import SwiftUI

nonisolated struct NativeDiscussionComposeTarget: Identifiable, Sendable {
    let actorID: String
    let postID: String?
    var id: String { actorID + "-" + (postID ?? "new") }
}

nonisolated struct NativeDiscussionSubmission: Sendable {
    let actorID: String
    let groupID: String
    let postID: String?
    let clientID: String
    let title: String?
    let body: String
    let data: Data

    static func suggestedTitle(_ body: String) -> String {
        var result = ""
        var length = 0
        for scalar in body.unicodeScalars {
            let units = scalar.utf16.count
            guard length + units <= 120 else { break }
            result.unicodeScalars.append(scalar)
            length += units
        }
        return result
    }

    static func valid(title: String, body: String, reply: Bool) -> Bool {
        NativeChatText.isValid(body, limit: reply ? 2000 : 4000) &&
            (reply || NativeChatText.body(title).isEmpty || NativeChatText.isValid(title, limit: 120))
    }

    init(actorID: String, groupID: String, postID: String?, title: String, body: String,
         clientID: String = UUID().uuidString) throws {
        guard Self.valid(title: title, body: body, reply: postID != nil),
              UUID(uuidString: groupID) != nil, UUID(uuidString: clientID) != nil,
              postID == nil || UUID(uuidString: postID ?? "") != nil else {
            throw NSError(domain: "OpenCourts", code: 400,
                userInfo: [NSLocalizedDescriptionKey: "Check the title and message length, and remove unsupported control characters."])
        }
        self.actorID = actorID; self.groupID = groupID; self.postID = postID; self.clientID = clientID
        self.body = NativeChatText.body(body)
        let normalizedTitle = NativeChatText.body(title)
        self.title = postID == nil ? (normalizedTitle.isEmpty ? Self.suggestedTitle(self.body) : normalizedTitle) : nil
        var payload = ["body": self.body, "clientId": clientID]
        if let title = self.title { payload["title"] = title }
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
        data = try encoder.encode(payload)
    }

    var path: String {
        "discussions/\(groupID)" + (postID.map { "/\($0)/comment" } ?? "")
    }
}

@Observable
final class NativeDiscussionSubmissionStore {
    // Session-only retry bytes survive sheet/scene recreation, never account changes.
    var pending: NativeDiscussionSubmission?
}

nonisolated private struct NativeDiscussionCreated: Decodable, Sendable {
    let id: String
}

struct NativeDiscussionComposeForm: View {
    @Binding var title: String
    @Binding var text: String
    let reply: Bool
    let busy: Bool
    let checking: Bool
    var destination: String? = nil
    var editing = false
    var submitInToolbar = false
    let submit: () -> Void

    var body: some View {
        Form {
            if let destination {
                if editing {
                    Section("Discussion") { Text(destination).font(.headline) }
                } else {
                    Section { Text(destination).font(.headline) }
                }
            }
            if !reply {
                Section {
                    HStack(spacing: 8) {
                        TextField("Title (optional)", text: $title)
                            .accessibilityHint("Leave empty to use the start of your post.")
                        Text("\(NativeChatText.body(title).utf16.count)/120")
                            .font(.caption).foregroundStyle(NativeChatText.body(title).utf16.count > 120 ? .red : .secondary)
                    }
                    if !NativeChatText.body(title).isEmpty, NativeChatText.body(title).utf16.count <= 120,
                       !NativeChatText.isValid(title, limit: 120) {
                        Text("Remove unsupported control characters from the title.")
                            .font(.footnote).foregroundStyle(.red)
                    }
                }
            }
            Section {
                TextField(reply ? "Write your reply" : "What would you like to share?", text: $text, axis: .vertical)
                    .lineLimit(6...12)
                Text("\(NativeChatText.body(text).utf16.count, format: .number)/\(reply ? 2000 : 4000, format: .number)")
                    .font(.caption)
                    .foregroundStyle(NativeChatText.body(text).utf16.count > (reply ? 2000 : 4000) ? .red : .secondary)
                if !NativeChatText.body(text).isEmpty,
                   NativeChatText.body(text).utf16.count <= (reply ? 2000 : 4000),
                   !NativeChatText.isValid(text, limit: reply ? 2000 : 4000) {
                    Text("Remove unsupported control characters before posting.")
                        .font(.footnote).foregroundStyle(.red)
                }
                if checking { Text("Checking current access…").font(.footnote).foregroundStyle(.secondary) }
            } header: {
                Text(reply ? "Reply" : "Post")
            } footer: {
                Text("Text only · Active group members can read this. Avoid private contact details.")
            }
            if !submitInToolbar {
                Section {
                    Button(busy ? (editing ? "Saving…" : "Posting…") : (editing ? "Save changes" : (reply ? "Post reply" : "Post discussion")), action: submit)
                        .frame(minHeight: 44)
                        .disabled(busy || checking || !NativeDiscussionSubmission.valid(title: title, body: text, reply: reply))
                }
            }
        }
        .contentMargins(.top, 0, for: .scrollContent)
        .listSectionSpacing(.compact)
        .toolbar {
            if submitInToolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button(busy ? "Posting…" : "Post", action: submit)
                        .disabled(busy || checking || !NativeDiscussionSubmission.valid(title: title, body: text, reply: reply))
                }
            }
        }
        .disabled(busy)
    }
}

struct NativeDiscussionComposer: View {
    let groupID: String
    let target: NativeDiscussionComposeTarget
    let submissions: NativeDiscussionSubmissionStore
    let published: (String) -> Void
    var inline = false
    var finished: () -> Void = {}
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.dismiss) private var dismiss
    @State private var title = ""
    @State private var text = ""
    @State private var access = false
    @State private var checking = false
    @State private var busy = false
    @State private var feedback: String?
    @State private var destination: String?
    private var attempt: NativeDiscussionSubmission? {
        get {
            guard submissions.pending?.actorID == target.actorID,
                  submissions.pending?.groupID == groupID,
                  submissions.pending?.postID == target.postID else { return nil }
            return submissions.pending
        }
        nonmutating set { submissions.pending = newValue }
    }
    @State private var generation = UUID()
    @State private var confirmClose = false
    @State private var confirmDiscard = false

    init(groupID: String, target: NativeDiscussionComposeTarget,
         submissions: NativeDiscussionSubmissionStore, inline: Bool = false,
         finished: @escaping () -> Void = {}, published: @escaping (String) -> Void) {
        self.groupID = groupID
        self.target = target
        self.submissions = submissions
        self.inline = inline
        self.finished = finished
        self.published = published
    }

    var body: some View {
        Group {
            if inline {
                inlineBody
            } else {
                NavigationStack {
                    Group {
                if phase != .active || account.player?.id != target.actorID {
                    ContentUnavailableView("Discussion unavailable", systemImage: "person.crop.circle",
                        description: Text("Close this sheet and check your account."))
                } else if attempt != nil {
                    Form {
                        Section {
                            Text("Your submission may already have been posted. Retry keeps the original text and request ID.")
                            if access, let attempt {
                                if let title = attempt.title { Text(title).font(.headline) }
                                Text(attempt.body).lineLimit(6)
                            }
                            if let feedback { Text(feedback).foregroundStyle(.red).font(.footnote) }
                            Button(busy ? "Posting…" : "Retry same submission") { Task { await send() } }
                                .frame(minHeight: 44).disabled(busy || checking)
                            Button("Discard retry", role: .destructive) { confirmDiscard = true }
                                .frame(minHeight: 44).disabled(busy || checking)
                        }
                    }
                } else if access {
                    VStack(spacing: 0) {
                        if let feedback { Text(feedback).font(.footnote).foregroundStyle(.red).padding() }
                        NativeDiscussionComposeForm(title: $title, text: $text, reply: target.postID != nil,
                                                    busy: busy, checking: checking, destination: destination,
                                                    submitInToolbar: target.postID == nil) { Task { await send() } }
                    }
                } else if checking {
                    ProgressView("Checking discussion access…")
                } else {
                    ContentUnavailableView {
                        Label("Cannot post right now", systemImage: "bubble.left")
                    } description: {
                        Text(feedback ?? "Current approved group membership is required.")
                    } actions: {
                        Button("Check access again") { Task { await check() } }
                    }
                }
            }
            .navigationTitle(target.postID == nil ? "New discussion" : "Reply")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close", action: closeComposer).disabled(busy)
                }
            }
            .interactiveDismissDisabled(busy || attempt != nil || !title.isEmpty || !text.isEmpty)
            .alert("Close this draft?", isPresented: $confirmClose) {
                Button("Keep editing", role: .cancel) {}
                Button("Close", role: .destructive) {
                    attempt = nil
                    if inline { finished() } else { dismiss() }
                }
            } message: {
                Text(attempt == nil ? "Your unsent text will be discarded." :
                     "Your submission may already be posted. Closing loses this retry request; check the discussion before posting it again.")
            }
            .alert("Discard this retry?", isPresented: $confirmDiscard) {
                Button("Keep retry", role: .cancel) {}
                Button("Discard retry", role: .destructive) {
                    attempt = nil; title = ""; text = ""; access = false
                    Task { await check() }
                }
            } message: { Text("This does not remove anything already posted. Check the discussion before writing it again.") }
                }
            }
        }
        .task(id: "\(account.player?.id ?? "")-\(phase)") {
            invalidate(clearAttempt: account.player?.id != target.actorID)
            guard phase == .active, account.player?.id == target.actorID else { return }
            await check()
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
                await check()
            }
        }
        .onChange(of: phase) { _, value in if value != .active { invalidate(clearAttempt: false) } }
        .onChange(of: account.player?.id) { _, _ in invalidate(clearAttempt: true) }
        .onDisappear { invalidate(clearAttempt: false) }
    }

    private var inlineBody: some View {
        VStack(alignment: .leading, spacing: 8) {
            if phase != .active || account.player?.id != target.actorID {
                Label("Reply unavailable", systemImage: "person.crop.circle")
                    .font(.footnote).foregroundStyle(.secondary)
            } else if let attempt {
                Text("A previous reply may have been posted.")
                    .font(.footnote).foregroundStyle(.secondary)
                if access { Text(attempt.body).font(.subheadline).lineLimit(3) }
                if let feedback { Text(feedback).font(.caption).foregroundStyle(.red) }
                HStack {
                    Button(busy ? "Posting…" : "Retry") { Task { await send() } }
                        .disabled(busy || checking)
                    Spacer()
                    Button("Discard", role: .destructive) { confirmDiscard = true }
                        .disabled(busy || checking)
                }
            } else if access {
                HStack(alignment: .bottom, spacing: 8) {
                    TextField("Write your reply", text: $text, axis: .vertical)
                        .lineLimit(1...6)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .frame(minHeight: 48, alignment: .leading)
                        .disabled(busy)
                        .accessibilityHint("Replies are limited to 2,000 characters.")
                    Button {
                        Task { await send() }
                    } label: {
                        Group {
                            if busy {
                                ProgressView().tint(.white)
                            } else {
                                Image(systemName: "arrow.up")
                                    .font(.system(size: 19, weight: .semibold))
                            }
                        }
                        .frame(width: 40, height: 40)
                        .foregroundStyle(.white)
                        .background(Brand.actionFill.opacity(
                            NativeDiscussionSubmission.valid(title: "", body: text, reply: true) && !busy && !checking ? 1 : 0.48
                        ), in: Circle())
                        .contentShape(Circle())
                    }
                    .buttonStyle(.plain)
                    .disabled(busy || checking ||
                        !NativeDiscussionSubmission.valid(title: "", body: text, reply: true))
                    .accessibilityLabel("Post reply")
                    .accessibilityHint("Posts your reply to the discussion")
                }
                .padding(6)
                .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 28))
                HStack(alignment: .firstTextBaseline) {
                    Text("\(NativeChatText.body(text).utf16.count, format: .number)/2,000")
                    Spacer()
                    Text("Active group members can read this.")
                }
                .font(.caption).foregroundStyle(.secondary)
                if let feedback { Text(feedback).font(.caption).foregroundStyle(.red) }
                if !NativeChatText.body(text).isEmpty && !NativeChatText.isValid(text, limit: 2000) {
                    Text("Remove unsupported control characters before posting.")
                        .font(.caption).foregroundStyle(.red)
                }
            } else if checking {
                ProgressView("Checking reply access…")
                    .font(.footnote)
            } else {
                HStack(spacing: 8) {
                    Text(feedback ?? "Replying is unavailable.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Spacer()
                    Button("Retry") { Task { await check() } }
                        .disabled(checking || busy)
                }
            }
            HStack {
                Spacer()
                Button("Cancel") { closeComposer() }
                    .font(.footnote.weight(.semibold))
                    .disabled(busy)
            }
        }
        .padding(.vertical, 8)
        .alert("Close this draft?", isPresented: $confirmClose) {
            Button("Keep editing", role: .cancel) {}
            Button("Close", role: .destructive) { attempt = nil; finished() }
        } message: {
            Text(attempt == nil ? "Your unsent text will be discarded." :
                 "This reply may already have been posted. Check the discussion before writing it again.")
        }
        .alert("Discard this retry?", isPresented: $confirmDiscard) {
            Button("Keep retry", role: .cancel) {}
            Button("Discard retry", role: .destructive) {
                attempt = nil; title = ""; text = ""; access = false
                Task { await check() }
            }
        } message: { Text("This does not remove anything already posted. Check the discussion before writing it again.") }
    }

    private func closeComposer() {
        if attempt != nil || !title.isEmpty || !text.isEmpty || busy {
            confirmClose = true
        } else if inline {
            finished()
        } else {
            dismiss()
        }
    }

    private func invalidate(clearAttempt: Bool) {
        generation = UUID(); access = false; checking = false; busy = false
        title = ""; text = ""; feedback = nil; destination = nil
        if clearAttempt { attempt = nil }
    }

    private func verifyAccess() async throws -> String {
        let detail: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
        guard !detail.archived, detail.membership?.status == "active", detail.content != nil else {
            throw CommunityError.accessChanged
        }
        let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(
            "discussions/\(groupID)" + (target.postID.map { "/\($0)" } ?? ""))
        let page = try response.validated(for: target.actorID, postID: target.postID)
        guard page.available else {
            throw NSError(domain: "OpenCourts", code: 503,
                userInfo: [NSLocalizedDescriptionKey: "Discussions are not available yet."])
        }
        if target.postID != nil, page.post?.locked != 0 {
            throw NSError(domain: "OpenCourts", code: 409,
                userInfo: [NSLocalizedDescriptionKey: "This discussion is locked. You can still read it."])
        }
        if let title = page.post?.title { return "\(detail.group.name) · \(title)" }
        return detail.group.name
    }

    @MainActor private func check() async {
        guard !checking, !busy, phase == .active, account.player?.id == target.actorID else { return }
        let ticket = generation
        checking = true
        defer { if ticket == generation { checking = false } }
        do {
            let currentDestination = try await verifyAccess()
            guard !Task.isCancelled, ticket == generation, phase == .active,
                  account.player?.id == target.actorID else { return }
            access = true; destination = currentDestination; feedback = nil
        } catch {
            guard !Task.isCancelled, ticket == generation, phase == .active,
                  account.player?.id == target.actorID else { return }
            access = false; destination = nil; feedback = error.localizedDescription
        }
    }

    @MainActor private func send() async {
        guard !busy, !checking, phase == .active, account.player?.id == target.actorID else { return }
        let pending: NativeDiscussionSubmission
        do {
            pending = try attempt ?? NativeDiscussionSubmission(actorID: target.actorID, groupID: groupID,
                postID: target.postID, title: title, body: text)
        } catch { feedback = error.localizedDescription; return }
        guard pending.actorID == target.actorID, pending.groupID == groupID, pending.postID == target.postID else { return }
        let ticket = generation
        busy = true; feedback = nil
        defer { if ticket == generation { busy = false } }
        do {
            let currentDestination = try await verifyAccess()
            guard !Task.isCancelled, ticket == generation, phase == .active,
                  account.player?.id == target.actorID else { return }
            destination = currentDestination
            attempt = pending
            let ack: NativeDiscussionCreated = try await NativeCommunityAPI.shared.request(
                pending.path, method: "POST", body: pending.data)
            guard UUID(uuidString: ack.id) != nil else { throw CommunityError.invalidResponse }
            guard ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            attempt = nil; title = ""; text = ""
            published(ack.id)
            if inline { finished() } else { dismiss() }
        } catch {
            guard ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            access = false; destination = nil; feedback = error.localizedDescription
        }
    }
}
