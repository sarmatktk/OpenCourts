import SwiftUI
import MapKit

private enum CommunitySection: String, CaseIterable {
    case games = "Find Games", feed = "Feed", groups = "Groups"
}

struct PlayTogetherView: View {
    let place: Place
    let account: NativeAccountStore
    let onReturnToMap: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab: CommunityTab = .feed
    @State private var communityDockHeight: CGFloat = 0
    @State private var chatIsOpen = false
    @State private var inboxPresented = false
    @Environment(NativeNotificationSummary.self) private var notificationSummary

    private func closeToMap() {
        onReturnToMap()
        dismiss()
    }

    private enum CommunityTab: String, CaseIterable {
        case feed = "Feed", games = "Find Games", myGames = "My Games", groups = "Groups", players = "Players"

        var icon: String {
            switch self {
            case .feed: "house"
            case .games: "magnifyingglass"
            case .myGames: "calendar"
            case .groups: "person.2"
            case .players: "person"
            }
        }
    }

    var body: some View {
        TabView(selection: $selectedTab) {
            CommunityExploreView(place: place, section: .feed, account: account, close: closeToMap, openInbox: { inboxPresented = true }, showGroups: { selectedTab = .groups })
            .toolbar(.hidden, for: .tabBar)
                .tabItem { Label("Feed", systemImage: "house") }.tag(CommunityTab.feed)
            CommunityExploreView(place: place, section: .games, account: account, close: closeToMap, openInbox: { inboxPresented = true })
                .toolbar(.hidden, for: .tabBar)
                .tabItem { Label("Find Games", systemImage: "magnifyingglass") }.tag(CommunityTab.games)
            NavigationStack {
                Group {
                    if account.player != nil { NativeMyGamesView() }
                    else { CommunitySignInPrompt(account: account, title: "My Games") }
                }
                .communityToolbar(account: account, close: closeToMap, openInbox: { inboxPresented = true })
            }
            .toolbar(.hidden, for: .tabBar)
                .tabItem { Label("My Games", systemImage: "calendar") }.tag(CommunityTab.myGames)
            CommunityExploreView(place: place, section: .groups, account: account, close: closeToMap, openInbox: { inboxPresented = true })
                .toolbar(.hidden, for: .tabBar)
                .tabItem { Label("Groups", systemImage: "person.3") }.tag(CommunityTab.groups)
            NavigationStack {
                Group {
                    if account.player != nil { NativePlayersView() }
                    else { CommunitySignInPrompt(account: account, title: "Players") }
                }
                .communityToolbar(account: account, close: closeToMap, openInbox: { inboxPresented = true })
            }
            .toolbar(.hidden, for: .tabBar)
                .tabItem { Label("Players", systemImage: "person.2") }.tag(CommunityTab.players)
        }
        .environment(account)
        .environment(notificationSummary)
        .environment(\.communityDockHeight, communityDockHeight)
        .environment(\.communityChatOpen, $chatIsOpen)
        .environment(\.communityPlace, place)
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            if !chatIsOpen {
                AppFloatingBar {
                    ForEach(CommunityTab.allCases, id: \.self) { tab in
                        Button {
                            withAnimation(.easeOut(duration: 0.18)) { selectedTab = tab }
                        } label: {
                            AppTabLabel(title: tab.rawValue, icon: tab.icon, isSelected: selectedTab == tab)
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(selectedTab == tab ? .isSelected : [])
                    }
                }
                .padding(.horizontal, 14)
                .padding(.bottom, 8)
                .onGeometryChange(for: CGFloat.self) { $0.size.height } action: { communityDockHeight = $0 }
            }
        }
        .fullScreenCover(isPresented: $inboxPresented) {
            NavigationStack {
                NativeNotificationsView()
                    .overlay { NativeSessionUnlockOverlay(account: account) }
                    .toolbar {
                        ToolbarItem(placement: .topBarLeading) {
                            Button {
                                inboxPresented = false
                            } label: {
                                Label("Back", systemImage: "chevron.left")
                            }
                        }
                    }
                }
                .environment(account)
                .environment(notificationSummary)
                .tint(Brand.accent)
        }
        .task {
            await account.refresh()
            if account.player == nil { selectedTab = .games }
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active { Task { await account.refresh() } }
            else { notificationSummary.clear() }
        }
        .onChange(of: account.player?.id) { _, _ in notificationSummary.clear() }
        .task(id: "\(account.player?.id ?? "signed-out")-\(scenePhase)") {
            guard scenePhase == .active, account.player != nil else {
                notificationSummary.clear()
                return
            }
            await notificationSummary.refresh(account: account)
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(30)) } catch { return }
                await notificationSummary.refresh(account: account)
            }
        }
        .overlay { NativeSessionUnlockOverlay(account: account) }
    }
}

private struct CommunitySignInPrompt: View {
    let account: NativeAccountStore
    let title: String

    private var message: String {
        switch title {
        case "My Games": "Sign in to manage your games, requests, and waitlist."
        case "Players": "Sign in to find players, view profiles, and invite them to games."
        default: "Sign in to join games, find players, and connect with groups."
        }
    }

    var body: some View {
        VStack {
            Spacer(minLength: 24)
            CommunitySignInCard(
                account: account,
                title: "Sign in to continue",
                message: message
            )
            Spacer(minLength: 24)
        }
        .padding(.horizontal, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Brand.background.ignoresSafeArea())
        .navigationTitle(title)
    }
}

private struct CommunitySignInCard: View {
    let account: NativeAccountStore
    let title: String
    let message: String

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.crop.circle.badge.checkmark")
                .font(.system(size: 34, weight: .regular))
                .foregroundStyle(Brand.accent)
                .frame(width: 68, height: 68)
                .background(Brand.accent.opacity(0.10), in: Circle())
                .accessibilityHidden(true)

            VStack(spacing: 6) {
                Text(title)
                    .font(.title3.weight(.semibold))
                    .multilineTextAlignment(.center)
                Text(message)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
                    .fixedSize(horizontal: false, vertical: true)
            }

            NavigationLink {
                NativeAccountView(account: account)
            } label: {
                Text("Sign in or create account")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .background(Brand.actionFill, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Sign in or create account")
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .background(Brand.surface, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
    }
}

private struct CommunityToolbar: ViewModifier {
    @Environment(NativeNotificationSummary.self) private var notificationSummary
    let account: NativeAccountStore
    let close: () -> Void
    let openInbox: () -> Void
    var showInbox = true
    var createActionTitle: String? = nil
    var createAction: (() -> Void)? = nil

    func body(content: Content) -> some View {
        content.toolbar {
            ToolbarItem(placement: .topBarLeading) {
                HStack(spacing: 4) {
                    if account.player != nil, let createAction, let createActionTitle {
                        Button(action: createAction) {
                            Image(systemName: "plus")
                                .font(.body.weight(.medium))
                                .foregroundStyle(Brand.accent)
                                .frame(width: 44, height: 44)
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(createActionTitle)
                    }

                    Button(action: close) {
                        HStack(spacing: 7) {
                            Image(systemName: "map")
                            Text("Courts")
                                .lineLimit(1)
                                .fixedSize(horizontal: true, vertical: false)
                        }
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(Brand.accent)
                        .padding(.horizontal, 8)
                        .frame(minHeight: 44)
                        .fixedSize(horizontal: true, vertical: false)
                    }
                    .buttonStyle(.plain)
                }
            }
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 4) {
                    if account.player != nil && showInbox {
                        Button(action: openInbox) {
                            NativeInboxToolbarLabel(count: notificationSummary.actorID == account.player?.id ? notificationSummary.unreadCount : nil)
                        }
                        .buttonStyle(.plain)
                    }
                    NavigationLink { NativeAccountView(account: account) } label: {
                        NativeAccountToolbarAvatar(account: account)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Account")
                }
            }
        }
        .toolbarBackground(Brand.surface, for: .navigationBar)
        .toolbarBackground(.visible, for: .navigationBar)
    }
}

private extension View {
    func communityToolbar(account: NativeAccountStore, close: @escaping () -> Void, openInbox: @escaping () -> Void, showInbox: Bool = true, createActionTitle: String? = nil, createAction: (() -> Void)? = nil) -> some View {
        modifier(CommunityToolbar(account: account, close: close, openInbox: openInbox, showInbox: showInbox, createActionTitle: createActionTitle, createAction: createAction))
    }
}

private struct CommunityExploreView: View {
    let place: Place
    let section: CommunitySection
    let account: NativeAccountStore
    let close: () -> Void
    let openInbox: () -> Void
    var showGroups: () -> Void = {}
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.communityDockHeight) private var communityDockHeight
    @State private var query = ""
    @State private var appliedGroupQuery = ""
    @State private var groupLocationSuggestions: [PlaceSuggestion] = []
    @State private var selectedGroupLocationQuery = ""
    @State private var cityQuery = ""
    @State private var gameLocationSuggestions: [PlaceSuggestion] = []
    @State private var selectedGameLocation: Place?
    @State private var selectedGameLocationQuery = ""
    @State private var useSelectedLocation = false
    @State private var radius = 25
    @State private var format = "any"
    @State private var skill = "any"
    @State private var showingGameFilters = false
    @State private var filterByDate = false
    @State private var day = Date()
    @State private var appliedSearch = CommunityGameSearch()
    @State private var locationLabel = "All locations"
    @State private var searching = false
    @State private var searchGeneration = UUID()
    @State private var feedFilter = "all"
    @State private var games: [CommunityGame] = []
    @State private var groups: [CommunityGroup] = []
    @State private var myGroups: [CommunityGroup] = []
    @State private var myGroupsLoading = false
    @State private var myGroupsError: String?
    @State private var myGroupsGeneration = UUID()
    @State private var next: String?
    @State private var loading = false
    @State private var error: String?
    @State private var generation = UUID()
    @State private var reloadID = UUID()
    @State private var creatingGame = false
    @State private var creatingGroup = false
    @State private var createdGroupID: String?
    @State private var showingCreatedGroup = false
    @State private var showingMyGroups = false
    @State private var showingGroupInvitations = false
    @State private var showingGameDetail = false
    @State private var selectedGameDetailID: String?

    private var activeGameFilterCount: Int {
        [useSelectedLocation, radius != 25, format != "any", skill != "any", filterByDate]
            .filter { $0 }
            .count
    }

    private var displayedGames: [CommunityGame] {
        guard section == .feed else { return games }
        let now = Date()
        return games.filter { $0.startDate.map { $0 > now } ?? false }
    }

    var body: some View {
        NavigationStack {
            List {
                if section == .feed && account.player == nil {
                    SwiftUI.Section {
                        CommunitySignInCard(
                            account: account,
                            title: "Play together",
                            message: "Sign in to join games, find players, and connect with tennis groups."
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowBackground(Brand.background)
                        .listRowSeparator(.hidden)
                    }
                }
                if section == .feed && account.player != nil {
                    SwiftUI.Section {
                        HStack(alignment: .firstTextBaseline, spacing: 12) {
                            Text("Your groups").font(.headline)
                            Spacer(minLength: 4)
                            NavigationLink {
                                NativeMyGroupsView()
                            } label: {
                                Text("See all")
                                .foregroundStyle(Brand.accent)
                                .font(.subheadline.weight(.semibold))
                            }
                            .buttonStyle(.plain)
                            .fixedSize()
                        }
                        .listRowInsets(EdgeInsets(top: 2, leading: 16, bottom: 2, trailing: 16))
                        .listRowSeparator(.hidden)
                        if myGroupsLoading {
                            ProgressView("Loading groups…")
                        } else if let myGroupsError {
                            Text(myGroupsError).font(.footnote).foregroundStyle(.secondary)
                            Button("Try again") { Task { await loadMyGroups() } }
                        } else if myGroups.isEmpty {
                            Text("You haven't joined any groups yet.")
                                .font(.subheadline).foregroundStyle(.secondary)
                        } else {
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 10) {
                                    ForEach(myGroups.prefix(6)) { group in
                                        NavigationLink {
                                            NativeGroupMembershipView(groupID: group.id)
                                        } label: {
                                            HStack(spacing: 10) {
                                                NativePublicGroupCover(groupID: group.id, aspectRatio: 1.15, compact: true)
                                                    .frame(width: 76, height: 66)
                                                    .accessibilityHidden(true)
                                                VStack(alignment: .leading, spacing: 4) {
                                                    Text(group.name)
                                                        .font(.subheadline.weight(.semibold))
                                                        .lineLimit(2)
                                                    if let status = group.membershipStatus, status.lowercased() == "pending" {
                                                        Text("Request pending").font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                                    } else if !group.generalLocation.isEmpty {
                                                        AppLocationLabel(title: group.generalLocation).font(.caption).foregroundStyle(.secondary).lineLimit(1)
                                                    }
                                                }
                                                .frame(maxWidth: .infinity, alignment: .leading)
                                            }
                                            .frame(width: 224, height: 82)
                                            .padding(6)
                                            .background(.tint.opacity(0.08), in: RoundedRectangle(cornerRadius: 12))
                                            .accessibilityElement(children: .combine)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                            .listRowInsets(EdgeInsets(top: 2, leading: 16, bottom: 2, trailing: 16))
                            .listRowSeparator(.hidden)
                        }
                    }
                }
                SwiftUI.Section {
                    if section == .games {
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 0) {
                                TextField("Search a city, area or ZIP code", text: $cityQuery)
                                    .textFieldStyle(.plain)
                                    .textInputAutocapitalization(.words)
                                    .onChange(of: cityQuery) { _, _ in
                                        if cityQuery != selectedGameLocationQuery {
                                            selectedGameLocation = nil
                                            selectedGameLocationQuery = ""
                                            gameLocationSuggestions = []
                                            useSelectedLocation = false
                                        }
                                    }
                                    .task(id: cityQuery) {
                                        try? await Task.sleep(for: .milliseconds(350))
                                        guard !Task.isCancelled else { return }
                                        await updateLocationSuggestions(cityQuery, forGroups: false)
                                    }
                                    .submitLabel(.search)
                                    .onSubmit { Task { await applyFilters() } }
                                    .padding(.leading, 12)
                                    .frame(minHeight: 48)
                                Rectangle()
                                    .fill(Color.secondary.opacity(0.18))
                                    .frame(width: 1, height: 26)
                                Button {
                                    withAnimation(.easeInOut(duration: 0.2)) {
                                        showingGameFilters.toggle()
                                    }
                                } label: {
                                    Image(systemName: "slider.horizontal.3")
                                        .font(.system(size: 17, weight: .semibold))
                                        .foregroundStyle(showingGameFilters || activeGameFilterCount > 0 ? Brand.accent : .secondary)
                                        .frame(width: 48, height: 48)
                                        .overlay(alignment: .topTrailing) {
                                            if activeGameFilterCount > 0 {
                                                Circle()
                                                    .fill(Brand.accent)
                                                    .frame(width: 8, height: 8)
                                                    .offset(x: -9, y: 8)
                                            }
                                        }
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel(activeGameFilterCount > 0 ? "Filters, \(activeGameFilterCount) active" : "Filters")
                                .accessibilityValue(showingGameFilters ? "Expanded" : "Collapsed")
                            }
                            .background(Brand.background, in: RoundedRectangle(cornerRadius: 10))
                            .overlay {
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                            }
                            Button {
                                Task { await applyFilters() }
                            } label: {
                                Label(searching ? "Finding location…" : "Find games", systemImage: "magnifyingglass")
                                    .font(.subheadline.weight(.semibold))
                                    .frame(maxWidth: .infinity, minHeight: 44)
                            }
                            .buttonStyle(AppPrimaryButtonStyle())
                            .tint(Brand.actionFill)
                            .disabled(searching)
                            ForEach(gameLocationSuggestions) { suggestion in
                                placeSuggestionRow(suggestion) {
                                    selectedGameLocation = suggestion.place
                                    selectedGameLocationQuery = suggestion.label
                                    cityQuery = suggestion.label
                                    gameLocationSuggestions = []
                                    useSelectedLocation = false
                                }
                            }
                            if let selectedGameLocation {
                                AppLocationLabel(title: selectedGameLocation.label)
                                    .font(.footnote).foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 6)
                        if showingGameFilters {
                            Toggle("Use \(place.label)", isOn: $useSelectedLocation)
                            Picker("Distance", selection: $radius) {
                                ForEach([5, 10, 25, 50], id: \.self) { Text("Within \($0) miles").tag($0) }
                            }
                            Picker("Format", selection: $format) {
                                Text("All formats").tag("any")
                                Text("Singles").tag("singles")
                                Text("Doubles").tag("doubles")
                            }
                            Picker("Skill preference", selection: $skill) {
                                Text("All skill levels").tag("any")
                                Text("Beginner & open games").tag("beginner")
                                Text("Intermediate & open games").tag("intermediate")
                                Text("Advanced & open games").tag("advanced")
                            }
                            Toggle("Choose a date", isOn: $filterByDate)
                            if filterByDate { DatePicker("Date", selection: $day, displayedComponents: .date) }
                            Text("Dates follow your device's time zone. Distance applies when a location is selected.")
                                .font(.footnote).foregroundStyle(.secondary)
                            Button("Reset filters") { resetFilters() }.frame(minHeight: 44)
                        }
                        if locationLabel != "All locations" {
                            AppLocationLabel(title: locationLabel).font(.caption).foregroundStyle(.secondary)
                        }
                    } else if section == .feed && account.player != nil {
                        Picker("Feed filter", selection: $feedFilter) {
                            Text("All").tag("all")
                            Text("My Groups").tag("groups")
                            Text("My Games").tag("mine")
                        }
                        .pickerStyle(.segmented)
                    } else if section == .groups {
                        VStack(alignment: .leading, spacing: 10) {
                            Text("Discover groups")
                                .font(.headline)
                            HStack(spacing: 8) {
                                TextField("Name or location", text: $query)
                                    .textFieldStyle(.plain)
                                    .textInputAutocapitalization(.words)
                                    .onChange(of: query) { _, value in
                                        if value != selectedGroupLocationQuery { selectedGroupLocationQuery = "" }
                                        groupLocationSuggestions = []
                                    }
                                    .task(id: query) {
                                        try? await Task.sleep(for: .milliseconds(350))
                                        guard !Task.isCancelled else { return }
                                        await updateLocationSuggestions(query, forGroups: true)
                                    }
                                    .submitLabel(.search)
                                    .onSubmit { appliedGroupQuery = query; reloadID = UUID() }
                                    .padding(.leading, 12)
                                    .frame(minHeight: 44)
                                Rectangle()
                                    .fill(Color.secondary.opacity(0.18))
                                    .frame(width: 1, height: 24)
                                Button {
                                    appliedGroupQuery = query
                                    reloadID = UUID()
                                } label: {
                                    Image(systemName: "magnifyingglass")
                                        .font(.system(size: 17, weight: .semibold))
                                        .foregroundStyle(Brand.accent)
                                        .frame(width: 44, height: 44)
                                }
                                .buttonStyle(.plain)
                                .accessibilityLabel("Search groups")
                                .disabled(query.count > 120)
                            }
                            .background(Brand.surface, in: RoundedRectangle(cornerRadius: 10))
                            .overlay {
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.secondary.opacity(0.2), lineWidth: 1)
                            }
                            ForEach(groupLocationSuggestions) { suggestion in
                                placeSuggestionRow(suggestion) {
                                    let locationQuery = suggestion.generalLocationLabel
                                    selectedGroupLocationQuery = locationQuery
                                    query = locationQuery
                                    appliedGroupQuery = locationQuery
                                    groupLocationSuggestions = []
                                    reloadID = UUID()
                                }
                            }
                            if query.count > 120 { Text("Use up to 120 characters.").foregroundStyle(.red) }
                            Rectangle()
                                .fill(Color.secondary.opacity(0.14))
                                .frame(height: 1)
                            HStack(spacing: 0) {
                                if account.player != nil {
                                    Button {
                                        showingMyGroups = true
                                    } label: {
                                        Label("My Groups", systemImage: "person.2")
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(Brand.accent)
                                            .frame(maxWidth: .infinity, minHeight: 44)
                                    }
                                    .buttonStyle(.plain)
                                }
                                if account.player != nil {
                                    Rectangle()
                                        .fill(Color.secondary.opacity(0.14))
                                        .frame(width: 1, height: 24)
                                }
                                Button {
                                    showingGroupInvitations = true
                                } label: {
                                    Label("Invitations", systemImage: "link")
                                        .font(.subheadline.weight(.semibold))
                                        .foregroundStyle(Brand.accent)
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.vertical, 4)
                        .listRowSeparator(.hidden)
                    }
                }
                SwiftUI.Section {
                    if section != .groups {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(section == .feed ? "Upcoming games" : "Games near you")
                                .font(.title3.weight(.semibold))
                            if section == .feed {
                                Text("Games do not reserve courts.")
                                    .font(.footnote)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                        ForEach(displayedGames) { game in
                            Button {
                                selectedGameDetailID = game.id
                                showingGameDetail = true
                            } label: {
                                CommunityGameRow(game: game)
                            }
                            .buttonStyle(.plain)
                        }
                    } else {
                        ForEach(groups) { group in
                            NavigationLink {
                                if account.player != nil {
                                    NativeGroupMembershipView(groupID: group.id)
                                } else {
                                    CommunityDetailView(gameID: nil, groupID: group.id)
                                }
                            } label: {
                                CommunityGroupRow(group: group)
                            }
                        }
                    }
                    if loading { ProgressView("Loading…") }
                    if let error {
                        Text(error).foregroundStyle(.secondary)
                        Button("Try again") { reloadID = UUID() }.frame(minHeight: 44)
                    } else if !loading && displayedGames.isEmpty && groups.isEmpty && next == nil {
                        Text(section == .groups ? "No groups found." : "No upcoming games found.")
                            .foregroundStyle(.secondary)
                    }
                    if next != nil {
                        Button("Load more") { Task { await load(more: true) } }
                            .disabled(loading).frame(minHeight: 44)
                    }
                }
            }
            .contentMargins(.top, 8, for: .scrollContent)
            .contentMargins(.bottom, communityDockHeight, for: .scrollContent)
            .listSectionSpacing(.compact)
            .navigationTitle(section.rawValue)
            .navigationBarTitleDisplayMode(.inline)
            .communityToolbar(
                account: account,
                close: close,
                openInbox: openInbox,
                createActionTitle: section == .groups ? "Create group" : "Create game",
                createAction: {
                    if section == .groups {
                        createdGroupID = nil
                        creatingGroup = true
                    } else {
                        creatingGame = true
                    }
                }
            )
            .navigationDestination(isPresented: $showingCreatedGroup) {
                if let createdGroupID { NativeGroupMembershipView(groupID: createdGroupID) }
            }
            .navigationDestination(isPresented: $showingMyGroups) {
                NativeMyGroupsView()
            }
            .navigationDestination(isPresented: $showingGroupInvitations) {
                NativeGroupInvitationReader()
            }
            .navigationDestination(isPresented: $showingGameDetail) {
                if let selectedGameDetailID {
                    CommunityDetailView(gameID: selectedGameDetailID, groupID: nil)
                }
            }
            .sheet(isPresented: $creatingGroup, onDismiss: {
                reloadID = UUID()
                showingCreatedGroup = createdGroupID != nil
            }) {
                NativeGroupEditor(groupID: nil) { id in createdGroupID = id }.environment(account)
            }
            .sheet(isPresented: $creatingGame) {
                NativeCreateGameView(place: place, account: account) { reloadID = UUID() }
            }
            .refreshable {
                await load()
                if section == .feed { await loadMyGroups() }
            }
            .task(id: "\(section.rawValue)-\(reloadID)") { await load() }
            .task(id: "\(account.player?.id ?? "signed-out")-\(reloadID)") {
                if section == .feed { await loadMyGroups() }
            }
            .onChange(of: account.player?.id) { _, _ in
                myGroupsGeneration = UUID(); myGroups = []; myGroupsError = nil; myGroupsLoading = false
                createdGroupID = nil; showingCreatedGroup = false
                generation = UUID(); games = []; groups = []; next = nil; feedFilter = "all"; reloadID = UUID()
            }
            .onChange(of: feedFilter) { _, _ in reloadID = UUID() }
            .onChange(of: scenePhase) { _, phase in
                // Remove previously displayed content before revalidating after backgrounding.
                if phase == .active { reloadID = UUID() }
                else {
                    myGroupsGeneration = UUID(); myGroups = []; myGroupsError = nil; myGroupsLoading = false
                    generation = UUID(); searchGeneration = UUID(); searching = false; games = []; groups = []; next = nil
                }
            }
        }
    }

    @MainActor private func loadMyGroups() async {
        let token = UUID()
        myGroupsGeneration = token
        myGroups = []
        myGroupsError = nil
        guard let playerID = account.player?.id, scenePhase == .active else {
            myGroupsLoading = false
            return
        }
        myGroupsLoading = true
        defer { if myGroupsGeneration == token { myGroupsLoading = false } }
        do {
            let page: CommunityGroupPage = try await NativeCommunityAPI.shared.request("groups/mine")
            guard myGroupsGeneration == token, account.player?.id == playerID,
                  scenePhase == .active, !Task.isCancelled else { return }
            myGroups = page.groups.filter {
                $0.membershipStatus == "active" && $0.status == "active"
            }
        } catch {
            guard myGroupsGeneration == token, account.player?.id == playerID,
                  scenePhase == .active, !Task.isCancelled else { return }
            myGroupsError = error.localizedDescription
        }
    }

    @MainActor private func load(more: Bool = false) async {
        if more && loading { return }
        if section == .groups && appliedGroupQuery.count > 120 { return }
        #if DEBUG
        if ScreenshotMockContent.isEnabled {
            generation = UUID()
            loading = false
            error = nil
            next = nil
            if more { return }
            if section == .groups {
                groups = ScreenshotMockContent.sampleGroups
                games = []
            } else {
                games = ScreenshotMockContent.sampleGames
                groups = []
            }
            return
        }
        #endif
        let token = UUID()
        generation = token
        let selected = section
        let cursor = more ? next : nil
        if !more { games = []; groups = []; next = nil }
        loading = true
        error = nil
        defer { if generation == token { loading = false } }
        do {
            if selected == .games {
                let page = try await CommunityAPI.shared.games(search: appliedSearch, cursor: cursor)
                guard generation == token, !Task.isCancelled else { return }
                var ids = Set(games.map(\.id))
                games += page.games.filter { ids.insert($0.id).inserted }
                next = page.nextCursor
            } else if selected == .feed {
                let page = try await CommunityAPI.shared.feed(filter: account.player == nil ? "all" : feedFilter, cursor: cursor)
                guard generation == token, !Task.isCancelled else { return }
                var ids = Set(games.map(\.id))
                games += page.games.filter { ids.insert($0.id).inserted }
                next = page.nextCursor
            } else {
                let page = try await CommunityAPI.shared.groups(query: appliedGroupQuery, cursor: cursor)
                guard generation == token, !Task.isCancelled else { return }
                var ids = Set(groups.map(\.id))
                groups += page.groups.filter { ids.insert($0.id).inserted }
                next = page.next
            }
        } catch {
            guard generation == token, !Task.isCancelled else { return }
            self.error = (error as? CommunityError)?.localizedDescription ?? CommunityError.unavailable.localizedDescription
        }
    }

    @MainActor private func applyFilters() async {
        let token = UUID()
        searchGeneration = token
        generation = UUID() // Invalidate in-flight results as soon as a new search starts.
        games = []; next = nil; loading = false; error = nil
        searching = true
        let usePlace = useSelectedLocation
        let text = cityQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        var search = CommunityGameSearch(radius: radius, format: format, skill: skill,
                                         day: filterByDate ? day : nil)
        defer { if searchGeneration == token { searching = false } }
        do {
            var label = "All locations"
            if usePlace {
                search.lat = place.lat; search.lon = place.lon
                label = "Within \(search.radius) miles of \(place.label)"
            } else if !text.isEmpty {
                let result: Place
                if let selectedGameLocation { result = selectedGameLocation }
                else { result = try await OpenCourtsAPI.shared.findPlace(text) }
                guard searchGeneration == token, !Task.isCancelled else { return }
                search.lat = result.lat; search.lon = result.lon
                label = "Within \(search.radius) miles of \(result.label)"
            }
            guard searchGeneration == token, !Task.isCancelled else { return }
            appliedSearch = search
            locationLabel = label
            reloadID = UUID()
        } catch {
            guard searchGeneration == token, !Task.isCancelled else { return }
            self.error = error.localizedDescription
        }
    }

    @MainActor private func resetFilters() {
        searchGeneration = UUID(); searching = false
        cityQuery = ""; selectedGameLocation = nil; selectedGameLocationQuery = ""; useSelectedLocation = false; radius = 25
        format = "any"; skill = "any"; filterByDate = false
        appliedSearch = CommunityGameSearch(); locationLabel = "All locations"
        reloadID = UUID()
    }

    private func placeSuggestionRow(_ suggestion: PlaceSuggestion, select: @escaping () -> Void) -> some View {
        Button(action: select) {
            HStack(alignment: .top, spacing: 10) {
                Image(systemName: "mappin.circle.fill").foregroundStyle(.tint)
                VStack(alignment: .leading, spacing: 2) {
                    Text(suggestion.title).foregroundStyle(.primary)
                    Text(suggestion.detail).font(.caption).foregroundStyle(.secondary)
                }
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

    @MainActor private func updateLocationSuggestions(_ input: String, forGroups: Bool) async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        if !forGroups, selectedGameLocationQuery == text {
            gameLocationSuggestions = []
            return
        }
        if forGroups, selectedGroupLocationQuery == text {
            groupLocationSuggestions = []
            return
        }
        guard text.count >= 3 else {
            if forGroups { groupLocationSuggestions = [] }
            else { gameLocationSuggestions = [] }
            return
        }
        do {
            let results = try await OpenCourtsAPI.shared.suggestions(for: text)
            guard !Task.isCancelled,
                  text == input.trimmingCharacters(in: .whitespacesAndNewlines),
                  (forGroups ? section == .groups : section == .games) else { return }
            if forGroups { groupLocationSuggestions = results }
            else { gameLocationSuggestions = results }
        } catch {
            guard !Task.isCancelled else { return }
            if forGroups { groupLocationSuggestions = [] }
            else { gameLocationSuggestions = [] }
        }
    }
}

private struct CommunityGroupRow: View {
    let group: CommunityGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(group.name)
                    .font(.headline)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                    .layoutPriority(1)
                NativeGroupMetadataChip(title: group.visibility.lowercased() == "private" ? "Private" : "Public")
                    .fixedSize()
                Spacer(minLength: 0)
            }
            HStack(spacing: 8) {
                if !group.generalLocation.isEmpty {
                    AppLocationLabel(title: group.generalLocation)
                }
                Text("Membership requires approval.")
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            if !group.publicDescription.isEmpty {
                Text(group.publicDescription)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        }
        .padding(.vertical, 4)
    }
}

struct CommunityGameRow: View {
    let game: CommunityGame
    @Environment(\.colorScheme) private var colorScheme

    private var status: (title: String, color: Color)? {
        if game.status == "cancelled" {
            return ("Cancelled", colorScheme == .dark
                    ? Color(red: 1, green: 0.42, blue: 0.38)
                    : Color(red: 0.68, green: 0.10, blue: 0.09))
        }
        if game.isOrganizer == true { return ("Organizing", Brand.accent) }
        if game.joined == true {
            return ("Going", colorScheme == .dark ? Brand.lime : Brand.accent)
        }
        if game.requestStatus == "pending" {
            return ("Awaiting approval", colorScheme == .dark
                    ? Color(red: 0.50, green: 0.75, blue: 1.0)
                    : Color(red: 0.13, green: 0.39, blue: 0.72))
        }
        return nil
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 5) {
            HStack(alignment: .top, spacing: 10) {
                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 7) {
                        if let status {
                            Text(status.title)
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(status.color)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 3)
                                .background(status.color.opacity(0.12), in: Capsule())
                        }
                        Text(game.dateLabel)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                            .minimumScaleFactor(0.85)
                    }
                    Text(game.title).font(.headline)
                    CommunityGameHostLabel(game: game)
                }
                Spacer(minLength: 0)
                if game.visibility == "group", let groupID = game.groupId {
                    NativePublicGroupCover(groupID: groupID, aspectRatio: 1.5, compact: true)
                        .frame(width: 88, height: 58)
                        .accessibilityHidden(true)
                }
            }
            HStack(spacing: 10) {
                AppLocationLabel(title: game.court.name)
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                if let distance = game.distanceMiles {
                    Text("\(distance, specifier: "%.1f") mi")
                        .font(.caption).foregroundStyle(.secondary).fixedSize()
                }
            }
            HStack(spacing: 12) {
                Text("\(game.playerCount)/\(game.capacity) places · \(game.format.capitalized)")
                    .font(.caption).foregroundStyle(.secondary).lineLimit(1)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 0)
                CommunityGameGoingRow(game: game)
            }
        }.padding(.vertical, 4)
    }
}

private struct CommunityGameHostLabel: View {
    let game: CommunityGame
    @Environment(\.colorScheme) private var colorScheme
    @State private var refreshID = UUID()

    private var isGroupHost: Bool { game.groupName != nil }
    private var title: String {
        if let groupName = game.groupName { return "By \(groupName)" }
        return "Hosted by \(game.organizer.displayName)"
    }
    private var tint: Color {
        NativeGroupCategoryPalette.color(for: isGroupHost ? "Group host" : "Host", colorScheme: colorScheme)
    }

    var body: some View {
        HStack(spacing: 6) {
            NativePlayerAvatar(playerID: game.organizer.id, displayName: game.organizer.displayName,
                               gameID: game.id, size: 20, refreshID: refreshID)
                .accessibilityHidden(true)
            Text(title)
                .font(.caption.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
        .foregroundStyle(tint)
        .padding(.leading, 4)
        .padding(.trailing, 9)
        .padding(.vertical, 4)
        .background(tint.opacity(colorScheme == .dark ? 0.16 : 0.09), in: Capsule())
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct CommunityGameGoingRow: View {
    let game: CommunityGame
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.colorScheme) private var colorScheme
    @State private var players: [GameGoingPlayer] = []
    @State private var loadID = UUID()

    private var canLoadPlayers: Bool {
        game.isOrganizer == true || game.joined == true ||
            (game.visibility == "group" && game.groupId != nil)
    }

    var body: some View {
        HStack(spacing: -7) {
            if players.isEmpty {
                Image(systemName: "person.2.fill")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(Brand.accent)
                    .frame(width: 26, height: 26)
                    .background(Brand.accent.opacity(0.1), in: Circle())
                    .overlay(Circle().strokeBorder(.background, lineWidth: 2))
                    .accessibilityHidden(true)
            } else {
                ForEach(players.prefix(3)) { player in
                    NativePlayerAvatar(playerID: player.id, displayName: player.displayName,
                                       gameID: game.id, refreshID: loadID)
                        .frame(width: 26, height: 26)
                        .scaleEffect(0.65)
                        .overlay(Circle().strokeBorder(.background, lineWidth: 2))
                        .accessibilityHidden(true)
                }
            }
            Text("\(game.playerCount) going")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
                .padding(.leading, players.isEmpty ? 7 : 12)
        }
        .frame(minHeight: 28, alignment: .leading)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(game.playerCount) people going")
        .task(id: "\(game.id)-\(game.playerCount)-\(account.player?.id ?? "")-\(scenePhase)") {
            await loadPlayers()
        }
    }

    @MainActor private func loadPlayers() async {
        let token = UUID()
        loadID = token
        players = []
        guard scenePhase == .active, account.player != nil, canLoadPlayers else { return }
        do {
            let response: GameGoingPlayers = try await NativeCommunityAPI.shared.request("games/\(game.id)/participants")
            guard !Task.isCancelled, scenePhase == .active else { return }
            players = Array(response.players.prefix(3))
        } catch {
            // The row still communicates attendance with a generic people icon.
        }
    }
}

nonisolated private struct GameGoingPlayer: Decodable, Identifiable, Sendable {
    let id: String
    let displayName: String
}

nonisolated private struct GameGoingPlayers: Decodable, Sendable {
    let players: [GameGoingPlayer]
}

struct CommunityDetailView: View {
    let gameID: String?
    let groupID: String?
    @Environment(\.communityDockHeight) private var dockHeight
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.colorScheme) private var colorScheme
    @State private var game: CommunityGame?
    @State private var group: CommunityGroup?
    @State private var error: String?
    @State private var reloadID = UUID()
    @State private var generation = UUID()
    @State private var signedIn = false
    @State private var chatGameID: String?
    @State private var chatAvailable = false
    @State private var chatUnreadCount: Int?
    @State private var hostAction: NativeGameHostAction?
    @State private var gameDecision: NativeGameDecision?

    private var hasUnreadChat: Bool { (chatUnreadCount ?? 0) > 0 }

    var body: some View {
        List {
            if let game {
                SwiftUI.Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text(game.title).font(.title2.bold())
                        Label(game.dateLabel, systemImage: "calendar")
                        Label(game.court.name, systemImage: "mappin.and.ellipse")
                        HStack(spacing: 6) {
                            Text("Hosted by \(game.organizer.displayName)")
                            Spacer(minLength: 4)
                            Text("\(game.playerCount) / \(game.capacity) places")
                        }
                        .font(.subheadline)
                        Text("\(game.format.capitalized) · \(game.courtCount ?? 1) court(s) · Skill: \(game.skillPreference.capitalized)")
                            .font(.subheadline).foregroundStyle(.secondary)
                        if let week = game.seriesWeek, let weeks = game.seriesWeeks {
                            Text("Series: week \(week) of \(weeks)")
                                .font(.subheadline).foregroundStyle(.secondary)
                        }
                        if game.status == "cancelled" { Text("Cancelled").foregroundStyle(.red) }
                        if let notes = game.notes, !notes.isEmpty { Text(notes).font(.subheadline) }
                        if game.visibility == "group" {
                            Text("Only approved group members can open or join this game.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                        Menu {
                            if game.visibility == "public" || (game.visibility == "group" && signedIn) {
                                ShareLink(item: publicURL(path: "game", id: game.id)) {
                                    Label("Share game", systemImage: "square.and.arrow.up")
                                }
                            }
                            Button("Open court in Maps", systemImage: "map") { openCourt(game, directions: false) }
                            Button("Directions to court", systemImage: "arrow.triangle.turn.up.right.diamond") {
                                openCourt(game, directions: true)
                            }
                        } label: {
                            Label("Share or get directions", systemImage: "arrow.up.right.square")
                                .frame(minHeight: 44)
                        }
                        if signedIn && chatAvailable {
                            Button {
                                chatGameID = game.id
                            } label: {
                                HStack(spacing: 10) {
                                    HStack(spacing: 6) {
                                        Image(systemName: hasUnreadChat ? "bubble.left.and.bubble.right.fill" : "bubble.left.and.bubble.right")
                                            .overlay(alignment: .topTrailing) {
                                                if hasUnreadChat {
                                                    Circle().fill(Color.red).frame(width: 9, height: 9)
                                                        .overlay(Circle().stroke(Color(uiColor: .systemBackground), lineWidth: 1.5))
                                                        .offset(x: 2, y: -2)
                                                }
                                            }
                                        Text("Open conversation")
                                        }
                                        .fontWeight(hasUnreadChat ? .semibold : .regular)
                                    Spacer(minLength: 8)
                                    if let chatUnreadCount, chatUnreadCount > 0 {
                                        Text("\(chatUnreadCount) new \(chatUnreadCount == 1 ? "message" : "messages")")
                                            .font(.caption2.weight(.bold))
                                            .foregroundStyle(colorScheme == .dark ? Color.black : Color.white)
                                            .padding(.horizontal, 9)
                                            .padding(.vertical, 5)
                                            .background(Brand.accent, in: Capsule())
                                            .accessibilityLabel("\(chatUnreadCount) unread chat messages")
                                    }
                                }
                                .frame(minHeight: 44)
                            }
                        }
                    }
                }
                if signedIn {
                    NativeGameParticipationView(game: game, updated: { updated in
                        if self.game?.id == updated.id { self.game = updated }
                    }, accessChanged: {
                        generation = UUID()
                        self.game = nil
                        error = CommunityError.accessChanged.localizedDescription
                    }, presentHostAction: { hostAction = $0 }, presentDecision: { gameDecision = $0 })
                } else {
                    SwiftUI.Section("Participation") {
                        CommunitySignInCard(
                            account: account,
                            title: "Join this game",
                            message: "An account is needed to request a place or join its waitlist."
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                        .listRowBackground(Brand.background)
                        .listRowSeparator(.hidden)
                    }
                }
                SwiftUI.Section {
                    Text("Attendance includes approved guests. Available places can change before a request is approved.")
                    Text("This game is not a court reservation.")
                }.font(.footnote).foregroundStyle(.secondary)
            } else if let group {
                SwiftUI.Section {
                    CommunityPublicGroupSummary(group: group)
                }
                .listRowSeparator(.hidden)
                SwiftUI.Section {
                    if signedIn {
                        NavigationLink {
                            NativeGroupMembershipView(groupID: group.id)
                        } label: {
                            Label("Membership & member details", systemImage: "person.2")
                                .frame(minHeight: 44, alignment: .leading)
                        }
                    } else {
                        CommunitySignInCard(
                            account: account,
                            title: "Join this group",
                            message: "An account is needed to request group membership."
                        )
                        .listRowInsets(EdgeInsets(top: 8, leading: 0, bottom: 8, trailing: 0))
                        .listRowBackground(Brand.background)
                        .listRowSeparator(.hidden)
                    }
                    ShareLink(item: publicURL(path: "group", id: group.id)) {
                        Label("Share group", systemImage: "square.and.arrow.up")
                            .frame(minHeight: 44, alignment: .leading)
                    }
                    .tint(Brand.accent)
                } footer: {
                    Text("Membership approval is required to view group games, members, and discussions.")
                }
            } else if let error {
                Text(error)
                Button("Try again") { reloadID = UUID() }.frame(minHeight: 44)
            } else { ProgressView("Loading…") }
        }
        .contentMargins(.top, 0, for: .scrollContent)
        .contentMargins(.bottom, dockHeight, for: .scrollContent)
        .navigationTitle(gameID != nil ? "Game" : group?.name ?? "Group")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: Binding(get: { chatGameID != nil }, set: { if !$0 { chatGameID = nil } }), onDismiss: {
            Task { await loadChatUnread() }
        }) {
            if let chatGameID { NativeGameChatView(gameID: chatGameID) }
        }
        .alert(gameDecision?.title ?? "Confirm action", isPresented: Binding(
            get: { gameDecision != nil }, set: { if !$0 { gameDecision = nil } }
        )) {
            if let decision = gameDecision {
                if decision.isInformational {
                    Button(decision.confirmTitle) { Task { await decision.perform() } }
                } else {
                    Button(decision.confirmTitle, role: .destructive) { Task { await decision.perform() } }
                }
            }
            if gameDecision?.isInformational != true {
                Button("Cancel", role: .cancel) { gameDecision = nil }
            }
        } message: {
            Text(gameDecision?.message ?? "")
        }
        // Present host tools from the List, rather than a virtualized Section or row.
        .sheet(item: $hostAction, onDismiss: { reloadID = UUID() }) { action in
            Group {
                switch action {
                case .invitations(let game):
                    NativeGameInvitationsView(game: game).environment(account)
                case .edit(let game, let version):
                    NativeGameEditor(game: game, version: version).environment(account)
                case .schedule(let gameID):
                    NativeSeriesManagementView(gameID: gameID).environment(account)
                case .leave(let isOrganizer, let isPending, let perform):
                    NativeGameLeaveView(isOrganizer: isOrganizer, isPending: isPending, perform: perform)
                }
            }
            .presentationDetents([.large])
        }
        .task(id: "\(reloadID)-\(account.player?.id ?? "signed-out")") { await load() }
        // Child navigation and sheets must not remove their own presenting content.
        .onDisappear { generation = UUID() }
        .onChange(of: account.player?.id) { _, _ in
            generation = UUID(); game = nil; group = nil; signedIn = false; hostAction = nil; gameDecision = nil
        }
        .refreshable { await load() }
        .onChange(of: scenePhase) { _, phase in
            generation = UUID()
            game = nil; group = nil
            hostAction = nil; gameDecision = nil
            if phase == .active { reloadID = UUID() }
        }
    }

    private func publicURL(path: String, id: String) -> URL {
        #if DEBUG
        let origin = NativeCommunityAPI.origin.absoluteString
        #else
        let origin = "https://opencourts.us"
        #endif
        var url = URLComponents(string: "\(origin)/play-together/\(path)")!
        url.queryItems = [URLQueryItem(name: "id", value: id)]
        return url.url!
    }

    private func openCourt(_ game: CommunityGame, directions: Bool) {
        guard game.court.lat.isFinite, game.court.lon.isFinite,
              abs(game.court.lat) <= 90, abs(game.court.lon) <= 180 else { return }
        let item: MKMapItem
        let coordinate = CLLocationCoordinate2D(latitude: game.court.lat, longitude: game.court.lon)
        if #available(iOS 26.0, *) {
            item = MKMapItem(location: CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude), address: nil)
        } else { item = MKMapItem(placemark: MKPlacemark(coordinate: coordinate)) }
        item.name = game.court.name
        item.openInMaps(launchOptions: directions ? [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving] : nil)
    }

    @MainActor private func load() async {
        let token = UUID()
        generation = token
        game = nil; group = nil; error = nil
        chatAvailable = false
        chatUnreadCount = nil
        #if DEBUG
        if ScreenshotMockContent.isEnabled {
            signedIn = false
            if let gameID {
                game = ScreenshotMockContent.sampleGames.first { $0.id == gameID }
            } else if let groupID {
                group = ScreenshotMockContent.sampleGroups.first { $0.id == groupID }
            }
            if game == nil && group == nil { error = CommunityError.accessChanged.localizedDescription }
            return
        }
        #endif
        let actor = account.player?.id
        signedIn = await NativeCommunityAPI.shared.hasSession
        do {
            if let gameID {
                let response = try await CommunityAPI.shared.game(id: gameID)
                guard generation == token, account.player?.id == actor, !Task.isCancelled, scenePhase == .active else { return }
                if response.game.visibility == "group" || response.game.groupId != nil {
                    guard actor != nil else { throw CommunityError.accessChanged }
                }
                game = response.game
                await loadChatUnread()
            } else if let groupID {
                let response = try await CommunityAPI.shared.group(id: groupID)
                guard generation == token, account.player?.id == actor, !Task.isCancelled, scenePhase == .active else { return }
                guard !response.archived else { throw CommunityError.accessChanged }
                group = response.group
            }
        } catch {
            guard generation == token, account.player?.id == actor, scenePhase == .active, !Task.isCancelled else { return }
            self.error = (error as? CommunityError)?.localizedDescription ?? CommunityError.unavailable.localizedDescription
        }
    }

    @MainActor private func loadChatUnread() async {
        guard let game, let actor = account.player?.id, scenePhase == .active else {
            chatUnreadCount = nil
            return
        }
        do {
            let response: NativeChatPage = try await NativeCommunityAPI.shared.request("games/\(game.id)/chat")
            guard account.player?.id == actor, self.game?.id == game.id, scenePhase == .active else { return }
            chatAvailable = response.available && response.expired != true
            chatUnreadCount = chatAvailable ? max(0, response.unread ?? 0) : nil
        } catch {
            guard account.player?.id == actor, self.game?.id == game.id else { return }
            chatAvailable = false
            chatUnreadCount = nil
        }
    }
}

private struct CommunityPublicGroupSummary: View {
    let group: CommunityGroup

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            NativePublicGroupCover(groupID: group.id)
                .padding(.bottom, 12)
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text(group.name)
                    .font(.title3.weight(.semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                NativeGroupMetadataChip(title: group.visibility.capitalized)
                    .fixedSize()
                Spacer(minLength: 0)
            }
            .padding(.bottom, 6)
            AppLocationLabel(title: group.generalLocation)
                .font(.subheadline)
                .foregroundStyle(.secondary)
            if !group.publicDescription.isEmpty {
                Text(group.publicDescription)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 8)
            }
        }
        .padding(.vertical, 4)
    }
}

struct CommunityGroupEvents: View {
    let groupID: String
    @Environment(NativeAccountStore.self) private var account
    @Environment(\.scenePhase) private var scenePhase
    @State private var games: [CommunityGame] = []
    @State private var next: String?
    @State private var loading = false
    @State private var error: String?
    @State private var generation = UUID()
    @State private var reloadID = UUID()
    @State private var showingGameDetail = false
    @State private var selectedGameDetailID: String?

    private var upcomingGroupGames: [CommunityGame] {
        let now = Date()
        return games.filter { $0.startDate.map { $0 > now } ?? false }
    }

    var body: some View {
        List {
            Section {
                Label("Members-only games", systemImage: "person.2.fill").font(.headline)
                Text("Only approved active members can view these games, whether the group is public or private.")
                    .font(.footnote).foregroundStyle(.secondary)
            }
            ForEach(upcomingGroupGames) { game in
                Button {
                    selectedGameDetailID = game.id
                    showingGameDetail = true
                } label: {
                    CommunityGameRow(game: game)
                }
                .buttonStyle(.plain)
            }
            if loading { ProgressView("Loading events…") }
            if let error {
                Text(error)
                Button("Try again") { reloadID = UUID() }.frame(minHeight: 44)
            } else if !loading && upcomingGroupGames.isEmpty && next == nil { Text("No upcoming group events.") }
            if next != nil {
                Button("Load more") { Task { await load(more: true) } }
                    .disabled(loading).frame(minHeight: 44)
            }
        }
        .navigationTitle("Group events")
        .navigationDestination(isPresented: $showingGameDetail) {
            if let selectedGameDetailID {
                CommunityDetailView(gameID: selectedGameDetailID, groupID: nil)
            }
        }
        .task(id: "\(reloadID)-\(account.player?.id ?? "signed-out")-\(scenePhase)") { await load() }
        .refreshable { await load() }
        .onDisappear { clear() }
        .onChange(of: account.player?.id) { _, _ in clear() }
        .onChange(of: scenePhase) { _, _ in clear() }
    }

    private func clear() {
        generation = UUID(); games = []; next = nil; loading = false; error = nil
    }

    @MainActor private func load(more: Bool = false) async {
        if more && loading { return }
        let cursor = more ? next : nil
        let previousGames = more ? games : []
        clear()
        guard scenePhase == .active else { return }
        guard let actor = account.player?.id else { error = NativeAccountError.signedOut.localizedDescription; return }
        let token = generation
        loading = true
        defer { if generation == token { loading = false } }
        do {
            let before: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard generation == token, account.player?.id == actor, scenePhase == .active, !Task.isCancelled else { return }
            guard before.canViewMembers else { throw CommunityError.accessChanged }
            let page = try await CommunityAPI.shared.feed(groupID: groupID, cursor: cursor)
            let after: NativeGroupDetail = try await NativeCommunityAPI.shared.request("groups/\(groupID)")
            guard generation == token, account.player?.id == actor, scenePhase == .active, !Task.isCancelled else { return }
            guard after.canViewMembers else { throw CommunityError.accessChanged }
            var ids = Set(previousGames.map(\.id))
            games = previousGames + page.games.filter { ids.insert($0.id).inserted }
            next = page.nextCursor
        } catch {
            guard generation == token, account.player?.id == actor, scenePhase == .active, !Task.isCancelled else { return }
            games = []; next = nil
            self.error = (error as? CommunityError)?.localizedDescription ?? error.localizedDescription
        }
    }
}
