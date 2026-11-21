import SwiftUI
import MapKit

struct PlayTogetherView: View {
    let place: Place
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var section = Section.games
    @State private var query = ""
    @State private var appliedGroupQuery = ""
    @State private var cityQuery = ""
    @State private var useSelectedLocation = false
    @State private var radius = 25
    @State private var format = "any"
    @State private var skill = "any"
    @State private var filterByDate = false
    @State private var day = Date()
    @State private var appliedSearch = CommunityGameSearch()
    @State private var locationLabel = "All locations"
    @State private var searching = false
    @State private var searchGeneration = UUID()
    @State private var account = NativeAccountStore()
    @State private var feedFilter = "all"
    @State private var games: [CommunityGame] = []
    @State private var groups: [CommunityGroup] = []
    @State private var next: String?
    @State private var loading = false
    @State private var error: String?
    @State private var generation = UUID()
    @State private var reloadID = UUID()

    private enum Section: String, CaseIterable { case games = "Find games", feed = "Feed", groups = "Groups" }

    var body: some View {
        NavigationStack {
            List {
                SwiftUI.Section {
                    NavigationLink { NativeAccountView(account: account) } label: {
                        Label(account.player?.displayName.isEmpty == false ? account.player!.displayName : "Account & sign in", systemImage: "person.crop.circle")
                    }
                    if account.player != nil {
                        NavigationLink("My Groups") { NativeMyGroupsView() }
                        NavigationLink("My Games") { NativeMyGamesView() }
                        NavigationLink("Players") { NativePlayersView() }
                    }
                }
                SwiftUI.Section {
                    Picker("Explore", selection: $section) {
                        ForEach(Section.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                    }
                    .pickerStyle(.menu)
                    if section == .games {
                        TextField("City, area or ZIP code", text: $cityQuery)
                            .submitLabel(.search)
                            .onSubmit { Task { await applyFilters() } }
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
                        Button(searching ? "Finding location…" : "Find games") { Task { await applyFilters() } }
                            .frame(minHeight: 44).disabled(searching)
                        Button("Reset filters") { resetFilters() }.frame(minHeight: 44)
                        Label(locationLabel, systemImage: "mappin.and.ellipse")
                            .font(.subheadline)
                    } else if section == .feed && account.player != nil {
                        Picker("Feed filter", selection: $feedFilter) {
                            Text("All").tag("all")
                            Text("My Groups").tag("groups")
                            Text("My Games").tag("mine")
                        }
                    } else if section == .groups {
                        TextField("Group name or location", text: $query)
                            .textInputAutocapitalization(.words)
                            .submitLabel(.search)
                            .onSubmit { appliedGroupQuery = query; reloadID = UUID() }
                        Button("Search groups") { appliedGroupQuery = query; reloadID = UUID() }
                            .frame(minHeight: 44)
                            .disabled(query.count > 120)
                        if query.count > 120 { Text("Use up to 120 characters.").foregroundStyle(.red) }
                    }
                }
                SwiftUI.Section {
                    if section != .groups {
                        ForEach(games) { game in
                            NavigationLink {
                                CommunityDetailView(gameID: game.id, groupID: nil)
                            } label: {
                                CommunityGameRow(game: game)
                            }
                        }
                    } else {
                        ForEach(groups) { group in
                            NavigationLink {
                                CommunityDetailView(gameID: nil, groupID: group.id)
                            } label: {
                                VStack(alignment: .leading, spacing: 6) {
                                    Text(group.name).font(.headline)
                                    Label(group.generalLocation, systemImage: "mappin")
                                        .font(.subheadline).foregroundStyle(.secondary)
                                    Text(group.visibility.capitalized).font(.caption)
                                }.padding(.vertical, 4)
                            }
                        }
                    }
                    if loading { ProgressView("Loading…") }
                    if let error {
                        Text(error).foregroundStyle(.secondary)
                        Button("Try again") { reloadID = UUID() }.frame(minHeight: 44)
                    } else if !loading && games.isEmpty && groups.isEmpty {
                        Text(section == .groups ? "No groups found." : "No upcoming games found.")
                            .foregroundStyle(.secondary)
                    }
                    if next != nil {
                        Button("Load more") { Task { await load(more: true) } }
                            .disabled(loading).frame(minHeight: 44)
                    }
                }
                SwiftUI.Section {
                    Text("Member features require sign-in. Native sign-in is being integrated against the isolated development server.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Text("Games do not reserve courts.").font(.footnote)
                }
            }
            .navigationTitle("Play Together")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
            .refreshable { await load() }
            .task(id: "\(section.rawValue)-\(reloadID)") { await load() }
            .task { await account.refresh() }
            .onChange(of: account.player?.id) { _, _ in
                generation = UUID(); games = []; groups = []; next = nil; feedFilter = "all"; reloadID = UUID()
            }
            .onChange(of: feedFilter) { _, _ in reloadID = UUID() }
            .onChange(of: scenePhase) { _, phase in
                // Remove previously displayed content before revalidating after backgrounding.
                if phase == .active { reloadID = UUID(); Task { await account.refresh() } }
                else { generation = UUID(); searchGeneration = UUID(); searching = false; games = []; groups = []; next = nil }
            }
            .onChange(of: section) { _, _ in searchGeneration = UUID(); searching = false }
        }
    }

    @MainActor private func load(more: Bool = false) async {
        if more && loading { return }
        if section == .groups && appliedGroupQuery.count > 120 { return }
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
                let result = try await OpenCourtsAPI.shared.findPlace(text)
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
        cityQuery = ""; useSelectedLocation = false; radius = 25
        format = "any"; skill = "any"; filterByDate = false
        appliedSearch = CommunityGameSearch(); locationLabel = "All locations"
        reloadID = UUID()
    }
}

private struct CommunityGameRow: View {
    let game: CommunityGame
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if game.status == "cancelled" { Text("Cancelled").font(.caption).foregroundStyle(.red) }
            else if game.isOrganizer == true { Text("Organizing").font(.caption) }
            else if game.joined == true { Text("Going").font(.caption) }
            else if game.requestStatus == "pending" { Text("Awaiting approval").font(.caption) }
            Text(game.title).font(.headline)
            Text(game.dateLabel).font(.subheadline)
            Text(game.groupName.map { "By \($0)" } ?? "Hosted by \(game.organizer.displayName)")
                .font(.subheadline).foregroundStyle(.secondary)
            Text(game.court.name).font(.subheadline).foregroundStyle(.secondary)
            if let distance = game.distanceMiles { Text("\(distance, specifier: "%.1f") miles").font(.caption) }
            Text("\(game.playerCount) / \(game.capacity) places · \(game.format.capitalized)")
                .font(.caption).foregroundStyle(.secondary)
        }.padding(.vertical, 4)
    }
}

struct CommunityDetailView: View {
    let gameID: String?
    let groupID: String?
    @Environment(\.scenePhase) private var scenePhase
    @State private var game: CommunityGame?
    @State private var group: CommunityGroup?
    @State private var error: String?
    @State private var reloadID = UUID()
    @State private var generation = UUID()
    @State private var signedIn = false

    var body: some View {
        List {
            if let game {
                SwiftUI.Section {
                    Text(game.title).font(.title2.bold())
                    Text(game.dateLabel)
                    Label(game.court.name, systemImage: "mappin.and.ellipse")
                    Text("Hosted by \(game.organizer.displayName)")
                    Text("\(game.playerCount) / \(game.capacity) places")
                    Text("\(game.format.capitalized) · \(game.courtCount ?? 1) planned court(s)")
                    Text("Skill: \(game.skillPreference.capitalized)")
                    if let week = game.seriesWeek, let weeks = game.seriesWeeks {
                        Text("Series: week \(week) of \(weeks)")
                    }
                    if game.status == "cancelled" { Text("Cancelled").foregroundStyle(.red) }
                    if let notes = game.notes, !notes.isEmpty { Text(notes) }
                    if game.visibility == "public" || (game.visibility == "group" && game.groupVisibility == "public") {
                        ShareLink(item: publicURL(path: "game", id: game.id)) {
                            Label("Share game", systemImage: "square.and.arrow.up")
                        }.frame(minHeight: 44)
                    }
                    Button("Open court in Maps", systemImage: "map") { openCourt(game, directions: false) }
                        .frame(minHeight: 44)
                    Button("Directions to court", systemImage: "arrow.triangle.turn.up.right.diamond") {
                        openCourt(game, directions: true)
                    }.frame(minHeight: 44)
                }
                SwiftUI.Section {
                    Text("Attendance includes approved guests. Available places can change before a request is approved.")
                    Text("This game is not a court reservation.")
                }.font(.footnote).foregroundStyle(.secondary)
            } else if let group {
                SwiftUI.Section {
                    Text(group.name).font(.title2.bold())
                    Label(group.generalLocation, systemImage: "mappin")
                    Text(group.visibility.capitalized)
                    Text(group.publicDescription)
                    if signedIn {
                        NavigationLink("Membership & member details") { NativeGroupMembershipView(groupID: group.id) }
                            .frame(minHeight: 44)
                    }
                    ShareLink(item: publicURL(path: "group", id: group.id)) {
                        Label("Share group", systemImage: "square.and.arrow.up")
                    }.frame(minHeight: 44)
                    if group.visibility == "public" {
                        NavigationLink("Upcoming group events") { CommunityPublicGroupEvents(groupID: group.id) }
                            .frame(minHeight: 44)
                    }
                }
                SwiftUI.Section {
                    Text("Member lists and discussions are available only to approved members, including in public groups.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
            } else if let error {
                Text(error)
                Button("Try again") { reloadID = UUID() }.frame(minHeight: 44)
            } else { ProgressView("Loading…") }
        }
        .navigationTitle(gameID != nil ? "Game" : "Group")
        .navigationBarTitleDisplayMode(.inline)
        .task(id: reloadID) { await load() }
        .refreshable { await load() }
        .onChange(of: scenePhase) { _, phase in
            generation = UUID()
            game = nil; group = nil
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
        signedIn = await NativeCommunityAPI.shared.hasSession
        do {
            if let gameID {
                let response = try await CommunityAPI.shared.game(id: gameID)
                guard generation == token, !Task.isCancelled, scenePhase == .active else { return }
                game = response.game
            } else if let groupID {
                let response = try await CommunityAPI.shared.group(id: groupID)
                guard generation == token, !Task.isCancelled, scenePhase == .active else { return }
                guard !response.archived else { throw CommunityError.accessChanged }
                group = response.group
            }
        } catch {
            guard generation == token, !Task.isCancelled else { return }
            self.error = (error as? CommunityError)?.localizedDescription ?? CommunityError.unavailable.localizedDescription
        }
    }
}

private struct CommunityPublicGroupEvents: View {
    let groupID: String
    @Environment(\.scenePhase) private var scenePhase
    @State private var games: [CommunityGame] = []
    @State private var next: String?
    @State private var loading = false
    @State private var error: String?
    @State private var generation = UUID()
    @State private var reloadID = UUID()

    var body: some View {
        List {
            ForEach(games) { game in
                NavigationLink { CommunityDetailView(gameID: game.id, groupID: nil) }
                    label: { CommunityGameRow(game: game) }
            }
            if loading { ProgressView("Loading events…") }
            if let error {
                Text(error)
                Button("Try again") { reloadID = UUID() }.frame(minHeight: 44)
            } else if !loading && games.isEmpty { Text("No upcoming group events.") }
            if next != nil {
                Button("Load more") { Task { await load(more: true) } }
                    .disabled(loading).frame(minHeight: 44)
            }
        }
        .navigationTitle("Group events")
        .task(id: reloadID) { await load() }
        .refreshable { await load() }
        .onChange(of: scenePhase) { _, phase in
            generation = UUID(); games = []; next = nil
            if phase == .active { reloadID = UUID() }
        }
    }

    @MainActor private func load(more: Bool = false) async {
        if more && loading { return }
        let token = UUID(); generation = token
        let cursor = more ? next : nil
        if !more { games = []; next = nil }
        loading = true; error = nil
        defer { if generation == token { loading = false } }
        do {
            let page = try await CommunityAPI.shared.feed(groupID: groupID, cursor: cursor)
            guard generation == token, !Task.isCancelled else { return }
            var ids = Set(games.map(\.id))
            games += page.games.filter { ids.insert($0.id).inserted }
            next = page.nextCursor
        } catch {
            guard generation == token, !Task.isCancelled else { return }
            games = []; next = nil
            self.error = (error as? CommunityError)?.localizedDescription ?? CommunityError.unavailable.localizedDescription
        }
    }
}
