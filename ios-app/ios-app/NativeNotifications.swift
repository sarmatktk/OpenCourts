import SwiftUI
import UserNotifications

nonisolated struct NativeNotificationInbox: Decodable, Sendable {
    let notifications: [NativeInboxNotification]
}

nonisolated struct NativeInboxNotification: Decodable, Identifiable, Sendable {
    let id: String
    let kind: String
    let postId: String?
    let displayName: String?
    let gameId: String?
    let gameTitle: String?
    let groupId: String?
    let groupName: String?
    let createdAt: Double
    let readAt: Double?
    let archived: Bool?
    let reason: String?
    let guestCount: Int?
    let invitationStatus: String?
    let requestStatus: String?

    var isUnread: Bool { readAt == nil && archived != true }

    var message: LocalizedStringResource {
        switch kind {
        case "discussion_post": "posted a group update"
        case "discussion_reply": "replied to a group discussion"
        case "chat_message": "has new messages"
        case "schedule_changed": "changed the schedule"
        case "game_reminder_24h": "Your game starts in about 24 hours."
        case "game_reminder_3h": "Your game starts in about 3 hours."
        case "waitlist_offer": "a place opened in your group game"
        case "waitlisted": "moved you out of a confirmed place"
        case "confirmed": "confirmed your place in the game"
        case "game_invited": "invited you to a game"
        case "guest_requested": "requested guest places"
        case "guest_approved": "approved your guest request"
        case "guest_rejected": "declined your guest request"
        case "guest_cancelled": "cancelled guest places"
        case "group_requested": "requested group membership"
        case "group_active": "approved your group membership"
        case "group_rejected": "declined your group membership request"
        case "group_removed": "removed you from the group"
        case "group_archived": "archived the group"
        case "requested": "requested to join"
        case "withdrawn": "withdrew their request"
        case "approved": "approved your request"
        case "rejected": "declined your request"
        case "removed": "removed you from the game"
        case "game_cancelled": "cancelled the game"
        case "cancelled": "cancelled their place"
        default: "updated your activity"
        }
    }
}

@MainActor
@Observable
final class NativeNotificationSummary {
    private(set) var unreadCount: Int?
    private(set) var actorID: String?
    private var generation = UUID()
    private var pendingBadgeCount: Int?
    private var badgeUpdateTask: Task<Void, Never>?

    func clear(resetBadge: Bool = false) {
        generation = UUID()
        actorID = nil
        unreadCount = nil
        if resetBadge { updateAppIconBadge(0) }
    }

    func apply(_ notifications: [NativeInboxNotification], actor: String) {
        generation = UUID()
        actorID = actor
        unreadCount = notifications.filter(\.isUnread).count
        updateAppIconBadge(unreadCount ?? 0)
    }

    func refresh(account: NativeAccountStore) async {
        guard let actor = account.player?.id else { clear(resetBadge: true); return }
        let ticket = UUID()
        generation = ticket
        if actorID != actor {
            actorID = actor
            unreadCount = nil
            updateAppIconBadge(0)
        }
        do {
            let response: NativeNotificationInbox = try await NativeCommunityAPI.shared.request("games/notifications")
            guard generation == ticket, account.player?.id == actor, !Task.isCancelled else { return }
            apply(response.notifications, actor: actor)
        } catch {
            guard generation == ticket, account.player?.id == actor, !Task.isCancelled else { return }
            unreadCount = nil
        }
    }

    private func updateAppIconBadge(_ count: Int) {
        pendingBadgeCount = max(0, count)
        guard badgeUpdateTask == nil else { return }
        badgeUpdateTask = Task { @MainActor [weak self] in
            guard let self else { return }
            while let nextCount = self.pendingBadgeCount {
                self.pendingBadgeCount = nil
                do {
                    try await UNUserNotificationCenter.current().setBadgeCount(nextCount)
                } catch {
                    // Badge permission is controlled by iOS notification settings.
                }
            }
            self.badgeUpdateTask = nil
        }
    }
}

struct NativeInboxToolbarLabel: View {
    let count: Int?
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        AppToolbarIcon(title: "Inbox", icon: "bell")
            .symbolVariant(colorScheme == .dark && (count ?? 0) > 0 ? .fill : .none)
            .foregroundStyle(colorScheme == .dark ? Brand.lime : Brand.accent)
            .overlay(alignment: .topTrailing) {
                if let count, count > 0 {
                    Text(count > 99 ? "99+" : "\(count)")
                        .font(.caption2.bold())
                        .foregroundStyle(colorScheme == .dark ? Brand.green : .white)
                        .padding(.horizontal, 4)
                        .background(colorScheme == .dark ? Brand.lime : Brand.accent, in: Capsule())
                        .accessibilityHidden(true)
                }
            }
            .accessibilityLabel(count.map { "Inbox, \($0) unread in recent notifications" } ?? "Inbox")
    }
}

private struct NativeNotificationDestinationView: View {
    let notification: NativeInboxNotification
    @State private var submissions = NativeDiscussionSubmissionStore()

    var body: some View {
        if notification.kind == "chat_message", let gameID = notification.gameId {
            NativeGameChatView(gameID: gameID)
        } else if ["discussion_post", "discussion_reply"].contains(notification.kind),
                  let groupID = notification.groupId, let postID = notification.postId {
            NativeGroupDiscussionsView(groupID: groupID, submissions: submissions,
                                       groupName: nil, postID: postID)
        } else if let gameID = notification.gameId {
            CommunityDetailView(gameID: gameID, groupID: nil)
        } else if let groupID = notification.groupId {
            NativeGroupMembershipView(groupID: groupID)
        } else {
            ContentUnavailableView("This notification has no destination", systemImage: "bell")
        }
    }
}

struct NativeNotificationsView: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(NativeNotificationSummary.self) private var summary
    @Environment(\.scenePhase) private var phase
    @Environment(\.communityDockHeight) private var dockHeight
    @State private var notifications: [NativeInboxNotification] = []
    @State private var filter = InboxFilter.active
    @State private var loading = false
    @State private var busy = false
    @State private var confirmingReadAll = false
    @State private var pendingReadIDs: [String] = []
    @State private var error: String?
    @State private var generation = UUID()
    @State private var showingSettings = false
    @State private var showingNotificationDestination = false
    @State private var selectedNotification: NativeInboxNotification?

    private enum InboxFilter: String, CaseIterable {
        case active = "Active", unread = "Unread", history = "History"
    }

    private var visibleNotifications: [NativeInboxNotification] {
        notifications.filter {
            switch filter {
            case .active: $0.archived != true
            case .unread: $0.isUnread
            case .history: $0.archived == true
            }
        }
    }

    private var unreadUpdateIDs: [String] {
        notifications.filter { $0.isUnread && $0.kind != "chat_message" }.map(\.id)
    }

    var body: some View {
        List {
            Section {
                HStack(spacing: 12) {
                    Button {
                        showingSettings = true
                    } label: {
                        Label("Settings", systemImage: "slider.horizontal.3")
                            .font(.subheadline.weight(.medium))
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Opens notification settings")
                    Spacer(minLength: 4)
                    Menu {
                        Picker("Show notifications", selection: $filter) {
                            ForEach(InboxFilter.allCases, id: \.self) { value in
                                Text(value.rawValue).tag(value)
                            }
                        }
                    } label: {
                        Label(filter.rawValue, systemImage: "line.3.horizontal.decrease")
                            .font(.subheadline.weight(.medium))
                            .foregroundStyle(Brand.accent)
                    }
                    .accessibilityLabel("Show notifications")
                    .accessibilityValue(filter.rawValue)
                }
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 12) {
                        Text("\(notifications.filter(\.isUnread).count) unread")
                            .font(.footnote).foregroundStyle(.secondary)
                        Spacer(minLength: 4)
                        Button("Mark all read") {
                            pendingReadIDs = unreadUpdateIDs
                            confirmingReadAll = true
                        }
                        .font(.subheadline.weight(.medium))
                        .disabled(unreadUpdateIDs.isEmpty || busy || loading)
                        .accessibilityLabel("Mark all updates as read")
                    }
                    .frame(minHeight: 44)
                    Text("Bulk read applies to updates only. Chats clear when opened.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            if loading && notifications.isEmpty {
                ProgressView("Loading notifications…")
            }
            if let error {
                Section {
                    Text(error).foregroundStyle(.red)
                    Button("Refresh inbox") { Task { await load() } }
                        .disabled(loading || busy)
                }
            }
            if !loading && error == nil && visibleNotifications.isEmpty {
                ContentUnavailableView("No notifications", systemImage: "bell",
                                       description: Text("Updates for this filter will appear here."))
            }
            ForEach(visibleNotifications) { notification in
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        NativeNotificationRow(notification: notification)
                        Divider()
                        HStack(spacing: 12) {
                            if notification.gameId != nil || notification.groupId != nil {
                                Button {
                                    // Detail fetches current server-authorized content; cached inbox data grants no access.
                                    selectedNotification = notification
                                    showingNotificationDestination = true
                                } label: {
                                    Label(notification.kind == "chat_message" ? "Open chat" : notification.postId != nil ? "Open discussion" : notification.groupId == nil ? "Open game" : "Open group",
                                          systemImage: notification.groupId == nil ? "calendar" : "person.2")
                                }
                                .buttonStyle(.plain)
                                .accessibilityHint("Opens the latest group or game details")
                            }
                            Spacer(minLength: 0)
                            if notification.isUnread && notification.kind != "chat_message" {
                                Button("Mark read") { Task { await markRead(notification.id) } }
                                    .font(.subheadline.weight(.medium))
                                    .disabled(busy || loading)
                                    .accessibilityLabel("Mark as read")
                            }
                        }
                        .frame(minHeight: 44)
                        if notification.kind == "chat_message" {
                            Text("Chat messages clear as you view them.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                }
            }
            Section {
                Text("Open a game or group to check its current status and available actions. Invitations and notifications do not reserve places.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .alert("Mark loaded updates as read?", isPresented: $confirmingReadAll) {
            Button("Mark updates as read") {
                let ids = pendingReadIDs
                Task { await markUpdatesRead(ids) }
            }
            Button("Cancel", role: .cancel) { pendingReadIDs = [] }
        } message: {
            Text("Unread non-chat updates in your latest 100 will be marked as read. New updates are excluded.")
        }
        .navigationDestination(isPresented: $showingSettings) {
            NativeNotificationSettingsView()
        }
        .navigationDestination(isPresented: $showingNotificationDestination) {
            if let selectedNotification {
                NativeNotificationDestinationView(notification: selectedNotification)
            }
        }
        .contentMargins(.top, 0, for: .scrollContent)
        .contentMargins(.bottom, dockHeight, for: .scrollContent)
        .listSectionSpacing(.compact)
        .navigationTitle("Inbox")
        .navigationBarTitleDisplayMode(.inline)
        .refreshable { if !busy { await load() } }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button("Refresh", systemImage: "arrow.clockwise") {
                    Task { await load() }
                }
                .disabled(loading || busy)
            }
        }
        .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") {
            clear()
            guard account.player != nil, phase == .active else { return }
            await load()
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
                if !busy && !confirmingReadAll { await load() }
            }
        }
        .onChange(of: account.player?.id) { _, _ in
            showingSettings = false
            showingNotificationDestination = false
            selectedNotification = nil
            clear()
        }
        .onChange(of: phase) { _, value in if value != .active { clear() } }
        .onDisappear { clear() }
    }

    @MainActor private func clear() {
        generation = UUID()
        notifications = []
        error = nil
        loading = false
        busy = false
        confirmingReadAll = false
        pendingReadIDs = []
        // Keep navigation state intact when this view disappears to show a pushed destination.
    }

    @MainActor private func load() async {
        let token = UUID()
        generation = token
        guard phase == .active else { clear(); return }
        error = nil
        loading = true
        defer { if generation == token { loading = false } }

        guard let actor = account.player?.id else { clear(); return }
        do {
            let response: NativeNotificationInbox = try await NativeCommunityAPI.shared.request("games/notifications")
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            var seen = Set<String>()
            notifications = response.notifications.filter { seen.insert($0.id).inserted }
            summary.apply(notifications, actor: actor)
            error = nil
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            notifications = []
            summary.clear()
            self.error = error.localizedDescription
        }
    }

    @MainActor private func markRead(_ id: String) async {
        guard !busy, let actor = account.player?.id, phase == .active else { return }
        let token = generation
        busy = true
        defer { if generation == token { busy = false } }
        do {
            let body = try JSONEncoder().encode(ReadRequest(id: id))
            let result: ReadResponse = try await NativeCommunityAPI.shared.request(
                "games/notifications/read", method: "POST", body: body)
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            guard result.ok else { throw CommunityError.invalidResponse }
            busy = false
            await load()
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            self.error = "Read status could not be confirmed. Refresh the inbox before trying again."
        }
    }

    @MainActor private func markUpdatesRead(_ ids: [String]) async {
        guard !busy, !ids.isEmpty, let actor = account.player?.id, phase == .active else { return }
        let token = generation
        busy = true
        var confirmed = 0
        do {
            // There is no atomic read-all API. Apply only this explicit snapshot and stop on uncertainty.
            for id in ids {
                guard generation == token, account.player?.id == actor, phase == .active,
                      !Task.isCancelled else { return }
                let result: ReadResponse = try await NativeCommunityAPI.shared.request(
                    "games/notifications/read", method: "POST",
                    body: try JSONEncoder().encode(ReadRequest(id: id)))
                guard result.ok else { throw CommunityError.invalidResponse }
                confirmed += 1
            }
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            busy = false
            await load()
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            busy = false
            notifications = []
            summary.clear()
            self.error = "\(confirmed) updates confirmed read. The remaining read status could not be confirmed. Refresh before trying again."
        }
    }

    nonisolated private struct ReadRequest: Encodable { let id: String }
    nonisolated private struct ReadResponse: Decodable, Sendable { let ok: Bool }
}

private struct NativeNotificationRow: View {
    let notification: NativeInboxNotification
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(alignment: .firstTextBaseline, spacing: 7) {
                if notification.isUnread {
                    Circle()
                        .fill(Brand.accent)
                        .frame(width: 8, height: 8)
                        .accessibilityHidden(true)
                }
                if let name = notification.displayName {
                    Text(name).font(.headline)
                }
                Spacer(minLength: 4)
                Text(Date(timeIntervalSince1970: notification.createdAt / 1000),
                     format: .dateTime.month(.abbreviated).day().hour().minute())
                    .font(.caption).foregroundStyle(.secondary)
                    .fixedSize(horizontal: true, vertical: false)
            }
            Text(notification.message)
                .font(.body)
            if notification.kind == "chat_message" && notification.isUnread {
                Text("NEW CHAT MESSAGE")
                    .font(.caption2.weight(.bold))
                    .foregroundStyle(colorScheme == .dark ? Color.black : Color.white)
                    .padding(.horizontal, 9)
                    .padding(.vertical, 5)
                    .background(Brand.accent, in: Capsule())
            }
            if let title = notification.groupName ?? notification.gameTitle {
                Text(title).font(.subheadline.weight(.semibold))
            }
            if let count = notification.guestCount { Text("\(count) guest places").font(.footnote) }
            if let reason = notification.reason, !reason.isEmpty {
                Text("Reason: \(reason)").font(.footnote)
            }
            if notification.kind == "game_invited" {
                Text("Open the game to review your invitation and current participation.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 0)
        .accessibilityElement(children: .combine)
        .accessibilityValue(notification.isUnread ? "Unread" : "Read")
    }
}
