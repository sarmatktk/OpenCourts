import SwiftUI

nonisolated enum NativeAssignableGroupRole: String, CaseIterable, Identifiable, Sendable {
    case member, organizer, coowner
    var id: String { rawValue }

    var title: LocalizedStringResource {
        switch self {
        case .member: "Member"
        case .organizer: "Organizer"
        case .coowner: "Co-owner"
        }
    }

    var explanation: LocalizedStringResource {
        switch self {
        case .member: "Join group games and participate in the group."
        case .organizer: "Approve membership requests, create group games and manage their own games."
        case .coowner: "Help manage group details, memberships and group games."
        }
    }

    var confirmationTitle: LocalizedStringResource {
        switch self {
        case .member: "Assign Member"
        case .organizer: "Assign Organizer"
        case .coowner: "Assign Co-owner"
        }
    }

    func confirmationMessage(for name: String) -> LocalizedStringResource {
        switch self {
        case .member:
            "Change \(name) to Member? They can still join group games and participate. If this removes hosting permission, their upcoming group games transfer to the primary Owner."
        case .organizer:
            "Allow \(name) to approve membership requests, create group games and manage their own games?"
        case .coowner:
            "Allow \(name) to help manage group details, memberships and group games? The primary Owner stays the Owner."
        }
    }

    var symbol: String {
        switch self {
        case .member: "person"
        case .organizer: "calendar"
        case .coowner: "person.2"
        }
    }
}

extension NativeGroupDetail {
    func canAssignMemberRole(_ player: NativeGroupMemberPage.Player, actorID: String?) -> Bool {
        membership?.role == "owner" && canRemoveMember(player, actorID: actorID)
    }
}

struct NativeGroupRoleEditor: View {
    let groupID: String
    let player: NativeGroupMemberPage.Player
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.dismiss) private var dismiss
    @State private var current: NativeGroupMemberPage.Player?
    @State private var groupName = ""
    @State private var selected: NativeAssignableGroupRole?
    @State private var loading = false
    @State private var busy = false
    @State private var needsReload = false
    @State private var error: String?
    @State private var confirming = false
    @State private var generation = UUID()

    var body: some View {
        NavigationStack {
            List {
                if let current {
                    Section {
                        Text(current.displayName).font(.title3.weight(.semibold))
                        Text(groupName).font(.subheadline).foregroundStyle(.secondary)
                        HStack {
                            Text("Current role").foregroundStyle(.secondary)
                            Spacer()
                            Text(current.roleLabel).fontWeight(.medium)
                        }.font(.subheadline)
                        if current.role == "admin" {
                            Text("Legacy Admin stays unchanged until you explicitly choose a new role.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    Section("Choose a role") {
                        ForEach(NativeAssignableGroupRole.allCases) { role in
                            NativeGroupRoleChoice(role: role, selected: selected == role,
                                current: current.role == role.rawValue) { selected = role }
                        }
                    }
                    .disabled(loading || busy || needsReload)
                    Section {
                        Text("The primary Owner stays the Owner. A group can have one Co-owner and one Organizer. To fill an occupied role, change its current holder to Member first.")
                            .font(.footnote).foregroundStyle(.secondary)
                        Button("Review role change") { confirming = true }
                            .buttonStyle(AppPrimaryButtonStyle())
                            .disabled(selected == nil || selected?.rawValue == current.role || loading || busy || needsReload)
                    }
                }
                Section {
                    if loading || busy { ProgressView(busy ? "Updating role…" : "Checking permissions…") }
                    if let error { Text(error).foregroundStyle(.red) }
                    if needsReload || (current == nil && !loading) {
                        Button("Reload current role") { Task { await load() } }.disabled(busy || loading)
                    }
                }
            }
            .listSectionSpacing(.compact)
            .navigationTitle("Member role")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(busy) }
            }
            .interactiveDismissDisabled(busy)
            .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") {
                clear()
                if account.player != nil && phase == .active { await load() }
            }
            .onDisappear { clear() }
            .alert("Confirm role change?", isPresented: $confirming) {
                if let selected {
                    Button(selected.confirmationTitle) { Task { await save(selected) } }
                }
                Button("Cancel", role: .cancel) { selected = nil }
            } message: {
                if let current, let selected {
                    Text(selected.confirmationMessage(for: current.displayName))
                }
            }
        }
    }

    private func clear() {
        generation = UUID(); current = nil; groupName = ""; selected = nil
        loading = false; needsReload = false; error = nil; confirming = false
    }

    @MainActor private func findCurrentMember() async throws -> NativeGroupMemberPage.Player {
        var cursor: String?
        var seen = Set<String>()
        repeat {
            try Task.checkCancellation()
            var query = [URLQueryItem(name: "q", value: player.displayName)]
            if let cursor { query.append(URLQueryItem(name: "cursor", value: cursor)) }
            let page: NativeGroupMemberPage = try await NativeCommunityAPI.shared.request("groups/\(groupID)/members", query: query)
            if let found = page.players.first(where: { $0.id == player.id }) { return found }
            cursor = page.next
            if let cursor, !seen.insert(cursor).inserted { throw CommunityError.invalidResponse }
        } while cursor != nil
        throw CommunityError.accessChanged
    }

    @MainActor private func load() async {
        guard !busy, let actor = account.player?.id, phase == .active else { return }
        let token = UUID()
        generation = token; loading = true; current = nil; selected = nil; error = nil
        needsReload = false; confirming = false; groupName = ""
        defer { if generation == token { loading = false } }
        do {
            let before: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard before.canAssignMemberRole(player, actorID: actor) else { throw CommunityError.accessChanged }
            let member = try await findCurrentMember()
            let after: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard after.canAssignMemberRole(member, actorID: actor) else { throw CommunityError.accessChanged }
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            current = member; groupName = after.group.name
            // Legacy Admin conversion requires an explicit choice; it is never preselected.
            selected = NativeAssignableGroupRole(rawValue: member.role)
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            self.error = error.localizedDescription
        }
    }

    @MainActor private func save(_ role: NativeAssignableGroupRole) async {
        guard !busy, !loading, !needsReload, let actor = account.player?.id,
              phase == .active, let current, role.rawValue != current.role else { return }
        let token = generation
        busy = true; confirming = false; error = nil
        defer { busy = false }
        do {
            let member = try await findCurrentMember()
            guard member.role == current.role else { throw CommunityError.accessChanged }
            let detail: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard detail.canAssignMemberRole(member, actorID: actor) else { throw CommunityError.accessChanged }
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            let body = try JSONSerialization.data(withJSONObject: ["playerId": member.id, "role": role.rawValue])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request(
                "groups/\(groupID)/role", method: "POST", body: body)
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            dismiss()
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            self.current = nil; selected = nil; groupName = ""
            needsReload = true
            self.error = "\(error.localizedDescription) Reload the current role before trying again; the change may already have completed."
        }
    }
}

private struct NativeGroupRoleChoice: View {
    let role: NativeAssignableGroupRole
    let selected: Bool
    let current: Bool
    let choose: () -> Void

    var body: some View {
        Button(action: choose) {
            HStack(alignment: .top, spacing: 12) {
                Image(systemName: role.symbol)
                    .font(.body.weight(.medium))
                    .foregroundStyle(Brand.accent)
                    .frame(width: 36, height: 36)
                    .background(Brand.accent.opacity(0.1), in: RoundedRectangle(cornerRadius: 10))
                    .accessibilityHidden(true)
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(role.title).font(.headline)
                        if current { Text("Current").font(.caption).foregroundStyle(.secondary) }
                    }
                    Text(role.explanation).font(.subheadline).foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                Image(systemName: selected ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(selected ? Brand.accent : Color.secondary)
                    .accessibilityHidden(true)
            }
            .padding(.vertical, 8)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(selected ? .isSelected : [])
    }
}
