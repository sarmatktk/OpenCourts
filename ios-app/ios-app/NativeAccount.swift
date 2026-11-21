import SwiftUI
import AuthenticationServices
import CryptoKit
import Security

nonisolated struct NativeCredential: Codable, Sendable {
    let token: String
    let csrfToken: String
    let expiresAt: Double
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
    case unavailable, signedOut, callback, storage
    var errorDescription: String? {
        switch self {
        case .unavailable: "Native sign-in is not enabled on this development server yet."
        case .signedOut: "Please sign in again."
        case .callback: "Sign-in could not be verified. Please try again."
        case .storage: "Your session could not be stored securely. Please try again."
        }
    }
}

nonisolated private enum NativeKeychain {
    // Separate service per backend. Never migrate browser cookies or store tokens in UserDefaults.
    static let service = "OpenCourts.native-session.preview.v1"
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
        return URL(string: "https://feature-play-together.opencourts.pages.dev")!
    }()
    private let session: URLSession
    private var credential: NativeCredential?
    init() {
        let config = URLSessionConfiguration.ephemeral
        config.httpCookieStorage = nil; config.httpShouldSetCookies = false; config.urlCache = nil
        config.timeoutIntervalForRequest = 20
        session = URLSession(configuration: config)
    }
    func restore() throws {
        #if DEBUG
        credential = nil
        credential = try NativeKeychain.read()
        if let credential, credential.expiresAt <= Date().timeIntervalSince1970 * 1000 {
            self.credential = nil; NativeKeychain.clear()
        }
        #endif
    }
    var hasSession: Bool { credential != nil }
    func invalidate() { credential = nil; NativeKeychain.clear() }
    func exchange(code: String, verifier: String) async throws {
        #if DEBUG
        let body = try JSONSerialization.data(withJSONObject: ["code": code, "verifier": verifier])
        let value: NativeCredential = try await request("auth/native/exchange", method: "POST", body: body, needsSession: false)
        guard value.expiresAt > Date().timeIntervalSince1970 * 1000 else { throw NativeAccountError.callback }
        try NativeKeychain.save(value)
        credential = value
        #else
        throw NativeAccountError.unavailable
        #endif
    }
    func logout(all: Bool = false) async throws {
        let _: Empty = try await request(all ? "auth/logout-all" : "auth/logout", method: "POST", body: Data("{}".utf8))
        credential = nil; NativeKeychain.clear()
    }
    func request<T: Decodable & Sendable>(_ path: String, query: [URLQueryItem] = [], method: String = "GET",
                                         body: Data? = nil, needsSession: Bool = true) async throws -> T {
        #if !DEBUG
        throw NativeAccountError.unavailable
        #else
        if needsSession && credential == nil { throw NativeAccountError.signedOut }
        let requestToken = credential?.token
        var parts = URLComponents(url: Self.origin.appending(path: "api/\(path)"), resolvingAgainstBaseURL: false)!
        parts.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: parts.url!, cachePolicy: .reloadIgnoringLocalCacheData)
        request.httpMethod = method; request.httpBody = body
        request.setValue(Self.origin.absoluteString, forHTTPHeaderField: "Origin")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if needsSession, let credential {
            request.setValue("Bearer \(credential.token)", forHTTPHeaderField: "Authorization")
            if method != "GET" { request.setValue(credential.csrfToken, forHTTPHeaderField: "X-CSRF-Token") }
        }
        let (data, response) = try await session.data(for: request)
        try Task.checkCancellation()
        if needsSession && credential?.token != requestToken { throw NativeAccountError.signedOut }
        guard let response = response as? HTTPURLResponse else { throw CommunityError.invalidResponse }
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
        #endif
    }
    nonisolated struct Empty: Decodable, Sendable {}
    nonisolated private struct ServerError: Decodable, Sendable { let error: String }
}

@MainActor @Observable final class NativeAccountStore {
    var player: NativePlayer?
    var connectedProviders: [String] = []
    var error: String?
    var busy = false
    func refresh() async {
        do {
            try await NativeCommunityAPI.shared.restore()
            guard await NativeCommunityAPI.shared.hasSession else { player = nil; connectedProviders = []; return }
            let account: NativeAccountResponse = try await NativeCommunityAPI.shared.request("auth/me")
            if account.player == nil { await NativeCommunityAPI.shared.invalidate() }
            player = account.player; connectedProviders = account.connectedProviders; error = nil
        } catch { player = nil; connectedProviders = []; self.error = error.localizedDescription }
    }
}

struct NativeAccountView: View {
    @Bindable var account: NativeAccountStore
    @Environment(\.webAuthenticationSession) private var authentication
    @Environment(\.scenePhase) private var scenePhase
    @State private var adult = false
    @State private var edit: NativePlayer?
    @State private var confirmDelete = false
    @State private var deleteText = ""
    var body: some View {
        Form {
            if let player = account.player {
                Section("Profile") {
                    Text(player.displayName.isEmpty ? "Complete your player profile" : player.displayName)
                    Text(player.generalLocation)
                    Button("Edit profile") { edit = player }
                    Text("Connected: \(account.connectedProviders.joined(separator: ", "))").font(.footnote)
                }
                Section {
                    Button("Sign out", role: .destructive) { Task { await signOut() } }
                    Button("Sign out on all devices", role: .destructive) { Task { await signOut(all: true) } }
                    Button("Delete account", role: .destructive) { deleteText = ""; confirmDelete = true }
                }.disabled(account.busy)
            } else {
                Section {
                    Toggle("I confirm I am 18 or older", isOn: $adult)
                    Button(account.busy ? "Signing in…" : "Sign in with Google or Apple") { Task { await signIn() } }
                        .disabled(!adult || account.busy)
                    Text("Use your existing account. A secure authentication browser verifies your sign-in before returning to the app.")
                        .font(.footnote).foregroundStyle(.secondary)
                    #if !DEBUG
                    Text("Native sign-in is available only in development builds during integration.")
                    #endif
                }
            }
            if let error = account.error { Section { Text(error).foregroundStyle(.red) } }
            Section {
                Link("Privacy policy", destination: NativeCommunityAPI.origin.appending(path: "privacy"))
                Link("Terms", destination: NativeCommunityAPI.origin.appending(path: "terms"))
                Link("Help & safety", destination: NativeCommunityAPI.origin.appending(path: "play-together-help"))
                Link("Support", destination: NativeCommunityAPI.origin.appending(path: "support"))
            }
        }
        .navigationTitle("Account")
        .task { await account.refresh() }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await account.refresh() } }
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
    @MainActor private func signIn() async {
        account.busy = true; account.error = nil
        defer { account.busy = false }
        do {
            #if DEBUG
            let verifier = try randomToken(), state = try randomToken()
            let challenge = Data(SHA256.hash(data: Data(verifier.utf8))).base64URLEncoded
            var url = URLComponents(url: NativeCommunityAPI.origin.appending(path: "api/auth/native/authorize"), resolvingAgainstBaseURL: false)!
            url.queryItems = [URLQueryItem(name: "challenge", value: challenge), URLQueryItem(name: "state", value: state)]
            let result = try await authentication.authenticate(using: url.url!, callbackURLScheme: "opencourts-ios", preferredBrowserSession: .ephemeral)
            guard let parts = URLComponents(url: result, resolvingAgainstBaseURL: false),
                  parts.scheme == "opencourts-ios", parts.host == "auth", parts.path == "/complete",
                  parts.queryItems?.filter({ $0.name == "state" }).count == 1,
                  parts.queryItems?.first(where: { $0.name == "state" })?.value == state,
                  parts.queryItems?.filter({ $0.name == "code" }).count == 1,
                  let code = parts.queryItems?.first(where: { $0.name == "code" })?.value else { throw NativeAccountError.callback }
            try await NativeCommunityAPI.shared.exchange(code: code, verifier: verifier)
            await account.refresh()
            #else
            throw NativeAccountError.unavailable
            #endif
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
    private func randomToken() throws -> String {
        var data = Data(count: 32)
        let status = data.withUnsafeMutableBytes { SecRandomCopyBytes(kSecRandomDefault, 32, $0.baseAddress!) }
        guard status == errSecSuccess else { throw NativeAccountError.callback }
        return data.base64URLEncoded
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
                TextField("General location", text: $player.generalLocation)
                TextField("Bio", text: $player.bio, axis: .vertical)
                Picker("Skill preference", selection: $player.skillLevel) {
                    ForEach(["unspecified", "beginner", "intermediate", "advanced"], id: \.self) { Text($0.capitalized).tag($0) }
                }
                Toggle("Appear in Players discovery", isOn: $player.discoverable)
                Text("Your provider email stays private. Photo sharing is a separate optional choice.")
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
