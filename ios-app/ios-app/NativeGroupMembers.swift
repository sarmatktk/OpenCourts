import SwiftUI

nonisolated struct NativeGroupMemberPage: Decodable, Sendable {
    let players: [Player]
    let next: String?

    struct Player: Decodable, Identifiable, Sendable {
        let id: String
        let displayName: String
        let role: String

        var roleLabel: LocalizedStringResource {
            switch role {
            case "owner": "Owner"
            case "coowner": "Co-owner"
            case "organizer": "Organizer"
            case "admin": "Legacy Admin"
            default: "Member"
            }
        }
    }
}

extension NativeGroupDetail {
    var canViewMembers: Bool {
        !archived && content != nil && membership?.status == "active"
    }

    // Presentation only. The remove endpoint resolves current authority and target role again.
    func canRemoveMember(_ player: NativeGroupMemberPage.Player, actorID: String?) -> Bool {
        guard canViewMembers, let actorID, player.id != actorID, player.role != "owner",
              ["member", "organizer", "coowner", "admin"].contains(player.role) else { return false }
        if membership?.role == "owner" { return true }
        return ["coowner", "admin"].contains(membership?.role ?? "") &&
            ["member", "organizer"].contains(player.role)
    }
}

struct NativeGroupMembersView: View {
    let groupID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var query = ""
    @State private var appliedQuery = ""
    @State private var detail: NativeGroupDetail?
    @State private var players: [NativeGroupMemberPage.Player] = []
    @State private var next: String?
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var notice: String?
    @State private var removing: NativeGroupMemberPage.Player?
    @State private var editingRole: NativeGroupMemberPage.Player?
    @State private var generation = UUID()

    var body: some View {
        List {
            Section {
                HStack(spacing: 8) {
                    TextField("Find a member by name", text: $query)
                        .textFieldStyle(.plain)
                        .textInputAutocapitalization(.words)
                        .submitLabel(.search)
                        .disabled(busy)
                        .onSubmit { Task { await load() } }
                        .onChange(of: query) { _, _ in
                            if query != appliedQuery { invalidateResults() }
                        }
                        .padding(.leading, 12)
                        .frame(minHeight: 44)
                    Rectangle()
                        .fill(Color.secondary.opacity(0.18))
                        .frame(width: 1, height: 24)
                    Button {
                        Task { await load() }
                    } label: {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 17, weight: .semibold))
                            .foregroundStyle(Brand.accent)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Search members")
                    .disabled(loading || busy || query.utf16.count > 80)
                }
                .background(Brand.surface, in: RoundedRectangle(cornerRadius: 10))
                .overlay {
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                }
                .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                if query.utf16.count > 80 {
                    Text("Search with up to 80 characters.").font(.footnote).foregroundStyle(.red)
                }
            }
            if let detail {
                Section("Members") {
                    ForEach(players) { player in
                        NativeGroupMemberRow(player: player, refreshID: generation,
                            canRemove: detail.canRemoveMember(player, actorID: account.player?.id),
                            canAssign: detail.canAssignMemberRole(player, actorID: account.player?.id),
                            disabled: loading || busy, remove: { removing = player },
                            assign: { editingRole = player })
                            .listRowInsets(EdgeInsets(top: 0, leading: 16, bottom: 0, trailing: 16))
                    }
                    if players.isEmpty && !loading { Text("No members match this search.") }
                    if next != nil {
                        Button("Load more members") { Task { await load(more: true) } }
                            .disabled(loading || busy)
                    }
                }
            }
            Section {
                if loading || busy { ProgressView(busy ? "Removing member…" : "Loading members…") }
                if let notice { Text(notice).foregroundStyle(.secondary) }
                if let error { Text(error).foregroundStyle(.red) }
                Button("Refresh members", systemImage: "arrow.clockwise") { Task { await load() } }
                    .disabled(loading || busy || query.utf16.count > 80)
            }
        }
        .listSectionSpacing(.compact)
        .contentMargins(.top, 0, for: .scrollContent)
        .navigationTitle("Group members")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(groupID)-\(account.player?.id ?? "signed-out")-\(phase)") {
            clear()
            if account.player != nil && phase == .active { await load() }
        }
        .refreshable { if !busy { await load() } }
        .onDisappear { clear() }
        .sheet(item: $editingRole, onDismiss: { Task { await load() } }) { player in
            NativeGroupRoleEditor(groupID: groupID, player: player).environment(account)
        }
        .alert("Remove this member?", isPresented: Binding(
            get: { removing != nil }, set: { if !$0 { removing = nil } }
        ), presenting: removing) { player in
            Button("Remove member", role: .destructive) { Task { await remove(player) } }
            Button("Cancel", role: .cancel) { removing = nil }
        } message: { player in
            Text("Remove \(player.displayName) from the group? They will lose member and group-game access. Their future places and guests will be released. Any hosted-game transfer is handled automatically.")
        }
    }

    private func invalidateResults() {
        generation = UUID(); players = []; next = nil; detail = nil
        loading = false; error = nil; notice = nil; removing = nil; editingRole = nil
    }

    private func clear() {
        invalidateResults(); query = ""; appliedQuery = ""
    }

    @MainActor private func load(more: Bool = false) async {
        guard !busy, let actor = account.player?.id, phase == .active, query.utf16.count <= 80 else { return }
        if more && (loading || next == nil || query != appliedQuery) { return }
        let token = UUID()
        let search = query
        let cursor = more ? next : nil
        generation = token; loading = true; error = nil; notice = nil; removing = nil
        if !more { players = []; next = nil; detail = nil }
        defer { if generation == token { loading = false } }
        do {
            let before: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard before.canViewMembers else { throw CommunityError.accessChanged }
            var items = [URLQueryItem(name: "q", value: search)]
            if let cursor { items.append(URLQueryItem(name: "cursor", value: cursor)) }
            let page: NativeGroupMemberPage = try await NativeCommunityAPI.shared.request("groups/\(groupID)/members", query: items)
            let current: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard current.canViewMembers else { throw CommunityError.accessChanged }
            guard generation == token, account.player?.id == actor, phase == .active, query == search, !Task.isCancelled else { return }
            var ids = Set(players.map(\.id))
            players += page.players.filter { ids.insert($0.id).inserted }
            next = page.next; appliedQuery = search; detail = current
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            players = []; next = nil; detail = nil
            self.error = error.localizedDescription
        }
    }

    @MainActor private func remove(_ player: NativeGroupMemberPage.Player) async {
        guard !busy, !loading, let actor = account.player?.id, phase == .active,
              detail?.canRemoveMember(player, actorID: actor) == true,
              players.contains(where: { $0.id == player.id }) else { return }
        let token = generation
        busy = true; error = nil; notice = nil; removing = nil
        defer { busy = false }
        var failure: String?
        do {
            let body = try JSONSerialization.data(withJSONObject: ["playerId": player.id])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request(
                "groups/\(groupID)/remove", method: "POST", body: body)
        } catch { failure = error.localizedDescription }
        guard generation == token, account.player?.id == actor, phase == .active else { return }
        // Never retry an uncertain removal automatically. Reload authorization and the first page.
        busy = false
        await load()
        guard account.player?.id == actor, phase == .active, detail != nil else { return }
        if let failure {
            error = "\(failure) The directory was refreshed. Check current membership before trying again."
        } else {
            notice = "Member removed."
        }
    }
}

private struct NativeGroupMemberRow: View {
    let player: NativeGroupMemberPage.Player
    @Environment(\.colorScheme) private var colorScheme
    let refreshID: UUID
    let canRemove: Bool
    let canAssign: Bool
    let disabled: Bool
    let remove: () -> Void
    let assign: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            NativePlayerAvatar(playerID: player.id, displayName: player.displayName, refreshID: refreshID)
            VStack(alignment: .leading, spacing: 4) {
                Text(player.displayName).font(.headline)
                Text(player.roleLabel).font(.caption)
                    .foregroundStyle(NativeGroupCategoryPalette.color(for: player.role, colorScheme: colorScheme))
            }
            Spacer(minLength: 0)
            if canRemove || canAssign {
                Menu {
                    if canAssign {
                        Button("Change role", systemImage: "person.badge.key", action: assign)
                    }
                    if canRemove {
                        Button("Remove from group", role: .destructive, action: remove)
                    }
                } label: {
                    AppToolbarIcon(title: "Member options for \(player.displayName)", icon: "ellipsis")
                }
                .disabled(disabled)
            }
        }
        .frame(minHeight: 44)
    }
}
