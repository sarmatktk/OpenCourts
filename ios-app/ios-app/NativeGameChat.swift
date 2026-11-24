import SwiftUI

nonisolated struct NativeChatPage: Decodable, Sendable {
    let available: Bool
    let notice: String?
    let expired: Bool?
    let canSend: Bool?
    let expiresAt: Double?
    let closesAt: Double?
    let series: Bool?
    let roomId: String?
    let viewerId: String?
    let muted: Bool?
    let unread: Int?
    let hasOlder: Bool?
    let messages: [Message]?
    let audience: [Person]?

    struct Message: Decodable, Identifiable, Sendable {
        let id: String
        let seq: Int
        let kind: String?
        let authorId: String?
        let displayName: String
        let body: String
        let createdAt: Double
        let hiddenAt: Double?
        var date: Date { Date(timeIntervalSince1970: createdAt / 1000) }
        var isSystem: Bool { kind != nil && kind != "message" }
        var visibleBody: String { hiddenAt == nil ? body : "Message removed by a site moderator." }
        func canReport(for actor: String) -> Bool {
            !actor.isEmpty && !isSystem && hiddenAt == nil && authorId != nil && authorId != actor
        }
    }

    struct Person: Decodable, Identifiable, Sendable {
        let id: String
        let displayName: String
        let role: String
        func badgeTitle(isSeries: Bool) -> String {
            if isSeries {
                return switch role {
                case "owner": "Owner"
                case "coowner": "Co-owner"
                case "organizer": "Organizer"
                case "member": "Member"
                default: "Participant"
                }
            } else {
                return switch role {
                case "organizer": "Host"
                case "player": "Player"
                default: "Invited"
                }
            }
        }
    }

    func validated(for actor: String) throws -> Self {
        guard available else { return self }
        if expired == true { return self }
        guard viewerId == actor, let roomId, !roomId.isEmpty,
              let expiresAt, expiresAt.isFinite, messages != nil, audience != nil else {
            throw CommunityError.invalidResponse
        }
        let rows = messages ?? []
        guard rows.count <= 50, Set(rows.map(\.id)).count == rows.count,
              zip(rows, rows.dropFirst()).allSatisfy({ $0.seq < $1.seq }) else {
            throw CommunityError.invalidResponse
        }
        return self
    }
}

nonisolated enum NativeChatHistory {
    static func prepend(_ earlier: [NativeChatPage.Message], to current: [NativeChatPage.Message],
                        before cursor: Int) throws -> [NativeChatPage.Message] {
        guard !earlier.isEmpty, earlier.allSatisfy({ $0.seq < cursor }),
              Set(earlier.map(\.id)).isDisjoint(with: Set(current.map(\.id))) else {
            throw CommunityError.invalidResponse
        }
        return earlier + current
    }
}

nonisolated enum NativeChatText {
    static func body(_ text: String) -> String {
        text.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    static func isValid(_ text: String, limit: Int = 2000) -> Bool {
        let value = body(text)
        return !value.isEmpty && value.utf16.count <= limit &&
            value.unicodeScalars.allSatisfy {
                !((0...8).contains($0.value) || $0.value == 11 || $0.value == 12 ||
                  (14...31).contains($0.value) || $0.value == 127)
            }
    }
}

nonisolated struct NativeChatSendAttempt: Sendable {
    let actorID: String
    let roomID: String
    let body: String
    let clientID: String
    let data: Data

    init(actorID: String, roomID: String, text: String, clientID: String = UUID().uuidString) throws {
        let body = NativeChatText.body(text)
        // JavaScript/server limits count UTF-16 code units, not Swift grapheme clusters.
        guard NativeChatText.isValid(text) else {
            throw NSError(domain: "OpenCourts", code: 400,
                          userInfo: [NSLocalizedDescriptionKey: "Enter a message of up to 2,000 characters."])
        }
        self.actorID = actorID; self.roomID = roomID; self.body = body; self.clientID = clientID
        let encoder = JSONEncoder(); encoder.outputFormatting = [.sortedKeys]
        data = try encoder.encode(["body": body, "clientId": clientID])
    }
}

nonisolated private struct NativeChatSent: Decodable, Sendable {
    let id: String
    let seq: Int
}

private struct NativeChatComposer: View {
    @Binding var text: String
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let series: Bool
    let busy: Bool
    var checking = false
    let locked: Bool
    let send: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            let inputLayout = dynamicTypeSize.isAccessibilitySize
                ? AnyLayout(VStackLayout(alignment: .trailing, spacing: 4))
                : AnyLayout(HStackLayout(alignment: .bottom, spacing: 8))
            inputLayout {
                TextField(series ? "Message the series" : "Message the game", text: $text, axis: .vertical)
                    .lineLimit(1...5)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .frame(minHeight: 48, alignment: .leading)
                    .disabled(busy || locked)
                Button(action: send) {
                    Group {
                        if busy {
                            ProgressView()
                                .tint(.white)
                        } else {
                            Image(systemName: "arrow.up")
                                .font(.system(size: 19, weight: .semibold))
                        }
                    }
                    .frame(width: 40, height: 40)
                    .foregroundStyle(.white)
                    .background(Brand.actionFill.opacity(NativeChatText.isValid(text) && !busy && !checking && !locked ? 1 : 0.48), in: Circle())
                    .contentShape(Circle())
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Send message")
                .accessibilityHint("Sends your message to the conversation")
                .disabled(busy || checking || locked || !NativeChatText.isValid(text))
            }
            .padding(6)
            .background(Color(uiColor: .secondarySystemGroupedBackground), in: RoundedRectangle(cornerRadius: 28))
            Text("\(NativeChatText.body(text).utf16.count)/2,000 · Text only")
                .font(.caption)
                .foregroundStyle(NativeChatText.body(text).utf16.count > 2000 ? .red : .secondary)
        }
        .padding(.horizontal, 16).padding(.vertical, 10)
        .background(.regularMaterial)
    }
}

nonisolated struct NativeChatReadTarget: Hashable, Sendable {
    let actorID: String
    let roomID: String
    let sequence: Int
    let generation: UUID
}

nonisolated enum NativeChatPreference: Sendable {
    case read(Int)
    case mute(Bool)

    var action: String {
        switch self {
        case .read: "read"
        case .mute: "mute"
        }
    }

    func encoded() throws -> Data {
        switch self {
        case .read(let sequence): try JSONEncoder().encode(["throughSeq": sequence])
        case .mute(let muted): try JSONEncoder().encode(["muted": muted])
        }
    }
}

nonisolated private struct NativeChatPreferenceAck: Decodable {
    let ok: Bool
}

struct NativeGameChatView: View {
    let gameID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.communityChatOpen) private var communityChatOpen
    @Environment(\.dismiss) private var dismiss
    @State private var page: NativeChatPage?
    @State private var error: String?
    @State private var loading = false
    @State private var generation = UUID()
    @State private var refreshID = UUID()
    @State private var visibleID: String?
    @State private var avatarRevision = UUID()
    @State private var messages: [NativeChatPage.Message] = []
    @State private var historyFloor: Int?
    @State private var hasOlder = false
    @State private var draft = ""
    @State private var attempt: NativeChatSendAttempt?
    @State private var sending = false
    @State private var sendError: String?
    @State private var confirmClose = false
    @State private var confirmDiscard = false
    @State private var visibleLatestSeq: Int?
    @State private var latestMessagesBelow = false
    @State private var readThrough = 0
    @State private var readFailed = false
    @State private var updatingPreference = false
    @State private var preferenceError: String?
    @State private var reportTarget: NativeChatReportTarget?
    @State private var chatDetailsExpanded = false

    private var readTarget: NativeChatReadTarget? {
        guard !loading, !sending, !readFailed, reportTarget == nil, scenePhase == .active,
              let page, page.available, page.expired != true,
              (page.unread ?? 0) > 0, let actor = account.player?.id,
              page.viewerId == actor, let room = page.roomId,
              let sequence = messages.last?.seq, visibleLatestSeq == sequence,
              sequence > readThrough else { return nil }
        return NativeChatReadTarget(actorID: actor, roomID: room, sequence: sequence, generation: generation)
    }

    private var title: String { page?.series == true ? "Series chat" : "Game chat" }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if account.player == nil {
                    ContentUnavailableView("Sign in to open chat", systemImage: "person.crop.circle",
                        description: Text("Close this conversation and sign in from Account."))
                } else if let page {
                    if !page.available {
                        ContentUnavailableView("Chat unavailable", systemImage: "bubble.left.and.bubble.right",
                            description: Text(page.notice ?? "Current game access is required to open this conversation."))
                    } else if page.expired == true {
                        ContentUnavailableView("Conversation expired", systemImage: "clock",
                            description: Text("Messages are no longer available."))
                    } else {
                        DisclosureGroup(isExpanded: $chatDetailsExpanded) {
                            VStack(alignment: .leading, spacing: 0) {
                                NativeNotificationOptInNudge(reason: .gameChat)
                                NativeChatContext(page: page)
                                if let muted = page.muted {
                                    NativeChatNotificationControl(muted: muted,
                                        busy: loading || sending || updatingPreference || scenePhase != .active) {
                                        Task { await updatePreference(.mute(!muted)) }
                                    }
                                }
                                if let preferenceError {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(preferenceError).font(.footnote).foregroundStyle(.red)
                                        Button("Refresh chat") {
                                            readFailed = false
                                            self.preferenceError = nil
                                            Task { await load() }
                                        }.frame(minHeight: 44)
                                    }.padding(.horizontal, 16).padding(.vertical, 8)
                                }
                            }
                        } label: {
                            HStack {
                                Label("Chat details", systemImage: "slider.horizontal.3")
                                    .font(.subheadline.weight(.semibold))
                                Spacer()
                                if page.muted == true {
                                    Label("Muted", systemImage: "bell.slash.fill")
                                        .font(.caption.weight(.medium))
                                        .foregroundStyle(.secondary)
                                }
                                if let unread = page.unread, unread > 0 {
                                    Text("\(unread) unread")
                                        .font(.caption.weight(.semibold))
                                        .foregroundStyle(Brand.accent)
                                }
                            }
                            .padding(.horizontal, 16)
                            .frame(minHeight: 48)
                        }
                        .tint(Brand.accent)
                        .background(Brand.accent.opacity(0.05))
                        Divider()
                        GeometryReader { viewport in
                            ScrollView {
                                LazyVStack(alignment: .leading, spacing: 16) {
                                    if hasOlder {
                                        Button("Earlier messages", systemImage: "clock.arrow.circlepath") {
                                            Task { await load(older: true) }
                                        }
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                        .disabled(loading)
                                    }
                                    if messages.isEmpty {
                                        ContentUnavailableView("No messages yet", systemImage: "bubble.left",
                                            description: Text("Use this conversation to coordinate with your players."))
                                    }
                                    ForEach(messages) { message in
                                        NativeChatMessageRow(message: message, viewerID: page.viewerId ?? "",
                                                             gameID: gameID, revision: avatarRevision,
                                                             report: message.canReport(for: page.viewerId ?? "") ? {
                                        guard let actor = account.player?.id, let room = page.roomId else { return }
                                        reportTarget = NativeChatReportTarget(messageID: message.id, sequence: message.seq,
                                                                            actorID: actor, roomID: room)
                                    } : nil)
                                    }
                                    if let last = messages.last {
                                        Color.clear.frame(height: 1)
                                            .id("chat-end-\(last.id)")
                                            .onGeometryChange(for: Bool.self) { geometry in
                                                let frame = geometry.frame(in: .named("chat-log"))
                                                return frame.minY >= 0 && frame.maxY <= viewport.size.height
                                            } action: { visible in
                                                if visible {
                                                    visibleLatestSeq = last.seq
                                                    latestMessagesBelow = false
                                                }
                                                else if visibleLatestSeq == last.seq { visibleLatestSeq = nil }
                                            }
                                    }
                                }
                                .scrollTargetLayout()
                                .padding(16)
                            }
                            .defaultScrollAnchor(.bottom)
                            .scrollPosition(id: $visibleID)
                            .coordinateSpace(name: "chat-log")
                        }
                        if latestMessagesBelow {
                            Button("Latest messages", systemImage: "arrow.down") {
                                visibleID = messages.last.map { "chat-end-\($0.id)" }
                                latestMessagesBelow = false
                            }
                            .font(.subheadline.weight(.semibold))
                            .frame(maxWidth: .infinity, minHeight: 44)
                            .background(.regularMaterial)
                        }
                    }
                } else if let error {
                    ContentUnavailableView {
                        Label("Chat could not load", systemImage: "wifi.exclamationmark")
                    } description: { Text(error) } actions: {
                        Button("Try again") { refreshID = UUID() }
                    }
                } else { ProgressView("Loading conversation…").frame(maxHeight: .infinity) }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        if attempt != nil || sending { confirmClose = true } else { dismiss() }
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Refresh", systemImage: "arrow.clockwise") {
                        readFailed = false; preferenceError = nil
                        avatarRevision = UUID()
                        Task { await load() }
                    }.disabled(loading || sending || updatingPreference)
                }
            }
            .overlay(alignment: .top) { if loading && page != nil { ProgressView().padding(8) } }
            .safeAreaInset(edge: .bottom) {
                if scenePhase == .active, account.player != nil {
                    VStack(spacing: 0) {
                        if let attempt, attempt.actorID == account.player?.id {
                            VStack(alignment: .leading, spacing: 8) {
                                Text(attempt.body).font(.subheadline).lineLimit(3)
                                Text(sending ? "Sending your message…" : "Your message may have been sent. Retry uses the same message request.")
                                    .font(.footnote)
                                if !sending {
                                    Button("Retry same message") { Task { await send() } }.frame(minHeight: 44)
                                    Button("Discard retry", role: .destructive) { confirmDiscard = true }.frame(minHeight: 44)
                                }
                            }.padding(.horizontal, 16).padding(.vertical, 8)
                        }
                        if let sendError { Text(sendError).font(.footnote).foregroundStyle(.red).padding(.horizontal, 16) }
                        if page?.available == true, page?.expired != true, page?.canSend == true {
                            NativeChatComposer(text: $draft, series: page?.series == true,
                                               busy: sending, checking: loading || updatingPreference, locked: attempt != nil) {
                                Task { await send() }
                            }
                        }
                    }.background(.regularMaterial)
                }
            }
            .sheet(item: $reportTarget, onDismiss: { Task { await load() } }) { target in
                NativeChatReportView(gameID: gameID, target: target)
            }
            .interactiveDismissDisabled(sending || attempt != nil)
            .alert("Close this conversation?", isPresented: $confirmClose) {
                Button("Keep checking", role: .cancel) {}
                Button("Close", role: .destructive) { dismiss() }
            } message: { Text("Your message may already have been sent. Check the conversation before sending it again.") }
            .alert("Discard this retry?", isPresented: $confirmDiscard) {
                Button("Keep retry", role: .cancel) {}
                Button("Discard retry", role: .destructive) {
                    attempt = nil; draft = ""; sendError = nil
                }
            } message: { Text("This does not remove a message already sent. Check the conversation before writing it again.") }
        }
        .task(id: "\(account.player?.id ?? "")-\(scenePhase)-\(refreshID)") {
            clear()
            guard scenePhase == .active, account.player != nil else { return }
            while !Task.isCancelled {
                await load()
                do { try await Task.sleep(for: .seconds(10)) } catch { return }
            }
        }
        .task(id: readTarget) {
            guard let target = readTarget else { return }
            // Wait for layout/scroll to settle; never acknowledge merely fetched history.
            do { try await Task.sleep(for: .milliseconds(350)) } catch { return }
            guard !Task.isCancelled, readTarget == target else { return }
            await updatePreference(.read(target.sequence))
        }
        .task(id: page?.expiresAt) {
            guard page?.expired != true, let expiry = page?.expiresAt, expiry.isFinite else { return }
            let seconds = max(0, expiry / 1000 - Date().timeIntervalSince1970)
            do { try await Task.sleep(for: .seconds(seconds)) } catch { return }
            clear(); error = "This conversation has expired. Refresh to check current access."
        }
        .onChange(of: account.player?.id) { _, _ in clear(); attempt = nil; sendError = nil }
        .onChange(of: scenePhase) { _, phase in if phase != .active { clear() } }
        .onAppear { communityChatOpen.wrappedValue = true }
        .onDisappear {
            communityChatOpen.wrappedValue = false
            clear()
        }
    }

    private func clear() {
        generation = UUID(); page = nil; error = nil; loading = false; visibleID = nil
        messages = []; historyFloor = nil; hasOlder = false; draft = ""
        visibleLatestSeq = nil; readThrough = 0; readFailed = false
        updatingPreference = false; preferenceError = nil; reportTarget = nil
    }

    @MainActor private func updatePreference(_ preference: NativeChatPreference) async {
        guard !loading, !sending, !updatingPreference, scenePhase == .active,
              let actor = account.player?.id, let room = page?.roomId,
              page?.available == true, page?.expired != true else { return }
        if case .read(let sequence) = preference {
            guard visibleLatestSeq == sequence, sequence > readThrough else { return }
        }
        let ticket = generation
        updatingPreference = true; preferenceError = nil
        defer { if ticket == generation { updatingPreference = false } }
        do {
            let response: NativeChatPage = try await NativeCommunityAPI.shared.request("games/\(gameID)/chat")
            let current = try response.validated(for: actor)
            guard !Task.isCancelled, ticket == generation, account.player?.id == actor,
                  scenePhase == .active else { return }
            guard current.available, current.expired != true, current.roomId == room else {
                throw CommunityError.invalidResponse
            }
            if case .read(let sequence) = preference {
                guard visibleLatestSeq == sequence, messages.last?.seq == sequence else { return }
            }
            let ack: NativeChatPreferenceAck = try await NativeCommunityAPI.shared.request(
                "games/\(gameID)/chat/\(preference.action)", method: "POST", body: try preference.encoded())
            guard ack.ok else { throw CommunityError.invalidResponse }
            guard ticket == generation, account.player?.id == actor, scenePhase == .active else { return }
            if case .read(let sequence) = preference { readThrough = max(readThrough, sequence) }
            updatingPreference = false
            // Updating the cursor changes the visibility task identity. Refresh independently
            // so cancellation of that completed task cannot cancel the readback.
            Task {
                guard ticket == generation, account.player?.id == actor, scenePhase == .active else { return }
                await load()
            }
        } catch {
            // Scrolling away cancels the visibility task. A read cursor is monotonic;
            // a later refresh can reconcile an acknowledgement lost during cancellation.
            guard !Task.isCancelled, ticket == generation, account.player?.id == actor,
                  scenePhase == .active else { return }
            readFailed = true
            preferenceError = "\(error.localizedDescription) Refresh chat to check the current read and notification settings."
            // An uncertain mutation or denied access must not leave private content visible.
            page = nil; messages = []; historyFloor = nil; hasOlder = false; visibleLatestSeq = nil
            self.error = preferenceError
        }
    }

    @MainActor private func send() async {
        guard !sending, !loading, !updatingPreference, scenePhase == .active, let actor = account.player?.id else { return }
        let ticket = generation
        sending = true; sendError = nil
        defer { sending = false }
        do {
            let response: NativeChatPage = try await NativeCommunityAPI.shared.request("games/\(gameID)/chat")
            let current = try response.validated(for: actor)
            guard !Task.isCancelled, ticket == generation, account.player?.id == actor, scenePhase == .active else { return }
            guard current.available, current.expired != true, current.canSend == true, let room = current.roomId else {
                page = current; messages = []; historyFloor = nil; hasOlder = false; draft = ""
                throw NSError(domain: "OpenCourts", code: 403,
                              userInfo: [NSLocalizedDescriptionKey: "You can no longer send to this conversation. Refresh to check current access."])
            }
            let pending: NativeChatSendAttempt
            if let attempt {
                guard attempt.actorID == actor, attempt.roomID == room else { throw CommunityError.invalidResponse }
                pending = attempt
            } else {
                pending = try NativeChatSendAttempt(actorID: actor, roomID: room, text: draft)
                attempt = pending
            }
            let acknowledgement: NativeChatSent = try await NativeCommunityAPI.shared.request(
                "games/\(gameID)/chat", method: "POST", body: pending.data)
            guard !acknowledgement.id.isEmpty, acknowledgement.seq > 0 else { throw CommunityError.invalidResponse }
            guard ticket == generation, account.player?.id == actor, scenePhase == .active else { return }
            attempt = nil; draft = ""; sendError = nil
            sending = false
            await load()
            if account.player?.id == actor, ticket == generation {
                visibleID = acknowledgement.id
            }
        } catch {
            guard ticket == generation, account.player?.id == actor, scenePhase == .active else { return }
            sendError = error.localizedDescription
            // Hide old messages after an uncertain write/access failure; never replay automatically.
            page = nil; messages = []; historyFloor = nil; hasOlder = false
        }
    }

    @MainActor private func load(older: Bool = false) async {
        guard !loading, !sending, !updatingPreference, scenePhase == .active, let actor = account.player?.id,
              UUID(uuidString: gameID) != nil else { return }
        let ticket = generation
        loading = true
        defer { if generation == ticket { loading = false } }
        do {
            let value: NativeChatPage = try await NativeCommunityAPI.shared.request("games/\(gameID)/chat")
            var checked = try value.validated(for: actor)
            let anchor = visibleID ?? messages.first?.id
            let sameRoom = page?.roomId == checked.roomId
            let floor = sameRoom ? historyFloor : nil
            var fresh = checked.messages ?? []
            var more = checked.hasOlder == true
            var extend = older && sameRoom
            // Rebuild every retained page from fresh server responses. Never merge old private bodies.
            while checked.available && checked.expired != true && more,
                  let first = fresh.first,
                  (floor.map { first.seq > $0 } ?? false) || extend {
                try Task.checkCancellation()
                guard generation == ticket, account.player?.id == actor, scenePhase == .active else { return }
                let rebuilding = floor.map { first.seq > $0 } ?? false
                let response: NativeChatPage = try await NativeCommunityAPI.shared.request(
                    "games/\(gameID)/chat", query: [URLQueryItem(name: "before", value: String(first.seq))])
                let earlier = try response.validated(for: actor)
                guard earlier.available, earlier.expired != true else {
                    checked = earlier; fresh = []; more = false; break
                }
                guard earlier.roomId == checked.roomId else { throw CommunityError.invalidResponse }
                if earlier.messages?.isEmpty == true {
                    guard earlier.hasOlder != true else { throw CommunityError.invalidResponse }
                    more = false; break
                }
                fresh = try NativeChatHistory.prepend(earlier.messages ?? [], to: fresh, before: first.seq)
                more = earlier.hasOlder == true
                if !rebuilding { extend = false }
            }
            if fresh.count > 50 {
                // Fetch full metadata: state=1 deliberately omits the audience.
                let response: NativeChatPage = try await NativeCommunityAPI.shared.request("games/\(gameID)/chat")
                let current = try response.validated(for: actor)
                guard current.available, current.expired != true else {
                    guard generation == ticket, account.player?.id == actor, scenePhase == .active else { return }
                    page = current; messages = []; historyFloor = nil; hasOlder = false
                    return
                }
                guard current.roomId == checked.roomId else { throw CommunityError.invalidResponse }
                checked = current
            }
            guard !Task.isCancelled, generation == ticket, account.player?.id == actor,
                  scenePhase == .active else { return }
            let previousLatestSeq = messages.last?.seq
            let wasAtLatest = previousLatestSeq == nil || visibleLatestSeq == previousLatestSeq
            let newMessageArrived = fresh.last.map { $0.seq > (previousLatestSeq ?? 0) && $0.kind == "message" } ?? false
            if !sameRoom {
                readThrough = 0
                visibleLatestSeq = nil
                latestMessagesBelow = false
            } else if newMessageArrived {
                latestMessagesBelow = !wasAtLatest
                if wasAtLatest, let last = fresh.last {
                    visibleID = "chat-end-\(last.id)"
                }
            }
            page = checked; messages = fresh; hasOlder = more
            if !checked.available || checked.expired == true || checked.canSend != true { draft = "" }
            historyFloor = fresh.count > 50 ? fresh.first?.seq : nil
            error = nil
            if !sameRoom { avatarRevision = UUID() }
            if older { visibleID = anchor } else if !sameRoom { visibleID = nil }
        } catch {
            guard !Task.isCancelled, generation == ticket, account.player?.id == actor,
                  scenePhase == .active else { return }
            let requestError = error as NSError
            if requestError.domain == "OpenCourts", requestError.code == 404 {
                page = nil; messages = []; historyFloor = nil; hasOlder = false
                visibleID = nil; self.error = nil
                dismiss()
                return
            }
            page = nil; messages = []; historyFloor = nil; hasOlder = false
            visibleID = nil; self.error = error.localizedDescription
        }
    }
}

private struct NativeChatNotificationControl: View {
    let muted: Bool
    let busy: Bool
    let change: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Button(action: change) {
                Label(muted ? "Unmute chat push" : "Mute chat push",
                      systemImage: muted ? "bell.slash" : "bell")
                    .frame(minHeight: 44)
            }
            .disabled(busy)
            Text(muted ? "Chat push is muted. Unread messages are kept." :
                 "Mute stops this conversation’s push notifications. Unread messages are kept.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 16).padding(.bottom, 8)
    }
}

private struct NativeChatContext: View {
    let page: NativeChatPage
    @Environment(\.colorScheme) private var colorScheme
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            if page.series == true {
                Text("One conversation for every date").font(.subheadline.weight(.semibold))
            }
            if let unread = page.unread, unread > 0 {
                Text("\(unread) unread messages").font(.caption.weight(.semibold)).foregroundStyle(Brand.accent)
            }
            DisclosureGroup("People & privacy") {
                ScrollView {
                    VStack(alignment: .leading, spacing: 10) {
                        ForEach(page.audience ?? []) { person in
                            HStack {
                                Text(person.displayName).font(.subheadline)
                                Spacer()
                                NativeGroupMetadataChip(title: person.badgeTitle(isSeries: page.series == true))
                            }
                        }
                        Text("Current access, not online status. New participants can see earlier retained messages. Personal blocks hide messages between accounts.")
                        Text("Messages are not end-to-end encrypted. Do not share private contact details.")
                        if page.series == true {
                            Text("Active group membership is required. Messages are kept for 30 days. Access expires after 30 days without playing or sending, unless you have an upcoming confirmed place. Group owners, co-owners, organizers and the series organizer keep access without playing or posting.")
                        } else if let expiry = page.expiresAt {
                            Text("Messages expire \(Date(timeIntervalSince1970: expiry / 1000).formatted(date: .abbreviated, time: .shortened)). Replies close 24 hours after the game ends, or immediately on cancellation.")
                        }
                        if page.canSend == false { Text("Read-only conversation").fontWeight(.semibold) }
                    }
                    .font(.footnote).foregroundStyle(.secondary).padding(.top, 8)
                }
                .frame(maxHeight: 240)
            }
            .font(.subheadline)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.accent.opacity(0.04))
    }
}

private struct NativeChatMessageRow: View {
    let message: NativeChatPage.Message
    let viewerID: String
    let gameID: String
    let revision: UUID
    var report: (() -> Void)? = nil

    var body: some View {
        if message.isSystem {
            Text("\(message.displayName) \(systemAction)")
                .font(.footnote).foregroundStyle(.secondary)
                .frame(maxWidth: .infinity).padding(.vertical, 4)
        } else {
            let outgoing = message.authorId == viewerID
            HStack(alignment: .bottom, spacing: 8) {
                if outgoing { Spacer(minLength: 36) }
                VStack(alignment: .leading, spacing: 4) {
                    HStack(alignment: .center, spacing: 7) {
                        if !outgoing, let author = message.authorId {
                            NativePlayerAvatar(playerID: author, displayName: message.displayName,
                                               gameID: gameID, size: 20, refreshID: revision)
                        }
                        Text(outgoing ? "You" : message.displayName)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(outgoing ? Color.white : Color.primary)
                            .lineLimit(1)
                        Text(message.date, format: .dateTime.hour().minute())
                            .font(.caption2)
                            .foregroundStyle(outgoing ? Color.white.opacity(0.72) : Color.secondary)
                            .lineLimit(1)
                        if let report {
                            Menu {
                                Button("Report message", systemImage: "flag", action: report)
                            } label: {
                                Image(systemName: "ellipsis")
                                    .frame(minWidth: 32, minHeight: 32)
                            }
                            .accessibilityLabel("More options for message by \(message.displayName)")
                        }
                    }
                    Text(message.visibleBody)
                        .font(.body)
                        .textSelection(.enabled)
                        .foregroundStyle(outgoing ? Color.white : (message.hiddenAt == nil ? Color.primary : Color.secondary))
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal, 11)
                .padding(.vertical, 8)
                .frame(maxWidth: 270, alignment: .leading)
                .background(outgoing ? Brand.actionFill : Color(uiColor: .secondarySystemGroupedBackground),
                            in: RoundedRectangle(cornerRadius: 19, style: .continuous))
                if !outgoing { Spacer(minLength: 36) }
            }
            .padding(.horizontal, 10)
        }
    }

    private var systemAction: String {
        switch message.kind {
        case "joined": "was added to the chat"
        case "inactive": "was removed from the chat · inactive for 30 days"
        default: "left the chat"
        }
    }
}

private struct NativeChatComposerPreview: View {
    @State private var text = "See you at the north courts.\nI’ll bring a spare racket."
    var body: some View {
        NavigationStack {
            ScrollView {
                Text("Conversation").frame(maxWidth: .infinity, minHeight: 180)
            }
            .navigationTitle("Game chat")
            .safeAreaInset(edge: .bottom) {
                NativeChatComposer(text: $text, series: false, busy: false, locked: false) {}
            }
        }
    }
}

#Preview("Chat composer") {
    NativeChatComposerPreview()
        .environment(\.dynamicTypeSize, .accessibility3)
        .preferredColorScheme(.dark)
}

#Preview("Conversation states") {
    ScrollView {
        VStack(spacing: 16) {
            NativeChatMessageRow(message: .init(id: "one", seq: 1, kind: "message", authorId: "alex",
                displayName: "Alex Chen", body: "See you by the north courts at 6.", createdAt: 1795366800000, hiddenAt: nil),
                viewerID: "viewer", gameID: "00000000-0000-0000-0000-000000000001", revision: UUID())
            NativeChatMessageRow(message: .init(id: "two", seq: 2, kind: "message", authorId: "viewer",
                displayName: "Sam", body: "Private body must not appear", createdAt: 1795366860000, hiddenAt: 1795366900000),
                viewerID: "viewer", gameID: "00000000-0000-0000-0000-000000000001", revision: UUID())
            NativeChatMessageRow(message: .init(id: "three", seq: 3, kind: "joined", authorId: nil,
                displayName: "Taylor", body: "", createdAt: 1795367000000, hiddenAt: nil),
                viewerID: "viewer", gameID: "00000000-0000-0000-0000-000000000001", revision: UUID())
        }.padding()
    }.background(Color(uiColor: .systemGroupedBackground))
        .environment(NativeAccountStore())
}
