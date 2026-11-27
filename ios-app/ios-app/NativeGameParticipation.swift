import SwiftUI

nonisolated struct NativeGameParticipation: Decodable, Sendable {
    let isOrganizer: Bool
    let isGameOrganizer: Bool
    let canManageGuests: Bool?
    let joined: Bool
    let requestStatus: String?
    let joinPolicy: String
    let isGroupMember: Bool
    let version: Int
    // isOrganizer is current management authority; isGameOrganizer is hosting identity.
    static func requiresManagement(_ route: String) -> Bool {
        ["approve", "reject", "remove", "approve-guests", "reject-guests", "cancel"].contains(route)
    }

    func canManage(version: Int) -> Bool { isOrganizer && self.version == version }

    let availablePlaces: Int?
    let waitlist: Waitlist?

    nonisolated struct Waitlist: Decodable, Sendable {
        let status: String
        let expiresAt: Double?
        let position: Int?
    }
}

nonisolated private struct ParticipationQueue: Decodable, Sendable {
    let players: [Player]
    struct Player: Decodable, Identifiable, Sendable {
        let id: String
        let displayName: String
        let status: String
        let requestedAt: Double?
        let expiresAt: Double?
    }
}

nonisolated private struct ParticipationPlayer: Decodable, Identifiable, Sendable {
    let id: String
    let displayName: String
    let guestCount: Int?
    let requestedAt: Double?
}

nonisolated private struct ParticipationPlayers: Decodable, Sendable {
    let players: [ParticipationPlayer]
}

nonisolated private struct ParticipationGuests: Decodable, Sendable {
    let own: Own?
    let requests: [Request]
    let canAddGuestsDirectly: Bool

    struct Own: Decodable, Sendable {
        let confirmed: Int
        let requested: Int?
        let status: String?
    }

    struct Request: Decodable, Identifiable, Sendable {
        let playerId: String
        let displayName: String
        let guestCount: Int
        let requestedAt: Double?
        var id: String { playerId }
    }
}

private struct ParticipationConfirmation {
    let route: String
    let title: String
    let message: String
    let playerID: String?
}

struct NativeGameDecision: Identifiable {
    let id = UUID()
    let title: String
    let message: String
    let confirmTitle: String
    var isInformational = false
    let perform: @MainActor () async -> Void
}

enum NativeGameHostAction: Identifiable {
    case invitations(CommunityGame)
    case edit(CommunityGame, version: Int)
    case schedule(String)
    case leave(isOrganizer: Bool, isPending: Bool, perform: @MainActor (String) async -> String?)

    var id: String {
        switch self {
        case .invitations(let game): "invitations-\(game.id)"
        case .edit(let game, let version): "edit-\(game.id)-\(version)"
        case .schedule(let id): "schedule-\(id)"
        case .leave: "leave"
        }
    }
}

struct NativeGameParticipationView: View {
    let game: CommunityGame
    let updated: (CommunityGame) -> Void
    let accessChanged: () -> Void
    let presentHostAction: (NativeGameHostAction) -> Void
    let presentDecision: (NativeGameDecision) -> Void
    @Environment(NativeAccountStore.self) private var account
    @Environment(OpenCourtsStore.self) private var store
    @Environment(\.scenePhase) private var scenePhase
    @State private var participation: NativeGameParticipation?
    @State private var players: [ParticipationPlayer] = []
    @State private var requests: [ParticipationPlayer] = []
    @State private var guests: ParticipationGuests?
    @State private var guestCount = 1
    @State private var queue: [ParticipationQueue.Player] = []
    @State private var generation = UUID()
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var actionError: String?

    private var isOpen: Bool {
        game.status == "scheduled" && (game.startDate.map { $0 > Date() } ?? false)
    }

    var body: some View {
        Section("Participation") {
            if account.player != nil {
                if let participation {
                    if participation.joined {
                        Label(participation.isGameOrganizer ? "You’re hosting and playing" : "You’re going", systemImage: "checkmark.circle")
                        NativeNotificationOptInNudge(reason: .joinedGame)
                        if isOpen {
                            Button(participation.isGameOrganizer ? "Stop playing" : "Leave game", role: .destructive) {
                                presentLeave()
                            }
                        }
                        if participation.isGameOrganizer {
                            Text("Changing your playing place keeps you as the host and keeps the game scheduled.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    } else if isOpen, let waitlist = participation.waitlist, waitlist.status != "expired" {
                        waitlistControls(waitlist)
                        NativeNotificationOptInNudge(reason: .gameWaitlist)
                    } else if participation.requestStatus == "pending" {
                        Label("Awaiting host approval", systemImage: "clock")
                        NativeNotificationOptInNudge(reason: .gameRequest)
                        Text("A request does not reserve a place.").font(.footnote).foregroundStyle(.secondary)
                        if isOpen {
                            Button("Withdraw request", role: .destructive) {
                                presentLeave()
                            }
                        }
                    } else if !participation.isGameOrganizer && ["rejected", "removed"].contains(participation.requestStatus ?? "") {
                        Text("The host has declined participation in this game.").foregroundStyle(.secondary)
                    } else if isOpen {
                        Button {
                            Task {
                                let full = (participation.availablePlaces ?? (game.capacity - game.playerCount)) <= 0
                                _ = await perform(full && participation.isGroupMember && !participation.isGameOrganizer ? "join-waitlist" : "join")
                            }
                        } label: {
                            Label((participation.availablePlaces ?? (game.capacity - game.playerCount)) <= 0 && participation.isGroupMember && !participation.isGameOrganizer
                                  ? "Join waitlist" : participation.joinPolicy == "instant" ? "Join game" : "Request to join",
                                  systemImage: "person.badge.plus")
                        }
                        .buttonStyle(AppPrimaryButtonStyle())
                        if participation.joinPolicy != "instant" {
                            Text("The host must approve your request before your place is confirmed.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    } else {
                        Text("This game is no longer open for joining.").foregroundStyle(.secondary)
                    }
                    if let available = participation.availablePlaces {
                        Text("\(max(0, available)) places currently available")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    if let actionError { Text(actionError).font(.footnote).foregroundStyle(.red) }
                    if busy { ProgressView("Updating…") }

                    if isOpen, let guests {
                        DisclosureGroup {
                            guestControls(guests, canManage: participation.canManageGuests == true)
                        } label: {
                            HStack(spacing: 10) {
                                Text("Guest places")
                                if participation.canManageGuests == true, !guests.requests.isEmpty {
                                    Text("\(guests.requests.count) pending")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(Brand.accent)
                                        .padding(.horizontal, 9)
                                        .padding(.vertical, 4)
                                        .background(Brand.accent.opacity(0.16), in: Capsule())
                                }
                            }
                        }
                    }
                    if participation.isOrganizer || participation.isGroupMember {
                        DisclosureGroup("Players (\(players.count))") {
                            if players.isEmpty { Text("No confirmed players.").foregroundStyle(.secondary) }
                            ForEach(players) { player in
                                playerRow(player, showActions: participation.isOrganizer && isOpen && player.id != account.player?.id) {
                                    if participation.isOrganizer && isOpen && player.id != account.player?.id {
                                        Button("Remove player", role: .destructive) {
                                            confirm(ParticipationConfirmation(route: "remove", title: "Remove player?",
                                                message: "Remove \(player.displayName) and their approved guests from this game?", playerID: player.id))
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if participation.isGroupMember {
                        DisclosureGroup("Waitlist (\(queue.count))") {
                            Button("Refresh waitlist") { Task { await load() } }
                            if queue.isEmpty { Text("No waiting players.").foregroundStyle(.secondary) }
                            ForEach(queue) { player in
                                VStack(alignment: .leading, spacing: 4) {
                                    Text(player.displayName).font(.headline)
                                    Text(player.status == "offered" ? "Place offered" : "Waiting")
                                        .font(.caption).foregroundStyle(.secondary)
                                    if let requestedAt = player.requestedAt {
                                        Text("Requested \(Date(timeIntervalSince1970: requestedAt / 1000).formatted(date: .abbreviated, time: .shortened))")
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                    if player.status == "offered", let expiry = player.expiresAt {
                                        Text("Offer ends \(Date(timeIntervalSince1970: expiry / 1000).formatted(date: .abbreviated, time: .shortened))")
                                            .font(.caption).foregroundStyle(.secondary)
                                    }
                                }
                            }
                            Text("Players are offered places in signup order. Active offers reserve one place. Guest requests remain separate.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    if participation.isOrganizer {
                        DisclosureGroup("Join requests (\(requests.count))") {
                            if requests.isEmpty { Text("No pending requests.").foregroundStyle(.secondary) }
                            ForEach(requests) { player in
                                playerRow(player, showActions: isOpen, requestedAt: player.requestedAt) {
                                    if isOpen {
                                        Button("Approve request") {
                                            Task { _ = await perform("approve", playerID: player.id) }
                                        }
                                        Button("Reject request", role: .destructive) {
                                            confirm(ParticipationConfirmation(route: "reject", title: "Reject request?",
                                                message: "Decline \(player.displayName)’s request to join this game?", playerID: player.id))
                                        }
                                    }
                                }
                            }
                        }
                        if game.status == "scheduled" {
                            DisclosureGroup {
                                if isOpen && participation.isGameOrganizer && ["public", "unlisted", "group"].contains(game.visibility ?? "") {
                                    Button("Invite players", systemImage: "envelope.badge") { presentHostAction(.invitations(game)) }
                                }
                                if isOpen {
                                    Button("Edit game", systemImage: "slider.horizontal.3") { presentHostAction(.edit(game, version: participation.version)) }
                                    Button("Manage schedule", systemImage: "calendar.badge.clock") { presentHostAction(.schedule(game.id)) }
                                }
                                Button("Cancel game", role: .destructive) {
                                    confirm(ParticipationConfirmation(route: "cancel", title: "Cancel this game?",
                                        message: "This cancels the game for everyone. It does not cancel any court booking.", playerID: nil))
                                }
                            } label: {
                                Text(game.visibility == "group" ? "Group game management" : "Host controls")
                                    .foregroundStyle(Brand.accent)
                            }
                        }
                    }
                } else {
                    if loading || busy { ProgressView("Checking game access…") }
                    else if let error {
                        Text(error).foregroundStyle(.secondary)
                        if let actionError { Text(actionError).font(.footnote).foregroundStyle(.red) }
                        Button("Try again") { Task { await load() } }
                    }
                }
            }
        }
        .disabled(busy || loading)
        .task(id: "\(game.id)-\(account.player?.id ?? "signed-out")-\(scenePhase)") {
            clear()
            if account.player != nil && scenePhase == .active { await load() }
        }
        // A presented editor covers this view; keep its presentation and access snapshot alive.
        .onDisappear { generation = UUID(); loading = false }
    }

    private func confirm(_ confirmation: ParticipationConfirmation) {
        let confirmTitle: String
        switch confirmation.route {
        case "cancel": confirmTitle = "Cancel game"
        case "remove": confirmTitle = "Remove player"
        case "reject": confirmTitle = "Reject request"
        case "leave-waitlist": confirmTitle = "Leave waitlist"
        case "cancel-guests": confirmTitle = "Cancel guest places"
        case "reject-guests": confirmTitle = "Reject guest request"
        default: confirmTitle = "Confirm"
        }
        presentDecision(NativeGameDecision(title: confirmation.title, message: confirmation.message,
                                          confirmTitle: confirmTitle) {
            _ = await perform(confirmation.route, playerID: confirmation.playerID)
        })
    }

    private func presentLeave() {
        actionError = nil
        presentHostAction(.leave(isOrganizer: participation?.isGameOrganizer == true,
                                 isPending: participation?.requestStatus == "pending", perform: { reason in
            if await perform("leave", reason: reason) { return nil }
            return actionError ?? "Unable to update your place. Close and refresh the game before trying again."
        }))
    }

    @ViewBuilder private func waitlistControls(_ waitlist: NativeGameParticipation.Waitlist) -> some View {
        if waitlist.status == "offered", let expiry = waitlist.expiresAt {
            TimelineView(.periodic(from: .now, by: 1)) { context in
                let deadline = Date(timeIntervalSince1970: expiry / 1000)
                VStack(alignment: .leading, spacing: 8) {
                    Label(deadline > context.date ? "A place is reserved for you" : "Your offer has expired", systemImage: "clock")
                    Text("Offer ends \(deadline.formatted(date: .abbreviated, time: .shortened))")
                        .font(.footnote).foregroundStyle(.secondary)
                    Button("Accept place") { Task { _ = await perform("accept-waitlist") } }
                        .buttonStyle(AppPrimaryButtonStyle())
                        .disabled(deadline <= context.date)
                    if deadline <= context.date {
                        Button("Refresh waitlist") { Task { await load() } }
                    }
                }
            }
        } else {
            Label("Waitlist position: \(waitlist.position ?? 0)", systemImage: "list.number")
        }
        Text("Offers last up to two hours, or until the game starts. The host may also confirm eligible waiting players when increasing capacity.")
            .font(.footnote).foregroundStyle(.secondary)
        Button("Leave waitlist", role: .destructive) {
            confirm(ParticipationConfirmation(route: "leave-waitlist", title: "Leave waitlist?",
                message: "You will lose your queue position and any current reserved offer.", playerID: nil))
        }
    }

    @ViewBuilder private func guestControls(_ state: ParticipationGuests, canManage: Bool) -> some View {
        if let own = state.own {
            Text("Guests count toward capacity and receive no group membership or private content access.")
                .font(.footnote).foregroundStyle(.secondary)
            if own.confirmed > 0 || own.status == "pending" {
                Text(own.confirmed > 0
                     ? "\(own.confirmed) guest place(s) confirmed"
                     : "\(own.requested ?? 0) guest place(s) awaiting approval")
                Button(own.confirmed > 0 ? "Cancel guest places" : "Withdraw guest request", role: .destructive) {
                    confirm(ParticipationConfirmation(route: "cancel-guests", title: "Cancel guest places?",
                        message: "Your own playing place stays confirmed. Only your guest places or pending guest request will be cancelled.", playerID: nil))
                }
            } else {
                Picker(selection: $guestCount) {
                    Text("1 guest").tag(1)
                    Text("2 guests").tag(2)
                    Text("3 guests").tag(3)
                } label: {
                    HStack(spacing: 10) {
                        Text("Number of guests")
                        if canManage && !state.requests.isEmpty {
                            Text("\(state.requests.count) pending")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(Brand.accent)
                                .padding(.horizontal, 9)
                                .padding(.vertical, 4)
                                .background(Brand.accent.opacity(0.16), in: Capsule())
                        }
                    }
                }
                Text(state.canAddGuestsDirectly
                     ? "Your role allows direct guest confirmation when places are available."
                     : "Requests need host approval and don’t reserve places.")
                    .font(.footnote).foregroundStyle(.secondary)
                Button(state.canAddGuestsDirectly ? "Add guest places" : "Request guest places") {
                    Task { _ = await perform("request-guests", guestCount: guestCount) }
                }
            }
        } else {
            Text("Confirm your own playing place before adding or requesting guests.")
                .font(.footnote).foregroundStyle(.secondary)
        }
        if canManage {
            Text("Guest requests").font(.headline)
            if state.requests.isEmpty { Text("No pending guest requests.").foregroundStyle(.secondary) }
            ForEach(state.requests) { request in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(request.displayName).font(.headline)
                        Text("\(request.guestCount) requested guest place(s)")
                            .font(.caption).foregroundStyle(.secondary)
                        if let requestedAt = request.requestedAt {
                            Text("Requested \(Date(timeIntervalSince1970: requestedAt / 1000).formatted(date: .abbreviated, time: .shortened))")
                                .font(.caption).foregroundStyle(.secondary)
                        }
                    }
                    Spacer()
                    Menu {
                        Button("Approve guest request") {
                            Task { _ = await perform("approve-guests", playerID: request.playerId) }
                        }
                        Button("Reject guest request", role: .destructive) {
                            confirm(ParticipationConfirmation(route: "reject-guests", title: "Reject guest request?",
                                message: "Decline guest places for \(request.displayName). Their own playing place stays confirmed.", playerID: request.playerId))
                        }
                    } label: {
                        AppToolbarIcon(title: "Guest options for \(request.displayName)", icon: "ellipsis")
                    }
                }
            }
        }
    }

    private func playerRow<Actions: View>(_ player: ParticipationPlayer, showActions: Bool, requestedAt: Double? = nil, @ViewBuilder actions: () -> Actions) -> some View {
        HStack(spacing: 12) {
            NativePlayerAvatar(playerID: player.id, displayName: player.displayName, gameID: game.id, refreshID: generation)
            VStack(alignment: .leading, spacing: 4) {
                Text(player.displayName).font(.headline)
                if let guests = player.guestCount, guests > 0 {
                    Text("\(guests) approved guest(s)").font(.caption).foregroundStyle(.secondary)
                }
                if let requestedAt {
                    Text("Requested \(Date(timeIntervalSince1970: requestedAt / 1000).formatted(date: .abbreviated, time: .shortened))")
                        .font(.caption).foregroundStyle(.secondary)
                }
            }
            Spacer()
            if showActions {
                Menu { actions() } label: {
                    AppToolbarIcon(title: "Options for \(player.displayName)", icon: "ellipsis")
                }
            }
        }
    }

    private func clear() {
        generation = UUID()
        queue = []
        participation = nil; players = []; requests = []; guests = nil
        loading = false; error = nil; actionError = nil
        guestCount = 1
    }

    @MainActor private func load() async {
        guard let playerID = account.player?.id, scenePhase == .active else { clear(); return }
        let token = UUID()
        generation = token; loading = true; error = nil; queue = []
        participation = nil; players = []; requests = []; guests = nil
        defer { if generation == token { loading = false } }
        do {
            let state: NativeGameParticipation = try await NativeCommunityAPI.shared.request("games/\(game.id)/participation")
            var roster: [ParticipationPlayer] = []
            var pending: [ParticipationPlayer] = []
            if state.isOrganizer || state.isGroupMember {
                let response: ParticipationPlayers = try await NativeCommunityAPI.shared.request("games/\(game.id)/participants")
                roster = response.players
            }
            if state.isOrganizer {
                let response: ParticipationPlayers = try await NativeCommunityAPI.shared.request("games/\(game.id)/requests")
                pending = response.players
            }
            var waiting: [ParticipationQueue.Player] = []
            if state.isGroupMember {
                let response: ParticipationQueue = try await NativeCommunityAPI.shared.request("games/\(game.id)/waitlist")
                waiting = response.players
            }
            let guestState: ParticipationGuests = try await NativeCommunityAPI.shared.request("games/\(game.id)/guests")
            let detail: CommunityGameDetail = try await NativeCommunityAPI.shared.request("games/\(game.id)")
            // Permissions can change while the roster and requests are loading.
            let current: NativeGameParticipation = try await NativeCommunityAPI.shared.request("games/\(game.id)/participation")
            guard generation == token, account.player?.id == playerID, scenePhase == .active, !Task.isCancelled else { return }
            participation = current
            queue = current.isGroupMember ? waiting : []
            // Do not retain a management queue if authority changed during loading.
            guests = ParticipationGuests(own: current.joined ? guestState.own : nil,
                requests: current.isOrganizer || current.canManageGuests == true ? guestState.requests : [],
                canAddGuestsDirectly: guestState.canAddGuestsDirectly)
            players = current.isOrganizer || current.isGroupMember ? roster : []
            requests = current.isOrganizer ? pending : []
            updated(detail.game)
        } catch {
            guard generation == token, account.player?.id == playerID, scenePhase == .active, !Task.isCancelled else { return }
            participation = nil; players = []; requests = []; guests = nil
            self.error = error.localizedDescription
            let response = error as NSError
            if response.domain == "OpenCourts" && [401, 403, 404].contains(response.code) {
                accessChanged()
            } else if let accountError = error as? NativeAccountError, case .signedOut = accountError {
                accessChanged()
            }
        }
    }

    @MainActor private func perform(_ route: String, playerID: String? = nil, reason: String? = nil, guestCount: Int? = nil) async -> Bool {
        guard !busy, let actorID = account.player?.id, participation != nil, scenePhase == .active else { return false }
        let token = generation
        busy = true; actionError = nil
        let preservesRequestSections = ["approve", "reject", "approve-guests", "reject-guests"].contains(route)
        if NativeGameParticipation.requiresManagement(route) && !preservesRequestSections {
            participation = nil; players = []; requests = []; queue = []; guests = nil
        }
        defer { busy = false }
        var body: [String: Any] = [:]
        if let playerID { body["playerId"] = playerID }
        if let reason { body["reason"] = reason }
        if let guestCount { body["guestCount"] = guestCount }
        do {
            if NativeGameParticipation.requiresManagement(route) {
                let current: NativeGameParticipation = try await NativeCommunityAPI.shared.request("games/\(game.id)/participation")
                guard generation == token, account.player?.id == actorID, scenePhase == .active, !Task.isCancelled else { return false }
                let authorized = (route == "approve-guests" || route == "reject-guests")
                    ? current.isOrganizer || current.canManageGuests == true
                    : current.isOrganizer
                guard authorized else {
                    throw NSError(domain: "OpenCourts", code: 403, userInfo: [NSLocalizedDescriptionKey: "Your game management access changed. Review the refreshed game before taking another action."])
                }
            }
            let data = try JSONSerialization.data(withJSONObject: body)
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("games/\(game.id)/\(route)", method: "POST", body: data)
            guard generation == token, account.player?.id == actorID, scenePhase == .active else { return false }
            await load()
            let succeeded = account.player?.id == actorID && scenePhase == .active
            if succeeded { store.recordValueUse() }
            return succeeded
        } catch {
            guard generation == token, account.player?.id == actorID, scenePhase == .active else { return false }
            let capacityError = error.localizedDescription.localizedCaseInsensitiveContains("not enough")
                && error.localizedDescription.localizedCaseInsensitiveContains("places")
            let fullCapacityError = capacityError
                || (route == "approve" && error.localizedDescription.localizedCaseInsensitiveContains("full"))
                || (error.localizedDescription.localizedCaseInsensitiveContains("full")
                    && error.localizedDescription.localizedCaseInsensitiveContains("guest"))
                || (error.localizedDescription.localizedCaseInsensitiveContains("available")
                    && error.localizedDescription.localizedCaseInsensitiveContains("places"))
            if fullCapacityError && ["approve", "approve-guests", "request-guests"].contains(route) {
                // Capacity failures are atomic: the pending request remains unchanged.
                // Keep the disclosure and scroll position intact while presenting the explanation.
                actionError = nil
                presentCapacityAlert(for: route)
                return false
            }
            // Mutations may have succeeded despite a lost response. Refresh before another action.
            await load()
            guard account.player?.id == actorID, scenePhase == .active else { return false }
            actionError = "\(error.localizedDescription) Refresh and check the current state before trying again."
            return false
        }
    }

    @MainActor private func presentCapacityAlert(for route: String) {
        let isJoinApproval = route == "approve"
        let isGuestApproval = route == "approve-guests"
        let isApproval = isJoinApproval || isGuestApproval
        let capacityNextStep: String
        if game.visibility == "group" {
            capacityNextStep = participation?.isOrganizer == true
                ? "Increase capacity in Group game management, then try again."
                : "Ask a group owner or co-owner to increase capacity, then try again."
        } else {
            capacityNextStep = "Increase capacity in Host controls, then try again."
        }
        let pendingRequest = isJoinApproval ? "This join request" : "This guest request"
        presentDecision(NativeGameDecision(
            title: "Not enough game places",
            message: isApproval
                ? "\(pendingRequest) is still pending. \(capacityNextStep) The request will remain available until you approve or reject it."
                : "There aren’t enough places to add these guests. No guest places were added. \(capacityNextStep)",
            confirmTitle: "OK",
            isInformational: true,
            perform: {}
        ))
    }
}

// Owned by the game-detail presenter, so scrolling participation rows cannot dismiss it.
struct NativeGameLeaveView: View {
    let isOrganizer: Bool
    let isPending: Bool
    let perform: @MainActor (String) async -> String?
    @Environment(\.dismiss) private var dismiss
    @State private var reason = ""
    @State private var busy = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Reason (optional)", text: $reason)
                    Text(isOrganizer
                         ? "You’ll remain the host. The game will continue without your playing place."
                         : "Your reason is private to the game’s authorized host managers.")
                        .font(.footnote).foregroundStyle(.secondary)
                    if reason.utf16.count > 500 { Text("Use up to 500 characters.").foregroundStyle(.red) }
                    if let error { Text(error).foregroundStyle(.red) }
                }
                Button(isPending ? "Withdraw request" : "Release playing place", role: .destructive) {
                    Task { @MainActor in
                        busy = true
                        error = await perform(reason)
                        busy = false
                        if error == nil { dismiss() }
                    }
                }
                .disabled(busy || reason.utf16.count > 500)
            }
            .disabled(busy)
            .navigationTitle(isPending ? "Withdraw request" : "Your playing place")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Keep my place") { dismiss() }.disabled(busy)
                }
            }
        }
        .interactiveDismissDisabled(busy)
    }
}
