import SwiftUI

nonisolated enum NativeGroupInvitationAddress {
    static func token(from address: String, origin: URL) -> String? {
        guard let parts = URLComponents(string: address.trimmingCharacters(in: .whitespacesAndNewlines)),
              parts.scheme == origin.scheme, parts.host == origin.host, parts.port == origin.port,
              parts.user == nil, parts.password == nil, parts.query == nil,
              parts.path == "/play-together/invitation",
              let token = parts.fragment, token.count == 64,
              token.unicodeScalars.allSatisfy({ CharacterSet(charactersIn: "0123456789abcdef").contains($0) })
        else { return nil }
        return token
    }
}

nonisolated struct NativeGroupInvitationPage: Decodable, Sendable {
    let invitations: [Invitation]
    struct Invitation: Decodable, Identifiable, Sendable {
        let id: String
        let createdAt: Double
        let expiresAt: Double?
        let revokedAt: Double?
    }
}

nonisolated private enum GroupInvitationExpiry: String, CaseIterable, Identifiable {
    case day, week, month, never
    var id: String { rawValue }
    var days: Int? {
        switch self {
        case .day: 1
        case .week: 7
        case .month: 30
        case .never: nil
        }
    }
    var title: LocalizedStringResource {
        switch self {
        case .day: "After 1 day"
        case .week: "After 7 days"
        case .month: "After 30 days"
        case .never: "No expiry"
        }
    }
}

extension NativeGroupDetail {
    var canManageInvitations: Bool {
        canViewMembers && ["owner", "coowner"].contains(membership?.role ?? "")
    }
}

struct NativeGroupInvitationsView: View {
    let groupID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var groupName = ""
    @State private var invitations: [NativeGroupInvitationPage.Invitation] = []
    @State private var expiry: GroupInvitationExpiry = .week
    @State private var createdURL: URL?
    @State private var revoking: NativeGroupInvitationPage.Invitation?
    @State private var authorized = false
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var notice: String?
    @State private var generation = UUID()

    var body: some View {
        List {
            if authorized {
                Section {
                    Text(groupName).font(.title3.weight(.semibold))
                    Label("Membership approval required", systemImage: "person.badge.clock")
                        .font(.subheadline).foregroundStyle(.secondary)
                    Text("Share a forwardable membership link. It is not addressed to one player and does not invite anyone to a game.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                Section("Create invitation") {
                    Picker("Expires", selection: $expiry) {
                        ForEach(GroupInvitationExpiry.allCases) { option in Text(option.title).tag(option) }
                    }
                    .disabled(loading || busy)
                    Button("Create invitation link", systemImage: "link") { Task { await mutate() } }
                        .buttonStyle(AppPrimaryButtonStyle())
                        .disabled(loading || busy)
                    if let createdURL {
                        ShareLink(item: createdURL) { Label("Share new invitation", systemImage: "square.and.arrow.up") }
                            .frame(minHeight: 44)
                        Text("Share now. For security, the complete address is only available when created.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                }
                Section("Recent invitations") {
                    ForEach(invitations) { invitation in
                        NativeGroupInvitationRow(invitation: invitation, disabled: loading || busy) {
                            revoking = invitation
                        }
                    }
                    if invitations.isEmpty { Text("No invitation links yet.") }
                    Text("Showing up to 50 recent links. Links also stop working if their creator loses invitation permissions or the group is archived.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
            Section {
                if loading || busy { ProgressView(busy ? "Updating invitation…" : "Loading invitations…") }
                if let notice { Text(notice).foregroundStyle(.secondary) }
                if let error { Text(error).foregroundStyle(.red) }
                Button("Refresh invitations", systemImage: "arrow.clockwise") { Task { _ = await load() } }
                    .disabled(loading || busy)
            }
        }
        .listSectionSpacing(.compact)
        .navigationTitle("Group invitations")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(groupID)-\(account.player?.id ?? "signed-out")-\(phase)") {
            clear()
            if account.player != nil && phase == .active { _ = await load() }
        }
        .refreshable { if !busy { _ = await load() } }
        .onDisappear { clear() }
        .alert("Revoke this invitation?", isPresented: Binding(
            get: { revoking != nil }, set: { if !$0 { revoking = nil } }
        ), presenting: revoking) { invitation in
            Button("Revoke invitation", role: .destructive) { Task { await mutate(revoke: invitation.id) } }
            Button("Cancel", role: .cancel) { revoking = nil }
        } message: { _ in
            Text("The link will stop accepting new uses. Existing approved members and pending membership requests stay unchanged.")
        }
    }

    private func clear() {
        generation = UUID(); groupName = ""; invitations = []; createdURL = nil
        revoking = nil; authorized = false; loading = false; error = nil; notice = nil
    }

    @MainActor private func load() async -> Bool {
        guard !busy, let actor = account.player?.id, phase == .active else { return false }
        let token = UUID()
        generation = token; loading = true; authorized = false; groupName = ""
        invitations = []; createdURL = nil; revoking = nil; error = nil; notice = nil
        defer { if generation == token { loading = false } }
        do {
            let before: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard before.canManageInvitations else { throw CommunityError.accessChanged }
            let page: NativeGroupInvitationPage = try await NativeCommunityAPI.shared.request("groups/\(groupID)/invitations")
            let after: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard after.canManageInvitations else { throw CommunityError.accessChanged }
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return false }
            groupName = after.group.name; invitations = page.invitations; authorized = true
            return true
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return false }
            self.error = error.localizedDescription
            return false
        }
    }

    @MainActor private func mutate(revoke: String? = nil) async {
        guard authorized, !busy, !loading, let actor = account.player?.id, phase == .active else { return }
        if let revoke, !invitations.contains(where: { $0.id == revoke }) { return }
        let token = generation
        busy = true; error = nil; notice = nil; createdURL = nil; revoking = nil
        defer { busy = false }
        var address: URL?
        var failure: String?
        do {
            let body: [String: Any]
            if let revoke { body = ["invitationId": revoke] }
            else { body = ["expiresInDays": expiry.days.map { $0 as Any } ?? NSNull()] }
            nonisolated struct Response: Decodable, Sendable { let url: String? }
            let route = revoke == nil ? "invitations" : "revoke-invitation"
            let response: Response = try await NativeCommunityAPI.shared.request(
                "groups/\(groupID)/\(route)", method: "POST", body: try JSONSerialization.data(withJSONObject: body))
            guard revoke != nil || response.url != nil else { throw CommunityError.invalidResponse }
            if let raw = response.url {
                guard NativeGroupInvitationAddress.token(from: raw, origin: NativeCommunityAPI.origin) != nil,
                      let url = URL(string: raw) else { throw CommunityError.invalidResponse }
                address = url
            }
        } catch { failure = error.localizedDescription }
        guard generation == token, account.player?.id == actor, phase == .active else { return }
        // Creation has no idempotency contract. Refresh after uncertain responses; never retry automatically.
        busy = false
        let refreshed = await load()
        guard refreshed, account.player?.id == actor, phase == .active, authorized else { return }
        if let failure {
            error = "\(failure) Review the refreshed list before trying again; a lost response may still have completed."
        } else {
            createdURL = address
            notice = revoke == nil ? "Invitation created. Membership still requires approval." : "Invitation revoked."
        }
    }
}

private struct NativeGroupInvitationRow: View {
    let invitation: NativeGroupInvitationPage.Invitation
    let disabled: Bool
    let revoke: () -> Void

    var body: some View {
        TimelineView(.periodic(from: .now, by: 60)) { context in
            let expiry = invitation.expiresAt.map { Date(timeIntervalSince1970: $0 / 1000) }
            let expired = expiry.map { $0 <= context.date } ?? false
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Text("Membership link").font(.headline)
                    Spacer()
                    Text(String(invitation.id.prefix(6))).font(.caption.monospaced()).foregroundStyle(.secondary)
                }
                Text(invitation.revokedAt != nil ? "Revoked" : expired ? "Expired" : "Not revoked")
                    .font(.subheadline).foregroundStyle(.secondary)
                Text("Created \(Date(timeIntervalSince1970: invitation.createdAt / 1000).formatted(date: .abbreviated, time: .shortened))")
                    .font(.caption).foregroundStyle(.secondary)
                if let expiry {
                    Text("Expires \(expiry.formatted(date: .abbreviated, time: .shortened))").font(.caption).foregroundStyle(.secondary)
                } else {
                    Text("No expiry").font(.caption).foregroundStyle(.secondary)
                }
                if invitation.revokedAt == nil && !expired {
                    Button("Revoke", role: .destructive, action: revoke).frame(minHeight: 44).disabled(disabled)
                }
            }
            .padding(.vertical, 4)
        }
    }
}

struct NativeGroupInvitationReader: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @State private var address = ""
    @State private var preview: CommunityGroup?
    @State private var previewToken: String?
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var destinationID: String?
    @State private var showingGroup = false
    @State private var generation = UUID()

    var body: some View {
        Form {
            Section("Invitation address") {
                TextField("Paste group invitation link", text: $address, axis: .vertical)
                    .textInputAutocapitalization(.never).autocorrectionDisabled()
                    .privacySensitive().disabled(busy)
                    .onChange(of: address) { _, _ in
                        generation = UUID(); preview = nil; previewToken = nil; error = nil; loading = false
                    }
                Button("Preview invitation", systemImage: "link") { Task { await loadPreview() } }
                    .buttonStyle(AppPrimaryButtonStyle())
                    .disabled(loading || busy || NativeGroupInvitationAddress.token(from: address, origin: NativeCommunityAPI.origin) == nil)
                if loading { ProgressView("Checking invitation…") }
                if let error { Text(error).foregroundStyle(.red) }
            }
            if let preview {
                Section {
                    Text(preview.name).font(.title3.weight(.semibold))
                    AppLocationLabel(title: preview.generalLocation)
                    Text(preview.visibility == "private" ? "Private group" : "Public group")
                        .font(.caption).foregroundStyle(.secondary)
                    if !preview.publicDescription.isEmpty { Text(preview.publicDescription) }
                    Text("Request membership to join. Member content, member lists and all group games stay unavailable until approval.")
                        .font(.footnote).foregroundStyle(.secondary)
                    if account.player != nil {
                        Button("Request membership") { Task { await accept() } }
                            .buttonStyle(AppPrimaryButtonStyle()).disabled(busy || loading)
                    } else {
                        NavigationLink { NativeAccountView(account: account) } label: { Text("Sign in to continue") }
                        Text("After signing in, paste this invitation again.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    if busy { ProgressView("Requesting membership…") }
                }
            } else if !loading {
                Section {
                    Text("Paste a membership link shared by a group Owner or Co-owner. Game invitations use a separate address.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            }
        }
        .listSectionSpacing(.compact)
        .navigationTitle("Group invitation")
        .navigationBarTitleDisplayMode(.inline)
        .navigationDestination(isPresented: $showingGroup) {
            if let destinationID { NativeGroupMembershipView(groupID: destinationID) }
        }
        .onChange(of: account.player?.id) { _, _ in clear() }
        .onChange(of: phase) { _, value in if value != .active { clear() } }
        .onDisappear { generation = UUID(); address = ""; preview = nil; previewToken = nil; error = nil; loading = false }
    }

    private func clear() {
        generation = UUID(); address = ""; preview = nil; previewToken = nil
        loading = false; error = nil; destinationID = nil; showingGroup = false
    }

    @MainActor private func loadPreview() async {
        guard !busy, !loading, phase == .active,
              let token = NativeGroupInvitationAddress.token(from: address, origin: NativeCommunityAPI.origin) else { return }
        let ticket = UUID()
        generation = ticket; loading = true; error = nil; preview = nil; previewToken = nil
        defer { if generation == ticket { loading = false } }
        do {
            nonisolated struct Preview: Decodable, Sendable { let group: CommunityGroup }
            let body = try JSONSerialization.data(withJSONObject: ["token": token])
            let response: Preview = try await NativeCommunityAPI.shared.request(
                "groups/invitation-preview", method: "POST", body: body, needsSession: false)
            guard generation == ticket, phase == .active, !Task.isCancelled else { return }
            preview = response.group; previewToken = token
        } catch {
            guard generation == ticket, phase == .active, !Task.isCancelled else { return }
            self.error = error.localizedDescription
        }
    }

    @MainActor private func accept() async {
        guard !busy, !loading, let actor = account.player?.id, phase == .active,
              let token = previewToken, let preview,
              NativeGroupInvitationAddress.token(from: address, origin: NativeCommunityAPI.origin) == token else { return }
        let ticket = generation
        busy = true; error = nil
        defer { busy = false }
        do {
            nonisolated struct Response: Decodable, Sendable { let groupId: String }
            let body = try JSONSerialization.data(withJSONObject: ["token": token])
            let response: Response = try await NativeCommunityAPI.shared.request(
                "groups/invitation-accept", method: "POST", body: body)
            guard generation == ticket, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            guard response.groupId == preview.id, UUID(uuidString: response.groupId) != nil else { throw CommunityError.invalidResponse }
            destinationID = response.groupId; showingGroup = true
        } catch {
            guard generation == ticket, account.player?.id == actor, phase == .active else { return }
            self.preview = nil; previewToken = nil
            self.error = "\(error.localizedDescription) The request may already exist. Check My Groups or preview the invitation again."
        }
    }
}
