import SwiftUI

nonisolated struct NativeGroupMetadataDraft: Equatable, Sendable {
    var name = ""
    var publicDescription = ""
    var description = ""
    var generalLocation = ""
    var skillPreference = "any"
    var visibility = "private"

    var valid: Bool {
        validText(name, maximum: 80, required: true) &&
        validText(publicDescription, maximum: 500) &&
        validText(description, maximum: 2000) &&
        validText(generalLocation, maximum: 120, required: true) &&
        ["any", "beginner", "intermediate", "advanced"].contains(skillPreference) &&
        ["public", "private"].contains(visibility)
    }

    private func validText(_ value: String, maximum: Int, required: Bool = false) -> Bool {
        value.utf16.count <= maximum &&
        (!required || !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty) &&
        !value.unicodeScalars.contains { scalar in
            scalar.value <= 8 || (11...31).contains(scalar.value) || scalar.value == 127
        }
    }

    func encoded(requestID: String? = nil, version: Int? = nil) throws -> Data {
        var fields: [String: Any] = [
            "name": name, "publicDescription": publicDescription, "description": description,
            "generalLocation": generalLocation, "skillPreference": skillPreference, "visibility": visibility
        ]
        if let requestID { fields["requestId"] = requestID }
        if let version { fields["version"] = version }
        return try JSONSerialization.data(withJSONObject: fields, options: .sortedKeys)
    }
}

struct NativeGroupEditor: View {
    private enum EditorConfirmation: Equatable {
        case discard
        case visibility
        case archive
    }

    let groupID: String?
    let completed: (String) -> Void
    @Environment(NativeAccountStore.self) private var account
    @Environment(OpenCourtsStore.self) private var store
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var phase
    @State private var draft = NativeGroupMetadataDraft()
    @State private var original = NativeGroupMetadataDraft()
    @State private var version: Int?
    @State private var actorID: String?
    @State private var pendingBody: Data?
    @State private var generation = UUID()
    @State private var loading = false
    @State private var busy = false
    @State private var ready = false
    @State private var canArchiveGroup = false
    @State private var needsRefresh = false
    @State private var error: String?
    @State private var confirmation: EditorConfirmation?

    private var dirty: Bool { draft != original }
    private var canSave: Bool {
        ready && draft.valid && !busy && !loading && !needsRefresh &&
        account.player?.id == actorID && phase == .active &&
        (groupID == nil || dirty)
    }

    var body: some View {
        NavigationStack {
            Form {
                NativeGroupPublicFields(draft: $draft)
                    .disabled(!ready || busy || pendingBody != nil || needsRefresh)
                if groupID == nil || (ready && !needsRefresh) {
                    NativeGroupMemberFields(draft: $draft, creating: groupID == nil)
                        .disabled(!ready || busy || pendingBody != nil)
                }
                Section {
                    if loading || busy { ProgressView(busy ? "Saving group…" : "Loading group…") }
                    if !draft.valid {
                        Text("Enter a group name (up to 80 characters) and general location (up to 120). Public description allows 500 characters; member description allows 2,000.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    if let error { Text(error).foregroundStyle(.red) }
                    if pendingBody != nil {
                        Text("The previous creation may have succeeded. Retry sends the exact same submission for this account. Check My Groups before starting another group.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    if needsRefresh {
                        Text("Close and reopen this editor to load current details and permissions before saving again.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    Button(pendingBody != nil ? "Retry same creation" : groupID == nil ? "Create group" : "Save changes") {
                        if groupID != nil && draft.visibility != original.visibility {
                            confirmation = .visibility
                        } else { Task { await save() } }
                    }
                    .buttonStyle(AppPrimaryButtonStyle())
                    .disabled(!canSave)
                    if !ready && !loading && !needsRefresh {
                        Button("Try loading again") { Task { await prepare() } }.disabled(busy)
                    }
                }
                if groupID != nil && ready && canArchiveGroup {
                    Section("Danger zone") {
                        Button("Archive group", role: .destructive) {
                            confirmation = .archive
                        }
                        .disabled(busy || loading || needsRefresh)
                        Text("Archive closes the group and ends member access. This cannot be undone.")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .listSectionSpacing(.compact)
            .navigationTitle(groupID == nil ? "Create group" : "Edit group")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        if dirty || pendingBody != nil { confirmation = .discard } else { dismiss() }
                    }.disabled(busy)
                }
            }
            .interactiveDismissDisabled(busy || dirty || pendingBody != nil)
            .task { await prepare() }
            .onChange(of: account.player?.id) { _, value in
                guard value != actorID else { return }
                generation = UUID(); loading = false; draft = NativeGroupMetadataDraft(); original = draft
                pendingBody = nil; ready = false; needsRefresh = true
                confirmation = nil
                error = "Your account changed. Close and reopen the form."
            }
            .onChange(of: phase) { _, value in
                if value != .active {
                    generation = UUID(); loading = false; confirmation = nil
                    if groupID != nil {
                        needsRefresh = true
                        error = "Refresh current group details before continuing."
                    }
                }
            }
            .onDisappear { generation = UUID(); pendingBody = nil; draft = NativeGroupMetadataDraft() }
            .alert(confirmation == .discard ? "Discard this draft?" :
                confirmation == .archive ? "Archive this group?" : "Change group visibility?",
                isPresented: Binding(get: { confirmation != nil }, set: { if !$0 { confirmation = nil } })) {
                if confirmation == .discard {
                    Button("Discard and close", role: .destructive) { dismiss() }
                } else if confirmation == .visibility {
                    Button("Save visibility change") { Task { await save() } }
                } else if confirmation == .archive {
                    Button("Archive group", role: .destructive) { Task { await archiveGroup() } }
                }
                Button(confirmation == .discard ? "Keep editing" : "Cancel", role: .cancel) { confirmation = nil }
            } message: {
                if confirmation == .discard {
                    Text(pendingBody != nil
                         ? "Creation may have completed. Check My Groups before creating another group."
                         : "Your unsaved group changes will be lost.")
                } else if confirmation == .archive {
                    Text("Archiving closes the group and removes it from search. Members lose access to private content and group games. This does not delete the group, but it cannot be undone.")
                } else if draft.visibility == "public" {
                    Text("The group will be public. Its name, general location and public description remain discoverable. Member details, member lists and group games still require approved membership.")
                } else {
                    Text("The group will become private. Its limited preview and cover remain public. Member details, member lists and group games still require approved membership.")
                }
            }
        }
    }

    @MainActor private func prepare() async {
        guard !busy, let actor = account.player?.id, phase == .active else { return }
        let token = UUID()
        generation = token; actorID = actor; loading = true; ready = false; error = nil
        defer { if generation == token { loading = false } }
        if groupID == nil { ready = true; return }
        do {
            guard let groupID else { return }
            let detail: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard detail.canEditMetadata, let content = detail.content else { throw CommunityError.accessChanged }
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            canArchiveGroup = detail.canArchive
            draft = NativeGroupMetadataDraft(name: detail.group.name, publicDescription: detail.group.publicDescription,
                description: content.description, generalLocation: detail.group.generalLocation,
                skillPreference: content.skillPreference, visibility: detail.group.visibility)
            original = draft; version = content.version; ready = true
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            self.error = error.localizedDescription
        }
    }

    @MainActor private func save() async {
        guard canSave, let actor = actorID else { return }
        let token = generation
        busy = true; error = nil
        defer { busy = false }
        do {
            let body: Data
            if let groupID {
                guard let version else { throw CommunityError.invalidResponse }
                let latest: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
                guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
                guard latest.canEditMetadata, latest.content?.version == version else {
                    throw NSError(domain: "OpenCourts", code: 409, userInfo: [NSLocalizedDescriptionKey: "Group details or editing access changed. Close and refresh before saving."])
                }
                body = try draft.encoded(version: version)
                let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request(
                    "groups/\(groupID)/edit", method: "POST", body: body)
                guard generation == token, account.player?.id == actor, phase == .active else { return }
                store.recordValueUse()
                completed(groupID); dismiss()
            } else {
                // Keep one immutable body and request ID across uncertain responses.
                if pendingBody == nil { pendingBody = try draft.encoded(requestID: UUID().uuidString) }
                guard let pendingBody else { throw CommunityError.invalidResponse }
                nonisolated struct Created: Decodable, Sendable { let id: String }
                let response: Created = try await NativeCommunityAPI.shared.request(
                    "groups", method: "POST", body: pendingBody)
                guard generation == token, account.player?.id == actor, phase == .active else { return }
                guard UUID(uuidString: response.id) != nil else { throw CommunityError.invalidResponse }
                store.recordValueUse()
                completed(response.id); dismiss()
            }
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            if groupID != nil {
                needsRefresh = true; ready = false; version = nil
                draft.description = ""; original.description = ""
                self.error = "\(error.localizedDescription) The save may have completed; refresh before another attempt."
            } else {
                let response = error as NSError
                if response.domain == "OpenCourts" && (400..<500).contains(response.code) && response.code != 408 {
                    pendingBody = nil
                }
                self.error = error.localizedDescription
            }
        }
    }

    @MainActor private func archiveGroup() async {
        guard let groupID, canArchiveGroup, let actor = actorID, account.player?.id == actor,
              phase == .active, !busy, !loading, !needsRefresh else { return }
        let token = generation
        busy = true
        error = nil
        defer { busy = false }
        do {
            let latest: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            guard latest.canArchive else { throw CommunityError.accessChanged }
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request(
                "groups/\(groupID)/archive", method: "POST", body: Data("{}".utf8))
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            completed(groupID)
            dismiss()
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            canArchiveGroup = false
            needsRefresh = true
            ready = false
            self.error = "\(error.localizedDescription) Close and reopen the editor to verify the group’s current status."
        }
    }
}

private struct NativeGroupPublicFields: View {
    @Binding var draft: NativeGroupMetadataDraft

    var body: some View {
        Section("Public preview") {
            TextField("Group name", text: $draft.name)
            TextField("City or general area", text: $draft.generalLocation)
            Text("Name and general location appear in search for both public and private groups. Use a city or neighborhood, never a private address.")
                .font(.footnote).foregroundStyle(.secondary)
            Picker("Visibility", selection: $draft.visibility) {
                Text("Private").tag("private")
                Text("Public").tag("public")
            }
            TextField("Public description (optional)", text: $draft.publicDescription, axis: .vertical)
                .lineLimit(3...6)
            Text("Anyone can read the public description. Member lists and all group games require approved membership in both public and private groups.")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }
}

private struct NativeGroupMemberFields: View {
    @Binding var draft: NativeGroupMetadataDraft
    let creating: Bool

    var body: some View {
        Section("Members only") {
            TextField("Member description (optional)", text: $draft.description, axis: .vertical)
                .lineLimit(4...8)
            Picker("Skill preference", selection: $draft.skillPreference) {
                Text("Any skill level").tag("any")
                Text("Beginner").tag("beginner")
                Text("Intermediate").tag("intermediate")
                Text("Advanced").tag("advanced")
            }
            Text(creating
                 ? "Only approved members can read these details. Group membership requires approval; creating a group makes you its Owner."
                 : "Only approved members can read these details. Editing group details does not change membership or roles.")
                .font(.footnote).foregroundStyle(.secondary)
        }
    }
}
