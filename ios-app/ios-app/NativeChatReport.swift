import SwiftUI

nonisolated struct NativeChatReportTarget: Identifiable, Sendable {
    let messageID: String
    let sequence: Int
    let actorID: String
    let roomID: String
    var id: String { messageID }
}

nonisolated enum NativeChatReportCategory: String, CaseIterable, Identifiable, Sendable {
    case harassment, spam, unsafe, privacy, other
    var id: String { rawValue }
    var title: LocalizedStringResource {
        switch self {
        case .harassment: "Harassment"
        case .spam: "Spam"
        case .unsafe: "Unsafe behavior"
        case .privacy: "Privacy"
        case .other: "Other"
        }
    }
}

nonisolated struct NativeChatReportBody: Encodable {
    let messageId: String
    let category: String
    let details: String

    init(messageID: String, category: NativeChatReportCategory, details: String) throws {
        guard NativeChatText.isValid(details, limit: 1000) else {
            throw NSError(domain: "OpenCourts", code: 400,
                userInfo: [NSLocalizedDescriptionKey: "Explain what happened in up to 1,000 characters."])
        }
        messageId = messageID
        self.category = category.rawValue
        self.details = NativeChatText.body(details)
    }
}

private enum NativeChatReportState {
    case checking, ready, sending, submitted, unavailable, rejected, unconfirmed
}

nonisolated private struct NativeChatReportAck: Decodable {
    let ok: Bool
}

struct NativeChatReportForm: View {
    let message: NativeChatPage.Message?
    @Binding var category: NativeChatReportCategory
    @Binding var details: String
    let busy: Bool
    let checkingAccess: Bool
    let submit: () -> Void

    var body: some View {
        Form {
            if let message {
                Section("Message from \(message.displayName)") {
                    Text(message.body).lineLimit(6)
                }
            }
            Section("Reason") {
                Picker("Reason", selection: $category) {
                    ForEach(NativeChatReportCategory.allCases) { reason in
                        Text(reason.title).tag(reason)
                    }
                }
            }
            Section {
                TextField("Describe what happened", text: $details, axis: .vertical)
                    .lineLimit(4...8)
                Text("\(NativeChatText.body(details).utf16.count)/1,000")
                    .font(.caption)
                    .foregroundStyle(NativeChatText.body(details).utf16.count > 1000 ? .red : .secondary)
            } header: {
                Text("What happened?")
            } footer: {
                Text("Reports are private to site moderators. Do not include passwords, private addresses or other sensitive information. For immediate danger, contact emergency services.")
            }
            Section {
                Button(busy ? "Submitting…" : "Submit report") { submit() }
                    .frame(minHeight: 44)
                    .disabled(busy || checkingAccess || !NativeChatText.isValid(details, limit: 1000))
                Text("Reporting does not automatically remove the message.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .disabled(busy)
    }
}

struct NativeChatReportView: View {
    let gameID: String
    let target: NativeChatReportTarget
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.dismiss) private var dismiss
    @State private var category: NativeChatReportCategory = .other
    @State private var details = ""
    @State private var message: NativeChatPage.Message?
    @State private var state: NativeChatReportState = .checking
    @State private var feedback: String?
    @State private var generation = UUID()
    @State private var confirmSubmit = false
    @State private var submissionStarted = false
    @State private var acknowledged = false
    @State private var checkingAccess = false
    @State private var rejected = false

    var body: some View {
        NavigationStack {
            Group {
                switch state {
                case .checking:
                    ProgressView("Checking message access…")
                case .ready, .sending:
                    NativeChatReportForm(message: message, category: $category, details: $details,
                                         busy: state == .sending, checkingAccess: checkingAccess) {
                        confirmSubmit = true
                    }
                case .submitted:
                    ContentUnavailableView("Report submitted", systemImage: "checkmark.circle",
                        description: Text("Site moderators will review your report. Reporting does not automatically remove the message."))
                case .unavailable:
                    ContentUnavailableView("Message unavailable", systemImage: "bubble.left",
                        description: Text(feedback ?? "Close this report and refresh the conversation to check current access."))
                case .rejected:
                    ContentUnavailableView("Report not accepted", systemImage: "exclamationmark.bubble",
                        description: Text(feedback ?? "Close this report and refresh the conversation before trying again."))
                case .unconfirmed:
                    ContentUnavailableView("Report outcome unconfirmed", systemImage: "exclamationmark.bubble",
                        description: Text(feedback ?? "The report may have been submitted. Close this sheet and check the conversation before trying again."))
                }
            }
            .navigationTitle("Report message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }.disabled(state == .sending)
                }
            }
            .interactiveDismissDisabled(state == .sending)
            .alert("Submit this report to site moderators?", isPresented: $confirmSubmit) {
                Button("Submit report") { Task { await submit() } }
                Button("Keep editing", role: .cancel) {}
            }
        }
        .task(id: "\(account.player?.id ?? "")-\(scenePhase)") {
            invalidate()
            guard scenePhase == .active, account.player?.id == target.actorID,
                  !submissionStarted else { return }
            await check()
            while !Task.isCancelled, state == .ready || state == .sending {
                do { try await Task.sleep(for: .seconds(10)) } catch { return }
                if state == .ready { await check() }
            }
        }
        .onChange(of: account.player?.id) { _, _ in invalidate() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { invalidate() } }
        .onDisappear { invalidate() }
    }

    private func invalidate() {
        generation = UUID(); message = nil; details = ""; confirmSubmit = false; checkingAccess = false
        state = acknowledged ? .submitted : (rejected ? .rejected : (submissionStarted ? .unconfirmed : .unavailable))
        feedback = submissionStarted && !acknowledged && !rejected
            ? "The report may have been submitted. Close this sheet and check the conversation before trying again."
            : nil
    }

    private func authorizedMessage() async throws -> NativeChatPage.Message {
        let response: NativeChatPage = try await NativeCommunityAPI.shared.request("games/\(gameID)/chat")
        let page = try response.validated(for: target.actorID)
        guard page.available, page.expired != true, page.roomId == target.roomID else {
            throw CommunityError.invalidResponse
        }
        var found = page.messages?.first { $0.id == target.messageID }
        if found == nil, target.sequence > 0, target.sequence < Int.max {
            let response: NativeChatPage = try await NativeCommunityAPI.shared.request(
                "games/\(gameID)/chat", query: [URLQueryItem(name: "before", value: String(target.sequence + 1))])
            let earlier = try response.validated(for: target.actorID)
            guard earlier.available, earlier.expired != true, earlier.roomId == target.roomID else {
                throw CommunityError.invalidResponse
            }
            found = earlier.messages?.first { $0.id == target.messageID }
        }
        guard let found, found.seq == target.sequence, found.canReport(for: target.actorID) else {
            throw NSError(domain: "OpenCourts", code: 404,
                userInfo: [NSLocalizedDescriptionKey: "This message can no longer be reported. Refresh the conversation to check current access."])
        }
        return found
    }

    @MainActor private func check() async {
        guard !checkingAccess, state != .sending else { return }
        let ticket = generation
        checkingAccess = true
        defer { if ticket == generation { checkingAccess = false } }
        if message == nil { state = .checking }
        do {
            let current = try await authorizedMessage()
            guard !Task.isCancelled, generation == ticket, scenePhase == .active,
                  account.player?.id == target.actorID else { return }
            message = current; state = .ready
        } catch {
            guard !Task.isCancelled, generation == ticket, scenePhase == .active,
                  account.player?.id == target.actorID else { return }
            message = nil; details = ""; state = .unavailable; feedback = error.localizedDescription
        }
    }

    @MainActor private func submit() async {
        guard state == .ready, !checkingAccess, scenePhase == .active, account.player?.id == target.actorID,
              let body = try? NativeChatReportBody(messageID: target.messageID, category: category, details: details),
              let data = try? JSONEncoder().encode(body) else { return }
        let ticket = generation
        state = .sending
        var posted = false
        do {
            _ = try await authorizedMessage()
            guard !Task.isCancelled, ticket == generation, scenePhase == .active,
                  account.player?.id == target.actorID else { return }
            posted = true; submissionStarted = true
            let ack: NativeChatReportAck = try await NativeCommunityAPI.shared.request(
                "games/\(gameID)/chat/report", method: "POST", body: data)
            guard ack.ok else { throw CommunityError.invalidResponse }
            guard ticket == generation, scenePhase == .active, account.player?.id == target.actorID else { return }
            acknowledged = true; message = nil; details = ""; state = .submitted
        } catch {
            guard ticket == generation, scenePhase == .active, account.player?.id == target.actorID else { return }
            message = nil; details = ""
            let responseError = error as NSError
            rejected = posted && responseError.domain == "OpenCourts" && (400..<500).contains(responseError.code)
            state = posted ? (rejected ? .rejected : .unconfirmed) : .unavailable
            feedback = posted && !rejected
                ? "\(error.localizedDescription) The report may have been submitted. No retry was sent. Close this sheet before checking the conversation."
                : error.localizedDescription
        }
    }
}
