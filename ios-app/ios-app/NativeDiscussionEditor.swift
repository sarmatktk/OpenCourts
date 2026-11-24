import SwiftUI

nonisolated enum NativeDiscussionOperation: String, Sendable {
    case edit, delete, lock, unlock
}

nonisolated struct NativeDiscussionChangeTarget: Identifiable, Sendable {
    let actorID: String
    let postID: String
    let commentID: String?
    let operation: NativeDiscussionOperation
    var requiresManagement = false
    var id: String { (commentID ?? postID) + "-" + operation.rawValue }
}

nonisolated struct NativeDiscussionMutationBody: Encodable, Sendable {
    let title: String?
    let body: String?
    let version: Int?
    let commentId: String?

    static func edit(title: String, body: String, version: Int, commentID: String?) throws -> Self {
        guard version > 0, NativeDiscussionSubmission.valid(title: title, body: body, reply: commentID != nil) else {
            throw CommunityError.invalidResponse
        }
        let normalizedBody = NativeChatText.body(body)
        let normalizedTitle = NativeChatText.body(title)
        return Self(title: commentID == nil ? (normalizedTitle.isEmpty ? NativeDiscussionSubmission.suggestedTitle(normalizedBody) : normalizedTitle) : nil,
                    body: normalizedBody, version: version, commentId: commentID)
    }

    static func delete(commentID: String?) -> Self {
        Self(title: nil, body: nil, version: nil, commentId: commentID)
    }
}

nonisolated private struct NativeDiscussionMutationAck: Decodable, Sendable {
    let ok: Bool
}

private enum NativeDiscussionEditorState {
    case loading, ready, conflict, unavailable, unconfirmed
}

struct NativeDiscussionEditor: View {
    let groupID: String
    let target: NativeDiscussionChangeTarget
    let changed: (Bool) -> Void
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.dismiss) private var dismiss
    @State private var state: NativeDiscussionEditorState = .loading
    @State private var content: NativeDiscussionContent?
    @State private var title = ""
    @State private var text = ""
    @State private var originalTitle = ""
    @State private var originalText = ""
    @State private var version = 0
    @State private var busy = false
    @State private var feedback: String?
    @State private var generation = UUID()
    @State private var writeStarted = false
    @State private var confirmDelete = false
    @State private var confirmReload = false
    @State private var confirmClose = false

    private var isReply: Bool { target.commentID != nil }
    private var isLockChange: Bool { target.operation == .lock || target.operation == .unlock }
    private var actionTitle: String {
        switch target.operation {
        case .edit: isReply ? "Edit reply" : "Edit post"
        case .delete: isReply ? "Delete reply" : "Delete post"
        case .lock: "Lock discussion"
        case .unlock: "Unlock discussion"
        }
    }
    private var dirty: Bool { target.operation == .edit && (title != originalTitle || text != originalText) }

    var body: some View {
        NavigationStack {
            Group {
                switch state {
                case .loading:
                    ProgressView("Checking current content…")
                case .ready:
                    if target.operation == .edit {
                        NativeDiscussionComposeForm(title: $title, text: $text, reply: isReply, busy: busy,
                            checking: false, editing: true) { Task { await mutate() } }
                    } else if isLockChange {
                        NativeDiscussionLockReview(title: content?.title ?? "", locking: target.operation == .lock,
                                                   busy: busy) { confirmDelete = true }
                    } else {
                        Form {
                            Section(isReply ? "Reply to delete" : "Post to delete") {
                                if let title = content?.title { Text(title).font(.headline) }
                                Text(content?.body ?? "").textSelection(.enabled)
                            }
                            Section {
                                Button(isReply ? "Delete reply" : "Delete post", role: .destructive) { confirmDelete = true }
                                    .frame(minHeight: 44)
                            } footer: {
                                Text(isReply
                                     ? "Deletes this reply and its likes. The discussion stays available. This cannot be undone."
                                     : "Deletes this post, its replies and likes. This cannot be undone. Previously submitted safety reports may be retained for review.")
                            }
                        }.disabled(busy)
                    }
                case .conflict:
                    ContentUnavailableView {
                        Label("Content changed", systemImage: "arrow.triangle.2.circlepath")
                    } description: {
                        Text(feedback ?? "Your changes were not applied. Reload the latest content before reviewing again.")
                    } actions: {
                        Button("Reload latest") { confirmReload = true }
                    }
                case .unavailable:
                    ContentUnavailableView("Content unavailable", systemImage: "bubble.left",
                        description: Text(feedback ?? "Close this sheet and refresh the discussion to check current access."))
                case .unconfirmed:
                    ContentUnavailableView("Change outcome unconfirmed", systemImage: "exclamationmark.bubble",
                        description: Text(feedback ?? "The change may have been applied. Close this sheet and refresh the discussion before making another change."))
                }
            }
            .navigationTitle(actionTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { if dirty { confirmClose = true } else { dismiss() } }.disabled(busy)
                }
            }
            .interactiveDismissDisabled(busy || dirty)
            .alert(isLockChange ? (target.operation == .lock ? "Lock this discussion?" : "Unlock this discussion?") : (isReply ? "Delete this reply?" : "Delete this post?"), isPresented: $confirmDelete) {
                Button(actionTitle, role: isLockChange ? nil : .destructive) { Task { await mutate() } }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text(isLockChange ? (target.operation == .lock ? "Members can still read and follow. Replies, edits and like changes will be closed." : "Members will be able to reply, edit their content and change likes again.") : (isReply ? "This cannot be undone." : "All replies and likes on this post will also be deleted. Safety reports may be retained for review. This cannot be undone."))
            }
            .alert("Reload latest content?", isPresented: $confirmReload) {
                Button(target.operation == .edit ? "Reload and discard draft" : "Reload latest", role: target.operation == .edit ? .destructive : nil) {
                    title = ""; text = ""; writeStarted = false
                    Task { await load() }
                }
                Button("Cancel", role: .cancel) {}
            } message: { Text(target.operation == .edit ? "This discards your unsaved text. Review the latest content before making another change." : "Review the latest content and current permissions before confirming again.") }
            .alert("Discard your changes?", isPresented: $confirmClose) {
                Button("Discard changes", role: .destructive) { dismiss() }
                Button("Keep editing", role: .cancel) {}
            }
        }
        .task(id: "\(account.player?.id ?? "")-\(phase)") {
            invalidate()
            guard phase == .active, account.player?.id == target.actorID, !writeStarted else { return }
            await load()
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
                await revalidate()
            }
        }
        .onChange(of: phase) { _, value in if value != .active { invalidate() } }
        .onChange(of: account.player?.id) { _, _ in invalidate() }
        .onDisappear { invalidate() }
    }

    private func invalidate() {
        generation = UUID(); content = nil; title = ""; text = ""
        originalTitle = ""; originalText = ""; version = 0; busy = false
        confirmDelete = false; confirmReload = false; confirmClose = false
        state = writeStarted ? .unconfirmed : .unavailable
        feedback = nil
    }

    private func freshContent() async throws -> NativeDiscussionContent {
        let path = "discussions/\(groupID)/\(target.postID)"
        let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(path)
        var page = try response.validated(for: target.actorID, postID: target.postID)
        guard page.available, !target.requiresManagement || page.canManage == true else { throw CommunityError.accessChanged }
        var found = target.commentID == nil ? page.post : page.comments?.first { $0.id == target.commentID }
        var cursors = Set<String>()
        while found == nil, let next = page.next {
            guard cursors.insert(next).inserted else { throw CommunityError.invalidResponse }
            try Task.checkCancellation()
            let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(
                path, query: [URLQueryItem(name: "before", value: next)])
            page = try response.validated(for: target.actorID, postID: target.postID)
            guard page.available, !target.requiresManagement || page.canManage == true else { throw CommunityError.accessChanged }
            found = page.comments?.first { $0.id == target.commentID }
        }
        guard let found, found.version > 0,
              NativeDiscussionPermission.allows(target.operation, own: found.authorId == target.actorID,
                                                canManage: page.canManage == true, reply: isReply) else {
            throw CommunityError.accessChanged
        }
        if target.operation == .edit, page.post?.locked != 0 {
            throw NSError(domain: "OpenCourts", code: 409,
                userInfo: [NSLocalizedDescriptionKey: "This discussion is locked. You can still read it, but edits are closed."])
        }
        return found
    }

    @MainActor private func load() async {
        guard !busy, phase == .active, account.player?.id == target.actorID else { return }
        let ticket = generation
        state = .loading
        do {
            let current = try await freshContent()
            guard !Task.isCancelled, ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            content = current; version = current.version
            title = current.title ?? ""; text = current.body
            originalTitle = title; originalText = text; feedback = nil
            state = .ready
        } catch {
            guard !Task.isCancelled, ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            content = nil; state = .unavailable; feedback = error.localizedDescription
        }
    }

    @MainActor private func revalidate() async {
        guard !busy, state == .ready, phase == .active, account.player?.id == target.actorID else { return }
        let ticket = generation
        busy = true
        defer { if ticket == generation { busy = false } }
        do {
            let current = try await freshContent()
            guard !Task.isCancelled, ticket == generation, phase == .active,
                  account.player?.id == target.actorID else { return }
            if current.version != version {
                content = nil
                state = .conflict
                feedback = target.operation == .edit
                    ? "The content changed while you were reviewing it. Reloading discards your draft so you can review the latest version."
                    : "The content changed while you were reviewing it. Reload and review the latest version before confirming again."
            }
        } catch {
            guard !Task.isCancelled, ticket == generation, phase == .active,
                  account.player?.id == target.actorID else { return }
            content = nil; title = ""; text = ""; originalTitle = ""; originalText = ""
            state = .unavailable; feedback = error.localizedDescription
        }
    }

    @MainActor private func mutate() async {
        guard !busy, state == .ready, phase == .active, account.player?.id == target.actorID else { return }
        let ticket = generation
        busy = true
        defer { if ticket == generation { busy = false } }
        var posted = false
        do {
            let payload = target.operation == .edit
                ? try NativeDiscussionMutationBody.edit(title: title, body: text, version: version, commentID: target.commentID)
                : NativeDiscussionMutationBody.delete(commentID: target.commentID)
            let data = isLockChange
                ? try JSONEncoder().encode(NativeDiscussionLockBody(locked: target.operation == .lock))
                : try JSONEncoder().encode(payload)
            let current = try await freshContent()
            guard !Task.isCancelled, ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            guard current.version == version else {
                throw NSError(domain: "OpenCourts", code: 409,
                    userInfo: [NSLocalizedDescriptionKey: "The content changed since you opened this sheet. Reload and review the latest version."])
            }
            if isLockChange, current.locked == (target.operation == .lock ? 1 : 0) {
                changed(false); dismiss()
                return
            }
            posted = true; writeStarted = true
            let ack: NativeDiscussionMutationAck = try await NativeCommunityAPI.shared.request(
                "discussions/\(groupID)/\(target.postID)/\(isLockChange ? "lock" : target.operation.rawValue)", method: "POST", body: data)
            guard ack.ok else { throw CommunityError.invalidResponse }
            guard ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            content = nil; title = ""; text = ""; originalTitle = ""; originalText = ""
            changed(target.operation == .delete && !isReply); dismiss()
        } catch {
            guard ticket == generation, phase == .active, account.player?.id == target.actorID else { return }
            content = nil
            let response = error as NSError
            if response.domain == "OpenCourts", response.code == 409 {
                state = .conflict
                feedback = target.operation == .edit
                    ? "\(error.localizedDescription) Reloading discards your draft; nothing will overwrite the latest version automatically."
                    : "\(error.localizedDescription) Reload and review current content before confirming again."
            } else if !posted || (response.domain == "OpenCourts" && (400..<500).contains(response.code)) {
                title = ""; text = ""; state = .unavailable; feedback = error.localizedDescription
            } else {
                title = ""; text = ""; state = .unconfirmed
                feedback = "\(error.localizedDescription) The change may already be applied. No retry was sent. Close and refresh the discussion before another change."
            }
        }
    }
}

struct NativeDiscussionOwnActions: View {
    let reply: Bool
    let canEdit: Bool
    var own = true
    var canDelete = true
    var canManageLock = false
    var locked = false
    var report: (() -> Void)? = nil
    let action: (NativeDiscussionOperation) -> Void

    var body: some View {
        HStack {
            Spacer()
            Menu {
                if canEdit {
                    Button(reply ? "Edit reply" : "Edit post", systemImage: "pencil") { action(.edit) }
                }
                if canDelete {
                    Button(reply ? "Delete reply" : "Delete post", systemImage: "trash", role: .destructive) { action(.delete) }
                }
                if canManageLock && !reply {
                    Button(locked ? "Unlock discussion" : "Lock discussion",
                           systemImage: locked ? "lock.open" : "lock") {
                        action(locked ? .unlock : .lock)
                    }
                }
                if let report {
                    Button(reply ? "Report reply" : "Report post", systemImage: "flag") { report() }
                }
            } label: {
                Image(systemName: "ellipsis").frame(minWidth: 44, minHeight: 44)
            }
            .accessibilityLabel(reply ? (own ? "Options for your reply" : "Options for reply") : (own ? "Options for your post" : "Options for post"))
        }
    }
}
