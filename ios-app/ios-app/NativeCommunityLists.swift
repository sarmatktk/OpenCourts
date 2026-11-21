import SwiftUI

@MainActor @Observable final class NativePagedStore<Item: Identifiable & Sendable> where Item.ID: Hashable {
    var items: [Item] = []
    var next: String?
    var loading = false
    var error: String?
    private var generation = UUID()
    func clear() { generation = UUID(); items = []; next = nil; loading = false; error = nil }
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
    @Environment(\.scenePhase) private var phase
    @State private var store = NativePagedStore<CommunityGroup>()
    @State private var reload = UUID()
    var body: some View {
        List {
            ForEach(store.items) { group in
                NavigationLink { NativeGroupMembershipView(groupID: group.id) } label: {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(group.name).font(.headline)
                        Text(group.generalLocation)
                        Text([group.membershipStatus, group.role, group.status].compactMap { $0 }.joined(separator: " · "))
                            .font(.caption).foregroundStyle(.secondary)
                    }.padding(.vertical, 4)
                }
            }
            NativeListStatus(store: store, retry: { reload = UUID() }, more: {})
        }
        .navigationTitle("My Groups")
        .task(id: reload) { await load() }
        .refreshable { await load() }
        .onDisappear { store.clear() }
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
}

struct NativeGroupMembershipView: View {
    let groupID: String
    @Environment(\.scenePhase) private var phase
    @State private var detail: NativeGroupDetail?
    @State private var error: String?
    @State private var reload = UUID()
    @State private var generation = UUID()
    @State private var busy = false
    @State private var confirmLeave = false
    var body: some View {
        List {
            if let detail {
                Section {
                    Text(detail.group.name).font(.title2.bold())
                    Text(detail.group.generalLocation)
                    Text(detail.group.publicDescription)
                    Text(detail.archived ? "Archived" : detail.group.visibility.capitalized)
                    if let membership = detail.membership {
                        Text("Membership: \(membership.status)")
                        if let role = membership.role { Text("Role: \(role)") }
                    }
                }
                if let content = detail.content, !detail.archived {
                    Section("Member details") {
                        Text(content.description)
                        Text("Skill: \(content.skillPreference)")
                        Text("Discussions: \(detail.discussionCount ?? 0)")
                    }
                }
                if !detail.archived {
                    Section {
                        if detail.membership?.status == "active" || detail.membership?.status == "pending" {
                            if detail.membership?.role != "owner" {
                                Button(detail.membership?.status == "pending" ? "Withdraw membership request" : "Leave group", role: .destructive) { confirmLeave = true }
                            }
                        } else { Button("Request membership") { Task { await act("request") } } }
                    }.disabled(busy)
                }
            } else if error == nil { ProgressView("Loading group…") }
            if let error { Text(error); Button("Try again") { reload = UUID() } }
        }
        .navigationTitle("Group")
        .task(id: reload) { await load() }
        .refreshable { await load() }
        .onDisappear { generation = UUID(); detail = nil }
        .onChange(of: phase) { _, value in generation = UUID(); detail = nil; if value == .active { reload = UUID() } }
        .confirmationDialog("Leave this group or withdraw your request?", isPresented: $confirmLeave, titleVisibility: .visible) {
            Button("Confirm", role: .destructive) { Task { await act("leave") } }
        }
    }
    @MainActor private func load() async {
        let token = UUID(); generation = token; detail = nil; error = nil
        do {
            let response: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard generation == token, !Task.isCancelled else { return }; detail = response
        } catch { if generation == token && !Task.isCancelled { self.error = error.localizedDescription } }
    }
    @MainActor private func act(_ action: String) async {
        busy = true; defer { busy = false }
        do {
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("groups/\(groupID)/\(action)", method: "POST", body: Data("{}".utf8))
            await load()
        } catch { detail = nil; self.error = error.localizedDescription }
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
    let waitlistStatus: String?
    let offerExpiresAt: Double?
    let position: Int?
    var dateLabel: String {
        let f = DateFormatter(); f.timeZone = TimeZone(identifier: time_zone) ?? TimeZone(secondsFromGMT: 0)
        f.dateStyle = .medium; f.timeStyle = .short
        return f.string(from: Date(timeIntervalSince1970: starts_at / 1000))
    }
}
nonisolated private struct NativeSchedulePage: Decodable, Sendable { let games: [NativeScheduledGame]; let nextCursor: String? }

struct NativeMyGamesView: View {
    @Environment(\.scenePhase) private var phase
    @State private var store = NativePagedStore<NativeScheduledGame>()
    @State private var view = "upcoming"
    @State private var reload = UUID()
    @State private var busy = false
    @State private var notice: String?
    var body: some View {
        List {
            Picker("Schedule", selection: $view) {
                ForEach(["upcoming", "requests", "waitlisted", "past", "cancelled"], id: \.self) { Text($0.capitalized).tag($0) }
            }
            if let notice { Text(notice) }
            ForEach(store.items) { game in
                Section {
                    NavigationLink { CommunityDetailView(gameID: game.id, groupID: nil) } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(game.title).font(.headline); Text(game.dateLabel); Text(game.court_name)
                            Text(game.status == "cancelled" ? "Cancelled" : game.isOrganizer ? "Organizing" : game.request_status ?? "Confirmed")
                                .font(.caption).foregroundStyle(.secondary)
                        }
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
        .navigationTitle("My Games")
        .task(id: "\(view)-\(reload)") { await load() }
        .refreshable { await load() }
        .onDisappear { store.clear() }
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
}
nonisolated private struct NativePlayerPage: Decodable, Sendable {
    let players: [NativeDiscoveredPlayer]
    let next: String?
    let resolvedLocation: String?
}

struct NativePlayersView: View {
    @Environment(\.scenePhase) private var phase
    @State private var store = NativePagedStore<NativeDiscoveredPlayer>()
    @State private var name = ""
    @State private var location = ""
    @State private var skill = "any"
    @State private var applied: [URLQueryItem] = []
    @State private var reload = UUID()
    @State private var invite: NativeDiscoveredPlayer?
    @State private var report: NativeDiscoveredPlayer?
    @State private var block: NativeDiscoveredPlayer?
    @State private var blocked: [NativeDiscoveredPlayer] = []
    @State private var actionBusy = false
    var body: some View {
        List {
            Section {
                TextField("Player name", text: $name)
                TextField("City, area or ZIP code", text: $location)
                Picker("Skill", selection: $skill) {
                    ForEach(["any", "unspecified", "beginner", "intermediate", "advanced"], id: \.self) { Text($0.capitalized).tag($0) }
                }
                Button("Find players") {
                    applied = [URLQueryItem(name: "name", value: name), URLQueryItem(name: "q", value: location), URLQueryItem(name: "skill", value: skill)]
                    reload = UUID()
                }.frame(minHeight: 44)
                Text("Only players who opt in appear. Location matches a general area, not precise distance.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            ForEach(store.items) { player in
                VStack(alignment: .leading, spacing: 6) {
                    HStack(alignment: .top) {
                        Text(player.displayName).font(.headline)
                        Spacer()
                        Menu {
                            Button("Block player", role: .destructive) { block = player }
                            Button("Report player") { report = player }
                        } label: { Image(systemName: "ellipsis").frame(width: 44, height: 44) }
                            .accessibilityLabel("More options for \(player.displayName)")
                    }
                    Label(player.generalLocation ?? "Location not shared", systemImage: "mappin")
                    if let bio = player.bio, !bio.isEmpty { Text(bio) }
                    if let skill = player.skillLevel { Text(skill.capitalized).font(.caption) }
                    Button("Invite to game") { invite = player }.frame(minHeight: 44)
                }.padding(.vertical, 4)
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
        .navigationTitle("Players")
        .task(id: reload) { await load(); await loadSafety() }
        .refreshable { await load() }
        .onDisappear { store.clear(); blocked = [] }
        .onChange(of: phase) { _, value in
            store.clear(); blocked = []; invite = nil; report = nil; block = nil
            if value == .active { reload = UUID() }
        }
        .sheet(item: $invite) { NativePlayerInvitationView(player: $0) }
        .sheet(item: $report) { NativePlayerReportView(player: $0) }
        .confirmationDialog("Block this player?", isPresented: Binding(get: { block != nil }, set: { if !$0 { block = nil } }), titleVisibility: .visible) {
            if let block { Button("Block player", role: .destructive) { Task { await safetyAction("block", player: block) } } }
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
        actionBusy = true; defer { actionBusy = false; block = nil }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["playerId": player.id])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("players/\(action)", method: "POST", body: body)
            await load(); await loadSafety()
        } catch { store.clear(); blocked = []; store.error = error.localizedDescription }
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
