import SwiftUI

nonisolated struct NativeSeriesPage: Decodable, Sendable {
    let games: [Occurrence]
    let seriesId: String?

    struct Occurrence: Decodable, Identifiable, Sendable {
        let id: String
        let title: String
        let startsAt: String
        let endsAt: String
        let startLocal: String
        let timeZone: String
        let status: String
        let version: Int
        let exception: Bool
        let week: Int?
        let editable: Bool
        let playerCount: Int
        let capacity: Int

        var startDate: Date? { NativeSeriesDates.iso(startsAt) }
    }
}

nonisolated enum NativeSeriesDates {
    static func iso(_ value: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: value) ?? ISO8601DateFormatter().date(from: value)
    }

    static func label(_ date: Date?, zone: String) -> String {
        guard let date, let timeZone = TimeZone(identifier: zone) else { return String(localized: "Date unavailable") }
        let formatter = DateFormatter()
        formatter.timeZone = timeZone
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: date)
    }

    static func wall(_ date: Date, zone: String) -> String? {
        guard let timeZone = TimeZone(identifier: zone) else { return nil }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = timeZone
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
        return formatter.string(from: date)
    }
}

nonisolated struct NativeSeriesDraft: Encodable, Equatable, Sendable {
    let scope: String
    let operation: String
    let preserveExceptions: Bool
    let startLocal: String?

    func encoded(planHash: String? = nil, requestID: String? = nil) throws -> Data {
        var body: [String: Any] = [
            "scope": scope, "operation": operation, "preserveExceptions": preserveExceptions
        ]
        if let startLocal { body["startLocal"] = startLocal }
        if let planHash { body["planHash"] = planHash }
        if let requestID { body["requestId"] = requestID }
        return try JSONSerialization.data(withJSONObject: body, options: .sortedKeys)
    }
}

nonisolated struct NativeSeriesPlan: Decodable, Sendable {
    let planHash: String
    let affected: [Change]
    let skipped: [Skipped]

    struct Change: Decodable, Identifiable, Sendable {
        let id: String
        let title: String
        let oldStart: Double
        let newStart: Double
        let newEnd: Double
        let timeZone: String
    }
    struct Skipped: Decodable, Identifiable, Sendable {
        let id: String
        let startsAt: String
        let timeZone: String?
        let reason: String
    }
}

nonisolated private struct NativeSeriesApplyResponse: Decodable, Sendable {
    let ok: Bool
    let changed: Int?
}

nonisolated private struct NativeSeriesReview: Sendable {
    let actorID: String
    let anchorID: String
    let draft: NativeSeriesDraft
    let plan: NativeSeriesPlan
    let body: Data
}

nonisolated private struct NativeSeriesPending: Sendable {
    let actorID: String
    let anchorID: String
    let body: Data
}

private struct NativeSeriesOccurrenceRow: View {
    let occurrence: NativeSeriesPage.Occurrence
    let selected: Bool
    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 6) {
                Text(NativeSeriesDates.label(occurrence.startDate, zone: occurrence.timeZone))
                    .font(.headline)
                Text(occurrence.title).font(.subheadline)
                Text(occurrence.timeZone).font(.caption).foregroundStyle(.secondary)
                Text("\(occurrence.playerCount) of \(occurrence.capacity) places confirmed")
                    .font(.footnote).foregroundStyle(.secondary)
                if occurrence.status == "cancelled" {
                    Label("Cancelled", systemImage: "calendar.badge.minus").font(.caption)
                } else if !occurrence.editable {
                    Text("Past or started").font(.caption).foregroundStyle(.secondary)
                } else {
                    Text("Upcoming").font(.caption).foregroundStyle(.secondary)
                }
                if occurrence.exception {
                    Label("Individual exception", systemImage: "calendar.badge.exclamationmark").font(.caption)
                }
            }
            Spacer(minLength: 4)
            if selected {
                Image(systemName: "checkmark.circle.fill").foregroundStyle(Brand.accent)
                    .accessibilityHidden(true)
            }
        }
        .padding(.vertical, 5)
        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
        .contentShape(Rectangle())
    }
}

private struct NativeSeriesReviewRows: View {
    let plan: NativeSeriesPlan
    let cancelling: Bool
    var body: some View {
        Section("Dates that will change") {
            ForEach(plan.affected) { change in
                VStack(alignment: .leading, spacing: 6) {
                    Text(change.title).font(.headline)
                    Text(NativeSeriesDates.label(Date(timeIntervalSince1970: change.oldStart / 1000), zone: change.timeZone))
                    if cancelling {
                        Label("Will be cancelled", systemImage: "calendar.badge.minus")
                            .foregroundStyle(.red)
                    } else {
                        Label(NativeSeriesDates.label(Date(timeIntervalSince1970: change.newStart / 1000), zone: change.timeZone),
                              systemImage: "arrow.right")
                    }
                    Text(change.timeZone).font(.caption).foregroundStyle(.secondary)
                }
                .font(.subheadline).padding(.vertical, 4)
            }
        }
        if !plan.skipped.isEmpty {
            Section("Dates left unchanged") {
                ForEach(plan.skipped) { skipped in
                    VStack(alignment: .leading, spacing: 4) {
                        if let zone = skipped.timeZone {
                            Text(NativeSeriesDates.label(NativeSeriesDates.iso(skipped.startsAt), zone: zone))
                        }
                        Text(skipped.reason).font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
        }
    }
}

#Preview("Schedule review") {
    NavigationStack {
        List {
            NativeSeriesReviewRows(plan: NativeSeriesPlan(
                planHash: "preview",
                affected: [.init(id: "change", title: "Weekly doubles",
                    oldStart: 1796484600000, newStart: 1796488200000, newEnd: 1796491800000,
                    timeZone: "America/New_York")],
                skipped: [.init(id: "skip", startsAt: "2026-12-12T15:30:00.000Z",
                    timeZone: "America/New_York", reason: "Individual exception preserved")]
            ), cancelling: false)
            Section {
                Text("Review every affected and unchanged date before confirming.")
                    .font(.footnote).foregroundStyle(.secondary)
                Button("Keep schedule", role: .cancel) { }
            }
        }
        .navigationTitle("Review schedule")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview("Occurrence states") {
    List {
        Section("Scheduled dates") {
            NativeSeriesOccurrenceRow(occurrence: .init(id: "upcoming", title: "Weekly doubles",
                startsAt: "2026-12-05T15:30:00.000Z", endsAt: "2026-12-05T16:30:00.000Z",
                startLocal: "2026-12-05T10:30", timeZone: "America/New_York", status: "scheduled",
                version: 1, exception: false, week: 1, editable: true, playerCount: 3, capacity: 4), selected: true)
            NativeSeriesOccurrenceRow(occurrence: .init(id: "exception", title: "Weekly doubles",
                startsAt: "2026-12-12T16:30:00.000Z", endsAt: "2026-12-12T17:30:00.000Z",
                startLocal: "2026-12-12T11:30", timeZone: "America/New_York", status: "scheduled",
                version: 2, exception: true, week: 2, editable: true, playerCount: 2, capacity: 4), selected: false)
            NativeSeriesOccurrenceRow(occurrence: .init(id: "cancelled", title: "Weekly doubles",
                startsAt: "2026-12-19T15:30:00.000Z", endsAt: "2026-12-19T16:30:00.000Z",
                startLocal: "2026-12-19T10:30", timeZone: "America/New_York", status: "cancelled",
                version: 2, exception: false, week: 3, editable: false, playerCount: 0, capacity: 4), selected: false)
        }
    }
}

struct NativeSeriesManagementView: View {
    let gameID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.dismiss) private var dismiss
    @State private var page: NativeSeriesPage?
    @State private var selectedID = ""
    @State private var operation = "reschedule"
    @State private var scope = "single"
    @State private var preserve = true
    @State private var start = Date()
    @State private var review: NativeSeriesReview?
    @State private var pending: NativeSeriesPending?
    @State private var busy = false
    @State private var applying = false
    @State private var error: String?
    @State private var notice: LocalizedStringResource?
    @State private var generation = UUID()
    @State private var confirmClose = false

    private var chosen: NativeSeriesPage.Occurrence? { page?.games.first { $0.id == selectedID && $0.editable } }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if page?.seriesId == nil {
                        Label("Game schedule", systemImage: "calendar").font(.headline)
                    } else {
                        Label("Weekly series", systemImage: "calendar").font(.headline)
                    }
                    Text("Each date keeps its own players, requests, invitations, guests and waitlist. Schedule changes do not reserve a court.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if let page {
                    Section("Scheduled dates") {
                        ForEach(page.games) { occurrence in
                            if occurrence.editable {
                                Button { select(occurrence) } label: {
                                    NativeSeriesOccurrenceRow(occurrence: occurrence, selected: selectedID == occurrence.id)
                                }
                                .buttonStyle(.plain)
                                .accessibilityAddTraits(selectedID == occurrence.id ? .isSelected : [])
                                .disabled(busy || review != nil || pending != nil)
                            } else {
                                NativeSeriesOccurrenceRow(occurrence: occurrence, selected: false)
                            }
                        }
                        if page.games.isEmpty { Text("No scheduled dates are available.") }
                    }
                }
                if let pending {
                    Section {
                        Text("The result needs checking").font(.headline)
                        Text("Your change may already be saved. Retry the same confirmation or check the current schedule before making another change.")
                            .font(.subheadline).foregroundStyle(.secondary)
                        if pending.actorID == account.player?.id {
                            Button("Retry same confirmation") { Task { await apply(pending) } }
                                .disabled(busy)
                            Button("Check current schedule") { Task { await load(resolvePending: true) } }
                                .disabled(busy)
                        } else {
                            Text("Return to the original account to check this confirmation, or close and review its schedule there.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                } else if let review {
                    NativeSeriesReviewRows(plan: review.plan, cancelling: review.draft.operation == "cancel")
                    Section {
                        Text("Review every affected and unchanged date before confirming.")
                            .font(.footnote).foregroundStyle(.secondary)
                        if review.draft.operation == "cancel" {
                            Button("Confirm cancellation", role: .destructive) { beginApply(review) }
                                .frame(minHeight: 44)
                        } else {
                            Button { beginApply(review) } label: {
                                Text("Confirm reschedule").frame(maxWidth: .infinity, minHeight: 44)
                            }.buttonStyle(AppPrimaryButtonStyle())
                        }
                        Button("Keep schedule", role: .cancel) { self.review = nil }
                            .frame(minHeight: 44)
                    }.disabled(busy)
                } else if let chosen {
                    Section("Change schedule") {
                        Picker("Action", selection: $operation) {
                            Text("Change date and time").tag("reschedule")
                            Text("Cancel game").tag("cancel")
                        }
                        if page?.seriesId != nil {
                            Picker("Apply to", selection: $scope) {
                                Text("This game only").tag("single")
                                Text("This and future games").tag("future")
                            }
                        }
                        if operation == "reschedule", let zone = TimeZone(identifier: chosen.timeZone) {
                            DatePicker("New start", selection: $start, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                                .environment(\.timeZone, zone)
                            Text(chosen.timeZone).font(.footnote).foregroundStyle(.secondary)
                            Text("Future dates keep their weekly spacing and the new local time. Duration stays unchanged. Every date must be within 180 days; daylight-saving changes are checked by the server.")
                                .font(.footnote).foregroundStyle(.secondary)
                            if scope == "future" {
                                Toggle("Keep individually rescheduled dates unchanged", isOn: $preserve)
                            }
                        } else if operation == "reschedule" {
                            Text("This time zone is unavailable. Close and refresh the game.").foregroundStyle(.secondary)
                        } else {
                            Text("Cancellation includes individually rescheduled dates in the selected scope. Past and already-cancelled games stay unchanged.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        Button { Task { await preview() } } label: {
                            Text("Review changes").frame(maxWidth: .infinity, minHeight: 44)
                        }.buttonStyle(AppPrimaryButtonStyle())
                            .disabled(operation == "reschedule" && TimeZone(identifier: chosen.timeZone) == nil)
                    }.disabled(busy)
                } else if page != nil && !busy {
                    Text("No upcoming games to change.").foregroundStyle(.secondary)
                }
                if busy { ProgressView("Checking schedule…") }
                if let notice { Text(notice).font(.footnote) }
                if let error {
                    Section {
                        Text(error).foregroundStyle(.secondary)
                        if pending == nil {
                            Button("Refresh schedule") { Task { await load() } }.disabled(busy)
                        }
                    }
                }
            }
            .navigationTitle(page?.seriesId == nil ? Text("Manage schedule") : Text("Manage series"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        if pending != nil { confirmClose = true } else { dismiss() }
                    }.disabled(busy)
                }
            }
            .interactiveDismissDisabled(busy || pending != nil)
            .alert("Leave an unconfirmed change?", isPresented: $confirmClose) {
                Button("Close and check My Games", role: .destructive) { dismiss() }
                Button("Keep checking", role: .cancel) { }
            } message: {
                Text("The schedule may already have changed. Check its current dates before submitting another change.")
            }
            .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") {
                if pending == nil { await load() }
            }
            .onDisappear { clearVisible() }
            .onChange(of: phase) { _, _ in clearVisible() }
            .onChange(of: account.player?.id) { _, _ in clearVisible() }
        }
    }

    private func clearVisible() {
        generation = UUID(); page = nil; selectedID = ""; review = nil
        error = nil; notice = nil; start = Date(); confirmClose = false
        if !applying { busy = false }
    }

    private func select(_ occurrence: NativeSeriesPage.Occurrence) {
        guard occurrence.editable, let date = occurrence.startDate else { return }
        selectedID = occurrence.id; start = date; review = nil; notice = nil
    }

    @MainActor private func load(resolvePending: Bool = false) async {
        guard !busy else { return }
        clearVisible()
        guard let actor = account.player?.id, phase == .active else { error = NativeAccountError.signedOut.localizedDescription; return }
        let token = generation
        busy = true
        defer { if generation == token { busy = false } }
        do {
            let response: NativeSeriesPage = try await NativeCommunityAPI.shared.request("games/\(gameID)/series")
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            page = response
            if let first = response.games.first(where: { $0.id == gameID && $0.editable }) ?? response.games.first(where: \.editable) { select(first) }
            if resolvePending, pending?.actorID == actor { pending = nil }
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            self.error = error.localizedDescription
        }
    }

    @MainActor private func preview() async {
        guard !busy, pending == nil, let actor = account.player?.id, let chosen, phase == .active else { return }
        let draft = NativeSeriesDraft(scope: page?.seriesId == nil ? "single" : scope, operation: operation,
            preserveExceptions: operation == "cancel" ? false : preserve,
            startLocal: operation == "reschedule" ? NativeSeriesDates.wall(start, zone: chosen.timeZone) : nil)
        guard operation != "reschedule" || draft.startLocal != nil else { return }
        let token = generation
        busy = true; error = nil; notice = nil; review = nil
        defer { if generation == token { busy = false } }
        do {
            let plan: NativeSeriesPlan = try await NativeCommunityAPI.shared.request(
                "games/\(chosen.id)/series/preview", method: "POST", body: draft.encoded())
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            guard !plan.affected.isEmpty, !plan.planHash.isEmpty else { throw CommunityError.invalidResponse }
            review = NativeSeriesReview(actorID: actor, anchorID: chosen.id, draft: draft, plan: plan,
                body: try draft.encoded(planHash: plan.planHash, requestID: UUID().uuidString))
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            page = nil; review = nil; self.error = error.localizedDescription
        }
    }

    private func beginApply(_ review: NativeSeriesReview) {
        guard !busy, pending == nil, account.player?.id == review.actorID, phase == .active else { return }
        let value = NativeSeriesPending(actorID: review.actorID, anchorID: review.anchorID, body: review.body)
        pending = value
        self.review = nil
        Task { await apply(value) }
    }

    @MainActor private func apply(_ value: NativeSeriesPending) async {
        guard !busy, account.player?.id == value.actorID, phase == .active else { return }
        let token = generation
        busy = true; applying = true; error = nil; page = nil
        do {
            let response: NativeSeriesApplyResponse = try await NativeCommunityAPI.shared.request(
                "games/\(value.anchorID)/series/apply", method: "POST", body: value.body)
            guard response.ok else { throw CommunityError.invalidResponse }
            guard generation == token, account.player?.id == value.actorID, phase == .active else { applying = false; busy = false; return }
            pending = nil
            applying = false; busy = false
            await load()
            if account.player?.id == value.actorID, phase == .active, page != nil {
                notice = "Schedule updated. Attendance stays with each date."
            }
        } catch {
            applying = false; busy = false
            guard generation == token, account.player?.id == value.actorID, phase == .active else { return }
            let code = error as NSError
            if code.domain == "OpenCourts", (400..<500).contains(code.code), code.code != 408 {
                pending = nil
            }
            self.error = "\(error.localizedDescription) Check the current schedule before making another change."
        }
    }
}
