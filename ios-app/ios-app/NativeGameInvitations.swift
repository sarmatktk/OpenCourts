import SwiftUI

nonisolated private struct GameInvitees: Decodable, Sendable {
    let players: [Player]
    let invitationCount: Int
    let resolvedLocation: String?

    struct Player: Decodable, Identifiable, Sendable {
        let id: String
        let displayName: String
        let generalLocation: String
        let invited: Int
    }
}

nonisolated private struct GameInvitationLinks: Decodable, Sendable {
    let links: [Link]

    struct Link: Decodable, Identifiable, Sendable {
        let id: String
        let expiresAt: Double
        let revokedAt: Double?
        let recipientName: String?
    }
}

struct NativeGameInvitationsView: View {
    let game: CommunityGame
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var result: GameInvitees?
    @State private var links: [GameInvitationLinks.Link] = []
    @State private var createdURL: URL?
    @State private var revoke: GameInvitationLinks.Link?
    @State private var loading = false
    @State private var mutating = false
    @State private var error: String?
    @State private var notice: String?
    @State private var generation = UUID()

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(game.title).font(.headline)
                    Text(game.dateLabel).font(.subheadline).foregroundStyle(.secondary)
                    Text(game.visibility == "group"
                         ? "Invite approved group members. Invitations do not reserve places or grant membership; members join under the game’s current rules."
                         : "Invitations do not reserve places. Players must request a place and receive host approval.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section("Invite players") {
                    TextField("Player name, city or ZIP code", text: $query)
                        .textInputAutocapitalization(.words)
                        .disabled(mutating)
                        .onSubmit { Task { await load() } }
                        .onChange(of: query) { _, _ in
                            generation = UUID(); result = nil; error = nil; loading = false
                        }
                    Button("Find players", systemImage: "magnifyingglass") { Task { await load() } }
                        .disabled(loading || mutating || query.utf16.count > 100)
                    if let result {
                        Text("\(result.invitationCount) of 10 invitations used")
                            .font(.footnote).foregroundStyle(.secondary)
                        if let location = result.resolvedLocation {
                            Text("Searching near \(location)").font(.footnote)
                        }
                        ForEach(result.players) { player in
                            NativeGameInviteeRow(name: player.displayName, location: player.generalLocation,
                                invited: player.invited != 0,
                                disabled: loading || mutating || result.invitationCount >= 10) {
                                Task { await mutate("players/invite-game",
                                    body: ["gameId": game.id, "playerId": player.id],
                                    success: "Invitation sent to \(player.displayName). No place is reserved.") }
                            }
                        }
                        if result.players.isEmpty {
                            Text(game.visibility == "group"
                                 ? "No eligible discoverable group members. Try another name or location."
                                 : "No eligible players. Try another name or location.")
                        }
                        Text("Showing up to 25 eligible players. Narrow your search to find someone else.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
                if game.visibility == "unlisted" {
                    Section("Invitation links") {
                        Text("A shareable link can be forwarded. A direct player invitation grants access only to its recipient. Signing in is required; neither confirms a place.")
                            .font(.footnote).foregroundStyle(.secondary)
                        Button("Create 7-day shareable link", systemImage: "link") {
                            Task { await mutate("games/\(game.id)/share-links", body: ["expiresInDays": 7],
                                success: "Link created. Share it now; the address is only shown once.") }
                        }
                        .disabled(loading || mutating || result == nil)
                        if let createdURL {
                            ShareLink(item: createdURL) { Label("Share new invitation", systemImage: "square.and.arrow.up") }
                        }
                        ForEach(links) { link in
                            NativeGameInvitationLinkRow(recipient: link.recipientName, expiry: link.expiresAt,
                                revoked: link.revokedAt != nil, disabled: loading || mutating) { revoke = link }
                        }
                        if links.isEmpty && !loading { Text("No invitation links.") }
                    }
                }
                Section {
                    if loading || mutating { ProgressView(mutating ? "Updating invitations…" : "Loading invitations…") }
                    if let notice { Text(notice).foregroundStyle(.secondary) }
                    if let error {
                        Text(error).foregroundStyle(.red)
                        Button("Refresh availability") { Task { await load() } }.disabled(loading || mutating)
                    }
                }
            }
            .listSectionSpacing(.compact)
            .navigationTitle("Invite players")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() }.disabled(mutating) }
            }
            .interactiveDismissDisabled(mutating)
            .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") {
                clear()
                if account.player != nil && phase == .active { await load() }
            }
            .onDisappear { clear() }
            .alert("Revoke this invitation?", isPresented: Binding(
                get: { revoke != nil }, set: { if !$0 { revoke = nil } }
            )) {
                if let revoke {
                    Button("Revoke invitation", role: .destructive) {
                        Task { await mutate("games/\(game.id)/revoke-link", body: ["linkId": revoke.id],
                            success: "Invitation revoked. Confirmed players retain access.") }
                    }
                }
                Button("Cancel", role: .cancel) { revoke = nil }
            } message: {
                Text("This removes access granted by this invitation. Confirmed players retain access through their playing place.")
            }
        }
    }

    private func clear() {
        generation = UUID(); result = nil; links = []; createdURL = nil
        revoke = nil; error = nil; notice = nil; loading = false; query = ""
    }

    @MainActor private func load() async {
        guard let actor = account.player?.id, phase == .active else { return }
        let token = UUID()
        generation = token; loading = true; error = nil; result = nil; links = []
        defer { if generation == token { loading = false } }
        do {
            let page: GameInvitees = try await NativeCommunityAPI.shared.request("players/game-invitees",
                query: [URLQueryItem(name: "gameId", value: game.id), URLQueryItem(name: "q", value: query)])
            var currentLinks: [GameInvitationLinks.Link] = []
            if game.visibility == "unlisted" {
                let response: GameInvitationLinks = try await NativeCommunityAPI.shared.request("games/\(game.id)/share-links")
                currentLinks = response.links
            }
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            result = page; links = currentLinks
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            result = nil; links = []; createdURL = nil
            self.error = error.localizedDescription
        }
    }

    @MainActor private func mutate(_ path: String, body: [String: Any], success: String) async {
        guard !mutating, !loading, let actor = account.player?.id, phase == .active else { return }
        let token = generation
        mutating = true; error = nil; notice = nil; createdURL = nil
        defer { mutating = false }
        do {
            nonisolated struct Response: Decodable, Sendable { let url: String? }
            let data = try JSONSerialization.data(withJSONObject: body)
            let response: Response = try await NativeCommunityAPI.shared.request(path, method: "POST", body: data)
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            await load()
            guard account.player?.id == actor, phase == .active, result != nil else { return }
            if let address = response.url, let url = URL(string: address),
               url.scheme == NativeCommunityAPI.origin.scheme, url.host == NativeCommunityAPI.origin.host,
               url.port == NativeCommunityAPI.origin.port, url.path == "/play-together/game-invitation" {
                createdURL = url
            }
            notice = success
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            await load()
            guard account.player?.id == actor, phase == .active, result != nil else { return }
            self.error = "\(error.localizedDescription) Refresh and check invitations before trying again. A lost response may still have completed."
        }
    }
}

private struct NativeGameInviteeRow: View {
    let name: String
    let location: String
    let invited: Bool
    let disabled: Bool
    let send: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(name).font(.headline)
            if !location.isEmpty { Text(location).font(.caption).foregroundStyle(.secondary) }
            Button(invited ? "Invited" : "Invite", action: send)
                .disabled(disabled || invited)
                .frame(minHeight: 44)
                .accessibilityLabel(invited ? "Already invited \(name)" : "Invite \(name)")
        }
    }
}

private struct NativeGameInvitationLinkRow: View {
    let recipient: String?
    let expiry: Double
    let revoked: Bool
    let disabled: Bool
    let revoke: () -> Void

    var body: some View {
        TimelineView(.periodic(from: .now, by: 30)) { context in
            let deadline = Date(timeIntervalSince1970: expiry / 1000)
            VStack(alignment: .leading, spacing: 4) {
                Text(recipient.map { "Invitation to \($0)" } ?? "Forwardable game link").font(.headline)
                Text(revoked ? "Revoked" : deadline <= context.date ? "Expired" : "Active")
                    .font(.caption).foregroundStyle(.secondary)
                Text("Expires \(deadline.formatted(date: .abbreviated, time: .shortened))").font(.caption)
                if !revoked && deadline > context.date {
                    Button("Revoke", role: .destructive, action: revoke)
                        .disabled(disabled).frame(minHeight: 44)
                }
            }
        }
    }
}

nonisolated private struct NativeInvitationInbox: Decodable, Sendable {
    let notifications: [Invitation]

    struct Invitation: Decodable, Identifiable, Sendable {
        let id: String
        let kind: String
        let gameId: String?
        let gameTitle: String?
        let displayName: String?
        let invitationStatus: String?
        let readAt: Double?

        var statusLabel: LocalizedStringResource {
            switch invitationStatus {
            case "available": "Open game to check available places"
            case "requested": "Awaiting host approval"
            case "joined": "Your place is confirmed"
            case "closed": "No place currently available"
            case "cancelled": "Game cancelled"
            case "completed": "Game completed"
            case "expired": "Invitation expired"
            default: "Open game for current status"
            }
        }
    }
}

struct NativeGameInvitationInboxView: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var invitations: [NativeInvitationInbox.Invitation] = []
    @State private var loading = false
    @State private var error: String?
    @State private var generation = UUID()

    var body: some View {
        List {
            Section {
                NavigationLink {
                    NativeGameInvitationRedeemer()
                } label: {
                    Label("Open an invitation link", systemImage: "link")
                }
                Text("Invitations reserve no places. Open the game to request a place or review your current participation.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            ForEach(invitations) { invitation in
                if let gameID = invitation.gameId {
                    NavigationLink {
                        CommunityDetailView(gameID: gameID, groupID: nil)
                            .task { await markRead(invitation.id) }
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            if invitation.readAt == nil { Label("Unread invitation", systemImage: "envelope.badge").font(.caption) }
                            Text(invitation.gameTitle ?? "Game invitation").font(.headline)
                            if let name = invitation.displayName { Text("From \(name)").font(.subheadline) }
                            Text(invitation.statusLabel).font(.footnote).foregroundStyle(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            if loading { ProgressView("Loading invitations…") }
            if let error {
                Text(error).foregroundStyle(.red)
                Button("Try again") { Task { await load() } }
            } else if !loading && invitations.isEmpty {
                Text("No game invitations in your recent inbox.")
            }
        }
        .listSectionSpacing(.compact)
        .navigationTitle("Game invitations")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") { await load() }
        .refreshable { await load() }
        .onDisappear { generation = UUID(); invitations = [] }
    }

    @MainActor private func load() async {
        let token = UUID()
        generation = token; invitations = []; error = nil; loading = false
        guard let actor = account.player?.id, phase == .active else { return }
        loading = true
        defer { if generation == token { loading = false } }
        do {
            let page: NativeInvitationInbox = try await NativeCommunityAPI.shared.request("games/notifications")
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            invitations = page.notifications.filter { $0.kind == "game_invited" }
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            self.error = error.localizedDescription
        }
    }

    @MainActor private func markRead(_ id: String) async {
        // Opening a game always revalidates access through its existing detail/participation flow.
        guard account.player != nil, phase == .active else { return }
        do {
            let body = try JSONSerialization.data(withJSONObject: ["id": id])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request(
                "games/notifications/read", method: "POST", body: body)
        } catch { /* Read status can be retried by reopening; it never blocks game access. */ }
    }
}


// Accept only invitation addresses from the configured environment. Tokens stay in memory.
nonisolated enum NativeGameInvitationAddress {
    static func token(from address: String, origin: URL) -> String? {
        guard let parts = URLComponents(string: address.trimmingCharacters(in: .whitespacesAndNewlines)),
              parts.scheme == origin.scheme, parts.host == origin.host, parts.port == origin.port,
              parts.user == nil, parts.password == nil, parts.query == nil,
              parts.path == "/play-together/game-invitation",
              let token = parts.fragment, token.count == 64,
              token.unicodeScalars.allSatisfy({ CharacterSet(charactersIn: "0123456789abcdef").contains($0) })
        else { return nil }
        return token
    }
}

private struct NativeGameInvitationRedeemer: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var address = ""
    @State private var busy = false
    @State private var error: String?
    @State private var gameID: String?
    @State private var showingGame = false
    @State private var generation = UUID()

    var body: some View {
        Form {
            Section("Invitation address") {
                TextField("Paste invitation link", text: $address, axis: .vertical)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .privacySensitive()
                    .disabled(busy)
                    .onChange(of: address) { _, _ in error = nil }
                Text("Use a shareable OpenCourts invitation link. Direct invitations are already in your inbox.")
                    .font(.footnote).foregroundStyle(.secondary)
                Button("Open invitation") { Task { await open() } }
                    .disabled(busy || NativeGameInvitationAddress.token(from: address, origin: NativeCommunityAPI.origin) == nil)
                if busy { ProgressView("Checking invitation…") }
                if let error { Text(error).foregroundStyle(.red) }
            }
            Section {
                Text("Opening a link grants viewing access only. You must still request a playing place and receive host approval.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .navigationTitle("Open invitation")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showingGame) {
            if let gameID { CommunityDetailView(gameID: gameID, groupID: nil) }
        }
        .onChange(of: account.player?.id) { _, _ in clear() }
        .onChange(of: phase) { _, value in if value != .active { clear() } }
        .onDisappear {
            generation = UUID(); address = ""; error = nil
        }
    }

    private func clear() {
        generation = UUID(); address = ""; error = nil; gameID = nil; showingGame = false
    }

    @MainActor private func open() async {
        guard !busy, let actor = account.player?.id, phase == .active,
              let token = NativeGameInvitationAddress.token(from: address, origin: NativeCommunityAPI.origin) else { return }
        let requestID = generation
        busy = true; error = nil
        defer { busy = false }
        do {
            nonisolated struct Response: Decodable, Sendable { let gameId: String }
            let body = try JSONSerialization.data(withJSONObject: ["token": token])
            let response: Response = try await NativeCommunityAPI.shared.request(
                "games/invitation-accept", method: "POST", body: body)
            guard generation == requestID, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            guard UUID(uuidString: response.gameId) != nil else { throw CommunityError.invalidResponse }
            address = ""; gameID = response.gameId; showingGame = true
        } catch {
            guard generation == requestID, account.player?.id == actor, phase == .active else { return }
            self.error = "\(error.localizedDescription) Check the invitation and try again."
        }
    }
}
