import SwiftUI
import PhotosUI
import CoreTransferable
import UniformTypeIdentifiers
import ImageIO

nonisolated private struct NativeCoverSaveResponse: Decodable, Sendable {
    let ok: Bool
    let url: String?
}

extension NativeGroupDetail {
    var canManageCover: Bool {
        canViewMembers && ["owner", "coowner"].contains(membership?.role ?? "")
    }
}

nonisolated enum NativeCoverError: LocalizedError {
    case invalidPhoto, unavailable, uncertain
    var errorDescription: String? {
        switch self {
        case .invalidPhoto: "Choose a JPEG, PNG or WebP image up to 5 MB."
        case .unavailable: "The group cover could not load. Refresh to try again."
        case .uncertain: "The change could not be confirmed. Refresh and review the current cover before trying again."
        }
    }
}

// Materialize only bounded files while the picker's temporary URL is valid.
// Keep the upload bytes in memory; do not persist the selection or its metadata.
nonisolated struct NativeCoverSelection: Transferable, Sendable {
    let bytes: Data
    let contentType: String
    let thumbnail: Data

    static var transferRepresentation: some TransferRepresentation {
        FileRepresentation(importedContentType: .image) { received in
            let size = try received.file.resourceValues(forKeys: [.fileSizeKey]).fileSize ?? 0
            guard (1...5 * 1024 * 1024).contains(size) else { throw NativeCoverError.invalidPhoto }
            return try prepare(Data(contentsOf: received.file))
        }
    }

    static func prepare(_ data: Data) throws -> Self {
        guard !data.isEmpty, data.count <= 5 * 1024 * 1024,
              let source = CGImageSourceCreateWithData(data as CFData, nil),
              let identifier = CGImageSourceGetType(source) as String?,
              let type = [UTType.jpeg, .png, .webP].first(where: { $0.identifier == identifier }),
              let mime = type.preferredMIMEType else { throw NativeCoverError.invalidPhoto }
        return Self(bytes: data, contentType: mime, thumbnail: try thumbnailData(data))
    }

    static func thumbnailData(_ data: Data) throws -> Data {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil),
              let image = CGImageSourceCreateThumbnailAtIndex(source, 0, [
                kCGImageSourceCreateThumbnailFromImageAlways: true,
                kCGImageSourceCreateThumbnailWithTransform: true,
                kCGImageSourceThumbnailMaxPixelSize: 1200,
                kCGImageSourceShouldCacheImmediately: true
              ] as CFDictionary) else { throw NativeCoverError.invalidPhoto }
        let result = NSMutableData()
        guard let destination = CGImageDestinationCreateWithData(result, UTType.jpeg.identifier as CFString, 1, nil) else {
            throw NativeCoverError.invalidPhoto
        }
        CGImageDestinationAddImage(destination, image, [kCGImageDestinationLossyCompressionQuality: 0.85] as CFDictionary)
        guard CGImageDestinationFinalize(destination) else { throw NativeCoverError.invalidPhoto }
        return result as Data
    }
}

// Covers are public. No bearer token, cookies, disk cache or persistent image cache.
actor NativeGroupCoverAPI {
    static let shared = NativeGroupCoverAPI()
    private let session: URLSession
    init() {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        configuration.timeoutIntervalForRequest = 20
        session = URLSession(configuration: configuration)
    }

    func image(groupID: String) async throws -> Data? {
        guard UUID(uuidString: groupID) != nil else { throw NativeCoverError.unavailable }
        #if DEBUG
        if ScreenshotMockContent.isEnabled { return nil }
        #endif
        #if DEBUG
        let origin = NativeCommunityAPI.origin
        #else
        let origin = URL(string: "https://opencourts.us")!
        #endif
        let url = origin.appending(path: "api/media/group/\(groupID)")
        var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
        request.setValue("image/webp", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request)
        try Task.checkCancellation()
        guard let response = response as? HTTPURLResponse,
              response.url?.scheme == origin.scheme, response.url?.host == origin.host,
              response.url?.port == origin.port, response.url?.path == url.path else { throw NativeCoverError.unavailable }
        if response.statusCode == 404 { return nil }
        guard response.statusCode == 200, response.mimeType == "image/webp",
              !data.isEmpty, data.count <= 1024 * 1024 else { throw NativeCoverError.unavailable }
        return try NativeCoverSelection.thumbnailData(data)
    }
}

private struct NativeCoverArtwork: View {
    let imageData: Data?
    let loading: Bool
    var unavailable = false
    var aspectRatio: CGFloat = 2
    var compact = false
    var body: some View {
        ZStack {
            LinearGradient(colors: [Brand.accent.opacity(0.14), Brand.accent.opacity(0.04)],
                           startPoint: .topLeading, endPoint: .bottomTrailing)
            if let imageData, let image = UIImage(data: imageData) {
                GeometryReader { proxy in
                    Image(uiImage: image).resizable().scaledToFill()
                        .frame(width: proxy.size.width, height: proxy.size.height).clipped()
                }
                .accessibilityLabel("Group cover photo")
            } else if loading {
                ProgressView("Loading cover…")
            } else {
                if compact {
                    Image(systemName: "person.2.fill")
                        .font(.title2)
                        .foregroundStyle(Brand.accent.opacity(0.8))
                } else {
                    Label {
                        if unavailable { Text("Cover unavailable") } else { Text("No group cover") }
                    } icon: { Image(systemName: "photo") }
                    .font(.subheadline).foregroundStyle(.secondary)
                }
            }
        }
        .aspectRatio(aspectRatio, contentMode: .fit)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct NativePublicGroupCover: View {
    let groupID: String
    var aspectRatio: CGFloat = 2
    var compact = false
    @Environment(\.scenePhase) private var phase
    @State private var data: Data?
    @State private var loading = true
    @State private var failed = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            NativeCoverArtwork(imageData: data, loading: loading, unavailable: failed,
                               aspectRatio: aspectRatio, compact: compact)
        }
        .task(id: "\(groupID)-\(phase)") {
            data = nil; failed = false
            guard phase == .active else { return }
            loading = true
            do {
                let result = try await NativeGroupCoverAPI.shared.image(groupID: groupID)
                guard !Task.isCancelled, phase == .active else { return }
                data = result; loading = false
            } catch {
                guard !Task.isCancelled, phase == .active else { return }
                failed = true; loading = false
            }
        }
        .onDisappear { data = nil }
    }
}

struct NativeGroupCoverView: View {
    let groupID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.communityDockHeight) private var dockHeight
    @State private var detail: NativeGroupDetail?
    @State private var currentImage: Data?
    @State private var selection: NativeCoverSelection?
    @State private var pickerItem: PhotosPickerItem?
    @State private var loading = false
    @State private var busy = false
    @State private var error: String?
    @State private var notice: LocalizedStringResource?
    @State private var confirmPublish = false
    @State private var confirmRemove = false
    @State private var generation = UUID()

    var body: some View {
        List {
            if let detail {
                Section {
                    Text(detail.group.name).font(.title2.bold())
                    NativeCoverArtwork(imageData: selection?.thumbnail ?? currentImage, loading: loading)
                    if selection != nil {
                        Label("Unsaved preview", systemImage: "eye").font(.caption.weight(.semibold))
                    }
                }
                Section {
                    Label("A public photo", systemImage: "globe").font(.headline)
                    Text("Anyone can view this cover, including when your group is private. Only Owners and Co-owners can change it.")
                        .font(.subheadline).foregroundStyle(.secondary)
                    Text("JPEG, PNG or WebP · Up to 5 MB. The saved cover is resized and its metadata is removed.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                if detail.canManageCover {
                    Section {
                        PhotosPicker(selection: $pickerItem, matching: .images, preferredItemEncoding: .compatible) {
                            Label {
                                if selection == nil { Text("Choose cover photo") } else { Text("Choose another photo") }
                            } icon: { Image(systemName: "photo.on.rectangle") }
                            .frame(minHeight: 44)
                        }
                        if selection != nil {
                            Button {
                                confirmPublish = true
                            } label: {
                                Label("Publish cover", systemImage: "arrow.up.circle")
                                    .frame(maxWidth: .infinity, minHeight: 44)
                            }
                            .buttonStyle(AppPrimaryButtonStyle())
                            Button("Discard selection", role: .cancel) { clearSelection() }
                                .frame(minHeight: 44)
                        } else if currentImage != nil {
                            Button("Remove cover", role: .destructive) { confirmRemove = true }
                                .frame(minHeight: 44)
                        }
                    }.disabled(busy || loading)
                }
            } else if loading { ProgressView("Loading group cover…") }
            if busy { ProgressView("Saving cover…") }
            if let notice { Text(notice).font(.footnote) }
            if let error {
                Section {
                    Text(error).foregroundStyle(.secondary)
                    Button("Refresh cover") { Task { await load() } }.disabled(busy)
                }
            }
        }
        .contentMargins(.bottom, dockHeight, for: .scrollContent)
        .navigationTitle("Group cover")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: "\(account.player?.id ?? "signed-out")-\(phase)") { await load() }
        .task(id: pickerItem) { await prepareSelection() }
        .refreshable { if !busy { await load() } }
        .onDisappear { invalidate() }
        .onChange(of: phase) { _, _ in invalidate() }
        .onChange(of: account.player?.id) { _, _ in invalidate() }
        .alert("Publish this cover publicly?", isPresented: $confirmPublish) {
            Button("Publish cover") { Task { await save(remove: false) } }
            Button("Keep editing", role: .cancel) { }
        } message: {
            Text("Anyone can view this photo, even if the group is private. Publishing replaces the current cover.")
        }
        .alert("Remove this group cover?", isPresented: $confirmRemove) {
            Button("Remove cover", role: .destructive) { Task { await save(remove: true) } }
            Button("Keep cover", role: .cancel) { }
        } message: {
            Text("This removes the saved photo. Previously cached public copies may remain visible after removal.")
        }
    }

    private func clearSelection() {
        pickerItem = nil; selection = nil; confirmPublish = false
    }

    private func invalidate() {
        generation = UUID(); detail = nil; currentImage = nil; clearSelection()
        confirmRemove = false; error = nil; notice = nil; loading = false
    }

    @MainActor private func load() async {
        invalidate()
        guard let actor = account.player?.id, phase == .active else { return }
        let token = generation
        loading = true
        defer { if generation == token { loading = false } }
        do {
            let response: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            guard response.canManageCover else { throw CommunityError.accessChanged }
            detail = response
            let image = try await NativeGroupCoverAPI.shared.image(groupID: groupID)
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            currentImage = image
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            detail = nil; currentImage = nil; self.error = error.localizedDescription
        }
    }

    @MainActor private func prepareSelection() async {
        guard let item = pickerItem, let actor = account.player?.id, detail?.canManageCover == true, !busy else { return }
        let token = generation
        selection = nil; error = nil; notice = nil; loading = true
        defer { if generation == token { loading = false } }
        do {
            guard let result = try await item.loadTransferable(type: NativeCoverSelection.self) else { throw NativeCoverError.invalidPhoto }
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            selection = result
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active, !Task.isCancelled else { return }
            pickerItem = nil; selection = nil; self.error = error.localizedDescription
        }
    }

    @MainActor private func save(remove: Bool) async {
        guard !busy, !loading, detail?.canManageCover == true, let actor = account.player?.id,
              phase == .active, remove || selection != nil else { return }
        let token = generation
        let upload = selection
        busy = true; error = nil; notice = nil; confirmPublish = false; confirmRemove = false
        defer { busy = false }
        do {
            let latest: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            guard latest.canManageCover else { throw CommunityError.accessChanged }
            let response: NativeCoverSaveResponse = try await NativeCommunityAPI.shared.request(
                "media/group/\(groupID)", method: remove ? "DELETE" : "PUT",
                body: remove ? nil : upload?.bytes, timeout: 60,
                contentType: upload?.contentType ?? "application/json"
            )
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            guard response.ok, remove ? response.url == nil : response.url?.hasPrefix("/api/media/group/\(groupID)?v=") == true else {
                throw NativeCoverError.uncertain
            }
            await load()
            if account.player?.id == actor, phase == .active, error == nil, detail?.canManageCover == true {
                notice = remove ? "Cover removed." : "Public cover saved."
            }
        } catch {
            guard generation == token, account.player?.id == actor, phase == .active else { return }
            detail = nil; currentImage = nil; clearSelection()
            self.error = "\(error.localizedDescription) \(NativeCoverError.uncertain.localizedDescription)"
        }
    }
}
