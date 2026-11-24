import SwiftUI
import PhotosUI
import UIKit

nonisolated final class NativePhotoRedirectGuard: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping @Sendable (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}

nonisolated private struct NativePhotoVisibility: Decodable, Sendable {
    let shared: Bool
    let hasPhoto: Bool
}

nonisolated private struct NativePhotoAcknowledgement: Decodable, Sendable {
    let ok: Bool
}

nonisolated enum NativePhotoFeedback {
    static func failure(_ error: Error) -> String {
        let value = error as NSError
        let recovery = "Refresh photo and settings before trying again."
        if value.domain == "OpenCourts", (400...599).contains(value.code) {
            // Even a server error may follow a committed write; do not promise it was rolled back.
            return "\(value.localizedDescription) \(recovery)"
        }
        if case NativeAccountError.signedOut = error {
            return "Please sign in again, then refresh photo and settings."
        }
        return "The change could not be confirmed. \(recovery)"
    }
}

// The site uses the same unit-square geometry for its circular preview and 512px export.
nonisolated struct NativeAvatarFraming: Equatable, Sendable {
    var x: Double = 50
    var y: Double = 25
    var zoom: Double = 1

    func rect(imageSize: CGSize, side: CGFloat) -> CGRect {
        guard imageSize.width > 0, imageSize.height > 0 else { return .zero }
        let scale = max(1 / imageSize.width, 1 / imageSize.height) * zoom
        let width = imageSize.width * scale * side
        let height = imageSize.height * scale * side
        return CGRect(x: (side - width) * x / 100, y: (side - height) * y / 100,
                      width: width, height: height)
    }

    @MainActor func png(image: UIImage) throws -> Data {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 512, height: 512), format: format)
        let data = renderer.pngData { _ in image.draw(in: rect(imageSize: image.size, side: 512)) }
        guard !data.isEmpty, data.count <= 5 * 1024 * 1024 else { throw NativeCoverError.invalidPhoto }
        return data
    }
}

private struct NativeAvatarCropControls: View {
    let image: UIImage
    @Binding var framing: NativeAvatarFraming

    var body: some View {
        VStack(spacing: 20) {
            GeometryReader { proxy in
                let side = min(proxy.size.width, 260)
                let rect = framing.rect(imageSize: image.size, side: side)
                Image(uiImage: image).resizable()
                    .frame(width: rect.width, height: rect.height)
                    .offset(x: rect.minX, y: rect.minY)
                    .frame(width: side, height: side, alignment: .topLeading)
                    .clipShape(Circle())
                    .overlay(Circle().strokeBorder(.primary.opacity(0.12), lineWidth: 1))
                    .frame(maxWidth: .infinity)
            }
            .frame(height: 260)
            .accessibilityLabel("Circular photo preview")
            Text("Use the sliders to frame your face.").font(.footnote).foregroundStyle(.secondary)
            VStack(alignment: .leading) {
                Text("Zoom").font(.subheadline)
                Slider(value: $framing.zoom, in: 1...3, step: 0.05) { Text("Zoom") }
                Text("Move left or right").font(.subheadline)
                Slider(value: $framing.x, in: 0...100) { Text("Move left or right") }
                    .disabled(framing.rect(imageSize: image.size, side: 1).width <= 1)
                Text("Move up or down").font(.subheadline)
                Slider(value: $framing.y, in: 0...100) { Text("Move up or down") }
                    .disabled(framing.rect(imageSize: image.size, side: 1).height <= 1)
            }
            Button("Reset framing") { framing = NativeAvatarFraming() }
        }
        .padding(.vertical, 12)
    }
}

struct NativeProfilePhotoView: View {
    let playerID: String
    let account: NativeAccountStore
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.communityDockHeight) private var communityDockHeight
    @State private var picker: PhotosPickerItem?
    @State private var draft: UIImage?
    @State private var saved: UIImage?
    @State private var framing = NativeAvatarFraming()
    @State private var visibility: NativePhotoVisibility?
    @State private var busy = false
    @State private var message: String?
    @State private var confirmRemoval = false
    @State private var generation = UUID()
    @State private var refreshID = UUID()

    private var active: Bool { scenePhase == .active && account.player?.id == playerID }
    private var path: String { "media/player/\(playerID)" }

    var body: some View {
        Form {
            Section {
                if let draft {
                    NativeAvatarCropControls(image: draft, framing: $framing)
                    Button("Save photo") { Task { await savePhoto(draft) } }
                        .buttonStyle(AppPrimaryButtonStyle())
                    Button("Discard selection") { self.draft = nil; picker = nil }
                } else if let saved {
                    Image(uiImage: saved).resizable().scaledToFill()
                        .frame(width: 120, height: 120).clipShape(Circle())
                        .frame(maxWidth: .infinity).padding(.vertical, 16)
                        .accessibilityLabel("Your saved profile photo")
                } else {
                    Image(systemName: "person.crop.circle")
                        .font(.system(size: 72)).foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity).padding(.vertical, 16)
                        .accessibilityLabel("No photo preview")
                }
                PhotosPicker(selection: $picker, matching: .images, preferredItemEncoding: .compatible) {
                    Label(visibility?.hasPhoto == true ? "Choose replacement" : "Choose photo", systemImage: "photo")
                }
                Text("JPEG, PNG or WebP, up to 5 MB. Your first photo is private until you turn on sharing.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            .disabled(busy || visibility == nil || !active)

            Section {
                Toggle("Share my photo in Players, games and groups", isOn: Binding(
                    get: { visibility?.shared == true },
                    set: { value in Task { await changeSharing(value) } }
                ))
                .disabled(busy || visibility?.hasPhoto != true || draft != nil || !active)
                Text("Optional. Off by default. Signed-in players can see your photo in Players when your profile is discoverable. Game and group access still applies. Otherwise, your initials appear.")
                    .font(.footnote).foregroundStyle(.secondary)
                if draft != nil { Text("Save your selected photo before changing sharing.").font(.footnote) }
            } header: { Text("Photo sharing") }

            if visibility?.hasPhoto == true {
                Section {
                    Button("Remove photo", role: .destructive) { confirmRemoval = true }
                        .disabled(busy || !active)
                }
            }
            if busy { Section { ProgressView("Updating photo…") } }
            if let message { Section { Text(message).font(.callout).accessibilityAddTraits(.updatesFrequently) } }
            Section {
                Button("Refresh photo and settings") { clear(); refreshID = UUID() }
                    .disabled(busy || !active)
            }
        }
        .contentMargins(.bottom, communityDockHeight, for: .scrollContent)
        .navigationTitle("Your photo")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: refreshID) { await load() }
        .task(id: picker) {
            guard let picker, active, !busy else { return }
            let ticket = generation
            do {
                guard let value = try await picker.loadTransferable(type: NativeCoverSelection.self),
                      let image = UIImage(data: value.thumbnail) else { throw NativeCoverError.invalidPhoto }
                guard active, generation == ticket, !Task.isCancelled else { return }
                draft = image; framing = NativeAvatarFraming(); message = nil
            } catch {
                guard active, generation == ticket, !Task.isCancelled else { return }
                message = error.localizedDescription
            }
        }
        .onChange(of: account.player?.id) { _, _ in clear() }
        .onChange(of: scenePhase) { _, phase in
            clear()
            if phase == .active { refreshID = UUID() }
        }
        .onDisappear { clear() }
        .alert("Remove your photo?", isPresented: $confirmRemoval) {
            Button("Remove photo", role: .destructive) { Task { await mutate(method: "DELETE") } }
            Button("Cancel", role: .cancel) { confirmRemoval = false }
        } message: {
            Text("Your photo will be removed and sharing will turn off.")
        }
    }

    private func clear() {
        generation = UUID(); saved = nil; draft = nil; picker = nil
        visibility = nil; message = nil; confirmRemoval = false; busy = false
    }

    @MainActor private func load() async {
        guard active else { return }
        let ticket = generation
        busy = true
        defer { if ticket == generation { busy = false } }
        do {
            let settings: NativePhotoVisibility = try await NativeCommunityAPI.shared.request(path + "/visibility")
            let data = settings.hasPhoto ? try await NativeCommunityAPI.shared.playerPhoto(playerID) : nil
            guard active, ticket == generation, !Task.isCancelled else { return }
            saved = data.flatMap { UIImage(data: $0) }
            visibility = settings
            if settings.hasPhoto && saved == nil { message = "Your photo preview could not load. Refresh to try again." }
        } catch {
            guard active, ticket == generation, !Task.isCancelled else { return }
            message = error.localizedDescription
        }
    }

    @MainActor private func savePhoto(_ image: UIImage) async {
        do { await mutate(method: "PUT", body: try framing.png(image: image), contentType: "image/png") }
        catch { message = error.localizedDescription }
    }

    @MainActor private func changeSharing(_ value: Bool) async {
        guard visibility?.hasPhoto == true, draft == nil else { return }
        do {
            let body = try JSONEncoder().encode(["shared": value])
            await mutate(method: "POST", body: body, suffix: "/visibility")
        } catch { message = error.localizedDescription }
    }

    @MainActor private func mutate(method: String, body: Data? = nil, contentType: String = "application/json",
                                   suffix: String = "") async {
        guard active, !busy, visibility != nil else { return }
        let ticket = generation
        busy = true; message = nil
        defer {
            if account.player?.id == playerID { account.photoRevision = UUID() }
        }
        do {
            let result: NativePhotoAcknowledgement = try await NativeCommunityAPI.shared.request(
                path + suffix, method: method, body: body, contentType: contentType)
            guard result.ok else { throw CommunityError.invalidResponse }
            guard active, ticket == generation, !Task.isCancelled else { return }
            clear(); busy = false
            await load()
        } catch {
            guard active, ticket == generation, !Task.isCancelled else { return }
            // A response may be lost after the server committed. Require a fresh read, never replay automatically.
            clear(); busy = false
            message = NativePhotoFeedback.failure(error)
        }
    }
}

/// The owner can see their own photo even when sharing is off.
/// Image state stays local to this visible control; no global or persistent image cache.
struct NativeAccountToolbarAvatar: View {
    let account: NativeAccountStore
    @Environment(\.scenePhase) private var scenePhase
    @State private var image: UIImage?
    @State private var loadedKey: String?
    @State private var generation = UUID()

    private var requestKey: String {
        "\(account.player?.id ?? "signed-out")-\(account.photoRevision)-\(scenePhase)"
    }

    var body: some View {
        NativeAccountAvatarBadge(
            image: activeImage,
            displayName: account.player?.displayName ?? ""
        )
        .frame(width: 44, height: 44)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("Account")
        .task(id: requestKey) { await load() }
        .onDisappear { clear() }
        .onChange(of: scenePhase) { _, phase in
            if phase != .active { clear() }
        }
    }

    private var activeImage: UIImage? {
        scenePhase == .active && loadedKey == requestKey ? image : nil
    }

    private func clear() {
        generation = UUID()
        image = nil
        loadedKey = nil
    }

    @MainActor private func load() async {
        clear()
        guard scenePhase == .active, let playerID = account.player?.id else { return }
        let ticket = generation
        let key = requestKey
        do {
            let data = try await NativeCommunityAPI.shared.playerPhoto(playerID)
            guard !Task.isCancelled, generation == ticket, requestKey == key,
                  scenePhase == .active, account.player?.id == playerID else { return }
            image = data.flatMap { UIImage(data: $0) }
            loadedKey = key
        } catch {
            guard generation == ticket, requestKey == key else { return }
            image = nil; loadedKey = nil
            if case NativeAccountError.signedOut = error { await account.refresh() }
        }
    }
}

/// Server-authorized shared avatar. No sharing flag or group role grants access locally.
struct NativePlayerAvatar: View {
    let playerID: String
    let displayName: String
    var gameID: String? = nil
    var size: CGFloat = 40
    let refreshID: UUID
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var scenePhase
    @State private var image: UIImage?
    @State private var loadedKey: String?
    @State private var generation = UUID()

    private var key: String {
        "\(account.player?.id ?? "")/\(playerID)/\(gameID ?? "")/\(account.photoRevision)/\(refreshID)/\(scenePhase)"
    }

    var body: some View {
        NativeAccountAvatarBadge(
            image: scenePhase == .active && account.player != nil && loadedKey == key ? image : nil,
            displayName: displayName,
            size: size
        )
        .accessibilityHidden(true)
        .task(id: key) { await load() }
        .onDisappear { clear() }
        .onChange(of: scenePhase) { _, phase in if phase != .active { clear() } }
    }

    private func clear() {
        generation = UUID(); image = nil; loadedKey = nil
    }

    @MainActor private func load() async {
        clear()
        guard scenePhase == .active, account.player != nil else { return }
        let ticket = generation
        let requestedKey = key
        do {
            let data = try await NativeCommunityAPI.shared.playerPhoto(playerID, gameID: gameID)
            guard !Task.isCancelled, generation == ticket, key == requestedKey,
                  scenePhase == .active, account.player != nil else { return }
            image = data.flatMap { UIImage(data: $0) }; loadedKey = requestedKey
        } catch {
            guard generation == ticket, key == requestedKey else { return }
            image = nil; loadedKey = nil
            if case NativeAccountError.signedOut = error { await account.refresh() }
        }
    }
}

struct NativeAccountAvatarBadge: View {
    let image: UIImage?
    let displayName: String
    var size: CGFloat = 30

    static func initials(_ name: String) -> String {
        let parts = name.split(whereSeparator: { $0.isWhitespace })
        return parts.prefix(2).compactMap { $0.first }.map(String.init).joined().uppercased()
    }

    var body: some View {
        ZStack {
            Circle().fill(Brand.accent.opacity(0.12))
            if let image {
                Image(uiImage: image).resizable().scaledToFill()
            } else if !Self.initials(displayName).isEmpty {
                Text(Self.initials(displayName))
                    .font(.system(size: min(12, size * 0.4), weight: .semibold))
                    .lineLimit(1).minimumScaleFactor(0.7)
                    .padding(3)
            } else {
                Image(systemName: "person.crop.circle")
                    .font(.body.weight(.medium))
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().strokeBorder(.primary.opacity(0.1), lineWidth: 0.5))
        .accessibilityHidden(true)
    }
}

private struct NativePhotoFramingPreview: View {
    @State private var framing = NativeAvatarFraming()
    static var image: UIImage {
    let format = UIGraphicsImageRendererFormat()
    format.scale = 1
    let image = UIGraphicsImageRenderer(size: CGSize(width: 500, height: 800), format: format).image { context in
        UIColor.systemTeal.setFill()
        context.fill(CGRect(x: 0, y: 0, width: 500, height: 800))
        UIColor.systemOrange.setFill()
        context.fill(CGRect(x: 100, y: 100, width: 300, height: 300))
    }
    return image
    }
    var body: some View {
        Form { NativeAvatarCropControls(image: Self.image, framing: $framing) }
    }
}

#Preview("Photo framing") { NativePhotoFramingPreview() }
#Preview("Account avatar states") {
    NavigationStack {
        VStack(spacing: 24) {
            Text("Account avatar states").font(.headline)
            HStack(spacing: 28) {
                NativeAccountAvatarBadge(image: NativePhotoFramingPreview.image, displayName: "Alex Chen")
                NativeAccountAvatarBadge(image: nil, displayName: "Alex Chen")
                NativeAccountAvatarBadge(image: nil, displayName: "")
            }
            Text("Photo · Initials · Signed out").font(.footnote).foregroundStyle(.secondary)
        }
        .navigationTitle("Courts")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {} label: {
                    NativeAccountAvatarBadge(image: NativePhotoFramingPreview.image, displayName: "Alex Chen")
                        .frame(width: 44, height: 44)
                }
                .accessibilityLabel("Account")
            }
        }
    }
    .tint(Brand.accent)
}
