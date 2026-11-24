import SwiftUI
import CoreFoundation

/// Only opaque destinations from our versioned provider contract cross the delegate boundary.
nonisolated struct NativePushPayload: Sendable {
    let registrationID: UUID
    let kind: String
    let targetType: String
    let targetID: String
    let postID: String?

    init?(userInfo: [AnyHashable: Any]) {
        guard let version = userInfo["version"] as? NSNumber,
              CFGetTypeID(version) != CFBooleanGetTypeID(), version == 1,
              let registration = userInfo["registrationId"] as? String,
              let registrationID = UUID(uuidString: registration),
              let kind = userInfo["kind"] as? String,
              let target = userInfo["target"] as? [String: Any],
              let type = target["type"] as? String, ["game", "group"].contains(type),
              let id = target["id"] as? String, UUID(uuidString: id) != nil else { return nil }
        let gameKinds = ["chat_message", "game_invited", "requested", "withdrawn", "approved",
                         "confirmed", "waitlisted", "rejected", "removed", "game_cancelled", "cancelled", "guest_requested",
                         "guest_approved", "guest_rejected", "guest_cancelled", "schedule_changed",
                         "game_reminder_24h", "game_reminder_3h", "waitlist_offer"]
        let groupKinds = ["discussion_post", "discussion_reply", "group_requested", "group_active",
                          "group_rejected", "group_removed", "group_archived"]
        guard (type == "game" ? gameKinds : groupKinds).contains(kind) else { return nil }
        let post = target["postId"] as? String
        if target["postId"] != nil {
            guard type == "group", let post, UUID(uuidString: post) != nil else { return nil }
        }
        self.registrationID = registrationID
        self.kind = kind
        targetType = type
        targetID = id
        postID = post
    }
}

struct NativePushOpenedView: View {
    let payload: NativePushPayload?
    let account: NativeAccountStore
    @Environment(\.scenePhase) private var phase
    @State private var summary = NativeNotificationSummary()
    @State private var submissions = NativeDiscussionSubmissionStore()
    @State private var destination: NativePushPayload?
    @State private var loading = true
    @State private var resolvedActor: String?

    var body: some View {
        NavigationStack {
            Group {
                if loading {
                    ProgressView("Opening notification…")
                } else if account.player == nil {
                    NativeAccountView(account: account)
                } else if let destination, resolvedActor == account.player?.id, phase == .active {
                    if destination.kind == "chat_message" {
                        NativeGameChatView(gameID: destination.targetID)
                    } else if ["discussion_post", "discussion_reply"].contains(destination.kind),
                              let postID = destination.postID {
                        NativeGroupDiscussionsView(groupID: destination.targetID, submissions: submissions,
                                                   groupName: nil, postID: postID)
                    } else if destination.targetType == "group" {
                        NativeGroupMembershipView(groupID: destination.targetID)
                    } else {
                        CommunityDetailView(gameID: destination.targetID, groupID: nil)
                    }
                } else {
                    NativeNotificationsView()
                }
            }
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .environment(account)
        .environment(summary)
        .task {
            await account.refresh()
            guard !Task.isCancelled else { return }
            let actor = account.player?.id
            if let actor {
                let value = await NativePushCoordinator.shared.authorizedDestination(payload, actor: actor)
                guard !Task.isCancelled, account.player?.id == actor else { loading = false; return }
                resolvedActor = actor
                destination = value
            }
            loading = false
        }
        .onChange(of: account.player?.id) { _, _ in destination = nil }
        .onChange(of: phase) { _, value in
            if value == .background { destination = nil }
        }
    }

    @Environment(\.dismiss) private var dismiss
}
