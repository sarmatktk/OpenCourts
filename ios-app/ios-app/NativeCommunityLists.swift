import SwiftUI

@MainActor @Observable final class NativePagedStore<Item: Identifiable & Sendable> where Item.ID: Hashable {
    var items: [Item] = []
    var next: String?
    var loading = false
    var error: String?
    private var generation = UUID()
    func clear() { generation = UUID(); items = []; next = nil; loading = false; error = nil }
    // Retain NavigationLink source rows while a destination covers the list.
    func suspend() { generation = UUID(); loading = false }
    func load(more: Bool = false, fetch: (String?) async throws -> ([Item], String?)) async {
        if more && loading { return }
        let cursor = more ? next : nil
        if !more { clear() }
        let token = UUID(); generation = token; loading = true; error = nil
        defer { if generation == token { loading = false } }
        do {
            let (results, cursor) = try await fetch(cursor)
            guard generation == token, !Task.isCancelled else { return }
            var ids = Set(items.map(\.id)); items += results.filter { ids.insert($0.id).inserted }; next = cursor
        } catch {
            guard generation == token, !Task.isCancelled else { return }
            // Access failures must remove private content, including earlier pages.
            items = []; next = nil; self.error = error.localizedDescription
        }
    }
}

private struct NativeCommunityIntro: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.title2.weight(.semibold))
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(.vertical, 2)
        .accessibilityElement(children: .combine)
    }
}

private struct NativeListStatus<Item: Identifiable & Sendable>: View where Item.ID: Hashable {
    let store: NativePagedStore<Item>
    let retry: () -> Void
    let more: () -> Void
    var body: some View {
        if store.loading { ProgressView("Loading…") }
        if let error = store.error {
            Text(error).foregroundStyle(.secondary)
            Button("Try again", action: retry).frame(minHeight: 44)
        } else if !store.loading && store.items.isEmpty { Text("No results yet.").foregroundStyle(.secondary) }
        if store.next != nil { Button("Load more", action: more).disabled(store.loading).frame(minHeight: 44) }
    }
}

struct NativeMyGroupsView: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.communityDockHeight) private var communityDockHeight
    @Environment(\.scenePhase) private var phase
    @State private var store = NativePagedStore<CommunityGroup>()
    @State private var reload = UUID()
    var body: some View {
        List {
            ForEach(store.items) { group in
                NavigationLink { NativeGroupMembershipView(groupID: group.id) } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(group.name).font(.headline)
                        AppLocationLabel(title: group.generalLocation)
                        HStack(spacing: 6) {
                            ForEach(Array([group.membershipStatus, group.role, group.status].compactMap { $0 }.enumerated()), id: \.offset) { item in
                                NativeGroupMetadataChip(title: item.element.capitalized)
                            }
                        }
                    }.padding(.vertical, 4)
                }
            }
            NativeListStatus(store: store, retry: { reload = UUID() }, more: {})
        }
        .contentMargins(.bottom, communityDockHeight, for: .scrollContent)
        .navigationTitle("My Groups")
        .task(id: "\(reload)-\(account.player?.id ?? "signed-out")") { await load() }
        .onChange(of: account.player?.id) { _, _ in store.clear() }
        .refreshable { await load() }
        .onDisappear { store.suspend() }
        .onChange(of: phase) { _, value in store.clear(); if value == .active { reload = UUID() } }
    }
    @MainActor private func load() async {
        await store.load { _ in
            let page: CommunityGroupPage = try await NativeCommunityAPI.shared.request("groups/mine")
            return (page.groups, nil)
        }
    }
}

nonisolated struct NativeGroupDetail: Decodable, Sendable {
    struct Membership: Decodable, Sendable { let status: String; let role: String? }
    struct Content: Decodable, Sendable { let description: String; let skillPreference: String; let version: Int }
    let group: CommunityGroup
    let membership: Membership?
    let content: Content?
    let discussionCount: Int?
    let archived: Bool

    var canHostGroupGame: Bool {
        !archived && content != nil && membership?.status == "active" &&
            ["owner", "coowner", "organizer"].contains(membership?.role ?? "")
    }

    var canArchive: Bool {
        !archived && content != nil && membership?.status == "active" && membership?.role == "owner"
    }

    var canEditMetadata: Bool {
        !archived && content != nil && membership?.status == "active" &&
            ["owner", "coowner", "admin"].contains(membership?.role ?? "")
    }

    // Presentation hint only; request listing and decisions remain server-authorized.
    var canReviewMembershipRequests: Bool {
        !archived && content != nil && membership?.status == "active" &&
            ["owner", "coowner", "organizer", "admin"].contains(membership?.role ?? "")
    }
}

enum NativeGroupCategoryPalette {
    static func color(for title: String, colorScheme: ColorScheme) -> Color {
        switch title.lowercased() {
        case "private":
            return colorScheme == .dark ? Color(red: 0.66, green: 0.62, blue: 1.0) : Color(red: 0.31, green: 0.27, blue: 0.72)
        case "public":
            return colorScheme == .dark ? Color(red: 0.46, green: 0.84, blue: 0.91) : Color(red: 0.02, green: 0.43, blue: 0.52)
        case "active":
            return colorScheme == .dark ? Brand.lime : Brand.accent
        case "owner", "group owner":
            return colorScheme == .dark
                ? Color(red: 0.83, green: 0.70, blue: 1.0)
                : Color(red: 0.43, green: 0.25, blue: 0.70)
        case "coowner", "co-owner":
            return colorScheme == .dark ? Color(red: 0.50, green: 0.75, blue: 1.0) : Color(red: 0.13, green: 0.39, blue: 0.72)
        case "organizer":
            return colorScheme == .dark ? Color(red: 0.38, green: 0.86, blue: 0.80) : Color(red: 0.02, green: 0.48, blue: 0.43)
        case "host":
            return colorScheme == .dark ? Color(red: 1.0, green: 0.70, blue: 0.38) : Color(red: 0.69, green: 0.31, blue: 0.04)
        case "group host":
            return colorScheme == .dark ? Color(red: 0.46, green: 0.84, blue: 0.91) : Color(red: 0.02, green: 0.43, blue: 0.52)
        case "admin", "legacy admin":
            return colorScheme == .dark ? Color(red: 1.0, green: 0.75, blue: 0.40) : Color(red: 0.67, green: 0.36, blue: 0.02)
        case "member", "series member":
            return colorScheme == .dark ? Color(red: 0.75, green: 0.77, blue: 0.80) : Color(red: 0.35, green: 0.37, blue: 0.40)
        case "confirmed player", "invited player", "player":
            return colorScheme == .dark ? Color(red: 0.46, green: 0.84, blue: 0.91) : Color(red: 0.02, green: 0.43, blue: 0.52)
        case "pending":
            return colorScheme == .dark
                ? Color(red: 0.50, green: 0.75, blue: 1.0)
                : Color(red: 0.13, green: 0.39, blue: 0.72)
        case "archived":
            return .secondary
        default:
            return Brand.accent
        }
    }
}

struct NativeGroupMetadataChip: View {
    let title: String
    @Environment(\.colorScheme) private var colorScheme

    private var tint: Color { NativeGroupCategoryPalette.color(for: title, colorScheme: colorScheme) }

    var body: some View {
        Text(title)
            .font(.caption.weight(.medium))
            .foregroundStyle(tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 5)
            .background(tint.opacity(colorScheme == .dark ? 0.17 : 0.10), in: Capsule())
    }
}

struct NativeGroupMembershipView: View {
    let groupID: String
    @Environment(\.communityDockHeight) private var communityDockHeight
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.colorScheme) private var colorScheme
    @State private var detail: NativeGroupDetail?
    @State private var error: String?
    @State private var reload = UUID()
    @State private var generation = UUID()
    @State private var busy = false
    @State private var pendingGroupAction: String?
    @Environment(\.communityPlace) private var communityPlace
    @State private var creatingGame = false
    @State private var editingGroup = false
    @State private var groupSection: NativeGroupSection = .details
    @State private var discussionCount: Int?
    @State private var unreadDiscussionNotificationIDs: [String] = []
    @State private var hasDiscussionAccess = false
    @State private var discussionSubmissions = NativeDiscussionSubmissionStore()
    private var showsMemberSections: Bool {
        hasDiscussionAccess && account.player != nil && phase == .active
    }
    var body: some View {
        VStack(spacing: 0) {
            if showsMemberSections {
                NativeGroupSectionPicker(selection: $groupSection, count: discussionCount,
                                         hasUnreadPosts: !unreadDiscussionNotificationIDs.isEmpty,
                                         openDiscussions: { Task { await markDiscussionAnnouncementsRead() } })
            }
            if groupSection == .discussions && showsMemberSections {
                NativeGroupDiscussionsView(groupID: groupID, submissions: discussionSubmissions, groupName: detail?.group.name, countChanged: { discussionCount = $0 }, accessRevoked: {
                    generation = UUID(); detail = nil; discussionCount = nil; unreadDiscussionNotificationIDs = []; hasDiscussionAccess = false
                    groupSection = .details; reload = UUID()
                })
            } else {
                List {
                    if let detail {
                        Section {
                            VStack(alignment: .leading, spacing: 10) {
                                if !detail.archived { NativePublicGroupCover(groupID: groupID) }
                                AppLocationLabel(title: detail.group.generalLocation)
                                if !detail.group.publicDescription.isEmpty {
                                    Text(detail.group.publicDescription)
                                        .font(.subheadline).foregroundStyle(.secondary)
                                }
                                if let content = detail.content, !detail.archived {
                                    HStack {
                                        Label("Skill", systemImage: "figure.tennis")
                                            .foregroundStyle(.secondary)
                                        Spacer()
                                        Text(content.skillPreference.capitalized)
                                    }
                                    .font(.subheadline)
                                }
                                ViewThatFits(in: .horizontal) {
                                    HStack(spacing: 8) {
                                        Text(detail.group.name)
                                            .font(.headline)
                                            .lineLimit(1)
                                            .minimumScaleFactor(0.85)
                                        Spacer(minLength: 4)
                                        HStack(spacing: 6) {
                                            NativeGroupMetadataChip(title: detail.archived ? "Archived" : detail.group.visibility.capitalized)
                                            if let membership = detail.membership {
                                                NativeGroupMetadataChip(title: membership.status.capitalized)
                                                if let role = membership.role { NativeGroupMetadataChip(title: role.capitalized) }
                                            }
                                        }
                                        .fixedSize(horizontal: true, vertical: false)
                                    }
                                    VStack(alignment: .leading, spacing: 8) {
                                        Text(detail.group.name).font(.headline)
                                        HStack(spacing: 6) {
                                            NativeGroupMetadataChip(title: detail.archived ? "Archived" : detail.group.visibility.capitalized)
                                            if let membership = detail.membership {
                                                NativeGroupMetadataChip(title: membership.status.capitalized)
                                                if let role = membership.role { NativeGroupMetadataChip(title: role.capitalized) }
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(.vertical, 4)
                            .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                        }
                        if let content = detail.content, !detail.archived {
                            Section("Member details") {
                                if detail.canHostGroupGame, communityPlace != nil {
                                    Button {
                                        creatingGame = true
                                    } label: {
                                        Label("Create group game", systemImage: "calendar.badge.plus")
                                            .frame(maxWidth: .infinity, minHeight: 44)
                                    }
                                    .buttonStyle(AppPrimaryButtonStyle())
                                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                }
                                NavigationLink {
                                    NativeGroupMembersView(groupID: groupID)
                                } label: {
                                    Label("Group members", systemImage: "person.2")
                                }
                                .frame(minHeight: 44)
                                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                if detail.canReviewMembershipRequests {
                                    NavigationLink {
                                        NativeGroupRequestsView(groupID: groupID)
                                    } label: {
                                        Label("Membership requests", systemImage: "person.badge.clock")
                                    }
                                    .frame(minHeight: 44)
                                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                }
                                if detail.canManageInvitations {
                                    NavigationLink {
                                        NativeGroupInvitationsView(groupID: groupID)
                                    } label: {
                                        Label("Group invitations", systemImage: "link")
                                    }
                                    .frame(minHeight: 44)
                                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                }
                                if detail.canManageCover {
                                    NavigationLink {
                                        NativeGroupCoverView(groupID: groupID)
                                    } label: {
                                        Label("Manage cover photo", systemImage: "photo")
                                    }
                                    .frame(minHeight: 44)
                                    .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                }
                                if detail.canEditMetadata {
                                    Button("Edit group", systemImage: "pencil") { editingGroup = true }
                                        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                                        .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                                }
                                if !content.description.isEmpty {
                                    Text(content.description)
                                        .font(.subheadline).foregroundStyle(.secondary)
                                }
                            }
                        }
                        if detail.archived {
                            Section {
                                Label("This group is archived", systemImage: "archivebox")
                                    .font(.headline)
                                Text("The group is closed to new memberships. Member lists, private details and group games are no longer available.")
                                    .font(.footnote).foregroundStyle(.secondary)
                            }
                        }
                        if !detail.archived {
                            Section {
                                if detail.membership?.status == "active" || detail.membership?.status == "pending" {
                                    if detail.membership?.role != "owner" {
                                        Button(detail.membership?.status == "pending" ? "Withdraw membership request" : "Leave group", role: .destructive) { pendingGroupAction = "leave" }
                                    }
                                } else { Button("Request membership") { Task { await act("request") } } }
                                if detail.membership?.status == "pending" {
                                    NativeNotificationOptInNudge(reason: .groupRequest)
                                }
                            }.disabled(busy)
                        }
                        if detail.content != nil, !detail.archived, detail.membership?.status == "active" {
                            NativeGroupUpcomingGamesSection(groupID: groupID)
                        }
                    } else if error == nil { ProgressView("Loading group…") }
                    if let error { Text(error); Button("Try again") { reload = UUID() } }
                }
                // Nested navigation does not reliably carry the outer TabView dock inset into this List.
                .contentMargins(.bottom, communityDockHeight, for: .scrollContent)
                .contentMargins(.top, 8, for: .scrollContent)
                .listSectionSpacing(.compact)
            }
        }
        .disabled(busy)
        .navigationTitle(detail?.group.name ?? "Group")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $creatingGame, onDismiss: { reload = UUID() }) {
            if let communityPlace {
                NativeCreateGameView(place: communityPlace, account: account, groupID: groupID) { reload = UUID() }
                    .environment(account)
            }
        }
        .sheet(isPresented: $editingGroup, onDismiss: { reload = UUID() }) {
            NativeGroupEditor(groupID: groupID) { _ in }.environment(account)
        }
        .task(id: "\(reload)-\(account.player?.id ?? "signed-out")-\(phase)") { await load() }
        .refreshable { await load() }
        .onDisappear { generation = UUID() }
        .onChange(of: phase) { _, value in
            generation = UUID(); detail = nil; discussionCount = nil; unreadDiscussionNotificationIDs = []; hasDiscussionAccess = false; pendingGroupAction = nil; editingGroup = false
            if value == .active { reload = UUID() }
        }
        .onChange(of: account.player?.id) { _, _ in
            discussionSubmissions.pending = nil
            generation = UUID(); detail = nil; discussionCount = nil; unreadDiscussionNotificationIDs = []; hasDiscussionAccess = false; pendingGroupAction = nil; editingGroup = false
        }
        .alert(detail?.membership?.status == "pending" ? "Withdraw membership request?" : "Leave this group?",
            isPresented: Binding(get: { pendingGroupAction != nil }, set: { if !$0 { pendingGroupAction = nil } })) {
            Button(detail?.membership?.status == "pending" ? "Withdraw request" : "Leave group",
                role: .destructive) {
                    let action = pendingGroupAction ?? "leave"
                    Task { await act(action) }
                }
            Button("Cancel", role: .cancel) {
                pendingGroupAction = nil
            }
        } message: {
            if detail?.membership?.status == "pending" {
                Text("Your request will be withdrawn. You can request to join again later.")
            } else {
                Text("You will lose access to member content and group games. You can request to join again later.")
            }
        }
    }
    @MainActor private func load() async {
        let token = UUID(); generation = token; detail = nil; discussionCount = nil; unreadDiscussionNotificationIDs = []; error = nil; pendingGroupAction = nil
        guard let actor = account.player?.id, phase == .active else { return }
        do {
            let response: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }; detail = response; discussionCount = response.discussionCount
            hasDiscussionAccess = !response.archived && response.content != nil && response.membership?.status == "active"
            if hasDiscussionAccess { await loadUnreadDiscussionAnnouncements(actor: actor, generation: token) }
        } catch { if generation == token && account.player?.id == actor && phase == .active && !Task.isCancelled { hasDiscussionAccess = false; self.error = error.localizedDescription } }
    }
    @MainActor private func loadUnreadDiscussionAnnouncements(actor: String, generation token: UUID) async {
        do {
            let response: NativeNotificationInbox = try await NativeCommunityAPI.shared.request("games/notifications")
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            unreadDiscussionNotificationIDs = response.notifications
                .filter { $0.kind == "discussion_post" && $0.groupId == groupID && $0.isUnread }
                .map(\.id)
        } catch {
            // The group details and discussion feed remain usable if inbox status is unavailable.
        }
    }
    @MainActor private func markDiscussionAnnouncementsRead() async {
        guard !unreadDiscussionNotificationIDs.isEmpty, let actor = account.player?.id, phase == .active else { return }
        let token = generation
        for id in unreadDiscussionNotificationIDs {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            do {
                let body = try JSONEncoder().encode(DiscussionReadRequest(id: id))
                let result: DiscussionReadResponse = try await NativeCommunityAPI.shared.request(
                    "games/notifications/read", method: "POST", body: body)
                guard result.ok, generation == token else { return }
                unreadDiscussionNotificationIDs.removeAll { $0 == id }
            } catch { return }
        }
    }
    nonisolated private struct DiscussionReadRequest: Encodable, Sendable { let id: String }
    nonisolated private struct DiscussionReadResponse: Decodable, Sendable { let ok: Bool }
    @MainActor private func act(_ action: String) async {
        guard !busy, let actor = account.player?.id, phase == .active, detail != nil else { return }
        let token = generation
        // Fail closed before a destructive request; a lost response must not restore private content.
        detail = nil; discussionCount = nil; hasDiscussionAccess = false; pendingGroupAction = nil; editingGroup = false
        busy = true; defer { busy = false }
        do {
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("groups/\(groupID)/\(action)", method: "POST", body: Data("{}".utf8))
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            await load()
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            detail = nil; self.error = error.localizedDescription
        }
    }
}

private struct NativeGroupUpcomingGamesSection: View {
    let groupID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var games: [CommunityGame] = []
    @State private var nextCursor: String?
    @State private var loading = false
    @State private var error: String?
    @State private var generation = UUID()
    @State private var reload = UUID()
    @State private var selectedGameID: String?
    @State private var showingGameDetail = false
    @State private var selectedSeriesChatGameID: String?
    @State private var showingSeriesChat = false
    @State private var seriesUnreadCounts: [String: Int] = [:]
    @State private var authorizedSeriesChats: Set<String> = []

    private var upcomingGames: [CommunityGame] {
        let now = Date()
        return games.filter { $0.startDate.map { $0 > now } ?? false }
    }

    private var seriesChats: [(seriesID: String, gameID: String, title: String, dateLabel: String)] {
        var seen = Set<String>()
        return games.compactMap { game in
            guard let seriesID = game.seriesId, !seriesID.isEmpty, seen.insert(seriesID).inserted else { return nil }
            return (seriesID: seriesID, gameID: game.id, title: game.title, dateLabel: game.dateLabel)
        }
    }

    var body: some View {
        Group {
            let visibleSeriesChats = seriesChats.filter { authorizedSeriesChats.contains($0.seriesID) }
            if !visibleSeriesChats.isEmpty {
                Section("Series chat") {
                    ForEach(visibleSeriesChats, id: \.seriesID) { chat in
                        let unread = seriesUnreadCounts[chat.seriesID] ?? 0
                        let unreadMessageLabel = unread == 1 ? "1 new message" : "\(unread) new messages"
                        Button {
                            selectedSeriesChatGameID = chat.gameID
                            showingSeriesChat = true
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: unread > 0 ? "bubble.left.and.bubble.right.fill" : "bubble.left.and.bubble.right")
                                    .foregroundStyle(Brand.accent)
                                    .overlay(alignment: .topTrailing) {
                                        if unread > 0 {
                                            Circle()
                                                .fill(Color.red)
                                                .frame(width: 9, height: 9)
                                                .overlay(Circle().stroke(Color(uiColor: .systemBackground), lineWidth: 1.5))
                                                .offset(x: 3, y: -3)
                                        }
                                    }
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(visibleSeriesChats.count == 1 ? "Series chat" : chat.title)
                                        .font(.body.weight(unread > 0 ? .semibold : .regular))
                                    Text(visibleSeriesChats.count == 1 ? chat.title : "Series chat · \(chat.dateLabel)")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                Spacer()
                                if unread > 0 {
                                    NativeUnreadChatBadge(message: unreadMessageLabel)
                                }
                            }
                            .frame(minHeight: 44)
                            .contentShape(Rectangle())
                            .accessibilityLabel(unread > 0
                                ? "Series chat, \(unread) unread \(unread == 1 ? "message" : "messages")"
                                : "Series chat, \(chat.title)")
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            Section("Upcoming group games") {
                ForEach(upcomingGames) { game in
                    Button {
                        selectedGameID = game.id
                        showingGameDetail = true
                    } label: {
                        CommunityGameRow(game: game)
                    }
                    .buttonStyle(.plain)
                }
                if loading && games.isEmpty {
                    ProgressView("Loading group games…")
                } else if let error {
                    Text(error).font(.footnote).foregroundStyle(.secondary)
                    Button("Try again") { reload = UUID() }
                } else if upcomingGames.isEmpty && nextCursor == nil {
                    Text("No upcoming group games.").foregroundStyle(.secondary)
                }
                if nextCursor != nil {
                    Button("Load more games") { Task { await load(more: true) } }
                        .disabled(loading)
                }
            }
        }
        .navigationDestination(isPresented: $showingGameDetail) {
            if let selectedGameID {
                CommunityDetailView(gameID: selectedGameID, groupID: nil)
            }
        }
        .navigationDestination(isPresented: $showingSeriesChat) {
            if let selectedSeriesChatGameID {
                NativeGameChatView(gameID: selectedSeriesChatGameID)
            }
        }
        .onChange(of: showingSeriesChat) { wasPresented, isPresented in
            if wasPresented && !isPresented {
                Task { await refreshSeriesUnreadCountsAfterChat() }
            }
        }
        .task(id: "\(groupID)-\(reload)-\(account.player?.id ?? "signed-out")-\(phase)") {
            await load()
        }
        .onDisappear {
            // Invalidate any request that finishes after this section leaves the
            // screen, and release the loading gate so a later appearance can retry.
            generation = UUID()
            loading = false
        }
        .onChange(of: phase) { _, value in
            generation = UUID()
            games = []; nextCursor = nil; loading = false; error = nil
            authorizedSeriesChats = []; seriesUnreadCounts = [:]
            if value == .active { reload = UUID() }
        }
        .onChange(of: account.player?.id) { _, _ in
            generation = UUID(); games = []; nextCursor = nil; loading = false; error = nil
            authorizedSeriesChats = []; seriesUnreadCounts = [:]
        }
        .refreshable { await load() }
    }

    @MainActor private func load(more: Bool = false) async {
        if loading { return }
        let actor = account.player?.id
        guard let actor, phase == .active else { return }
        let previous = more ? games : []
        let cursor = more ? nextCursor : nil
        let token = UUID()
        generation = token
        games = previous
        loading = true
        error = nil
        defer { if generation == token { loading = false } }
        do {
            // The authenticated feed endpoint enforces active group membership itself.
            // Avoid extra sequential group-detail requests that delayed the first cards.
            let page = try await CommunityAPI.shared.feed(groupID: groupID, cursor: cursor)
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            var ids = Set(previous.map(\.id))
            games = previous + page.games.filter { ids.insert($0.id).inserted }
            nextCursor = page.nextCursor
            if !more { seriesUnreadCounts = [:]; authorizedSeriesChats = [] }
            Task { await refreshSeriesUnreadCounts(actor: actor, token: token) }
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            games = []; nextCursor = nil
            self.error = (error as? CommunityError)?.localizedDescription ?? error.localizedDescription
        }
    }

    @MainActor private func refreshSeriesUnreadCounts(actor: String, token: UUID) async {
        for chat in seriesChats {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            do {
                let response: NativeChatPage = try await NativeCommunityAPI.shared.request("games/\(chat.gameID)/chat")
                let page = try response.validated(for: actor)
                guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
                guard page.available, page.expired != true, page.series == true else { continue }
                authorizedSeriesChats.insert(chat.seriesID)
                seriesUnreadCounts[chat.seriesID] = max(0, page.unread ?? 0)
            } catch {
                // Keep the group page usable if chat metadata cannot be loaded.
            }
        }
    }

    @MainActor private func refreshSeriesUnreadCountsAfterChat() async {
        guard let actor = account.player?.id, phase == .active else { return }
        let token = UUID()
        generation = token
        await refreshSeriesUnreadCounts(actor: actor, token: token)
    }
}

private struct NativeUnreadChatBadge: View {
    let message: String
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Text(message)
            .font(.caption2.weight(.bold))
            .foregroundStyle(colorScheme == .dark ? Color.black : Color.white)
            .padding(.horizontal, 9)
            .padding(.vertical, 5)
            .background(Brand.accent, in: Capsule())
    }
}

nonisolated struct NativeScheduledGame: Decodable, Identifiable, Sendable {
    let id: String
    let title: String
    let starts_at: Double
    let time_zone: String
    let court_name: String
    let status: String
    let request_status: String?
    let isOrganizer: Bool
    let section: String?
    let left_game: Int?
    let withdrew: Int?
    let waitlistStatus: String?
    let offerExpiresAt: Double?
    let position: Int?
    var dateLabel: String {
        let f = DateFormatter(); f.timeZone = TimeZone(identifier: time_zone) ?? TimeZone(secondsFromGMT: 0)
        f.dateStyle = .medium; f.timeStyle = .short
        return f.string(from: Date(timeIntervalSince1970: starts_at / 1000))
    }
}

private struct NativeScheduledGameStatus: View {
    let game: NativeScheduledGame
    @Environment(\.colorScheme) private var colorScheme

    private var title: String {
        if game.status == "cancelled" { return "Cancelled" }
        if game.request_status == "removed" { return "Removed" }
        if game.request_status == "rejected" { return "Request declined" }
        if game.request_status == "pending" {
            return game.section == "cancelled" ? "Request expired" : "Awaiting approval"
        }
        if game.left_game == 1 { return "You left this game" }
        if game.withdrew == 1 { return "Request withdrawn" }
        if game.isOrganizer { return "Organizing" }
        if let waitlistStatus = game.waitlistStatus, !waitlistStatus.isEmpty {
            return waitlistStatus == "offered" ? "Place offered" : "Waitlisted"
        }
        return "Going"
    }

    private var tint: Color {
        switch title {
        case "Cancelled", "Removed", "Request declined":
            return colorScheme == .dark ? Color(red: 1, green: 0.42, blue: 0.38) : Color(red: 0.68, green: 0.10, blue: 0.09)
        case "Organizing", "Going":
            return colorScheme == .dark ? Brand.lime : Brand.accent
        case "Awaiting approval":
            return colorScheme == .dark ? Color(red: 0.50, green: 0.75, blue: 1.0) : Color(red: 0.13, green: 0.39, blue: 0.72)
        case "Request expired":
            return colorScheme == .dark ? Color(red: 0.68, green: 0.68, blue: 0.72) : Color(red: 0.38, green: 0.38, blue: 0.42)
        case "You left this game":
            return colorScheme == .dark ? Color(red: 1.0, green: 0.68, blue: 0.35) : Color(red: 0.64, green: 0.32, blue: 0.04)
        case "Request withdrawn":
            return colorScheme == .dark ? Color(red: 0.78, green: 0.66, blue: 1.0) : Color(red: 0.40, green: 0.24, blue: 0.68)
        case "Waitlisted":
            return colorScheme == .dark ? Color(red: 0.78, green: 0.66, blue: 1.0) : Color(red: 0.40, green: 0.24, blue: 0.68)
        case "Place offered":
            return colorScheme == .dark ? Color(red: 0.46, green: 0.84, blue: 0.91) : Color(red: 0.02, green: 0.43, blue: 0.52)
        default:
            return .secondary
        }
    }

    var body: some View {
        Text(title)
            .font(.caption.weight(.semibold))
            .foregroundStyle(tint)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(tint.opacity(colorScheme == .dark ? 0.17 : 0.10), in: Capsule())
    }
}
nonisolated private struct NativeSchedulePage: Decodable, Sendable { let games: [NativeScheduledGame]; let nextCursor: String? }

struct NativeMyGamesView: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.communityDockHeight) private var communityDockHeight
    @Environment(\.scenePhase) private var phase
    @State private var store = NativePagedStore<NativeScheduledGame>()
    @State private var view = "upcoming"
    @State private var reload = UUID()
    @State private var busy = false
    @State private var notice: String?
    var body: some View {
        List {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(["upcoming", "requests", "waitlisted", "past", "cancelled"], id: \.self) { option in
                        Button {
                            view = option
                        } label: {
                            Text(option == "cancelled" ? "History" : option.capitalized)
                                .font(.subheadline.weight(.semibold))
                                .lineLimit(1)
                                .fixedSize(horizontal: true, vertical: false)
                                .frame(minHeight: 44)
                                .padding(.horizontal, 16)
                                .foregroundStyle(view == option ? Brand.accent : Color.secondary)
                                .background(view == option ? Brand.accent.opacity(0.14) : Color.secondary.opacity(0.08), in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(view == option ? .isSelected : [])
                    }
                }
            }
            .listRowBackground(Color.clear)
            .listRowInsets(EdgeInsets(top: 2, leading: 16, bottom: 2, trailing: 16))
            .listRowSeparator(.hidden)
            if let notice { Text(notice) }
            ForEach(store.items) { game in
                Section {
                    NavigationLink { CommunityDetailView(gameID: game.id, groupID: nil) } label: {
                        VStack(alignment: .leading, spacing: 9) {
                            Text(game.title)
                                .font(.title3.weight(.semibold))
                                .foregroundStyle(.primary)
                                .lineLimit(2)
                            Label(game.dateLabel, systemImage: "clock")
                                .font(.subheadline.weight(.medium))
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                            Label(game.court_name, systemImage: "mappin.and.ellipse")
                                .font(.body)
                                .foregroundStyle(.primary)
                                .lineLimit(1)
                            NativeScheduledGameStatus(game: game)
                        }
                        .padding(.vertical, 5)
                    }
                    if view == "waitlisted" {
                        Text(game.waitlistStatus == "offered" ? "Place offered" : "Waitlist position: \(game.position ?? 0)")
                        if let expiry = game.offerExpiresAt {
                            Text("Offer expires \(Date(timeIntervalSince1970: expiry / 1000).formatted())").font(.footnote)
                        }
                        if game.waitlistStatus == "offered" {
                            Button("Accept place") { Task { await waitAction(game, "accept-waitlist") } }.disabled(busy)
                        }
                        Button("Leave waitlist", role: .destructive) { Task { await waitAction(game, "leave-waitlist") } }.disabled(busy)
                    }
                }
            }
            NativeListStatus(store: store, retry: { reload = UUID() }, more: { Task { await load(more: true) } })
        }
        .listSectionSpacing(12)
        .contentMargins(.top, 0, for: .scrollContent)
        .contentMargins(.bottom, communityDockHeight, for: .scrollContent)
        .navigationTitle("My Games")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(view)-\(reload)-\(account.player?.id ?? "signed-out")") { await load() }
        .onChange(of: account.player?.id) { _, _ in store.clear(); notice = nil }
        .refreshable { await load() }
        .onDisappear { store.suspend() }
        .onChange(of: phase) { _, value in store.clear(); if value == .active { reload = UUID() } }
    }
    @MainActor private func load(more: Bool = false) async {
        let selected = view
        await store.load(more: more) { cursor in
            var q = [URLQueryItem(name: "view", value: selected)]
            if let cursor { q.append(URLQueryItem(name: "cursor", value: cursor)) }
            let page: NativeSchedulePage = try await NativeCommunityAPI.shared.request("games/mine", query: q)
            return (page.games, page.nextCursor)
        }
    }
    @MainActor private func waitAction(_ game: NativeScheduledGame, _ action: String) async {
        busy = true; defer { busy = false }
        do {
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("games/\(game.id)/\(action)", method: "POST", body: Data("{}".utf8))
            notice = action == "accept-waitlist" ? "Place confirmed. Find this game in Upcoming." : "You left the waitlist."
            await load()
        } catch { store.clear(); store.error = error.localizedDescription }
    }
}

nonisolated struct NativeDiscoveredPlayer: Decodable, Identifiable, Sendable {
    let id: String
    let displayName: String
    let generalLocation: String?
    let skillLevel: String?
    let bio: String?
    let activityStatus: String?

    var activityLabel: String? {
        switch activityStatus {
        case "recent": "Active recently"
        case "today": "Active today"
        case "yesterday": "Active yesterday"
        case "week": "Active this week"
        case "older": "Last active over a week ago"
        case "unknown": "Activity not recorded yet"
        default: nil
        }
    }
}
nonisolated private struct NativePlayerPage: Decodable, Sendable {
    let players: [NativeDiscoveredPlayer]
    let next: String?
    let resolvedLocation: String?
}

struct NativePlayersView: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.communityDockHeight) private var communityDockHeight
    @Environment(\.scenePhase) private var phase
    @State private var store = NativePagedStore<NativeDiscoveredPlayer>()
    @State private var name = ""
    @State private var location = ""
    @State private var locationSuggestions: [PlaceSuggestion] = []
    @State private var selectedPlayerAreaQuery = ""
    @State private var skill = "any"
    @State private var showingSkillFilter = false
    @State private var applied: [URLQueryItem] = []
    @State private var reload = UUID()
    @State private var invite: NativeDiscoveredPlayer?
    @State private var selectedProfile: NativeDiscoveredPlayer?
    @State private var showingProfile = false
    @State private var report: NativeDiscoveredPlayer?
    @State private var block: NativeDiscoveredPlayer?
    @State private var blocked: [NativeDiscoveredPlayer] = []
    @State private var actionBusy = false
    var body: some View {
        List {
            Section {
                VStack(spacing: 0) {
                    TextField("Player name", text: $name)
                        .textInputAutocapitalization(.words)
                        .padding(.horizontal, 12)
                        .frame(minHeight: 48)
                    Rectangle().fill(Color.secondary.opacity(0.16)).frame(height: 1)
                    HStack(spacing: 0) {
                        TextField("City, area or ZIP code", text: $location)
                            .textInputAutocapitalization(.words)
                            .onChange(of: location) { _, value in
                                if value != selectedPlayerAreaQuery { selectedPlayerAreaQuery = "" }
                                locationSuggestions = []
                            }
                            .task(id: location) {
                                try? await Task.sleep(for: .milliseconds(350))
                                guard !Task.isCancelled else { return }
                                await updateLocationSuggestions(location)
                            }
                            .padding(.leading, 12)
                            .frame(minHeight: 48)
                        Rectangle().fill(Color.secondary.opacity(0.16)).frame(width: 1, height: 26)
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) { showingSkillFilter.toggle() }
                        } label: {
                            Image(systemName: "slider.horizontal.3")
                                .font(.system(size: 17, weight: .semibold))
                                .foregroundStyle(showingSkillFilter || skill != "any" ? Brand.accent : .secondary)
                                .frame(width: 48, height: 48)
                                .overlay(alignment: .topTrailing) {
                                    if skill != "any" {
                                        Circle().fill(Brand.accent).frame(width: 8, height: 8).offset(x: -9, y: 8)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(skill == "any" ? "Skill filter" : "Skill filter, \(skill)")
                        .accessibilityValue(showingSkillFilter ? "Expanded" : "Collapsed")
                    }
                }
                .background(Brand.background, in: RoundedRectangle(cornerRadius: 10))
                .overlay { RoundedRectangle(cornerRadius: 10).stroke(Color.secondary.opacity(0.2), lineWidth: 1) }
                ForEach(locationSuggestions) { suggestion in
                    Button {
                        let area = suggestion.generalLocationLabel
                        selectedPlayerAreaQuery = area
                        location = area
                        locationSuggestions = []
                    } label: {
                        HStack(alignment: .top, spacing: 10) {
                            Image(systemName: "mappin.circle.fill").foregroundStyle(.tint)
                            VStack(alignment: .leading, spacing: 2) {
                                Text(suggestion.generalLocationLabel).foregroundStyle(.primary)
                                Text(suggestion.detail).font(.caption).foregroundStyle(.secondary)
                            }
                            Spacer(minLength: 0)
                        }
                        .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
                if showingSkillFilter {
                    Picker("Skill", selection: $skill) {
                        ForEach(["any", "unspecified", "beginner", "intermediate", "advanced"], id: \.self) { Text($0.capitalized).tag($0) }
                    }
                }
                Button {
                    applied = [URLQueryItem(name: "name", value: name), URLQueryItem(name: "q", value: location), URLQueryItem(name: "skill", value: skill)]
                    reload = UUID()
                } label: {
                    Label("Find players", systemImage: "magnifyingglass")
                        .font(.subheadline.weight(.semibold))
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(AppPrimaryButtonStyle())
                .tint(Brand.actionFill)
                Text("Only players who opt in appear. Approximate recent activity is shown to help you choose who to invite. Location matches a general area, not precise distance.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            ForEach(store.items) { player in
                HStack(spacing: 8) {
                    NativePlayerAvatar(playerID: player.id, displayName: player.displayName, refreshID: reload)
                    Button {
                        selectedProfile = player
                        showingProfile = true
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(player.displayName)
                                .font(.headline)
                                .lineLimit(1)
                            HStack(alignment: .firstTextBaseline, spacing: 4) {
                                Image(systemName: "mappin")
                                    .accessibilityHidden(true)
                                Text(player.generalLocation.flatMap { $0.isEmpty ? nil : $0 } ?? "Location not shared")
                                if let skill = player.skillLevel, !skill.isEmpty, skill.lowercased() != "unspecified" {
                                    Text("·")
                                    Text(skill.capitalized)
                                }
                            }
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            if let activity = player.activityLabel {
                                Text(activity)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .fixedSize(horizontal: false, vertical: true)
                                    .accessibilityLabel("Recent activity: \(activity)")
                            }
                            if let bio = player.bio, !bio.isEmpty {
                                Text(bio)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityHint("Opens player profile")
                    VStack(alignment: .trailing, spacing: 2) {
                        Menu {
                            Button("Block player", role: .destructive) { block = player }
                            Button("Report player") { report = player }
                        } label: {
                            AppToolbarIcon(title: "More options", icon: "ellipsis")
                                .foregroundStyle(.secondary)
                        }
                        .buttonStyle(.borderless)
                        .accessibilityLabel("More options for \(player.displayName)")

                        Button {
                            invite = player
                        } label: {
                            Text("Invite")
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(Brand.accent)
                                .padding(.horizontal, 10)
                                .frame(minHeight: 44)
                                .background(Brand.accent.opacity(0.1), in: Capsule())
                        }
                        .buttonStyle(.borderless)
                        .fixedSize(horizontal: true, vertical: false)
                    }
                }
                .padding(.vertical, 0)
                .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
            }
            NativeListStatus(store: store, retry: { reload = UUID() }, more: { Task { await load(more: true) } })
            Section {
                DisclosureGroup("Blocked players (\(blocked.count))") {
                    ForEach(blocked) { player in
                        HStack {
                            Text(player.displayName)
                            Spacer()
                            Button("Unblock") { Task { await safetyAction("unblock", player: player) } }
                                .disabled(actionBusy).frame(minHeight: 44)
                        }
                    }
                    Text("Blocking hides player discovery and restricts new interactions. Existing shared group memberships remain.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
        .listSectionSpacing(.compact)
        .contentMargins(.top, 8, for: .scrollContent)
        .contentMargins(.bottom, communityDockHeight, for: .scrollContent)
        .navigationTitle("Players")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showingProfile) {
            if let selectedProfile {
                NativeDiscoveredPlayerProfileView(player: selectedProfile, refreshID: reload)
            }
        }
        .task(id: "\(reload)-\(account.player?.id ?? "signed-out")") { await load(); await loadSafety() }
        .onChange(of: account.player?.id) { _, _ in
            store.clear(); blocked = []; invite = nil; selectedProfile = nil; showingProfile = false; report = nil; block = nil
        }
        .refreshable { await load() }
        .onDisappear { store.clear(); blocked = [] }
        .onChange(of: phase) { _, value in
            store.clear(); blocked = []; invite = nil; selectedProfile = nil; showingProfile = false; report = nil; block = nil
            if value == .active { reload = UUID() }
        }
        .sheet(item: $invite) { NativePlayerInvitationView(player: $0) }
        .sheet(item: $report) { NativePlayerReportView(player: $0) }
        .alert("Block this player?", isPresented: Binding(get: { block != nil }, set: { if !$0 { block = nil } })) {
            if let block { Button("Block player", role: .destructive) { Task { await safetyAction("block", player: block) } } }
            Button("Cancel", role: .cancel) { block = nil }
        }
    }
    @MainActor private func load(more: Bool = false) async {
        let query = applied
        await store.load(more: more) { cursor in
            var q = query
            if let cursor { q.append(URLQueryItem(name: "after", value: cursor)) }
            let page: NativePlayerPage = try await NativeCommunityAPI.shared.request("players", query: q)
            return (page.players, page.next)
        }
    }
    @MainActor private func loadSafety() async {
        do {
            let page: NativePlayerPage = try await NativeCommunityAPI.shared.request("players/blocks")
            guard !Task.isCancelled, phase == .active else { return }; blocked = page.players
        } catch { blocked = []; if !Task.isCancelled { store.clear(); store.error = error.localizedDescription } }
    }
    @MainActor private func safetyAction(_ action: String, player: NativeDiscoveredPlayer) async {
        account.photoRevision = UUID()
        actionBusy = true; defer { actionBusy = false; block = nil; account.photoRevision = UUID() }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["playerId": player.id])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("players/\(action)", method: "POST", body: body)
            await load(); await loadSafety()
        } catch { store.clear(); blocked = []; store.error = error.localizedDescription }
    }

    @MainActor private func updateLocationSuggestions(_ input: String) async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if selectedPlayerAreaQuery == text {
            locationSuggestions = []
            return
        }
        guard text.count >= 3 else { locationSuggestions = []; return }
        do {
            let results = try await OpenCourtsAPI.shared.suggestions(for: text)
            guard !Task.isCancelled, text == input.trimmingCharacters(in: .whitespacesAndNewlines) else { return }
            locationSuggestions = results
        } catch {
            guard !Task.isCancelled else { return }
            locationSuggestions = []
        }
    }
}

private struct NativeDiscoveredPlayerProfileView: View {
    let player: NativeDiscoveredPlayer
    let refreshID: UUID

    var body: some View {
        List {
            Section {
                HStack(spacing: 12) {
                    NativePlayerAvatar(playerID: player.id, displayName: player.displayName, refreshID: refreshID)
                    Text(player.displayName)
                        .font(.title3.weight(.semibold))
                }
                if let location = player.generalLocation, !location.isEmpty {
                    Label(location, systemImage: "mappin")
                } else {
                    Label("Location not shared", systemImage: "mappin")
                        .foregroundStyle(.secondary)
                }
                if let skill = player.skillLevel, !skill.isEmpty, skill.lowercased() != "unspecified" {
                    Label(skill.capitalized, systemImage: "figure.tennis")
                }
            }
            Section("About") {
                if let bio = player.bio, !bio.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
                    Text(bio)
                        .fixedSize(horizontal: false, vertical: true)
                } else {
                    Text("This player hasn’t added a bio yet.")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .navigationTitle("Player")
        .navigationBarTitleDisplayMode(.inline)
    }
}

private struct NativePlayerInvitationView: View {
    let player: NativeDiscoveredPlayer
    nonisolated struct Game: Decodable, Identifiable, Sendable {
        let id: String; let title: String; let startsAt: Double; let timeZone: String; let invited: Int
        var dateLabel: String {
            let f = DateFormatter(); f.timeZone = TimeZone(identifier: timeZone); f.dateStyle = .medium; f.timeStyle = .short
            return f.string(from: Date(timeIntervalSince1970: startsAt / 1000))
        }
    }
    nonisolated struct Page: Decodable, Sendable { let games: [Game] }
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var phase
    @State private var games: [Game] = []
    @State private var busy = false
    @State private var error: String?
    @State private var notice: String?
    var body: some View {
        NavigationStack {
            List {
                Text("Invite \(player.displayName) to a game you organize. Invitations do not reserve places; normal approval rules apply.")
                    .font(.footnote)
                ForEach(games) { game in
                    Button {
                        Task { await send(game) }
                    } label: {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(game.title); Text(game.dateLabel).font(.caption)
                            if game.invited != 0 { Text("Already invited").font(.caption) }
                        }
                    }.disabled(busy || game.invited != 0).frame(minHeight: 44)
                }
                if busy { ProgressView() }
                if let error { Text(error); Button("Try again") { Task { await load() } } }
                if let notice { Text(notice) }
                if !busy && error == nil && games.isEmpty { Text("No eligible upcoming games. Create an eligible game with space first.") }
            }
            .navigationTitle("Invite to game")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .task { await load() }
            .onChange(of: phase) { _, value in games = []; if value != .active { dismiss() } }
        }
    }
    @MainActor private func load() async {
        busy = true; error = nil; defer { busy = false }
        do {
            let page: Page = try await NativeCommunityAPI.shared.request("players/invitable-games", query: [URLQueryItem(name: "playerId", value: player.id)])
            guard !Task.isCancelled, phase == .active else { return }; games = page.games
        } catch { games = []; self.error = error.localizedDescription }
    }
    @MainActor private func send(_ game: Game) async {
        busy = true; error = nil; defer { busy = false }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["playerId": player.id, "gameId": game.id])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("players/invite-game", method: "POST", body: body)
            notice = "Invitation sent. No place is reserved."; await load()
        } catch { self.error = error.localizedDescription }
    }
}

private struct NativePlayerReportView: View {
    let player: NativeDiscoveredPlayer
    @Environment(\.dismiss) private var dismiss
    @State private var category = "other"
    @State private var details = ""
    @State private var busy = false
    @State private var error: String?
    @State private var submitted = false
    var body: some View {
        NavigationStack {
            Form {
                if submitted { Text("Report submitted for moderator review.") }
                else {
                    Text("Report \(player.displayName)")
                    Picker("Reason", selection: $category) {
                        ForEach(["harassment", "spam", "unsafe", "privacy", "other"], id: \.self) { Text($0.capitalized).tag($0) }
                    }
                    TextField("What happened?", text: $details, axis: .vertical)
                    Text("Explain what happened in up to 1,000 characters. Do not include passwords or private addresses.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Button("Submit report") { Task { await send() } }
                        .disabled(busy || details.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || details.count > 1000)
                }
                if let error { Text(error).foregroundStyle(.red) }
            }
            .navigationTitle("Report player")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Done") { dismiss() }.disabled(busy) } }
        }.interactiveDismissDisabled(busy)
    }
    @MainActor private func send() async {
        busy = true; error = nil; defer { busy = false }
        do {
            let data = try JSONSerialization.data(withJSONObject: ["subjectType": "player", "subjectId": player.id,
                "category": category, "details": details.trimmingCharacters(in: .whitespacesAndNewlines)])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("players/report", method: "POST", body: data)
            submitted = true; details = ""
        } catch { self.error = error.localizedDescription }
    }
}
