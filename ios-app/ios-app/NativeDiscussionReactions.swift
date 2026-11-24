import SwiftUI

nonisolated struct NativeDiscussionPreference: Encodable, Sendable {
    let liked: Bool?
    let muted: Bool?
    let commentId: String?

    static func like(_ value: Bool, commentID: String?) -> Self {
        Self(liked: value, muted: nil, commentId: commentID)
    }

    static func follow(_ value: Bool) -> Self {
        Self(liked: nil, muted: !value, commentId: nil)
    }
}

nonisolated private struct NativeDiscussionPreferenceAck: Decodable, Sendable {
    let ok: Bool
}

struct NativeDiscussionReactions: View {
    let groupID: String
    let postID: String
    let content: NativeDiscussionContent
    let reply: Bool
    let locked: Bool
    let revision: UUID
    let refresh: () async -> Void
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var busy = false
    @State private var needsRefresh = false
    @State private var feedback: String?
    @State private var generation = UUID()

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 12) {
                Button {
                    Task { await update(follow: false, desired: content.liked == 0) }
                } label: {
                    Label {
                        Text(content.liked == 1 ? "Liked · \(content.likes)" : "Like · \(content.likes)")
                    } icon: {
                        Image(systemName: content.liked == 1 ? "heart.fill" : "heart")
                    }
                    .frame(minHeight: 44)
                }
                .disabled(locked || busy || needsRefresh)
                .accessibilityLabel(content.liked == 1 ? "Unlike" : "Like")
                .accessibilityValue("\(content.likes) likes")
                if !reply {
                    Button {
                        Task { await update(follow: true, desired: content.muted != 0) }
                    } label: {
                        Label(content.muted == 0 ? "Following" : "Follow", systemImage: content.muted == 0 ? "bell.fill" : "bell")
                            .frame(minHeight: 44)
                    }
                    .disabled(busy || needsRefresh)
                    .accessibilityHint(content.muted == 0 ? "Stop following replies to this discussion" : "Follow replies to this discussion")
                }
            }
            if !reply {
                Text("Follows your Groups notification preferences.")
                    .font(.caption).foregroundStyle(.secondary)
            }
            if busy { ProgressView("Checking and updating…").font(.caption) }
            if let feedback {
                Text(feedback).font(.caption).foregroundStyle(.secondary)
            }
            if needsRefresh {
                Button("Refresh status") { Task { await refresh() } }
                    .frame(minHeight: 44).disabled(busy)
            }
        }
        .buttonStyle(.borderless)
        .disabled(account.player == nil || phase != .active)
        .onChange(of: revision) { _, _ in
            // A fresh authorized reader snapshot is required before another choice.
            if !busy { needsRefresh = false; feedback = nil }
        }
        .onChange(of: account.player?.id) { _, _ in invalidate() }
        .onChange(of: phase) { _, value in if value != .active { invalidate() } }
        .onDisappear { invalidate() }
    }

    private func invalidate() {
        generation = UUID()
        busy = false; needsRefresh = true; feedback = nil
    }

    @MainActor private func update(follow: Bool, desired: Bool) async {
        guard !busy, !needsRefresh, phase == .active, let actor = account.player?.id else { return }
        let ticket = generation
        busy = true
        var posted = false
        do {
            let path = "discussions/\(groupID)/\(postID)"
            let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(path)
            var page = try response.validated(for: actor, postID: postID)
            guard page.available, let post = page.post else { throw CommunityError.accessChanged }
            if !follow {
                guard post.locked == 0 else {
                    throw NSError(domain: "OpenCourts", code: 409,
                                  userInfo: [NSLocalizedDescriptionKey: "This discussion is locked. Likes cannot be changed."])
                }
                var found = reply ? page.comments?.first { $0.id == content.id } : post
                var cursors = Set<String>()
                while found == nil, let next = page.next {
                    guard cursors.insert(next).inserted else { throw CommunityError.invalidResponse }
                    try Task.checkCancellation()
                    let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(
                        path, query: [URLQueryItem(name: "before", value: next)])
                    page = try response.validated(for: actor, postID: postID)
                    guard page.available, page.post?.locked == 0 else { throw CommunityError.accessChanged }
                    found = page.comments?.first { $0.id == content.id }
                }
                guard found != nil else { throw CommunityError.accessChanged }
            }
            guard !Task.isCancelled, ticket == generation, phase == .active, account.player?.id == actor else { return }
            let payload = follow ? NativeDiscussionPreference.follow(desired)
                : NativeDiscussionPreference.like(desired, commentID: reply ? content.id : nil)
            let data = try JSONEncoder().encode(payload)
            posted = true
            let ack: NativeDiscussionPreferenceAck = try await NativeCommunityAPI.shared.request(
                path + (follow ? "/mute" : "/like"), method: "POST", body: data)
            guard ack.ok else { throw CommunityError.invalidResponse }
            guard ticket == generation, phase == .active, account.player?.id == actor else { return }
            needsRefresh = true
            feedback = "Choice saved. Refreshing current status…"
            busy = false
            await refresh()
        } catch {
            guard ticket == generation, phase == .active, account.player?.id == actor else { return }
            busy = false; needsRefresh = true
            let response = error as NSError
            let definitive = response.domain == "OpenCourts" && (400..<500).contains(response.code)
            feedback = posted && !definitive
                ? "The change may have been saved. Refresh status before choosing again."
                : "\(error.localizedDescription) Refresh to check current access and status."
            // Clear private reader content on failed authorization, and reconcile uncertain writes.
            await refresh()
        }
    }
}
