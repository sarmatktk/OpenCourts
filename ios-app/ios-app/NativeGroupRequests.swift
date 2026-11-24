import SwiftUI

nonisolated struct NativeGroupRequestPage: Decodable, Sendable {
    let players: [Player]
    let limitedTo: Int?

    struct Player: Decodable, Identifiable, Sendable {
        let id: String
        let displayName: String
        let role: String
        let updatedAt: Int?
    }
}

private struct NativeGroupRequestDecision: Identifiable {
    let player: NativeGroupRequestPage.Player
    let approve: Bool
    var id: String { player.id }
}

struct NativeGroupRequestsView: View {
    let groupID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var groupName = ""
    @State private var requests: [NativeGroupRequestPage.Player] = []
    @State private var limit = 200
    @State private var authorized = false
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var notice: String?
    @State private var decision: NativeGroupRequestDecision?
    @State private var generation = UUID()

    var body: some View {
        List {
            if authorized {
                Section {
                    Text(groupName).font(.headline)
                    Text("Approved members can view member content and group games. Approval does not reserve a playing place.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section("Pending requests") {
                    NativeNotificationOptInNudge(reason: .groupRequest)
                    ForEach(requests) { player in
                        NativeGroupRequestRow(name: player.displayName,
                            disabled: loading || busy || player.updatedAt == nil,
                            approve: { decision = NativeGroupRequestDecision(player: player, approve: true) },
                            reject: { decision = NativeGroupRequestDecision(player: player, approve: false) })
                    }
                    if requests.isEmpty { Text("No pending membership requests.") }
                    if requests.contains(where: { $0.updatedAt == nil }) {
                        Text("The service needs an update before these requests can be reviewed safely. Refresh after the service is updated.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    if requests.count >= limit {
                        Text("Showing up to \(limit) requests. Review these and refresh to load remaining requests.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
            }
            Section {
                if loading || busy { ProgressView(busy ? "Updating membership…" : "Loading requests…") }
                if let notice { Text(notice).foregroundStyle(.secondary) }
                if let error { Text(error).foregroundStyle(.red) }
                Button("Refresh requests", systemImage: "arrow.clockwise") { Task { await load() } }
                    .disabled(loading || busy)
            }
        }
        .listSectionSpacing(.compact)
        .navigationTitle("Membership requests")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(groupID)-\(account.player?.id ?? "signed-out")-\(phase)") {
            clear()
            if account.player != nil && phase == .active { await load() }
        }
        .refreshable { if !busy { await load() } }
        .onDisappear { clear() }
        .alert(decision?.approve == true ? "Approve membership?" : "Reject membership request?",
            isPresented: Binding(get: { decision != nil }, set: { if !$0 { decision = nil } }),
            presenting: decision) { selected in
                if selected.approve {
                    Button("Approve membership") { Task { await perform(selected) } }
                } else {
                    Button("Reject request", role: .destructive) { Task { await perform(selected) } }
                }
                Button("Cancel", role: .cancel) { decision = nil }
        } message: { selected in
            Text(selected.approve
                 ? "Approve \(selected.player.displayName) to access member content and group games?"
                 : "Reject \(selected.player.displayName)’s membership request? They will not gain member access.")
        }
    }

    private func clear() {
        generation = UUID(); groupName = ""; requests = []; authorized = false
        loading = false; error = nil; notice = nil; decision = nil
    }

    @MainActor private func load() async {
        guard let actor = account.player?.id, phase == .active else { clear(); return }
        let token = UUID()
        generation = token; loading = true; error = nil; notice = nil
        authorized = false; groupName = ""; requests = []; decision = nil
        defer { if generation == token { loading = false } }
        do {
            let detail: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard detail.canReviewMembershipRequests else { throw CommunityError.accessChanged }
            let page: NativeGroupRequestPage = try await NativeCommunityAPI.shared.request("groups/\(groupID)/requests")
            // Authority may change while the queue loads. Never retain names after access loss.
            let current: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard current.canReviewMembershipRequests else { throw CommunityError.accessChanged }
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            groupName = current.group.name; requests = page.players
            limit = max(1, page.limitedTo ?? 200); authorized = true
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            requests = []; authorized = false
            self.error = error.localizedDescription
        }
    }

    @MainActor private func perform(_ selected: NativeGroupRequestDecision) async {
        guard authorized, !loading, !busy, let actor = account.player?.id, phase == .active,
              let updatedAt = selected.player.updatedAt,
              requests.contains(where: { $0.id == selected.player.id && $0.updatedAt == updatedAt }) else { return }
        let token = generation
        busy = true; error = nil; notice = nil; decision = nil
        defer { busy = false }
        do {
            let body = try JSONSerialization.data(withJSONObject: [
                "playerId": selected.player.id, "requestUpdatedAt": updatedAt
            ])
            let route = selected.approve ? "approve" : "reject"
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request(
                "groups/\(groupID)/\(route)", method: "POST", body: body)
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            await load()
            guard account.player?.id == actor, phase == .active, authorized else { return }
            notice = selected.approve ? "Membership approved." : "Membership request rejected."
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            // A lost response may still have completed. Reload instead of automatically retrying a decision.
            await load()
            guard account.player?.id == actor, phase == .active, authorized else { return }
            self.error = "\(error.localizedDescription) The request list was refreshed. Check its current state before deciding again."
        }
    }
}

private struct NativeGroupRequestRow: View {
    let name: String
    let disabled: Bool
    let approve: () -> Void
    let reject: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(name).font(.headline)
            ViewThatFits(in: .horizontal) {
                HStack(spacing: 16) { actions }
                VStack(alignment: .leading, spacing: 4) { actions }
            }
        }
        .padding(.vertical, 4)
        .buttonStyle(.borderless)
    }

    @ViewBuilder private var actions: some View {
        Button("Approve", action: approve)
            .accessibilityLabel("Approve membership for \(name)")
            .frame(minHeight: 44)
            .disabled(disabled)
        Button("Reject", role: .destructive, action: reject)
            .accessibilityLabel("Reject membership request from \(name)")
            .frame(minHeight: 44)
            .disabled(disabled)
    }
}
