import SwiftUI
import AuthenticationServices
import LocalAuthentication
import Security
import CryptoKit
import GoogleSignIn

nonisolated struct NativeCredential: Codable, Sendable {
    let token: String
    let csrfToken: String
    let expiresAt: Double
}
nonisolated struct NativeProviderChallenge: Decodable, Sendable {
    let challengeId: String
    let nonce: String
}

nonisolated struct NativePlayer: Codable, Sendable {
    let id: String
    var displayName: String
    var bio: String
    var generalLocation: String
    var skillLevel: String
    var discoverable: Bool
}
nonisolated struct NativeAccountResponse: Decodable, Sendable {
    let player: NativePlayer?
    let csrfToken: String?
    let connectedProviders: [String]
}
nonisolated enum NativeAccountError: LocalizedError {
    case unavailable, signedOut, callback, appleCredentialMissing, appleChallengeMissing
    case appleStateMismatch, appleIdentityTokenMissing, appleAuthorizationCodeMissing, storage
    var errorDescription: String? {
        switch self {
        case .unavailable: "OpenCourts is temporarily unavailable. Please try again later."
        case .signedOut: "Please sign in again."
        case .callback: "Sign-in could not be verified. Please try again."
        case .appleCredentialMissing: "Apple returned an unexpected sign-in credential. Please try again."
        case .appleChallengeMissing: "Apple sign-in request is no longer available. Please try again."
        case .appleStateMismatch: "Apple returned a sign-in response that did not match this request. Please try again."
        case .appleIdentityTokenMissing: "Apple did not provide an identity token. Check Sign in with Apple in iPhone Settings."
        case .appleAuthorizationCodeMissing: "Apple did not provide an authorization code. Check Sign in with Apple in iPhone Settings."
        case .storage: "Your session could not be stored securely. Please try again."
        }
    }
}

nonisolated private enum NativeKeychain {
    // Separate service per backend. Never migrate browser cookies or store tokens in UserDefaults.
    static var service: String {
        let origin = NativeCommunityAPI.origin
        if origin.host == "feature-play-together.opencourts.pages.dev" {
            return "OpenCourts.native-session.preview.v1"
        }
        return "OpenCourts.native-session.local.\(origin.host ?? "unknown").\(origin.port ?? 80)"
    }
    static func read() throws -> NativeCredential? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: "session",
            kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        if status == errSecItemNotFound { return nil }
        guard status == errSecSuccess, let data = result as? Data else { throw NativeAccountError.storage }
        return try JSONDecoder().decode(NativeCredential.self, from: data)
    }
    static func save(_ credential: NativeCredential) throws {
        let key: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: "session"]
        let attributes: [String: Any] = [kSecValueData as String: try JSONEncoder().encode(credential),
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(key as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var item = key; attributes.forEach { item[$0.key] = $0.value }
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw NativeAccountError.storage }
        } else if status != errSecSuccess { throw NativeAccountError.storage }
    }
    static func clear() {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: "session"] as CFDictionary)
    }
}

actor NativeCommunityAPI {
    static let shared = NativeCommunityAPI()
    static let origin: URL = {
        #if DEBUG
        if let configured = ProcessInfo.processInfo.environment["OPENCOURTS_NATIVE_API_ORIGIN"],
           let parts = URLComponents(string: configured), let url = parts.url,
           parts.user == nil, parts.password == nil, parts.query == nil, parts.fragment == nil,
           (parts.path.isEmpty || parts.path == "/"),
           ((parts.scheme == "http" && ["localhost", "127.0.0.1"].contains(parts.host ?? "")) ||
            (url.absoluteString == "https://feature-play-together.opencourts.pages.dev")) {
            // Debug scheme variable only. Production is never a native development origin.
            return URL(string: "\(url.scheme!)://\(url.host!)\(url.port.map { ":\($0)" } ?? "")")!
        }
        #endif
        #if DEBUG
        return URL(string: "https://feature-play-together.opencourts.pages.dev")!
        #else
        return URL(string: "https://opencourts.us")!
        #endif
    }()
    private let session: URLSession
    private var credential: NativeCredential?
    private var sessionLocked = UserDefaults.standard.bool(forKey: "OpenCourts.biometricSessionUnlock")
    init() {
        let config = URLSessionConfiguration.ephemeral
        config.httpCookieStorage = nil; config.httpShouldSetCookies = false; config.urlCache = nil
        config.timeoutIntervalForRequest = 20
        session = URLSession(configuration: config)
    }
    func restore() throws {
        guard !sessionLocked else { throw NativeAccountError.signedOut }
        credential = nil
        credential = try NativeKeychain.read()
        if let credential, credential.expiresAt <= Date().timeIntervalSince1970 * 1000 {
            self.credential = nil
            NativeKeychain.clear()
        }
    }
    func lockSession() {
        sessionLocked = true
        credential = nil
    }
    func unlockSession() { sessionLocked = false }
    func hasStoredSession() -> Bool {
        guard let stored = try? NativeKeychain.read() else { return false }
        if stored.expiresAt <= Date().timeIntervalSince1970 * 1000 {
            NativeKeychain.clear()
            return false
        }
        return true
    }
    var hasSession: Bool {
        if let credential, credential.expiresAt <= Date().timeIntervalSince1970 * 1000 {
            self.credential = nil
            NativeKeychain.clear()
        }
        return credential != nil
    }
    func sessionFingerprint() -> String? {
        guard hasSession, let credential else { return nil }
        return SHA256.hash(data: Data(credential.token.utf8)).map { String(format: "%02x", $0) }.joined()
    }
    func invalidate() { credential = nil; NativeKeychain.clear() }
    func exchange(code: String, verifier: String) async throws {
        let body = try JSONSerialization.data(withJSONObject: ["code": code, "verifier": verifier])
        let value: NativeCredential = try await request("auth/native/exchange", method: "POST", body: body, needsSession: false)
        guard value.expiresAt > Date().timeIntervalSince1970 * 1000 else { throw NativeAccountError.callback }
        try NativeKeychain.save(value)
        credential = value
    }
    func providerChallenge(_ provider: String, linking: Bool = false) async throws -> NativeProviderChallenge {
        let payload: [String: Any] = linking
            ? ["provider": provider, "link": true]
            : ["provider": provider, "adultConfirmed": true]
        let body = try JSONSerialization.data(withJSONObject: payload)
        return try await request("auth/native/provider/challenge", method: "POST", body: body, needsSession: linking)
    }
    func exchangeProvider(challengeId: String, idToken: String, authorizationCode: String? = nil, linking: Bool = false) async throws {
        var payload = ["challengeId": challengeId, "idToken": idToken]
        if let authorizationCode { payload["authorizationCode"] = authorizationCode }
        let body = try JSONSerialization.data(withJSONObject: payload)
        if linking {
            let _: Empty = try await request("auth/native/provider/exchange", method: "POST", body: body, needsSession: true)
            return
        }
        let value: NativeCredential = try await request("auth/native/provider/exchange", method: "POST", body: body, needsSession: false)
        guard value.expiresAt > Date().timeIntervalSince1970 * 1000 else { throw NativeAccountError.callback }
        try NativeKeychain.save(value)
        credential = value
    }
    func logout(all: Bool = false) async throws {
        let _: Empty = try await request(all ? "auth/logout-all" : "auth/logout", method: "POST", body: Data("{}".utf8))
        credential = nil; NativeKeychain.clear()
    }
    func request<T: Decodable & Sendable>(_ path: String, query: [URLQueryItem] = [], method: String = "GET",
                                         body: Data? = nil, needsSession: Bool = true, timeout: TimeInterval = 20,
                                         contentType: String = "application/json", expectedSessionFingerprint: String? = nil) async throws -> T {
        #if DEBUG
        if ScreenshotMockContent.isEnabled && method != "GET" {
            throw CommunityError.unavailable
        }
        #endif
        if needsSession && (sessionLocked || !hasSession) { throw NativeAccountError.signedOut }
        if let expectedSessionFingerprint, sessionFingerprint() != expectedSessionFingerprint {
            throw NativeAccountError.signedOut
        }
        let requestToken = credential?.token
        var parts = URLComponents(url: Self.origin.appending(path: "api/\(path)"), resolvingAgainstBaseURL: false)!
        parts.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: parts.url!, cachePolicy: .reloadIgnoringLocalCacheData)
        request.httpMethod = method; request.httpBody = body
        request.timeoutInterval = timeout
        request.setValue(Self.origin.absoluteString, forHTTPHeaderField: "Origin")
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        if needsSession, let credential {
            request.setValue("Bearer \(credential.token)", forHTTPHeaderField: "Authorization")
            if method != "GET" { request.setValue(credential.csrfToken, forHTTPHeaderField: "X-CSRF-Token") }
        }
        let (receivedData, response) = try await session.data(for: request)
        #if DEBUG
        let data = ScreenshotMockContent.sanitized(receivedData)
        #else
        let data = receivedData
        #endif
        try Task.checkCancellation()
        if needsSession && credential?.token != requestToken { throw NativeAccountError.signedOut }
        guard let response = response as? HTTPURLResponse else { throw CommunityError.invalidResponse }
        #if DEBUG
        if response.statusCode >= 400 {
            let serverMessage = (try? JSONDecoder().decode(ServerError.self, from: data))?.error ?? "<no server message>"
            print("[NativeCommunityAPI] \(method) /api/\(path) returned HTTP \(response.statusCode): \(serverMessage)")
        }
        #endif
        if response.statusCode == 401 && needsSession {
            credential = nil; NativeKeychain.clear(); throw NativeAccountError.signedOut
        }
        guard (200..<300).contains(response.statusCode) else {
            if response.statusCode == 404 && !needsSession { throw NativeAccountError.unavailable }
            let message = (try? JSONDecoder().decode(ServerError.self, from: data))?.error
            throw NSError(domain: "OpenCourts", code: response.statusCode,
                          userInfo: [NSLocalizedDescriptionKey: message ?? "This action could not be completed. Try again."])
        }
        return try JSONDecoder().decode(T.self, from: data)
    }
    // Private media never uses AsyncImage or the public group-cover transport.
    func playerPhoto(_ playerID: String, gameID: String? = nil) async throws -> Data? {
        #if DEBUG
        if ScreenshotMockContent.isEnabled { return nil }
        #endif
        guard !sessionLocked, hasSession, let token = credential?.token else { throw NativeAccountError.signedOut }
        guard playerID.range(of: "^[A-Za-z0-9_-]{1,100}$", options: .regularExpression) != nil else {
            throw CommunityError.invalidResponse
        }
        var parts = URLComponents(url: Self.origin.appending(path: "api/media/player/\(playerID)"), resolvingAgainstBaseURL: false)
        if let gameID {
            guard UUID(uuidString: gameID) != nil else { throw CommunityError.invalidResponse }
            parts?.queryItems = [URLQueryItem(name: "gameId", value: gameID)]
        }
        guard let url = parts?.url else { throw CommunityError.invalidResponse }
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("image/webp", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request, delegate: NativePhotoRedirectGuard())
        try Task.checkCancellation()
        guard credential?.token == token else { throw NativeAccountError.signedOut }
        guard let response = response as? HTTPURLResponse, response.url == url else {
            throw CommunityError.invalidResponse
        }
        if response.statusCode == 401 {
            invalidate()
            throw NativeAccountError.signedOut
        }
        if response.statusCode == 404 { return nil }
        guard response.statusCode == 200, response.mimeType == "image/webp",
              !data.isEmpty, data.count <= 1024 * 1024 else { throw CommunityError.invalidResponse }
        return try NativeCoverSelection.thumbnailData(data)
    }
    nonisolated struct Empty: Decodable, Sendable {}
    nonisolated private struct ServerError: Decodable, Sendable { let error: String }
}

@MainActor @Observable final class NativeAccountStore {
    var player: NativePlayer? {
        didSet {
            photoRevision = UUID()
            NativePushCoordinator.shared.accountChanged(to: player?.id)
        }
    }
    var photoRevision = UUID()
    var connectedProviders: [String] = []
    var error: String?
    var busy = false
    var biometricUnlockEnabled = UserDefaults.standard.bool(forKey: "OpenCourts.biometricSessionUnlock")
    var isSessionLocked = UserDefaults.standard.bool(forKey: "OpenCourts.biometricSessionUnlock")
    var isUnlocking = false
    var sessionUnlockError: String?
    let biometricName: String
    let biometricAvailable: Bool
    private var unlockTask: Task<Bool, Never>?
    private var refreshGeneration = 0
    private(set) var providerAuthorizationInProgress = false
    private(set) var pendingAppleChallenge: NativeProviderChallenge?
    private var lockAfterProviderAuthorization = false

    init() {
        let context = LAContext()
        var error: NSError?
        biometricAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
        switch context.biometryType {
        case .faceID: biometricName = "Face ID"
        case .touchID: biometricName = "Touch ID"
        default: biometricName = "Biometrics"
        }
    }

    func refresh(allowDuringProviderAuthorization: Bool = false) async {
        guard allowDuringProviderAuthorization || !providerAuthorizationInProgress else { return }
        refreshGeneration += 1
        let generation = refreshGeneration
        do {
            if biometricUnlockEnabled {
                if await NativeCommunityAPI.shared.hasStoredSession() {
                    guard await unlockSession() else { return }
                } else {
                    isSessionLocked = false
                    await NativeCommunityAPI.shared.unlockSession()
                }
            }
            try await NativeCommunityAPI.shared.restore()
            guard generation == refreshGeneration,
                  allowDuringProviderAuthorization || !providerAuthorizationInProgress else { return }
            let hasSession = await NativeCommunityAPI.shared.hasSession
            guard generation == refreshGeneration,
                  allowDuringProviderAuthorization || !providerAuthorizationInProgress else { return }
            guard hasSession else { player = nil; connectedProviders = []; return }
            let account: NativeAccountResponse = try await NativeCommunityAPI.shared.request("auth/me")
            guard generation == refreshGeneration,
                  allowDuringProviderAuthorization || !providerAuthorizationInProgress else { return }
            if account.player == nil { await NativeCommunityAPI.shared.invalidate() }
            guard generation == refreshGeneration,
                  allowDuringProviderAuthorization || !providerAuthorizationInProgress else { return }
            player = account.player; connectedProviders = account.connectedProviders; error = nil
        } catch {
            guard generation == refreshGeneration,
                  allowDuringProviderAuthorization || !providerAuthorizationInProgress else { return }
            if error is CancellationError || (error as? URLError)?.code == .cancelled {
                return
            }

            self.error = error.localizedDescription
            guard await NativeCommunityAPI.shared.hasSession else {
                player = nil
                connectedProviders = []
                return
            }
        }
    }

    func setBiometricUnlock(_ enabled: Bool) async {
        sessionUnlockError = nil
        guard enabled else {
            UserDefaults.standard.set(false, forKey: "OpenCourts.biometricSessionUnlock")
            biometricUnlockEnabled = false
            isSessionLocked = false
            await NativeCommunityAPI.shared.unlockSession()
            return
        }
        guard biometricAvailable else {
            sessionUnlockError = "Set up Face ID or Touch ID on this device before enabling biometric unlock."
            return
        }
        let context = LAContext()
        do {
            try await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Protect access to your OpenCourts account")
            UserDefaults.standard.set(true, forKey: "OpenCourts.biometricSessionUnlock")
            biometricUnlockEnabled = true
            isSessionLocked = false
            await NativeCommunityAPI.shared.unlockSession()
        } catch {
            sessionUnlockError = error.localizedDescription
        }
    }

    func beginProviderAuthorization() {
        refreshGeneration += 1
        providerAuthorizationInProgress = true
    }

    func beginAppleAuthorization(challenge: NativeProviderChallenge?) {
        refreshGeneration += 1
        pendingAppleChallenge = challenge
        providerAuthorizationInProgress = true
    }

    func endProviderAuthorization() {
        providerAuthorizationInProgress = false
        pendingAppleChallenge = nil
        guard lockAfterProviderAuthorization else { return }
        lockAfterProviderAuthorization = false
        lockSession()
    }

    func lockSession() {
        guard biometricUnlockEnabled else { return }
        guard !providerAuthorizationInProgress else {
            lockAfterProviderAuthorization = true
            return
        }
        guard !isSessionLocked else { return }
        isSessionLocked = true
        sessionUnlockError = nil
        Task { await NativeCommunityAPI.shared.lockSession() }
    }

    @discardableResult
    func unlockSession() async -> Bool {
        guard biometricUnlockEnabled else { return true }
        guard isSessionLocked else { return true }
        if let unlockTask { return await unlockTask.value }
        sessionUnlockError = nil
        isUnlocking = true
        let context = LAContext()
        let task = Task {
            (try? await context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock your OpenCourts account")) == true
        }
        unlockTask = task
        let authenticated = await task.value
        unlockTask = nil
        isUnlocking = false
        guard authenticated else {
            sessionUnlockError = "Unlock to continue. You can use your device passcode if Face ID or Touch ID is unavailable."
            return false
        }
        await NativeCommunityAPI.shared.unlockSession()
        do {
            try await NativeCommunityAPI.shared.restore()
            isSessionLocked = false
            return true
        } catch {
            sessionUnlockError = error.localizedDescription
            return false
        }
    }
}

struct NativeSessionUnlockOverlay: View {
    let account: NativeAccountStore
    var body: some View {
        if account.isSessionLocked {
            VStack(spacing: 16) {
                Image(systemName: account.biometricName == "Face ID" ? "faceid" : "touchid")
                    .font(.system(size: 42, weight: .regular))
                    .foregroundStyle(Brand.accent)
                    .accessibilityHidden(true)
                Text("OpenCourts is locked")
                    .font(.title3.weight(.semibold))
                Text("Unlock with \(account.biometricName) or your device passcode to continue.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                if let error = account.sessionUnlockError {
                    Text(error).font(.footnote).foregroundStyle(.secondary).multilineTextAlignment(.center)
                }
                Button {
                    Task { _ = await account.unlockSession() }
                } label: {
                    Label(account.isUnlocking ? "Unlocking…" : "Unlock", systemImage: account.biometricName == "Face ID" ? "faceid" : "touchid")
                        .frame(maxWidth: .infinity, minHeight: 44)
                }
                .buttonStyle(AppPrimaryButtonStyle())
                .tint(Brand.actionFill)
                .disabled(account.isUnlocking)
            }
            .padding(28)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(Brand.background.ignoresSafeArea())
            .transition(.opacity)
            .zIndex(100)
        }
    }
}

struct NativeAccountView: View {
    @Bindable var account: NativeAccountStore
    @Environment(\.communityDockHeight) private var communityDockHeight
    @Environment(\.scenePhase) private var scenePhase
    @State private var adult = false
    @State private var edit: NativePlayer?
    @State private var confirmDelete = false
    @State private var deleteText = ""
    @State private var appleChallenge: NativeProviderChallenge?

    @State private var appleChallengeIsLinking = false
    @State private var appleChallengeLoading = false
    @State private var appleChallengeError: String?
    @State private var providerMessage: String?
    @State private var providerFeedbackError: String?
    @State private var appleChallengeRefreshID = UUID()
    var body: some View {
        Form {
            if let player = account.player {
                Section {
                    HStack(spacing: 14) {
                        NativeAccountToolbarAvatar(account: account)
                            .frame(width: 46, height: 46)
                        VStack(alignment: .leading, spacing: 4) {
                            Text(player.displayName.isEmpty ? "Complete your player profile" : player.displayName)
                                .font(.headline)
                            if !player.generalLocation.isEmpty {
                                Label(player.generalLocation, systemImage: "mappin.and.ellipse")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            } else {
                                Text("Player profile")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 5)
                    }
                    Button { edit = player } label: { Label("Edit profile", systemImage: "pencil") }
                    NavigationLink {
                        NativeProfilePhotoView(playerID: player.id, account: account)
                    } label: {
                        Label("Your photo", systemImage: "person.crop.square")
                    }
                    LabeledContent("Connected account", value: account.connectedProviders.joined(separator: ", "))
                        .font(.footnote)
                } header: {
                    Label("Your profile", systemImage: "person.crop.circle")
                }
                Section("Security") {
                    if account.biometricAvailable {
                        Toggle("Lock with \(account.biometricName)", isOn: Binding(
                            get: { account.biometricUnlockEnabled },
                            set: { value in Task { await account.setBiometricUnlock(value) } }
                        ))
                        .disabled(account.busy || account.isSessionLocked)
                        Text("OpenCourts locks when you leave the app. Unlock with \(account.biometricName) or your device passcode to return.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    Button("Sign out", role: .destructive) { Task { await signOut() } }
                    Button("Sign out on all devices", role: .destructive) { Task { await signOut(all: true) } }
                    Button("Delete account", role: .destructive) { deleteText = ""; confirmDelete = true }
                }.disabled(account.busy)
                Section("Sign-in methods") {
                    Text("Connect another sign-in method to this account. A method already connected to a different OpenCourts account cannot be linked.")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if account.connectedProviders.contains("google") {
                        Label("Google connected", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.secondary)
                    } else {
                        GoogleSignInControl(enabled: !account.busy, accessibilityTitle: "Connect with Google") { presenter in
                            Task { await signInWithGoogle(presenter: presenter, linking: true) }
                        }
                        .frame(height: 50)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                    }
                    if account.connectedProviders.contains("apple") {
                        Label("Apple connected", systemImage: "checkmark.circle.fill")
                            .foregroundStyle(.secondary)
                    } else if let appleChallenge {
                        let linking = appleChallengeIsLinking
                        SignInWithAppleButton(.continue) { request in
                            account.beginAppleAuthorization(challenge: appleChallenge)
                            request.nonce = appleChallenge.nonce
                            request.state = appleChallenge.challengeId
                            request.requestedScopes = [.email]
                        } onCompletion: { result in
                            let retainedChallenge = account.pendingAppleChallenge ?? appleChallenge
                            Task {
                                await completeAppleSignIn(
                                    result,
                                    challenge: retainedChallenge,
                                    linking: linking
                                )
                            }
                        }
                        .signInWithAppleButtonStyle(.black)
                        .frame(height: 50)
                        .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                        .disabled(account.busy)
                    } else if appleChallengeLoading {
                        ProgressView("Preparing Apple sign-in")
                    } else {
                        if let appleChallengeError {
                            Text(appleChallengeError)
                                .font(.footnote)
                                .foregroundStyle(.red)
                        }
                        Button("Try Apple sign-in again") {
                            account.error = nil
                            appleChallengeError = nil
                            providerFeedbackError = nil
                            providerMessage = nil
                            appleChallengeRefreshID = UUID()
                        }
                        .disabled(account.busy)
                    }
                    if let providerFeedbackError {
                        Text(providerFeedbackError)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                    if let providerMessage {
                        Text(providerMessage)
                            .font(.footnote)
                            .foregroundStyle(Brand.accent)
                    }
                }
            } else {
                Section {
                    VStack(alignment: .leading, spacing: 18) {
                        Toggle(isOn: $adult) {
                            VStack(alignment: .leading, spacing: 3) {
                                Text("I confirm I am 18 or older")
                                    .font(.body.weight(.medium))
                                Text("Required to create or access an account.")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Divider()

                        VStack(spacing: 12) {
                            GoogleSignInControl(enabled: true, accessibilityTitle: "Sign in with Google") { presenter in
                                Task { await signInWithGoogle(presenter: presenter) }
                            }
                            .frame(height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                            .allowsHitTesting(adult && !account.busy)
                            .accessibilityHidden(!adult || account.busy)

                            SignInWithAppleButton(.signIn) { request in
                                guard let challenge = appleChallenge else { return }
                                account.beginAppleAuthorization(challenge: challenge)
                                request.nonce = challenge.nonce
                                request.state = challenge.challengeId
                                request.requestedScopes = [.email]
                            } onCompletion: { result in
                                Task {
                                    await completeAppleSignIn(
                                        result,
                                        challenge: account.pendingAppleChallenge ?? appleChallenge,
                                        linking: false
                                    )
                                }
                            }
                            .signInWithAppleButtonStyle(.black)
                            .frame(height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: 13, style: .continuous))
                            .allowsHitTesting(adult && appleChallenge != nil && !account.busy)
                            .accessibilityHidden(!adult || appleChallenge == nil || account.busy)

                            if !adult {
                                Label("Sign-in is locked until you confirm your age above.", systemImage: "lock.fill")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            } else if appleChallengeLoading {
                                ProgressView("Preparing Apple sign-in")
                            } else if appleChallenge == nil {
                                if let appleChallengeError {
                                    Text(appleChallengeError)
                                        .font(.footnote)
                                        .foregroundStyle(.red)
                                }
                                Button("Try Apple sign-in again") {
                                    account.error = nil
                                    appleChallengeError = nil
                                    providerFeedbackError = nil
                                    providerMessage = nil
                                    appleChallengeRefreshID = UUID()
                                }
                                .disabled(account.busy)
                            }
                        }

                        Label("Use the same sign-in method you use for OpenCourts.", systemImage: "lock.shield")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .fixedSize(horizontal: false, vertical: true)

                        Text(legalNotice)
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            .tint(Brand.accent)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    .padding(.vertical, 6)
                } header: {
                    Text("Sign in securely")
                }
            }
            if let sessionUnlockError = account.sessionUnlockError {
                Section { Text(sessionUnlockError).foregroundStyle(.red) }
            }
            if let error = account.error { Section { Text(error).foregroundStyle(.red) } }
            Section("OpenCourts") {
                Link("Privacy policy", destination: NativeCommunityAPI.origin.appending(path: "privacy"))
                Link("Terms", destination: NativeCommunityAPI.origin.appending(path: "terms"))
                Link("Help & safety", destination: NativeCommunityAPI.origin.appending(path: "play-together-help"))
                Link("Support", destination: NativeCommunityAPI.origin.appending(path: "support"))
            }
        }
        .contentMargins(.bottom, communityDockHeight, for: .scrollContent)
        .overlay { NativeSessionUnlockOverlay(account: account) }
        .navigationTitle("Account")
        .task { await account.refresh() }
        .task(id: "\(appleChallengeRefreshID.uuidString)|\(account.player?.id ?? "signed-out")|\(account.connectedProviders.sorted().joined(separator: ","))|\(adult)") {
            await prepareAppleChallengeForCurrentState()
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                Task {
                    guard !account.providerAuthorizationInProgress else { return }
                    await account.refresh()
                    guard !account.providerAuthorizationInProgress else { return }
                    appleChallengeRefreshID = UUID()
                }
            }
        }
        .sheet(isPresented: Binding(get: { edit != nil }, set: { if !$0 { edit = nil } })) {
            if let player = edit { NativeProfileEditor(player: player, account: account) }
        }
        .alert("Delete your account?", isPresented: $confirmDelete) {
            TextField("Type DELETE", text: $deleteText)
            Button("Delete account", role: .destructive) { Task { await deleteAccount() } }
                .disabled(deleteText != "DELETE")
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This permanently deletes your account. Archive owned groups first. Recent sign-in is required; if prompted, sign out and sign back in.")
        }
    }
    private var legalNotice: AttributedString {
        var notice = AttributedString("By continuing, you agree to our ")
        var terms = AttributedString("Terms of Use")
        terms.link = NativeCommunityAPI.origin.appending(path: "terms")
        terms.foregroundColor = Brand.accent
        terms.underlineStyle = .single
        notice.append(terms)
        notice.append(AttributedString(" and acknowledge our "))
        var privacy = AttributedString("Privacy policy")
        privacy.link = NativeCommunityAPI.origin.appending(path: "privacy")
        privacy.foregroundColor = Brand.accent
        privacy.underlineStyle = .single
        notice.append(privacy)
        notice.append(AttributedString("."))
        return notice
    }
    @MainActor private func prepareAppleChallengeForCurrentState() async {
        guard !account.providerAuthorizationInProgress else { return }
        appleChallenge = nil
        appleChallengeIsLinking = false
        appleChallengeLoading = false
        appleChallengeError = nil
        let linking = account.player != nil
        guard linking ? !account.connectedProviders.contains("apple") : adult else { return }
        appleChallengeLoading = true
        do {
            let challenge = try await NativeCommunityAPI.shared.providerChallenge("apple", linking: linking)
            appleChallengeLoading = false
            guard !Task.isCancelled else { return }
            guard linking ? account.player != nil && !account.connectedProviders.contains("apple") : adult && account.player == nil else { return }
            appleChallenge = challenge
            appleChallengeIsLinking = linking
        } catch {
            appleChallengeLoading = false
            guard !Task.isCancelled else { return }
            let message = error.localizedDescription
            if linking && message == "Confirm your age and choose a sign-in method." {
                appleChallengeError = "Apple linking is not available on this server yet. Please try again later."
            } else {
                appleChallengeError = message
            }
        }
    }
    @MainActor private func completeAppleSignIn(
        _ result: Result<ASAuthorization, Error>,
        challenge: NativeProviderChallenge?,
        linking: Bool
    ) async {
        account.error = nil
        providerMessage = nil
        account.busy = true
        defer {
            account.busy = false
            account.endProviderAuthorization()
        }
        do {
            let authorization = try result.get()
            guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
                throw NativeAccountError.appleCredentialMissing
            }
            guard let challenge else { throw NativeAccountError.appleChallengeMissing }
            guard credential.state == challenge.challengeId else { throw NativeAccountError.appleStateMismatch }
            guard let tokenData = credential.identityToken,
                  let token = String(data: tokenData, encoding: .utf8) else {
                throw NativeAccountError.appleIdentityTokenMissing
            }
            guard let codeData = credential.authorizationCode,
                  let code = String(data: codeData, encoding: .utf8) else {
                throw NativeAccountError.appleAuthorizationCodeMissing
            }
            try await NativeCommunityAPI.shared.exchangeProvider(challengeId: challenge.challengeId, idToken: token, authorizationCode: code, linking: linking)
            await account.refresh(allowDuringProviderAuthorization: true)
            if linking { providerMessage = "Apple connected to this OpenCourts account." }
        } catch let authorizationError as ASAuthorizationError {
            let message = authorizationError.code == .canceled
                ? (linking
                    ? "Apple authorization was canceled. Your Google account is still connected."
                    : "Apple sign-in was canceled. Please try again.")
                : "Apple couldn't complete authorization. Check Apple Account verification in Settings and try again."
            if linking {
                providerFeedbackError = message
            } else {
                account.error = message
            }
        } catch {
            let callbackError = error as NSError
            let description = error.localizedDescription.lowercased()
            let wasCanceled = callbackError.code == -7034 ||
                description == "cancelled" ||
                description == "canceled"
            let isAppleAuthorizationFailure =
                callbackError.domain == "AKAuthenticationError" ||
                callbackError.domain == "com.apple.AuthenticationServices.AuthorizationError"
            let message: String
            if wasCanceled {
                message = linking
                    ? "Apple authorization was canceled. Your current account is still connected."
                    : "Apple sign-in was canceled. Please try again."
            } else if isAppleAuthorizationFailure {
                message = "Apple couldn't complete authorization. Check Apple Account verification in Settings and try again."
            } else {
                message = error.localizedDescription
            }
            if linking {
                providerFeedbackError = message
            } else {
                account.error = message
            }
        }
        appleChallenge = nil
        appleChallengeRefreshID = UUID()
    }
    @MainActor private func signInWithGoogle(presenter: UIViewController, linking: Bool = false) async {
        account.beginProviderAuthorization()
        account.busy = true
        account.error = nil
        providerMessage = nil
        defer {
            account.busy = false
            account.endProviderAuthorization()
        }
        do {
            let challenge = try await NativeCommunityAPI.shared.providerChallenge("google", linking: linking)
            let result = try await GIDSignIn.sharedInstance.signIn(
                withPresenting: presenter, hint: nil, additionalScopes: nil, nonce: challenge.nonce
            )
            guard let token = result.user.idToken?.tokenString else { throw NativeAccountError.callback }
            try await NativeCommunityAPI.shared.exchangeProvider(challengeId: challenge.challengeId, idToken: token, linking: linking)
            await account.refresh(allowDuringProviderAuthorization: true)
            if linking { providerMessage = "Google connected to this OpenCourts account." }
        } catch { account.error = error.localizedDescription }
    }
    @MainActor private func signOut(all: Bool = false) async {
        account.busy = true; defer { account.busy = false }
        do { try await NativeCommunityAPI.shared.logout(all: all); account.player = nil; account.connectedProviders = []; account.error = nil }
        catch { account.error = error.localizedDescription; await account.refresh() }
    }
    @MainActor private func deleteAccount() async {
        guard deleteText == "DELETE" else { return }
        account.busy = true; defer { account.busy = false; deleteText = "" }
        do {
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("auth/me", method: "DELETE", body: Data("{\"confirm\":\"DELETE\"}".utf8))
            await NativeCommunityAPI.shared.invalidate()
            account.player = nil; account.connectedProviders = []; account.error = nil
        } catch { account.error = error.localizedDescription }
    }

}

private struct GoogleSignInControl: UIViewControllerRepresentable {
    let enabled: Bool
    let accessibilityTitle: String
    let action: (UIViewController) -> Void

    func makeUIViewController(context: Context) -> Controller {
        let controller = Controller()
        controller.action = action
        controller.accessibilityTitle = accessibilityTitle
        return controller
    }

    func updateUIViewController(_ controller: Controller, context: Context) {
        controller.action = action
        controller.button.isEnabled = enabled
        controller.accessibilityTitle = accessibilityTitle
        controller.button.accessibilityLabel = accessibilityTitle
    }

    final class Controller: UIViewController {
        let button = GIDSignInButton()
        var action: ((UIViewController) -> Void)?
        var accessibilityTitle = "Sign in with Google"

        override func viewDidLoad() {
            super.viewDidLoad()
            button.translatesAutoresizingMaskIntoConstraints = false
            view.addSubview(button)
            NSLayoutConstraint.activate([
                button.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                button.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                button.topAnchor.constraint(equalTo: view.topAnchor),
                button.bottomAnchor.constraint(equalTo: view.bottomAnchor)
            ])
            button.accessibilityLabel = self.accessibilityTitle
            button.addTarget(self, action: #selector(pressed), for: .touchUpInside)
        }

        @objc private func pressed() { action?(self) }
    }
}

private struct NativeProfileEditor: View {
    @State var player: NativePlayer
    let account: NativeAccountStore
    @Environment(\.dismiss) private var dismiss
    @State private var busy = false
    @State private var error: String?
    var body: some View {
        NavigationStack {
            Form {
                TextField("Display name", text: $player.displayName)
                HStack(spacing: 12) {
                    Image(systemName: "mappin.and.ellipse")
                        .foregroundStyle(.secondary)
                        .accessibilityHidden(true)
                    TextField("General location", text: $player.generalLocation)
                }
                TextField("Bio", text: $player.bio, axis: .vertical)
                    .lineLimit(4...8)
                Picker("Skill preference", selection: $player.skillLevel) {
                    ForEach(["unspecified", "beginner", "intermediate", "advanced"], id: \.self) { Text($0.capitalized).tag($0) }
                }
                Toggle("Appear in Players discovery", isOn: $player.discoverable)
                Text("When discoverable, signed-in players can see approximate activity recency to help decide whether to invite you. Your provider email stays private. Photo sharing is a separate optional choice.")
                    .font(.footnote).foregroundStyle(.secondary)
                if let error { Text(error).foregroundStyle(.red) }
            }
            .navigationTitle("Edit profile")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() }.disabled(busy) }
                ToolbarItem(placement: .confirmationAction) { Button("Save") { Task { await save() } }.disabled(busy) }
            }
        }.interactiveDismissDisabled(busy)
    }
    @MainActor private func save() async {
        busy = true; defer { busy = false }
        do {
            // Match PATCH auth/me exactly; never submit the player ID or provider claims.
            let data = try JSONSerialization.data(withJSONObject: ["displayName": player.displayName,
                "generalLocation": player.generalLocation, "bio": player.bio,
                "skillLevel": player.skillLevel, "discoverable": player.discoverable])
            let _: NativeCommunityAPI.Empty = try await NativeCommunityAPI.shared.request("auth/me", method: "PATCH", body: data)
            await account.refresh(); dismiss()
        } catch { self.error = error.localizedDescription }
    }
}

nonisolated private extension Data {
    var base64URLEncoded: String { base64EncodedString().replacingOccurrences(of: "+", with: "-")
        .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "") }
}
