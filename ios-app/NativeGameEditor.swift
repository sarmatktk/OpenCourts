import SwiftUI

nonisolated private struct GameEditDraft: Encodable, Equatable, Sendable {
    var title: String
    var notes: String
    var format: String
    var courtCount: Int
    var capacity: Int
    var fillWaiting = true
    let version: Int
}

nonisolated private struct GameEditPreview: Decodable, Sendable {
    let confirmedPlaces: Int
    let reservedPlaces: Int
    let capacity: Int
    let candidates: [Candidate]
    let demoted: [Demoted]?

    struct Candidate: Decodable, Sendable {
        let playerId: String
        let displayName: String
        // The database returns SQLite booleans as integers.
        let willConfirm: Int
    }
    struct Demoted: Decodable, Sendable {
        let playerId: String
        let displayName: String
        let partySize: Int
    }
}

struct NativeGameEditor: View {
    let game: CommunityGame
    let version: Int
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var draft: GameEditDraft
    @State private var reviewedDraft: GameEditDraft?
    @State private var preview: GameEditPreview?
    @State private var error: String?
    @State private var busy = false
    @State private var needsRefresh = false
    @State private var generation = UUID()
    @State private var actorID: String?
    @State private var discard = false
    @State private var authorityConfirmed = false
    @State private var checkingAuthority = true

    init(game: CommunityGame, version: Int) {
        self.game = game
        self.version = version
        _draft = State(initialValue: GameEditDraft(title: game.title, notes: game.notes ?? "",
            format: game.format, courtCount: game.courtCount ?? 1, capacity: game.capacity, version: version))
    }

    private var minimum: Int { draft.courtCount * (draft.format == "singles" ? 2 : 4) }
    private var valid: Bool {
        !draft.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        && draft.title.utf16.count <= 80 && draft.notes.utf16.count <= 1000
        && (1...16).contains(draft.courtCount)
        && draft.capacity >= minimum && draft.capacity <= 128
    }
    private var increasing: Bool { draft.capacity > game.capacity }
    private var dirty: Bool {
        draft.title != game.title || draft.notes != (game.notes ?? "")
        || draft.format != game.format || draft.courtCount != (game.courtCount ?? 1)
        || draft.capacity != game.capacity
    }

    var body: some View {
        NavigationStack {
            Form {
                if authorityConfirmed {
                    Section("Game details") {
                        TextField("Game title", text: $draft.title)
                        Picker("Format", selection: $draft.format) {
                            Text("Singles").tag("singles")
                            Text("Doubles").tag("doubles")
                        }
                        .onChange(of: draft.format) { oldFormat, newFormat in
                            let oldMinimum = draft.courtCount * (oldFormat == "singles" ? 2 : 4)
                            if draft.capacity == oldMinimum {
                                draft.capacity = draft.courtCount * (newFormat == "singles" ? 2 : 4)
                            }
                        }
                        Stepper("Planned courts: \(draft.courtCount)", value: $draft.courtCount, in: 1...16)
                            .onChange(of: draft.courtCount) { oldCourts, newCourts in
                                let placesPerCourt = draft.format == "singles" ? 2 : 4
                                if draft.capacity == oldCourts * placesPerCourt {
                                    draft.capacity = newCourts * placesPerCourt
                                }
                            }
                        Stepper("Total capacity: \(draft.capacity)", value: $draft.capacity, in: 2...128)
                        Text("At least \(minimum) places for the planned courts. Capacity includes approved guests and must also cover reserved waitlist offers.")
                            .font(.footnote).foregroundStyle(.secondary)
                        TextField("Organizer notes", text: $draft.notes, axis: .vertical)
                            .lineLimit(3...8)
                    }
                    if increasing && game.visibility == "group" {
                        Section("New places") {
                            Text("Eligible group members on the waitlist will be added automatically in the order they joined it. Guest requests remain subject to the group's guest approval rules.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    } else if increasing {
                        Section("New places") {
                            Text("Pending join requests still need your approval. Increasing capacity does not confirm anyone automatically.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    Section {
                        Text(game.seriesId == nil
                             ? "Court availability must still be checked. These changes do not reserve a court."
                             : "These changes apply to this date only. Court availability must still be checked.")
                        Text("Date, time, court and audience stay fixed here. Schedule management is a separate action.")
                    }.font(.footnote).foregroundStyle(.secondary)
                    if !valid {
                        Section {
                            Text("Enter a title up to 80 characters and notes up to 1,000. Capacity must cover confirmed players and planned courts, up to 128 places.")
                                .foregroundStyle(.red)
                        }
                    }
                    if let error {
                        Section {
                            Text(error).foregroundStyle(.red)
                            if needsRefresh {
                                Button("Close and refresh game") { dismiss() }
                            }
                        }
                    }
                    if reviewedDraft == draft, let preview {
                        Section("Review changes") {
                            LabeledContent("Confirmed places", value: "\(preview.confirmedPlaces)")
                            LabeledContent("Reserved offers", value: "\(preview.reservedPlaces)")
                            LabeledContent("New capacity", value: "\(preview.capacity)")
                            if let demoted = preview.demoted, !demoted.isEmpty {
                                Text("The most recently joined player(s) will move out of confirmed places: \(demoted.map(\.displayName).joined(separator: ", ")). They will be notified. Group players enter the waitlist; standalone players return to pending host approval.")
                                    .font(.footnote).foregroundStyle(.secondary)
                            }
                            if increasing && game.visibility == "group" {
                                let count = preview.candidates.filter { $0.willConfirm != 0 }.count
                                Text("Up to \(count) waitlisted group member(s) will be added in request order. Eligibility and capacity are checked again when saving.")
                                    .font(.footnote).foregroundStyle(.secondary)
                            } else if increasing && game.visibility != "group" {
                                Text("No pending requests will be approved by this change. Review them in the participant requests list and approve each player you accept.")
                                    .font(.footnote).foregroundStyle(.secondary)
                            }
                            Button("Save changes") { Task { await save() } }
                                .buttonStyle(AppPrimaryButtonStyle())
                        }
                    } else {
                        Section {
                            Button("Review changes") { Task { await review() } }
                                .buttonStyle(AppPrimaryButtonStyle())
                                .disabled(!valid || !dirty || needsRefresh)
                        }
                    }
                    if busy { ProgressView("Checking game…") }
                } else {
                    Section {
                        if checkingAuthority {
                            ProgressView("Checking management access…")
                        } else {
                            Label("Game needs a refresh", systemImage: "arrow.clockwise")
                                .font(.headline)
                            Text(error ?? "Return to the game and refresh before editing.")
                                .font(.subheadline).foregroundStyle(.secondary)
                            Button("Close and refresh game") { dismiss() }
                        }
                    }
                }
            }
            .disabled(busy)
            .navigationTitle("Edit game")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if authorityConfirmed && dirty { discard = true } else { dismiss() }
                    }.disabled(busy)
                }
            }
            .alert("Discard your changes?", isPresented: $discard) {
                Button("Discard changes", role: .destructive) { dismiss() }
                Button("Keep editing", role: .cancel) { discard = false }
            }
        }
        .interactiveDismissDisabled((authorityConfirmed && dirty) || busy)
        .task {
            actorID = account.player?.id
            let token = generation
            do { try await confirmAuthority() }
            catch { if generation == token, !Task.isCancelled { invalidateAuthority(error) } }
        }
        .onChange(of: draft) { _, _ in preview = nil; reviewedDraft = nil }
        .onChange(of: account.player?.id) { _, _ in generation = UUID(); dismiss() }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active {
                generation = UUID(); preview = nil; reviewedDraft = nil
                authorityConfirmed = false; checkingAuthority = false
                needsRefresh = true
                error = "Return to the game and refresh before editing again."
            }
        }
        .onDisappear { generation = UUID() }
    }

    @MainActor private func confirmAuthority() async throws {
        guard let actorID, account.player?.id == actorID, scenePhase == .active else { throw NativeAccountError.signedOut }
        let token = generation
        authorityConfirmed = false; checkingAuthority = true
        let state: NativeGameParticipation = try await NativeCommunityAPI.shared.request("games/\(game.id)/participation")
        guard generation == token, account.player?.id == actorID, scenePhase == .active, !Task.isCancelled else { throw CancellationError() }
        guard state.canManage(version: version) else {
            throw NSError(domain: "OpenCourts", code: 409, userInfo: [NSLocalizedDescriptionKey: "Game or management access changed. Close and refresh before editing."])
        }
        authorityConfirmed = true; checkingAuthority = false
    }

    private func invalidateAuthority(_ failure: Error) {
        authorityConfirmed = false; checkingAuthority = false
        preview = nil; reviewedDraft = nil; needsRefresh = true
        draft.title = ""; draft.notes = ""
        error = failure.localizedDescription
    }

    private func payload(_ value: GameEditDraft) throws -> Data {
        var value = value
        value.fillWaiting = game.visibility == "group" && value.capacity > game.capacity
        return try JSONEncoder().encode(value)
    }

    @MainActor private func review() async {
        guard authorityConfirmed, valid, !busy, !needsRefresh, let actorID,
              account.player?.id == actorID, scenePhase == .active else { return }
        let token = generation
        let snapshot = draft
        busy = true; error = nil
        defer { busy = false }
        do {
            do { try await confirmAuthority() }
            catch { if generation == token { invalidateAuthority(error) }; return }
            let result: GameEditPreview = try await NativeCommunityAPI.shared.request(
                "games/\(game.id)/edit-preview", method: "POST", body: payload(snapshot))
            guard generation == token, account.player?.id == actorID, draft == snapshot, !Task.isCancelled else { return }
            preview = result; reviewedDraft = snapshot
        } catch {
            guard generation == token else { return }
            preview = nil; reviewedDraft = nil
            self.error = error.localizedDescription
            let response = error as NSError
            needsRefresh = response.domain == "OpenCourts" && [401, 403, 404, 409].contains(response.code)
            if response.domain == "OpenCourts", [401, 403, 404].contains(response.code) { invalidateAuthority(error) }
        }
    }

    @MainActor private func save() async {
        guard authorityConfirmed, valid, !busy, !needsRefresh, reviewedDraft == draft, preview != nil,
              let actorID, account.player?.id == actorID, scenePhase == .active else { return }
        let token = generation
        busy = true; error = nil
        defer { busy = false }
        do {
            do { try await confirmAuthority() }
            catch { if generation == token { invalidateAuthority(error) }; return }
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request(
                "games/\(game.id)/edit", method: "POST", body: payload(draft))
            guard generation == token, account.player?.id == actorID else { return }
            dismiss()
        } catch {
            guard generation == token else { return }
            // A lost response may follow a committed edit. Never automatically repeat it.
            invalidateAuthority(error)
            self.error = "\(error.localizedDescription) Close and refresh the game to check whether changes were saved."
        }
    }
}
