import SwiftUI

nonisolated struct NativeDiscussionContent: Decodable, Identifiable, Sendable {
    let id: String
    let authorId: String
    let displayName: String
    let authorRole: String?
    let body: String
    let title: String?
    let createdAt: Double
    let updatedAt: Double
    let version: Int
    let likes: Int
    let liked: Int
    let locked: Int?
    let muted: Int?
    let commentCount: Int?

    var date: Date { Date(timeIntervalSince1970: createdAt / 1000) }
    var roleLabel: LocalizedStringResource? {
        switch authorRole {
        case "owner": "Owner"
        case "coowner", "admin": "Co-owner"
        case "organizer": "Organizer"
        default: nil
        }
    }
}

nonisolated struct NativeDiscussionPage: Decodable, Sendable {
    let available: Bool
    let total: Int?
    let viewerId: String?
    let canManage: Bool?
    let posts: [NativeDiscussionContent]?
    let post: NativeDiscussionContent?
    let comments: [NativeDiscussionContent]?
    let next: String?

    func validated(for actor: String, postID: String?) throws -> Self {
        guard available else { return self }
        guard viewerId == actor, let total, total >= 0, canManage != nil else {
            throw CommunityError.invalidResponse
        }
        let rows: [NativeDiscussionContent]
        if let postID {
            guard post?.id == postID, post?.title != nil, let comments, comments.count <= 50 else {
                throw CommunityError.invalidResponse
            }
            rows = comments
        } else {
            guard let posts, posts.count <= 20 else { throw CommunityError.invalidResponse }
            rows = posts
        }
        guard Set(rows.map(\.id)).count == rows.count,
              rows.allSatisfy({ UUID(uuidString: $0.id) != nil && $0.createdAt.isFinite && $0.updatedAt.isFinite }),
              zip(rows, rows.dropFirst()).allSatisfy({
                  postID == nil ? NativeDiscussionHistory.precedes($1, $0) : NativeDiscussionHistory.precedes($0, $1)
              }), next == nil || (!rows.isEmpty && next?.isEmpty == false) else {
            throw CommunityError.invalidResponse
        }
        return self
    }
}

nonisolated enum NativeDiscussionHistory {
    static func precedes(_ lhs: NativeDiscussionContent, _ rhs: NativeDiscussionContent) -> Bool {
        lhs.createdAt < rhs.createdAt || (lhs.createdAt == rhs.createdAt && lhs.id < rhs.id)
    }

    static func combine(_ older: [NativeDiscussionContent], with current: [NativeDiscussionContent],
                        replies: Bool) throws -> [NativeDiscussionContent] {
        guard !older.isEmpty, Set(older.map(\.id)).isDisjoint(with: Set(current.map(\.id))),
              let boundary = replies ? current.first : current.last,
              older.allSatisfy({ precedes($0, boundary) }) else { throw CommunityError.invalidResponse }
        return replies ? older + current : current + older
    }
}

nonisolated struct NativeDiscussionDestination: Identifiable, Hashable {
    let id: String
}

struct NativeGroupDiscussionsView: View {
    let groupID: String
    let submissions: NativeDiscussionSubmissionStore
    var groupName: String? = nil
    var postID: String? = nil
    var countChanged: (Int?) -> Void = { _ in }
    var accessRevoked: () -> Void = {}
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var phase
    @Environment(\.communityDockHeight) private var dockHeight
    @State private var page: NativeDiscussionPage?
    @State private var rows: [NativeDiscussionContent] = []
    @State private var next: String?
    @State private var retainedPages = 1
    @State private var loading = false
    @State private var error: String?
    @State private var generation = UUID()
    @State private var refreshID = UUID()
    @State private var avatarRevision = UUID()
    @State private var selectedPost: NativeDiscussionDestination?
    @State private var composeTarget: NativeDiscussionComposeTarget?
    @State private var inlineReplyComposer = false
    @State private var publishedPostID: String?
    @State private var changeTarget: NativeDiscussionChangeTarget?
    @State private var deletedCurrentPost = false
    @State private var reportTarget: NativeDiscussionReportTarget?
    @Environment(\.dismiss) private var dismiss
    private var hasPendingSubmission: Bool {
        submissions.pending?.actorID == account.player?.id && submissions.pending?.groupID == groupID
    }

    var body: some View {
        List {
            if hasPendingSubmission {
                Section {
                    Button("Resume pending submission", systemImage: "arrow.clockwise") { openComposer() }
                        .frame(minHeight: 44).disabled(loading || page?.available != true)
                }
            }
            if account.player == nil {
                ContentUnavailableView("Sign in to read discussions", systemImage: "person.crop.circle")
            } else if let page {
                if !page.available {
                    ContentUnavailableView("Discussions unavailable", systemImage: "bubble.left.and.bubble.right",
                        description: Text("Discussions are not available yet."))
                } else if let post = page.post {
                    Section { NativeNotificationOptInNudge(reason: .groupActivity) }
                    Section {
                        VStack(alignment: .leading, spacing: 4) {
                            NativeDiscussionRow(content: post, revision: avatarRevision, fullText: true,
                                trailing: page.viewerId == nil ? nil : AnyView(
                                    NativeDiscussionOwnActions(
                                        reply: false,
                                        canEdit: post.authorId == page.viewerId && post.locked == 0,
                                        own: post.authorId == page.viewerId,
                                        canDelete: post.authorId == page.viewerId || page.canManage == true,
                                        canManageLock: page.canManage == true,
                                        locked: post.locked != 0,
                                        report: post.authorId != page.viewerId ? { openReport(post, reply: false) } : nil
                                    ) { operation in
                                        openChange(post, reply: false, operation: operation)
                                    }.disabled(loading)
                                ))
                            if post.locked == 0 && !hasPendingSubmission {
                                Button("Write a reply", systemImage: "square.and.pencil") {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        inlineReplyComposer = true
                                    }
                                }
                                .frame(minHeight: 44)
                                .disabled(loading)
                                if inlineReplyComposer, let actor = account.player?.id {
                                    NativeDiscussionComposer(
                                        groupID: groupID,
                                        target: NativeDiscussionComposeTarget(actorID: actor, postID: post.id),
                                        submissions: submissions,
                                        inline: true,
                                        finished: {
                                            withAnimation(.easeInOut(duration: 0.2)) {
                                                inlineReplyComposer = false
                                            }
                                            Task { await load() }
                                        },
                                        published: { _ in }
                                    )
                                }
                            }
                            Divider()
                            NativeDiscussionReactions(groupID: groupID, postID: post.id, content: post,
                                reply: false, locked: post.locked != 0, revision: avatarRevision) { await load() }
                                .disabled(loading)
                            if post.locked == 1 {
                                Label("Discussion locked", systemImage: "lock")
                                    .font(.subheadline).foregroundStyle(.secondary)
                            }
                        }
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    }
                    Section {
                        VStack(alignment: .leading, spacing: 8) {
                            if next != nil {
                                Button("Earlier replies", systemImage: "clock.arrow.circlepath") {
                                    Task { await load(more: true) }
                                }.frame(minHeight: 44).disabled(loading)
                            }
                            if rows.isEmpty {
                                Text("No replies yet.")
                                    .foregroundStyle(.secondary)
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(.vertical, 4)
                            }
                            ForEach(rows) { reply in
                                VStack(alignment: .leading, spacing: 8) {
                                    NativeDiscussionRow(content: reply, revision: avatarRevision, fullText: true)
                                    NativeDiscussionReactions(groupID: groupID, postID: post.id, content: reply,
                                        reply: true, locked: post.locked != 0, revision: avatarRevision) { await load() }
                                        .disabled(loading)
                                    if page.viewerId != nil {
                                        NativeDiscussionOwnActions(reply: true, canEdit: reply.authorId == page.viewerId && post.locked == 0,
                                            own: reply.authorId == page.viewerId,
                                            canDelete: reply.authorId == page.viewerId || page.canManage == true,
                                            report: reply.authorId != page.viewerId ? { openReport(reply, reply: true) } : nil) { operation in
                                            openChange(reply, reply: true, operation: operation)
                                        }.disabled(loading)
                                    }
                                }
                            }
                        }
                        .listRowInsets(EdgeInsets(top: 2, leading: 16, bottom: 2, trailing: 16))
                    } header: {
                        Text("Replies (\(post.commentCount ?? 0))")
                    }

                } else {
                    Section { NativeNotificationOptInNudge(reason: .groupActivity) }
                    if rows.isEmpty {
                        ContentUnavailableView("No discussions yet", systemImage: "bubble.left",
                            description: Text("Group discussions will appear here."))
                    }
                    ForEach(rows) { post in
                        NativeDiscussionRow(content: post, revision: avatarRevision, fullText: false,
                            openAction: { selectedPost = NativeDiscussionDestination(id: post.id) },
                            trailing: page.viewerId == nil ? nil : AnyView(
                                NativeDiscussionOwnActions(
                                    reply: false,
                                    canEdit: post.authorId == page.viewerId && post.locked == 0,
                                    own: post.authorId == page.viewerId,
                                    canDelete: post.authorId == page.viewerId || page.canManage == true,
                                    report: post.authorId != page.viewerId ? { openReport(post, reply: false) } : nil
                                ) { operation in
                                    openChange(post, reply: false, operation: operation)
                                }.disabled(loading)
                            ))
                            .disabled(loading)
                    }
                    if next != nil {
                        Button("More discussions", systemImage: "chevron.down") {
                            Task { await load(more: true) }
                        }.frame(minHeight: 44).disabled(loading)
                    }
                }
            } else if let error {
                ContentUnavailableView("Discussions could not load", systemImage: "wifi.exclamationmark",
                    description: Text(error))
                Button("Try again") { refreshID = UUID() }.frame(minHeight: 44)
            } else { ProgressView("Loading discussions…") }
        }
        .navigationDestination(item: $selectedPost) { selection in
            NativeGroupDiscussionsView(groupID: groupID, submissions: submissions, groupName: groupName, postID: selection.id,
                                       countChanged: countChanged, accessRevoked: accessRevoked)
                .navigationTitle("Discussion")
        }
        .sheet(item: $composeTarget, onDismiss: {
            if let id = publishedPostID {
                publishedPostID = nil
                selectedPost = NativeDiscussionDestination(id: id)
            }
            Task { await load() }
        }) { target in
            NativeDiscussionComposer(groupID: groupID, target: target, submissions: submissions) { id in
                if target.postID == nil { publishedPostID = id }
            }
        }
        .sheet(item: $changeTarget, onDismiss: {
            let shouldLeaveThread = deletedCurrentPost && postID != nil
            deletedCurrentPost = false
            if shouldLeaveThread { dismiss() }
            else { Task { await load() } }
        }) { target in
            NativeDiscussionEditor(groupID: groupID, target: target) { deletedPost in
                deletedCurrentPost = deletedPost
            }
        }
        .sheet(item: $reportTarget, onDismiss: { Task { await load() } }) { target in
            NativeDiscussionReportView(groupID: groupID, target: target)
        }
        .contentMargins(.top, 0, for: .scrollContent)
        .contentMargins(.bottom, dockHeight + 24, for: .scrollContent)
        .scrollContentBackground(.hidden)
        .background(Brand.surface)
        .listStyle(.plain)
        .listSectionSpacing(.compact)
        .navigationTitle(groupName ?? "Group")
        .navigationBarTitleDisplayMode(.inline)
        .overlay(alignment: .top) { if loading && page != nil { ProgressView().padding(8) } }
        .toolbar {
            if postID == nil, page?.available == true, account.player != nil, !hasPendingSubmission {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("New discussion", systemImage: "plus") { openComposer() }
                        .disabled(loading)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button("Refresh discussions", systemImage: "arrow.clockwise") { Task { await load() } }
                    .disabled(loading)
            }
        }
        .refreshable { await load() }
        .task(id: "\(account.player?.id ?? "")-\(phase)-\(refreshID)") {
            clear()
            guard account.player != nil, phase == .active else { return }
            while !Task.isCancelled {
                await load()
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
            }
        }
        .onChange(of: account.player?.id) { _, _ in clear(); selectedPost = nil; composeTarget = nil; publishedPostID = nil; changeTarget = nil; deletedCurrentPost = false; reportTarget = nil }
        .onChange(of: phase) { _, value in if value != .active { clear() } }
        .onDisappear { clear() }
    }

    private func openChange(_ content: NativeDiscussionContent, reply: Bool, operation: NativeDiscussionOperation) {
        guard phase == .active, let actor = account.player?.id, page?.viewerId == actor,
              page?.available == true else { return }
        let management = operation == .lock || operation == .unlock || content.authorId != actor
        guard management ? page?.canManage == true && operation != .edit : content.authorId == actor else { return }
        guard !reply || (operation != .lock && operation != .unlock) else { return }
        changeTarget = NativeDiscussionChangeTarget(actorID: actor, postID: postID ?? content.id,
            commentID: reply ? content.id : nil, operation: operation, requiresManagement: management)
    }

    private func openReport(_ content: NativeDiscussionContent, reply: Bool) {
        guard phase == .active, let actor = account.player?.id, page?.viewerId == actor,
              page?.available == true, content.authorId != actor else { return }
        reportTarget = NativeDiscussionReportTarget(actorID: actor, postID: postID ?? content.id,
            commentID: reply ? content.id : nil)
    }

    private func openComposer() {
        guard phase == .active, let actor = account.player?.id, page?.available == true else { return }
        if let pending = submissions.pending, pending.actorID == actor, pending.groupID == groupID {
            composeTarget = NativeDiscussionComposeTarget(actorID: actor, postID: pending.postID)
        } else {
            guard postID == nil || page?.post?.locked == 0 else { return }
            composeTarget = NativeDiscussionComposeTarget(actorID: actor, postID: postID)
        }
    }

    private func clear() {
        generation = UUID(); page = nil; rows = []; next = nil
        retainedPages = 1; loading = false; error = nil
    }

    @MainActor private func load(more: Bool = false) async {
        guard !loading, phase == .active, let actor = account.player?.id,
              UUID(uuidString: groupID) != nil else { return }
        let ticket = generation
        let desired = retainedPages + (more ? 1 : 0)
        loading = true
        defer { if ticket == generation { loading = false } }
        do {
            let path = "discussions/\(groupID)" + (postID.map { "/\($0)" } ?? "")
            let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(path)
            var current = try response.validated(for: actor, postID: postID)
            var fresh = postID == nil ? current.posts ?? [] : current.comments ?? []
            var cursor = current.next
            var seen = Set<String>()
            var loaded = 1
            while current.available, loaded < desired, let before = cursor {
                guard seen.insert(before).inserted else { throw CommunityError.invalidResponse }
                try Task.checkCancellation()
                let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(
                    path, query: [URLQueryItem(name: "before", value: before)])
                let older = try response.validated(for: actor, postID: postID)
                guard older.available else { current = older; fresh = []; cursor = nil; break }
                let olderRows = postID == nil ? older.posts ?? [] : older.comments ?? []
                if olderRows.isEmpty {
                    guard older.next == nil else { throw CommunityError.invalidResponse }
                    cursor = nil; break
                }
                fresh = try NativeDiscussionHistory.combine(olderRows, with: fresh, replies: postID != nil)
                cursor = older.next; loaded += 1
            }
            // Recheck live membership/archive state after rebuilding all retained pages.
            let membership: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard !membership.archived, membership.membership?.status == "active", membership.content != nil else {
                throw CommunityError.accessChanged
            }
            if loaded > 1, postID != nil {
                let response: NativeDiscussionPage = try await NativeCommunityAPI.shared.request(path)
                let latest = try response.validated(for: actor, postID: postID)
                guard latest.available else { throw CommunityError.accessChanged }
                current = latest
            }
            guard !Task.isCancelled, generation == ticket, phase == .active, account.player?.id == actor else { return }
            page = current; rows = fresh; next = cursor; retainedPages = loaded
            error = nil; avatarRevision = UUID()
            if let total = current.total { countChanged(total) }
        } catch {
            guard !Task.isCancelled, generation == ticket, phase == .active, account.player?.id == actor else { return }
            page = nil; rows = []; next = nil; self.error = error.localizedDescription
            countChanged(nil)
            let responseError = error as NSError
            if responseError.domain == "OpenCourts", [401, 403, 404, 410].contains(responseError.code) {
                // A missing/blocked post is different from losing group membership.
                let membership: NativeGroupDetail? = try? await NativeCommunityAPI.shared.request("groups/\(groupID)")
                guard !Task.isCancelled, generation == ticket, phase == .active, account.player?.id == actor else { return }
                if membership?.archived != false || membership?.membership?.status != "active" || membership?.content == nil {
                    accessRevoked()
                }
            } else if let changed = error as? CommunityError, case .accessChanged = changed {
                accessRevoked()
            }
        }
    }
}

struct NativeDiscussionRow: View {
    let content: NativeDiscussionContent
    let revision: UUID
    let fullText: Bool
    @Environment(\.colorScheme) private var colorScheme
    var openAction: (() -> Void)? = nil
    var trailing: AnyView? = nil

    private var visibleTitle: String? {
        guard let title = content.title,
              title != NativeDiscussionSubmission.suggestedTitle(content.body) else { return nil }
        return title
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(alignment: .top, spacing: 10) {
                NativePlayerAvatar(playerID: content.authorId, displayName: content.displayName, refreshID: revision)
                VStack(alignment: .leading, spacing: 3) {
                    Text(content.displayName).font(.subheadline.weight(.semibold))
                    if let role = content.roleLabel {
                        Text(role).font(.caption.weight(.semibold))
                            .foregroundStyle(NativeGroupCategoryPalette.color(for: content.authorRole ?? "", colorScheme: colorScheme))
                    }
                    Text(content.date, format: .dateTime.month(.abbreviated).day().hour().minute())
                        .font(.caption).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
                if let trailing { trailing }
                if content.locked == 1 { Image(systemName: "lock").accessibilityLabel("Locked discussion") }
            }
            if let openAction {
                Button(action: openAction) { discussionText }
                    .buttonStyle(.plain)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                discussionText
            }
        }
        .padding(.vertical, 4)
    }

    @ViewBuilder
    private var discussionText: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let title = visibleTitle { Text(title).font(.headline) }
            Text(content.body).font(.body).lineLimit(fullText ? nil : 4)
            if content.version > 1 { Text("Edited").font(.caption).foregroundStyle(.secondary) }
            if !fullText {
                Label("\(content.commentCount ?? 0) replies", systemImage: "bubble.right")
                    .font(.caption).foregroundStyle(.secondary)
                Text("Open discussion").font(.caption.weight(.semibold)).foregroundStyle(Brand.accent)
            }
        }
    }
}

#if DEBUG
private struct NativeDiscussionsRowsPreview: View {
    @State private var section: NativeGroupSection = .discussions
    private let revision = UUID()

    private func sample(_ id: String, role: String, locked: Int = 0) -> NativeDiscussionContent {
        NativeDiscussionContent(id: id, authorId: "preview-author", displayName: "Alex Chen",
            authorRole: role, body: "Would anyone like to play doubles on Saturday morning? We can meet at the north courts and decide teams there.",
            title: "Saturday doubles", createdAt: 1795366800000, updatedAt: 1795366800000,
            version: 2, likes: 3, liked: 0, locked: locked, muted: 1, commentCount: 12)
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                NativeGroupSectionPicker(selection: $section, count: 1234)
                List {
                    NativeDiscussionRow(content: sample("one", role: "owner"), revision: revision, fullText: false)
                    NativeDiscussionRow(content: sample("two", role: "organizer", locked: 1), revision: revision, fullText: true)
                }
            }
            .navigationTitle("Discussions")
        }
        .environment(NativeAccountStore())
    }
}

#Preview("Discussion rows") {
    NativeDiscussionsRowsPreview()
        .environment(\.dynamicTypeSize, .accessibility3)
        .preferredColorScheme(.dark)
}
#endif

nonisolated enum NativeGroupSection: String, CaseIterable {
    case details, discussions
}

struct NativeGroupSectionPicker: View {
    @Binding var selection: NativeGroupSection
    let count: Int?
    var hasUnreadPosts = false
    var openDiscussions: () -> Void = {}
    @Environment(\.dynamicTypeSize) private var typeSize

    var body: some View {
        let layout = typeSize.isAccessibilitySize
            ? AnyLayout(VStackLayout(spacing: 8)) : AnyLayout(HStackLayout(spacing: 8))
        layout {
            Button { selection = .details } label: {
                Text("Group details").frame(maxWidth: .infinity, minHeight: 44)
            }
            .background(selection == .details ? Brand.accent.opacity(0.12) : .clear, in: RoundedRectangle(cornerRadius: 12))
            .accessibilityAddTraits(selection == .details ? .isSelected : [])
            Button { selection = .discussions; openDiscussions() } label: {
                HStack {
                    Text("Discussions")
                    if hasUnreadPosts {
                        Circle().fill(Color.red).frame(width: 8, height: 8)
                            .accessibilityLabel("New discussion posts")
                    }
                    if let count {
                        Text(count, format: .number).font(.caption.weight(.semibold))
                            .padding(.horizontal, 8).padding(.vertical, 4)
                            .background(Brand.accent.opacity(0.1), in: Capsule())
                    }
                }.frame(maxWidth: .infinity, minHeight: 44)
            }
            .background(selection == .discussions ? Brand.accent.opacity(0.12) : .clear, in: RoundedRectangle(cornerRadius: 12))
            .accessibilityAddTraits(selection == .discussions ? .isSelected : [])
        }
        .buttonStyle(.plain).foregroundStyle(Brand.accent).padding(.horizontal, 16).padding(.vertical, 8)
    }
}
