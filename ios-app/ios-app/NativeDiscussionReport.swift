import SwiftUI

nonisolated struct NativeDiscussionReportTarget: Identifiable, Sendable {
    let actorID: String
    let postID: String
    let commentID: String?
    var id: String { commentID ?? postID }
}

nonisolated struct NativeDiscussionReportBody: Encodable, Sendable {
    let subjectType: String
    let subjectId: String
    let category: String
    let details: String

    init(target: NativeDiscussionReportTarget, category: NativeChatReportCategory, details: String) throws {
        guard UUID(uuidString: target.id) != nil, NativeChatText.isValid(details, limit: 1000) else {
            throw CommunityError.invalidResponse
        }
        subjectType = target.commentID == nil ? "post" : "comment"
        subjectId = target.id
        self.category = category.rawValue
        self.details = NativeChatText.body(details)
    }
}

struct NativeDiscussionReportForm: View {
    let content: NativeDiscussionContent
    @Binding var category: NativeChatReportCategory
    @Binding var details: String
    let busy: Bool
    let checking: Bool
    let submit: () -> Void

    var body: some View {
        Form {
            Section("Content from \(content.displayName)") {
                if let title = content.title { Text(title).font(.headline) }
                Text(content.body).lineLimit(6)
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
            } header: { Text("What happened?") }
            footer: {
                Text("Reports go to site moderators. Do not include passwords, private addresses or other sensitive information. For immediate danger, contact emergency services.")
            }
            Section {
                Button(busy ? "Submitting…" : "Submit report") { submit() }
                    .frame(minHeight: 44)
                    .disabled(busy || checking || !NativeChatText.isValid(details, limit: 1000))
                Text("Reporting does not automatically remove this content.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .disabled(busy)
    }
}

private enum NativeDiscussionReportState {
    case checking, ready, sending, submitted, unavailable, rejected, unconfirmed
}

nonisolated private struct NativeDiscussionReportAck: Decodable { let ok: Bool }

struct NativeDiscussionReportView: View {
    let groupID: String
    let target: NativeDiscussionReportTarget
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.dismiss) private var dismiss
    @State private var content: NativeDiscussionContent?
    @State private var category: NativeChatReportCategory = .other
    @State private var details = ""
    @State private var state: NativeDiscussionReportState = .checking
    @State private var checking = false
    @State private var feedback: String?
    @State private var generation = UUID()
    @State private var confirmSubmit = false
    @State private var confirmClose = false
    @State private var started = false
    @State private var acknowledged = false
    @State private var rejected = false

    var body: some View {
        NavigationStack {
            Group {
                switch state {
                case .checking: ProgressView("Checking current content…")
                case .ready, .sending:
                    if let content {
                        VStack(spacing: 0) {
                            if let feedback { Text(feedback).font(.footnote).padding() }
                            NativeDiscussionReportForm(content: content, category: $category, details: $details,
                                busy: state == .sending, checking: checking) { confirmSubmit = true }
                        }
                    }
                case .submitted:
                    ContentUnavailableView("Report submitted", systemImage: "checkmark.circle",
                        description: Text("Site moderators will review your report. Reporting does not automatically remove the content."))
                case .unavailable, .rejected, .unconfirmed:
                    ContentUnavailableView(state == .unconfirmed ? "Report outcome unconfirmed" :
                        (state == .rejected ? "Report not accepted" : "Content unavailable"),
                        systemImage: "exclamationmark.bubble",
                        description: Text(feedback ?? "Close and refresh the discussion before taking another action."))
                }
            }
            .navigationTitle(target.commentID == nil ? "Report post" : "Report reply")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") {
                        if state == .ready && !details.isEmpty { confirmClose = true } else { dismiss() }
                    }.disabled(state == .sending)
                }
            }
            .interactiveDismissDisabled(state == .sending || (state == .ready && !details.isEmpty))
            .alert("Submit this report to site moderators?", isPresented: $confirmSubmit) {
                Button("Submit report") { Task { await submit() } }
                Button("Keep editing", role: .cancel) {}
            }
            .alert("Discard this report draft?", isPresented: $confirmClose) {
                Button("Discard draft", role: .destructive) { dismiss() }
                Button("Keep editing", role: .cancel) {}
            }
        }
        .task(id: "\(account.player?.id ?? "")-\(phase)") {
            invalidate()
            guard phase == .active, account.player?.id == target.actorID, !started else { return }
            await check()
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
                if state == .ready { await check() }
            }
        }
        .onChange(of: account.player?.id) { _, _ in invalidate() }
        .onChange(of: phase) { _, value in if value != .active { invalidate() } }
        .onDisappear { invalidate() }
    }

    private func invalidate() {
        generation = UUID(); content = nil; details = ""; category = .other
        confirmSubmit = false; confirmClose = false; checking = false
        state = acknowledged ? .submitted : (rejected ? .rejected : (started ? .unconfirmed : .unavailable))
        feedback = started && !acknowledged && !rejected
            ? "The report may have been submitted. No retry was sent. Close and refresh the discussion." : nil
    }

    private func authorizedContent() async throws -> NativeDiscussionContent {
        let path = "discussions/\(groupID)/\(target.postID)"
        let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(path)
        var page = try response.validated(for: target.actorID, postID: target.postID)
        guard page.available else { throw CommunityError.accessChanged }
        var found = target.commentID == nil ? page.post : page.comments?.first { $0.id == target.commentID }
        var cursors = Set<String>()
        while found == nil, let next = page.next {
            guard cursors.insert(next).inserted else { throw CommunityError.invalidResponse }
            try Task.checkCancellation()
            let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(
                path, query: [URLQueryItem(name: "before", value: next)])
            page = try response.validated(for: target.actorID, postID: target.postID)
            guard page.available else { throw CommunityError.accessChanged }
            found = page.comments?.first { $0.id == target.commentID }
        }
        guard let found, found.authorId != target.actorID, found.version > 0 else { throw CommunityError.accessChanged }
        return found
    }

    @MainActor private func check() async {
        guard !checking, state != .sending else { return }
        let ticket = generation
        checking = true
        defer { if ticket == generation { checking = false } }
        do {
            let current = try await authorizedContent()
            guard !Task.isCancelled, ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            if let content, content.version != current.version {
                confirmSubmit = false
                feedback = "The content changed. Review the current content and your explanation before submitting."
            }
            content = current; state = .ready
        } catch {
            guard !Task.isCancelled, ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            content = nil; details = ""; confirmSubmit = false
            state = .unavailable; feedback = error.localizedDescription
        }
    }

    @MainActor private func submit() async {
        guard state == .ready, !checking, phase == .active, account.player?.id == target.actorID,
              let reviewed = content,
              let payload = try? NativeDiscussionReportBody(target: target, category: category, details: details),
              let data = try? JSONEncoder().encode(payload) else { return }
        let ticket = generation
        state = .sending
        var posted = false
        do {
            let current = try await authorizedContent()
            guard !Task.isCancelled, ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            guard current.version == reviewed.version else {
                content = current; state = .ready
                feedback = "The content changed. Review it and your explanation, then confirm again."
                return
            }
            started = true; posted = true
            let ack: NativeDiscussionReportAck = try await NativeCommunityAPI.shared.request(
                "discussions/\(groupID)/report", method: "POST", body: data)
            guard ack.ok else { throw CommunityError.invalidResponse }
            guard ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            acknowledged = true; content = nil; details = ""; state = .submitted
        } catch {
            guard ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            content = nil; details = ""
            let response = error as NSError
            rejected = posted && response.domain == "OpenCourts" && (400..<500).contains(response.code)
            state = posted ? (rejected ? .rejected : .unconfirmed) : .unavailable
            feedback = posted && !rejected
                ? "\(error.localizedDescription) The report may have been submitted. No retry was sent. Close and refresh the discussion."
                : error.localizedDescription
        }
    }
}
