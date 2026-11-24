import SwiftUI

nonisolated struct NativeNotificationPreferences: Codable, Equatable, Sendable {
    var enabled: Bool
    var games: Bool
    var groups: Bool

    private enum CodingKeys: String, CodingKey { case enabled, games, groups }

    init(enabled: Bool, games: Bool, groups: Bool) {
        self.enabled = enabled
        self.games = games
        self.groups = groups
    }

    init(from decoder: Decoder) throws {
        let values = try decoder.container(keyedBy: CodingKeys.self)
        func flag(_ key: CodingKeys) throws -> Bool {
            let value = try values.decode(Int.self, forKey: key)
            guard value == 0 || value == 1 else {
                throw DecodingError.dataCorruptedError(forKey: key, in: values,
                                                       debugDescription: "Expected a 0 or 1 preference.")
            }
            return value == 1
        }
        enabled = try flag(.enabled)
        games = try flag(.games)
        groups = try flag(.groups)
    }
}

nonisolated struct NativeNotificationDevice: Decodable, Identifiable, Sendable {
    let id: String
    let transport: String
    let currentSession: Bool
    let createdAt: Double
    let updatedAt: Double

    var title: String {
        let name = transport == "webpush" ? "Browser registration" : "Device registration"
        return "\(name) · \(id.suffix(4))"
    }
}

nonisolated struct NativeNotificationSettings: Decodable, Sendable {
    let available: Bool
    let preferences: NativeNotificationPreferences?
    let devices: [NativeNotificationDevice]?

    func validated() throws -> Self {
        guard available else { return self }
        guard preferences != nil, let devices, devices.count <= 10,
              Set(devices.map(\.id)).count == devices.count,
              devices.allSatisfy({ UUID(uuidString: $0.id) != nil &&
                  $0.createdAt.isFinite && $0.updatedAt.isFinite }) else {
            throw CommunityError.invalidResponse
        }
        return self
    }
}

struct NativeNotificationPreferencesControls: View {
    @Binding var preferences: NativeNotificationPreferences
    let disabled: Bool

    var body: some View {
        Section {
            Toggle("Allow push on registered devices", isOn: $preferences.enabled)
            Toggle("Game invitations and activity", isOn: $preferences.games)
            Toggle("Group activity and discussions", isOn: $preferences.groups)
        } header: {
            Text("Account preferences")
        } footer: {
            Text("These choices apply across your registered devices. Turning push off keeps your category choices. Your in-app inbox stays available.")
        }
        .disabled(disabled)
    }
}

struct NativeNotificationSettingsView: View {
    private enum Confirmation {
        case discard
        case remove(NativeNotificationDevice)
        case removeThisIPhone
    }
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.dismiss) private var dismiss
    @Environment(\.openURL) private var openURL
    @Environment(\.communityDockHeight) private var dockHeight
    @State private var settings: NativeNotificationSettings?
    @State private var baseline: NativeNotificationPreferences?
    @State private var draft = NativeNotificationPreferences(enabled: false, games: true, groups: true)
    @State private var generation = UUID()
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var notice: String?
    @State private var confirmation: Confirmation?
    @State private var push = NativePushCoordinator.shared

    private var hasChanges: Bool { baseline.map { draft != $0 } ?? false }

    var body: some View {
        Form {
            Section("This iPhone") {
                LabeledContent("Notification permission", value: push.permission)
                if push.registeredID != nil {
                    Label("This iPhone is registered", systemImage: "checkmark.circle.fill")
                        .foregroundStyle(Brand.accent)
                } else if push.permissionDenied {
                    Button("Open iPhone Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    }
                } else if push.capability?.deliveryAvailable == true {
                    Button("Enable notifications on this iPhone") {
                        Task { await push.enable() }
                    }
                    .disabled(push.busy || push.checking)
                } else if push.capability != nil {
                    Text("Push isn’t available right now. Your in-app inbox still works.")
                        .font(.footnote).foregroundStyle(.secondary)
                } else {
                    Text("Checking iPhone notification availability…")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if push.registeredID != nil {
                    Button("Turn off on this iPhone", role: .destructive) {
                        confirmation = .removeThisIPhone
                    }
                    .disabled(push.busy || push.checking)
                }
                if push.busy || push.checking { ProgressView("Updating iPhone notifications…") }
                if let error = push.error { Text(error).font(.footnote).foregroundStyle(.red) }
                if let notice = push.notice { Text(notice).font(.footnote).foregroundStyle(.secondary) }
            }
            if loading { ProgressView("Loading notification settings…") }
            if let error {
                Section {
                    Text(error).foregroundStyle(.red)
                    Button("Reload settings") { Task { await load() } }
                        .disabled(busy || loading)
                }
            }
            if let notice { Text(notice).font(.footnote).foregroundStyle(.secondary) }
            if settings?.available == false {
                ContentUnavailableView("Push settings unavailable", systemImage: "bell.slash",
                                       description: Text("Your in-app inbox continues to work. Try refreshing settings later."))
            }
            if settings?.available == true, baseline != nil {
                NativeNotificationPreferencesControls(preferences: $draft, disabled: busy || loading)
                Section {
                    if busy {
                        ProgressView("Saving notification preferences…")
                    } else if hasChanges {
                        Label("Changes need to be saved", systemImage: "exclamationmark.circle")
                            .foregroundStyle(.orange)
                        Button("Retry saving preferences") { Task { await save() } }
                            .disabled(busy || loading || phase != .active)
                    } else if notice == "Notification preferences saved." {
                        Label("Preferences saved", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                    }
                }
                Section {
                    if let devices = settings?.devices?.filter({ $0.id != push.registeredID }), !devices.isEmpty {
                        ForEach(devices) { device in
                            VStack(alignment: .leading, spacing: 6) {
                                Text(device.title).font(.headline)
                                Text(Date(timeIntervalSince1970: device.updatedAt / 1000),
                                     format: .dateTime.month(.abbreviated).day().hour().minute())
                                    .font(.caption).foregroundStyle(.secondary)
                                if device.currentSession {
                                    Text("Registered with this sign-in session").font(.caption)
                                }
                                Button("Remove registration", role: .destructive) { confirmation = .remove(device) }
                                    .disabled(busy || loading || hasChanges)
                                    .frame(minHeight: 44)
                            }
                            .padding(.vertical, 4)
                        }
                    } else {
                        Text("No registered devices.")
                    }
                } header: {
                    Text("Registered devices")
                } footer: {
                    Text("Removing a registration stops future sends to it. It does not change browser permissions or recall notifications already sent. Save or discard preference edits before removing a registration.")
                }
            }
        }
        .contentMargins(.bottom, dockHeight, for: .scrollContent)
        .navigationTitle("Notification settings")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(hasChanges || busy)
        .interactiveDismissDisabled(hasChanges || busy)
        .toolbar {
            if hasChanges || busy {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Back") { confirmation = .discard }.disabled(busy)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Refresh", systemImage: "arrow.clockwise") {
                    Task {
                        await load()
                        await push.refreshStatus()
                    }
                }
                .disabled(busy || loading || hasChanges)
            }
        }
        .alert(confirmationTitle, isPresented: Binding(
            get: { confirmation != nil },
            set: { if !$0 { confirmation = nil } }
        )) {
            switch confirmation {
            case .some(.discard):
                Button("Discard changes", role: .destructive) { dismiss() }
                Button("Keep editing", role: .cancel) { confirmation = nil }
            case .some(.remove(let device)):
                Button("Remove registration", role: .destructive) { Task { await remove(device) } }
                Button("Cancel", role: .cancel) { confirmation = nil }
            case .some(.removeThisIPhone):
                Button("Turn off on this iPhone", role: .destructive) {
                    Task { await push.removeRegistration() }
                }
                Button("Cancel", role: .cancel) { confirmation = nil }
            case .none:
                Button("OK", role: .cancel) { confirmation = nil }
            }
        } message: {
            if case .some(.remove(let device)) = confirmation {
                Text("Stop future notifications to \(device.title)? You can register it again from that browser.")
            } else if case .some(.removeThisIPhone) = confirmation {
                Text("Push notifications will stop on this iPhone. Your account choices and other devices stay unchanged.")
            }
        }
        .task(id: account.player?.id ?? "signed-out") {
            clear()
            push.accountChanged(to: account.player?.id)
            if phase == .active {
                await load()
                await push.refreshStatus()
            }
        }
        .onChange(of: phase) { _, value in
            guard value == .active else { return }
            push.accountChanged(to: account.player?.id)
            Task { await refreshAfterAuthentication() }
        }
        .onChange(of: account.isSessionLocked) { _, locked in
            guard !locked, phase == .active else { return }
            Task { await refreshAfterAuthentication() }
        }
        .onChange(of: draft) { _, _ in
            persistPendingDraft()
            guard hasChanges, !busy, !loading, phase == .active else { return }
            Task { await save() }
        }
    }

    private var confirmationTitle: String {
        if case .some(.discard) = confirmation { return "Discard unsaved preferences?" }
        if case .some(.remove) = confirmation { return "Remove this registration?" }
        if case .some(.removeThisIPhone) = confirmation { return "Turn off notifications here?" }
        return "Confirm"
    }

    @MainActor private func clear() {
        generation = UUID()
        settings = nil
        baseline = nil
        draft = .init(enabled: false, games: true, groups: true)
        loading = false
        busy = false
        error = nil
        notice = nil
        confirmation = nil
    }

    @MainActor private func install(_ response: NativeNotificationSettings) {
        settings = response
        baseline = response.available ? response.preferences : nil
        draft = baseline ?? .init(enabled: false, games: true, groups: true)
    }

    private func pendingPreferencesKey(for actor: String) -> String {
        "OpenCourts.pendingNotificationPreferences.\(actor)"
    }

    private func pendingPreferences(for actor: String) -> NativeNotificationPreferences? {
        guard let data = UserDefaults.standard.data(forKey: pendingPreferencesKey(for: actor)) else { return nil }
        return try? JSONDecoder().decode(NativeNotificationPreferences.self, from: data)
    }

    @MainActor private func persistPendingDraft() {
        guard let actor = account.player?.id, let baseline else { return }
        let key = pendingPreferencesKey(for: actor)
        guard draft != baseline else {
            UserDefaults.standard.removeObject(forKey: key)
            return
        }
        guard let data = try? JSONEncoder().encode(draft) else { return }
        UserDefaults.standard.set(data, forKey: key)
    }

    private func clearPendingDraft(for actor: String) {
        UserDefaults.standard.removeObject(forKey: pendingPreferencesKey(for: actor))
    }

    @MainActor private func fetch() async throws -> NativeNotificationSettings {
        let response: NativeNotificationSettings = try await NativeCommunityAPI.shared.request("push/settings")
        return try response.validated()
    }

    @MainActor private func isCurrent(_ ticket: UUID, actor: String) -> Bool {
        generation == ticket && account.player?.id == actor && !Task.isCancelled
    }

    @MainActor private func load() async {
        guard !busy, !loading else { return }
        if hasChanges { await save(); return }
        guard let actor = account.player?.id, phase == .active else { return }
        generation = UUID()
        let ticket = generation
        loading = true
        defer { if generation == ticket { loading = false } }
        do {
            let response = try await fetch()
            guard isCurrent(ticket, actor: actor) else { return }
            install(response)
            var shouldRetryPending = false
            if response.available, let serverPreferences = response.preferences,
               let pending = pendingPreferences(for: actor) {
                if pending == serverPreferences {
                    clearPendingDraft(for: actor)
                } else {
                    draft = pending
                    shouldRetryPending = true
                }
            }
            loading = false
            if shouldRetryPending { await save() }
        } catch {
            guard isCurrent(ticket, actor: actor) else { return }
            loading = false
            self.error = error.localizedDescription
        }
    }

    @MainActor private func refreshAfterAuthentication() async {
        // The scene can become active before Face ID restores the in-memory
        // credential. Wait for an overlapping failed load to finish, then fetch
        // the server's authoritative choices or retry a persisted draft.
        for _ in 0..<20 where loading {
            try? await Task.sleep(for: .milliseconds(50))
        }
        guard phase == .active, !busy else { return }
        error = nil
        if hasChanges { await save() } else { await load() }
        await push.refreshStatus()
    }

    @MainActor private func save() async {
        guard !busy, !loading, hasChanges, let previous = baseline,
              let actor = account.player?.id, phase == .active else { return }
        let ticket = generation
        let desired = draft
        busy = true
        error = nil
        notice = nil
        var submitted = false
        defer { if generation == ticket { busy = false } }
        do {
            let current = try await fetch()
            guard isCurrent(ticket, actor: actor) else { return }
            guard current.available, current.preferences == previous else {
                install(current)
                clearPendingDraft(for: actor)
                error = "Settings changed. Review the current preferences before saving again."
                return
            }
            submitted = true
            let result: Acknowledgement = try await NativeCommunityAPI.shared.request(
                "push/preferences", method: "PATCH", body: try JSONEncoder().encode(desired))
            guard isCurrent(ticket, actor: actor) else { return }
            guard result.ok else { throw CommunityError.invalidResponse }
            let verified = try await fetch()
            guard isCurrent(ticket, actor: actor) else { return }
            install(verified)
            clearPendingDraft(for: actor)
            notice = verified.available && verified.preferences == desired
                ? "Notification preferences saved."
                : "Settings changed after saving. Review the current settings."
        } catch {
            guard isCurrent(ticket, actor: actor) else { return }
            // Keep the user's selection visible when a request fails or the app
            // backgrounds. They can retry once the app is active again.
            self.error = submitted
                ? "Save could not be confirmed. Your choices are still here; retry to check and save them."
                : "Current settings could not be checked. Your choices are still here; retry when connected."
        }
    }

    @MainActor private func remove(_ device: NativeNotificationDevice) async {
        guard !busy, !loading, !hasChanges, let actor = account.player?.id, phase == .active else { return }
        let ticket = generation
        busy = true
        error = nil
        notice = nil
        var submitted = false
        defer { if generation == ticket { busy = false } }
        do {
            let current = try await fetch()
            guard isCurrent(ticket, actor: actor) else { return }
            guard current.available else { install(current); return }
            guard current.devices?.contains(where: { $0.id == device.id }) == true else {
                install(current)
                notice = "This registration is already removed."
                return
            }
            submitted = true
            let result: Acknowledgement = try await NativeCommunityAPI.shared.request(
                "push/devices", method: "DELETE", body: try JSONEncoder().encode(RemoveRequest(id: device.id)))
            guard isCurrent(ticket, actor: actor) else { return }
            guard result.ok else { throw CommunityError.invalidResponse }
            let verified = try await fetch()
            guard isCurrent(ticket, actor: actor) else { return }
            install(verified)
            notice = verified.available && verified.devices?.contains(where: { $0.id == device.id }) == false
                ? "Registration removed."
                : "Removal could not be confirmed. Refresh settings to check its status."
        } catch {
            guard isCurrent(ticket, actor: actor) else { return }
            settings = nil
            baseline = nil
            draft = .init(enabled: false, games: true, groups: true)
            self.error = submitted
                ? "Removal could not be confirmed. Reload settings before trying again."
                : "Current registrations could not be checked. Reload settings before removing one."
        }
    }

    nonisolated private struct Acknowledgement: Decodable, Sendable { let ok: Bool }
    nonisolated private struct RemoveRequest: Encodable { let id: String }
}
