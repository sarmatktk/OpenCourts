import SwiftUI
import UIKit
import UserNotifications
import Security

nonisolated struct NativePushCapability: Decodable, Sendable {
    let available: Bool
    let deliveryAvailable: Bool
    let environment: String?
    let playerId: String?
    let preferences: NativeNotificationPreferences?
    let devices: [NativeNotificationDevice]?

    func validated(for actor: String? = nil) throws -> Self {
        guard available else {
            guard !deliveryAvailable else { throw CommunityError.invalidResponse }
            return self
        }
        guard ["sandbox", "production"].contains(environment ?? ""), let playerId, !playerId.isEmpty, preferences != nil, let devices,
              devices.count <= 10, Set(devices.map(\.id)).count == devices.count,
              devices.allSatisfy({ UUID(uuidString: $0.id) != nil && $0.transport == "apns" }) else {
            throw CommunityError.invalidResponse
        }
        if let actor, playerId != actor { throw CommunityError.accessChanged }
        return self
    }
}

nonisolated struct NativePushReceipt: Codable, Sendable {
    let registrationID: String
    let actorID: String
    let sessionFingerprint: String

    func permits(_ payload: NativePushPayload, actor: String, fingerprint: String) -> Bool {
        actorID == actor && sessionFingerprint == fingerprint &&
        UUID(uuidString: registrationID) == payload.registrationID
    }
}

nonisolated struct NativePushInstallation: Codable, Sendable {
    let secret: String
    var receipt: NativePushReceipt?
}

nonisolated struct NativePushReview: Decodable, Sendable {
    let registrationId: String?
    let currentSession: Bool

    func validated() throws -> Self {
        guard registrationId.map({ UUID(uuidString: $0) != nil }) ?? !currentSession else {
            throw CommunityError.invalidResponse
        }
        return self
    }
}

nonisolated struct NativePushRegistrationRequest: Encodable, Sendable {
    let deviceToken: String
    let installationId: String
    let consent: Bool
    let environment: String
    let topic: String
    let expectedRegistrationId: String?

    init(deviceToken: String, installationId: String, consent: Bool, environment: String,
         expectedRegistrationId: String?) {
        self.deviceToken = deviceToken
        self.installationId = installationId
        self.consent = consent
        self.environment = environment
        self.topic = "us.opencourts.ios"
        self.expectedRegistrationId = expectedRegistrationId
    }

    static func hex(_ data: Data) -> String {
        data.map { String(format: "%02x", $0) }.joined()
    }
}

nonisolated private enum NativePushKeychain {
    private static var query: [String: Any] {
        [kSecClass as String: kSecClassGenericPassword,
         kSecAttrService as String: "OpenCourts.push-installation.\(NativeCommunityAPI.origin.absoluteString).v1",
         kSecAttrAccount as String: "installation"]
    }

    static func read() throws -> NativePushInstallation? {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &item)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = item as? Data else { throw NativeAccountError.storage }
        let value = try JSONDecoder().decode(NativePushInstallation.self, from: data)
        guard value.secret.range(of: "^[a-f0-9]{64}$", options: .regularExpression) != nil else {
            throw NativeAccountError.storage
        }
        return value
    }

    static func save(_ value: NativePushInstallation) throws {
        let data = try JSONEncoder().encode(value)
        let update = [kSecValueData as String: data]
        let status = SecItemUpdate(query as CFDictionary, update as CFDictionary)
        if status == errSecItemNotFound {
            var request = query
            request[kSecValueData as String] = data
            request[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            guard SecItemAdd(request as CFDictionary, nil) == errSecSuccess else { throw NativeAccountError.storage }
        } else if status != errSecSuccess {
            throw NativeAccountError.storage
        }
    }

    static func installation() throws -> NativePushInstallation {
        if let value = try read() { return value }
        var bytes = [UInt8](repeating: 0, count: 32)
        guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
            throw NativeAccountError.storage
        }
        let value = NativePushInstallation(secret: NativePushRegistrationRequest.hex(Data(bytes)), receipt: nil)
        try save(value)
        return value
    }

    static func clearReceipt() throws {
        guard var value = try read() else { return }
        value.receipt = nil
        try save(value)
    }
}

@MainActor
final class NativePushAppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        return true
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping @Sendable (UNNotificationPresentationOptions) -> Void) {
        Task { @MainActor in
            // Foreground alerts never display unverified payload text or interrupt an edit.
            completionHandler([])
        }
    }

    nonisolated func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping @Sendable () -> Void) {
        let opensNotification = response.actionIdentifier == UNNotificationDefaultActionIdentifier
        let payload = NativePushPayload(userInfo: response.notification.request.content.userInfo)
        Task { @MainActor in
            if opensNotification {
                NativePushCoordinator.shared.queueTap(payload)
            }
            // UIKit updates its snapshot when this finishes. The async delegate bridge
            // completed off-main on the physical phone and triggered a UIKit assertion.
            completionHandler()
        }
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NativePushCoordinator.shared.receivedToken(deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NativePushCoordinator.shared.registrationFailed()
    }
}

@MainActor
@Observable
final class NativePushCoordinator {
    static let shared = NativePushCoordinator()
    private(set) var tapID: UUID?
    private var tappedPayload: NativePushPayload?

    func queueTap(_ payload: NativePushPayload?) {
        tappedPayload = payload
        tapID = UUID()
    }

    func takeTap() -> NativePushPayload? {
        defer { tappedPayload = nil; tapID = nil }
        return tappedPayload
    }

    func authorizedDestination(_ payload: NativePushPayload?, actor: String) async -> NativePushPayload? {
        let ticket = generation
        guard let payload, let installation = try? NativePushKeychain.read(),
              let receipt = installation.receipt,
              let fingerprint = await NativeCommunityAPI.shared.sessionFingerprint(),
              receipt.permits(payload, actor: actor, fingerprint: fingerprint) else { return nil }
        do {
            let capability = try await fetch(fingerprint, actor: actor)
            guard capability.available, capability.devices?.contains(where: {
                UUID(uuidString: $0.id) == payload.registrationID
            }) == true else { return nil }
            let reviewed = try await review(installation, fingerprint: fingerprint)
            guard reviewed.currentSession, reviewed.registrationId.flatMap(UUID.init(uuidString:)) == payload.registrationID,
                  current(ticket, actor: actor),
                  await NativeCommunityAPI.shared.sessionFingerprint() == fingerprint else { return nil }
            return payload
        } catch { return nil }
    }

    private(set) var capability: NativePushCapability?
    private(set) var permission = "Checking permission…"
    private(set) var permissionDenied = false
    private(set) var badgePermission = "Checking…"
    private(set) var badgesDisabled = false
    private(set) var registeredID: String?
    private(set) var busy = false
    private(set) var checking = false
    private(set) var error: String?
    private(set) var notice: String?
    private var actorID: String?
    private var active = false
    private var generation = UUID()
    private var observedSession: String?
    private var pending: Attempt?
    private var token: Data?
    private var deadline: Task<Void, Never>?

    nonisolated private struct Attempt: Sendable {
        let ticket: UUID
        let actor: String
        let fingerprint: String
        let installation: NativePushInstallation
        let expectedID: String?
        let consent: Bool
        let environment: String
    }
    nonisolated private struct InstallationRequest: Encodable { let installationId: String }
    nonisolated private struct DeleteRequest: Encodable { let id: String }
    nonisolated private struct Acknowledgement: Decodable, Sendable {
        let ok: Bool
        let id: String?
        let deliveryAvailable: Bool?
    }

    func accountChanged(to actor: String?) {
        if actorID != actor {
            if actorID != nil {
                try? NativePushKeychain.clearReceipt()
                tappedPayload = nil
                tapID = nil
            }
            actorID = actor
            observedSession = nil
            invalidate()
        }
        Task { await refreshStatus(automaticallyRefreshToken: true, onlyIfSessionChanged: true) }
    }

    func sceneChanged(_ phase: ScenePhase) {
        active = phase == .active
        if phase == .background { invalidate() }
        if phase == .active {
            if token != nil, pending != nil { submitToken() }
            else { Task { await refreshStatus(automaticallyRefreshToken: true) } }
        }
    }

    private func invalidate() {
        generation = UUID()
        deadline?.cancel()
        deadline = nil
        pending = nil
        token = nil
        capability = nil
        registeredID = nil
        busy = false
        checking = false
        error = nil
        notice = nil
    }

    private func current(_ ticket: UUID, actor: String) -> Bool {
        generation == ticket && actorID == actor && active && !Task.isCancelled
    }

    private func fetch(_ fingerprint: String, actor: String) async throws -> NativePushCapability {
        let value: NativePushCapability = try await NativeCommunityAPI.shared.request(
            "push/native/settings", expectedSessionFingerprint: fingerprint)
        return try value.validated(for: actor)
    }

    private func review(_ installation: NativePushInstallation, fingerprint: String) async throws -> NativePushReview {
        let value: NativePushReview = try await NativeCommunityAPI.shared.request(
            "push/native/installation", method: "POST",
            body: try JSONEncoder().encode(InstallationRequest(installationId: installation.secret)),
            expectedSessionFingerprint: fingerprint)
        return try value.validated()
    }

    private func updatePermission(_ settings: UNNotificationSettings) {
        permissionDenied = settings.authorizationStatus == .denied
        badgesDisabled = settings.badgeSetting != .enabled
        switch settings.badgeSetting {
        case .enabled: badgePermission = "On"
        case .disabled: badgePermission = "Off"
        case .notSupported: badgePermission = "Unavailable"
        @unknown default: badgePermission = "Unknown"
        }
        switch settings.authorizationStatus {
        case .authorized: permission = "Allowed"
        case .provisional: permission = "Quiet delivery"
        case .ephemeral: permission = "Allowed temporarily"
        case .denied: permission = "Not allowed"
        case .notDetermined: permission = "Not requested"
        @unknown default: permission = "Unknown"
        }
    }

    func refreshStatus(automaticallyRefreshToken: Bool = false, onlyIfSessionChanged: Bool = false) async {
        guard active, !busy, !checking, let actor = actorID else { return }
        let ticket = UUID()
        generation = ticket
        checking = true
        defer { if generation == ticket { checking = false } }
        do {
            guard let fingerprint = await NativeCommunityAPI.shared.sessionFingerprint() else {
                throw NativeAccountError.signedOut
            }
            guard current(ticket, actor: actor) else { return }
            if onlyIfSessionChanged && observedSession == fingerprint { return }
            let notificationSettings = await UNUserNotificationCenter.current().notificationSettings()
            guard current(ticket, actor: actor) else { return }
            updatePermission(notificationSettings)
            let value = try await fetch(fingerprint, actor: actor)
            guard current(ticket, actor: actor) else { return }
            capability = value
            observedSession = fingerprint
            registeredID = nil
            error = nil
            guard let installation = try NativePushKeychain.read(), let receipt = installation.receipt,
                  receipt.actorID == actor, receipt.sessionFingerprint == fingerprint,
                  value.devices?.contains(where: { $0.id == receipt.registrationID }) == true else { return }
            registeredID = receipt.registrationID
            guard automaticallyRefreshToken, value.available, value.deliveryAvailable,
                  [.authorized, .provisional, .ephemeral].contains(notificationSettings.authorizationStatus) else { return }
            let latest = try await review(installation, fingerprint: fingerprint)
            guard current(ticket, actor: actor), latest.currentSession,
                  latest.registrationId == receipt.registrationID else { return }
            guard let environment = value.environment else { throw CommunityError.invalidResponse }
            beginTokenRequest(.init(ticket: ticket, actor: actor, fingerprint: fingerprint,
                                    installation: installation, expectedID: receipt.registrationID, consent: false,
                                    environment: environment))
        } catch {
            guard current(ticket, actor: actor) else { return }
            capability = nil
            registeredID = nil
            let serverError = error as NSError
            if serverError.domain != "OpenCourts" || serverError.code != 404 {
                if serverError.domain == "OpenCourts" {
                    self.error = "The notification service returned HTTP \(serverError.code): \(serverError.localizedDescription)"
                } else if serverError.domain == NSURLErrorDomain {
                    self.error = "Could not reach the notification service. Check your connection and refresh."
                } else {
                    self.error = "Notification status could not be checked. Refresh to try again."
                }
            }
        }
    }

    func enable() async {
        guard active, !busy, !checking, let actor = actorID else { return }
        let ticket = UUID()
        generation = ticket
        busy = true
        error = nil
        notice = nil
        defer { if generation == ticket && pending == nil { busy = false } }
        do {
            guard let fingerprint = await NativeCommunityAPI.shared.sessionFingerprint() else {
                throw NativeAccountError.signedOut
            }
            let value = try await fetch(fingerprint, actor: actor)
            guard current(ticket, actor: actor) else { return }
            capability = value
            guard value.available, value.deliveryAvailable, Bundle.main.bundleIdentifier == "us.opencourts.ios" else {
                busy = false
                notice = "Push delivery is not available yet. Your inbox continues to work."
                return
            }
            let installation = try NativePushKeychain.installation()
            let latest = try await review(installation, fingerprint: fingerprint)
            guard current(ticket, actor: actor) else { return }
            let center = UNUserNotificationCenter.current()
            var settings = await center.notificationSettings()
            guard current(ticket, actor: actor) else { return }
            if settings.authorizationStatus == .notDetermined {
                _ = try await center.requestAuthorization(options: [.alert, .badge, .sound])
                settings = await center.notificationSettings()
            }
            guard current(ticket, actor: actor) else {
                if generation == ticket { busy = false }
                return
            }
            updatePermission(settings)
            guard [.authorized, .provisional, .ephemeral].contains(settings.authorizationStatus) else {
                busy = false
                notice = "Allow notifications in iPhone Settings to continue."
                return
            }
            guard let environment = value.environment else { throw CommunityError.invalidResponse }
            beginTokenRequest(.init(ticket: ticket, actor: actor, fingerprint: fingerprint,
                                    installation: installation, expectedID: latest.registrationId, consent: true,
                                    environment: environment))
        } catch {
            guard current(ticket, actor: actor) else { return }
            busy = false
            self.error = "This iPhone could not be registered. Refresh status before trying again."
        }
    }

    private func beginTokenRequest(_ attempt: Attempt) {
        pending = attempt
        token = nil
        busy = true
        UIApplication.shared.registerForRemoteNotifications()
        deadline?.cancel()
        deadline = Task {
            do { try await Task.sleep(for: .seconds(20)) } catch { return }
            guard self.generation == attempt.ticket, self.pending != nil else { return }
            self.registrationFailed()
        }
    }

    func receivedToken(_ value: Data) {
        guard pending != nil, !value.isEmpty, value.count <= 512 else { return }
        token = value
        if active { submitToken() }
    }

    func registrationFailed() {
        guard pending != nil else { return }
        deadline?.cancel()
        deadline = nil
        pending = nil
        token = nil
        busy = false
        error = "This iPhone could not register with Apple. Refresh status and try again later."
    }

    private func submitToken() {
        guard let attempt = pending, let data = token, current(attempt.ticket, actor: attempt.actor) else { return }
        pending = nil
        token = nil
        deadline?.cancel()
        deadline = nil
        Task {
            defer { if generation == attempt.ticket { busy = false } }
            do {
                let body = NativePushRegistrationRequest(
                    deviceToken: NativePushRegistrationRequest.hex(data),
                    installationId: attempt.installation.secret, consent: attempt.consent,
                    environment: attempt.environment,
                    expectedRegistrationId: attempt.expectedID)
                let result: Acknowledgement = try await NativeCommunityAPI.shared.request(
                    "push/native/devices", method: "POST", body: try JSONEncoder().encode(body),
                    expectedSessionFingerprint: attempt.fingerprint)
                guard current(attempt.ticket, actor: attempt.actor) else { return }
                guard result.ok, let id = result.id, UUID(uuidString: id) != nil else {
                    throw CommunityError.invalidResponse
                }
                var installation = attempt.installation
                installation.receipt = .init(registrationID: id, actorID: attempt.actor,
                                             sessionFingerprint: attempt.fingerprint)
                try NativePushKeychain.save(installation)
                registeredID = id
                observedSession = attempt.fingerprint
                busy = false
                notice = result.deliveryAvailable == true
                    ? "This iPhone is registered. Delivery depends on your notification settings."
                    : "Registration saved. Push delivery is not available yet."
            } catch {
                guard current(attempt.ticket, actor: attempt.actor) else { return }
                busy = false
                registeredID = nil
                self.error = "Registration could not be confirmed. Refresh status before enabling again."
            }
        }
    }

    func removeRegistration() async {
        guard active, !busy, !checking, let actor = actorID, let id = registeredID else { return }
        let ticket = UUID()
        generation = ticket
        busy = true
        error = nil
        notice = nil
        defer { if generation == ticket { busy = false } }
        do {
            guard let fingerprint = await NativeCommunityAPI.shared.sessionFingerprint(),
                  let installation = try NativePushKeychain.read() else { throw NativeAccountError.signedOut }
            let latest = try await review(installation, fingerprint: fingerprint)
            guard current(ticket, actor: actor) else { return }
            guard latest.currentSession, latest.registrationId == id else { throw CommunityError.accessChanged }
            let result: Acknowledgement = try await NativeCommunityAPI.shared.request(
                "push/native/devices", method: "DELETE", body: try JSONEncoder().encode(DeleteRequest(id: id)),
                expectedSessionFingerprint: fingerprint)
            guard current(ticket, actor: actor) else { return }
            guard result.ok else { throw CommunityError.invalidResponse }
            UIApplication.shared.unregisterForRemoteNotifications()
            try NativePushKeychain.clearReceipt()
            registeredID = nil
            let verified = try await fetch(fingerprint, actor: actor)
            guard current(ticket, actor: actor) else { return }
            capability = verified
            guard verified.devices?.contains(where: { $0.id == id }) != true else {
                throw CommunityError.invalidResponse
            }
            notice = "This iPhone registration was removed. iPhone permission and your other devices are unchanged."
        } catch {
            guard current(ticket, actor: actor) else { return }
            registeredID = nil
            self.error = "Removal could not be confirmed. Refresh status before trying again."
        }
    }
}

enum NativeNotificationOptInReason {
    case joinedGame
    case gameRequest
    case gameWaitlist
    case gameChat
    case groupRequest
    case groupActivity

    var category: String {
        switch self {
        case .joinedGame, .gameRequest, .gameWaitlist, .gameChat: "games"
        case .groupRequest, .groupActivity: "groups"
        }
    }

    var title: String {
        switch self {
        case .joinedGame: "Get game reminders"
        case .gameRequest, .gameWaitlist, .gameChat: "Get game updates"
        case .groupRequest, .groupActivity: "Get group updates"
        }
    }

    var message: String {
        switch self {
        case .joinedGame: "Get a heads-up before games you’ve joined. Turn on notifications for this iPhone."
        case .gameRequest: "Get notified when the host reviews your request and about games you join."
        case .gameWaitlist: "Get notified if a place opens or the host offers you one."
        case .groupRequest: "Get notified about membership requests and group activity."
        case .gameChat: "Get updates about game chat and the games you’re playing."
        case .groupActivity: "Get updates about group discussions and membership activity."
        }
    }
}

struct NativeNotificationOptInNudge: View {
    let reason: NativeNotificationOptInReason
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.openURL) private var openURL
    @State private var push = NativePushCoordinator.shared
    @State private var dismissed = false

    private var shouldShow: Bool {
        guard !dismissed,
              let capability = push.capability,
              capability.available, capability.deliveryAvailable,
              capability.preferences?.games == true || capability.preferences?.groups == true else { return false }
        let categoryEnabled = reason.category == "games"
            ? capability.preferences?.games == true
            : capability.preferences?.groups == true
        guard categoryEnabled else { return false }
        let authorized = ["Allowed", "Quiet delivery", "Allowed temporarily"].contains(push.permission)
        let fullyEnabled = capability.preferences?.enabled == true && push.registeredID != nil && authorized
        return !fullyEnabled
    }

    var body: some View {
        Group {
            if shouldShow {
                VStack(alignment: .leading, spacing: 10) {
                    Label(reason.title, systemImage: "bell.badge")
                        .font(.headline)
                        .foregroundStyle(Brand.accent)
                    Text(reason.message)
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    HStack(spacing: 16) {
                        if push.permissionDenied || push.badgesDisabled {
                            Button("Open iPhone Settings") {
                                if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                            }
                            .foregroundStyle(Brand.accent)
                        } else {
                            Button("Enable notifications") { Task { await push.enable() } }
                                .buttonStyle(AppPrimaryButtonStyle())
                                .disabled(push.busy || push.checking)
                        }
                        Button("Not now") {
                            dismissed = true
                            if let actor = account.player?.id {
                                UserDefaults.standard.set(true, forKey: dismissalKey(for: actor))
                            }
                        }
                        .disabled(push.busy)
                    }
                    if push.busy { ProgressView("Enabling notifications…") }
                    if let notice = push.notice { Text(notice).font(.footnote).foregroundStyle(.secondary) }
                    if let error = push.error { Text(error).font(.footnote).foregroundStyle(.red) }
                }
                .padding(12)
                .background(Brand.accent.opacity(0.08), in: RoundedRectangle(cornerRadius: 14))
            }
        }
        .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") {
            refreshDismissal()
            if phase == .active { await push.refreshStatus() }
        }
        .onAppear { refreshDismissal() }
        .onChange(of: push.registeredID) { _, registrationID in
            if registrationID != nil { Task { await push.refreshStatus() } }
        }
        .onChange(of: push.notice) { _, notice in
            guard notice?.hasPrefix("This iPhone is registered.") == true,
                  let actor = account.player?.id else { return }
            dismissed = true
            UserDefaults.standard.set(true, forKey: dismissalKey(for: actor))
        }
    }

    private func dismissalKey(for actor: String) -> String {
        "OpenCourts.notificationOptInNudge.dismissed.v1.\(actor)"
    }

    private func refreshDismissal() {
        guard let actor = account.player?.id else { dismissed = false; return }
        dismissed = UserDefaults.standard.bool(forKey: dismissalKey(for: actor))
    }
}

struct NativePushDeviceView: View {
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.communityDockHeight) private var dockHeight
    @Environment(\.openURL) private var openURL
    @State private var push = NativePushCoordinator.shared
    @State private var confirmRemove = false

    var body: some View {
        Form {
            Section {
                LabeledContent("Notification permission", value: push.permission)
                LabeledContent("App icon badge", value: push.badgePermission)
                if push.registeredID != nil {
                    Label("Registration saved", systemImage: "checkmark.circle")
                }
                if push.capability?.deliveryAvailable != true {
                    Text("Push delivery to this iPhone app is not available yet. Your in-app inbox continues to work.")
                        .foregroundStyle(.secondary)
                }
                if push.permissionDenied || push.badgesDisabled {
                    Button("Open iPhone Settings") {
                        if let url = URL(string: UIApplication.openSettingsURLString) { openURL(url) }
                    }
                }
                if push.capability?.available == true && push.capability?.deliveryAvailable == true {
                    Button("Enable on this iPhone") { Task { await push.enable() } }
                        .disabled(push.busy || push.checking)
                    Text("Enabling also allows account-wide push while preserving your Games and Groups choices.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if push.registeredID != nil {
                    Button("Remove this iPhone registration", role: .destructive) { confirmRemove = true }
                        .disabled(push.busy || push.checking)
                }
                if push.busy || push.checking { ProgressView("Checking notifications…") }
            }
            if let error = push.error { Text(error).foregroundStyle(.red) }
            if let notice = push.notice { Text(notice).font(.footnote).foregroundStyle(.secondary) }
            Section {
                Button("Refresh status") { Task { await push.refreshStatus() } }
                    .disabled(push.busy || push.checking)
                Text("iPhone permission and account preferences are separate. Removing a registration does not recall notifications already sent.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
        }
        .contentMargins(.bottom, dockHeight, for: .scrollContent)
        .navigationTitle("This iPhone")
        .navigationBarTitleDisplayMode(.inline)
        .navigationBarBackButtonHidden(push.busy)
        .interactiveDismissDisabled(push.busy)
        .alert("Remove this iPhone registration?", isPresented: $confirmRemove) {
            Button("Remove registration", role: .destructive) { Task { await push.removeRegistration() } }
            Button("Cancel", role: .cancel) { confirmRemove = false }
        }
        .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") {
            guard phase == .active else { return }
            push.accountChanged(to: account.player?.id)
            await push.refreshStatus()
        }
    }
}
