import SwiftUI

nonisolated private struct CreateCourt: Codable, Identifiable, Sendable {
    let id: String
    let name: String
    let access: String
    let distanceMiles: Double
    let courtCount: Int?
    let selectionToken: String?
}

nonisolated private struct CreateCourtPage: Decodable, Sendable {
    let courts: [CreateCourt]
}

@MainActor private enum CreateGameCourtCache {
    struct Entry: Codable {
        let savedAt: Date
        let courts: [CreateCourt]
    }

    static let lifetime: TimeInterval = 3 * 24 * 60 * 60
    private static let keyPrefix = "opencourts.create-game-courts."

    static func key(accountID: String, place: Place) -> String {
        "v2|\(accountID)|\(place.lat)|\(place.lon)|\(place.countryCode ?? "")"
    }

    static func entry(for key: String, now: Date = Date()) -> Entry? {
        pruneExpired(now: now)
        let storageKey = keyPrefix + Data(key.utf8).base64EncodedString()
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let entry = try? JSONDecoder().decode(Entry.self, from: data),
              now.timeIntervalSince(entry.savedAt) < lifetime else {
            UserDefaults.standard.removeObject(forKey: storageKey)
            return nil
        }
        return entry
    }

    static func save(_ courts: [CreateCourt], for key: String, now: Date = Date()) {
        pruneExpired(now: now)
        let storageKey = keyPrefix + Data(key.utf8).base64EncodedString()
        let displayOnlyCourts = courts.map { court in
            CreateCourt(id: court.id, name: court.name, access: court.access,
                        distanceMiles: court.distanceMiles, courtCount: court.courtCount, selectionToken: nil)
        }
        let entry = Entry(savedAt: now, courts: displayOnlyCourts)
        if let data = try? JSONEncoder().encode(entry) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }

    private static func pruneExpired(now: Date) {
        for storageKey in UserDefaults.standard.dictionaryRepresentation().keys where storageKey.hasPrefix(keyPrefix) {
            guard let data = UserDefaults.standard.data(forKey: storageKey),
                  let entry = try? JSONDecoder().decode(Entry.self, from: data),
                  now.timeIntervalSince(entry.savedAt) < lifetime else {
                UserDefaults.standard.removeObject(forKey: storageKey)
                continue
            }
        }
    }
}

struct NativeCreateGameView: View {
    let place: Place
    let account: NativeAccountStore
    let created: () -> Void
    let groupID: String?
    @Environment(OpenCourtsStore.self) private var store

    init(place: Place, account: NativeAccountStore, groupID: String? = nil, created: @escaping () -> Void) {
        self.place = place
        self.account = account
        self.groupID = groupID
        self.created = created
        _visibility = State(initialValue: groupID == nil ? "public" : "group")
        _selectedGroupID = State(initialValue: groupID ?? "")
    }
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase
    @State private var query = ""
    @State private var courtLocationSuggestions: [PlaceSuggestion] = []
    @State private var manualAddressSuggestions: [PlaceSuggestion] = []
    @State private var selectedCourtSearchPlace: Place?
    @State private var selectedManualAddress = ""
    @State private var courts: [CreateCourt] = []
    @State private var selected: CreateCourt?
    @State private var pendingCourtSelectionID: String?
    @State private var manual = false
    @State private var manualName = ""
    @State private var manualAddress = ""
    @State private var manualPlace: Place?
    @State private var finding = false
    @State private var searchToken = UUID()
    @State private var courtError: String?
    @State private var suggestionError: String?
    @State private var title = ""
    @State private var visibility = "public"
    @State private var hostingGroups: [CommunityGroup] = []
    @State private var selectedGroupID = ""
    @State private var groupsLoading = false
    @State private var groupsError: String?
    @State private var groupsGeneration = UUID()
    @State private var start = Date().addingTimeInterval(3600)
    @State private var timeZone = TimeZone.current.identifier
    @State private var duration = 60
    @State private var format = "doubles"
    @State private var courtCount = 1
    @State private var capacity = 4
    @State private var repeatWeeks = 1
    @State private var skill = "any"
    @State private var notes = ""
    @State private var confirmAccess = false
    @State private var acknowledge = false
    @State private var busy = false
    @State private var error: String?
    @State private var pendingBody: Data?
    @State private var pendingPlayerID: String?
    @State private var createdGame: CommunityGame?
    @State private var confirmingDismiss = false

    private var minimumCapacity: Int { courtCount * (format == "singles" ? 2 : 4) }
    private var locationReady: Bool {
        if manual {
            return manualPlace != nil && (1...80).contains(manualName.trimmingCharacters(in: .whitespacesAndNewlines).count) &&
                (1...110).contains(manualAddress.trimmingCharacters(in: .whitespacesAndNewlines).count)
        }
        return selected != nil
    }
    private var needsAccessConfirmation: Bool { manual || selected?.access == "unknown" }
    private var canCreate: Bool {
        locationReady && !finding && !title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && title.count <= 80 &&
        notes.count <= 1000 && acknowledge && (!needsAccessConfirmation || confirmAccess) &&
        start > Date() && capacity >= minimumCapacity && capacity <= 128 && !busy &&
        (visibility != "group" || hostingGroups.contains { $0.id == selectedGroupID })
    }

    var body: some View {
        NavigationStack {
            Group {
                if let createdGame {
                    List {
                        Section {
                            Label("Game created", systemImage: "checkmark.circle.fill")
                                .foregroundStyle(.tint)
                            Text(createdGame.title).font(.headline)
                            Text(createdGame.dateLabel).foregroundStyle(.secondary)
                            NavigationLink("View game") {
                                CommunityDetailView(gameID: createdGame.id, groupID: nil)
                            }
                        }
                    }
                } else if account.player == nil {
                    ContentUnavailableView("Sign in to create a game", systemImage: "person.crop.circle", description: Text("Sign in from Account, then return to create your game."))
                } else if account.player?.displayName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty == true {
                    ContentUnavailableView("Complete your profile", systemImage: "person.crop.circle", description: Text("Add a display name in Account before creating a game."))
                } else {
                    form
                }
            }
            .navigationTitle(groupID == nil ? "Create game" : "Create group game")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button(createdGame == nil ? "Cancel" : "Done") {
                        if pendingBody != nil { confirmingDismiss = true }
                        else { dismiss() }
                    }.disabled(busy)
                }
            }
            .interactiveDismissDisabled(busy || pendingBody != nil)
            .alert("Check My Games before leaving?", isPresented: $confirmingDismiss) {
                Button("Leave and check My Games", role: .destructive) { dismiss() }
                Button("Keep editing", role: .cancel) { confirmingDismiss = false }
            } message: {
                Text("Your game may already have been created. Check My Games before submitting another game.")
            }
            .task(id: "\(account.player?.id ?? "signed-out")-\(scenePhase)") {
                if scenePhase == .active, account.player != nil { await loadHostingGroups() }
                else { clearHostingGroups() }
            }
            .onDisappear {
                invalidateCourtSearch()
                clearHostingGroups()
            }
            .onChange(of: account.player?.id) { _, _ in
                invalidateCourtSearch()
                courts = []
                selected = nil
                pendingCourtSelectionID = nil
                manualPlace = nil
                confirmAccess = false
                createdGame = nil
                clearHostingGroups()
            }
            .onChange(of: scenePhase) { _, phase in
                if phase != .active {
                    if finding { courtError = "Court lookup was interrupted. Try the search again." }
                    invalidateCourtSearch()
                }
            }
        }
    }

    private var form: some View {
        Form {
            Section("1. Choose a court") {
                Picker("Location", selection: $manual) {
                    Text("Find a court").tag(false)
                    Text("Enter manually").tag(true)
                }.pickerStyle(.segmented)
                if manual {
                    TextField("Court or facility name", text: $manualName)
                        .onChange(of: manualName) { _, _ in confirmAccess = false }
                    if manualName.trimmingCharacters(in: .whitespacesAndNewlines).count > 80 {
                        Text("Use up to 80 characters for the court name.").foregroundStyle(.red)
                    }
                    TextField("Street address, city and ZIP", text: $manualAddress)
                        .onChange(of: manualAddress) { _, value in
                            if value == selectedManualAddress {
                                selectedManualAddress = ""
                            } else {
                                invalidateCourtSearch()
                                manualPlace = nil
                                courtError = nil
                                suggestionError = nil
                                confirmAccess = false
                            }
                        }
                        .task(id: manualAddress) {
                            try? await Task.sleep(for: .milliseconds(350))
                            guard !Task.isCancelled else { return }
                            await loadPlaceSuggestions(for: manualAddress, manualAddress: true)
                        }
                    ForEach(manualAddressSuggestions) { suggestion in
                        placeSuggestionRow(suggestion) {
                            selectedManualAddress = suggestion.label
                            manualAddress = suggestion.label
                            manualPlace = suggestion.place
                            manualAddressSuggestions = []
                            courtError = nil
                        }
                    }
                    if let suggestionError {
                        Text(suggestionError).font(.footnote).foregroundStyle(.secondary)
                    }
                    if manualAddress.trimmingCharacters(in: .whitespacesAndNewlines).count > 110 {
                        Text("Use up to 110 characters for the court address.").foregroundStyle(.red)
                    }
                    Button(finding ? "Locating…" : "Locate address") { Task { await locateManual() } }
                        .disabled(finding || manualAddress.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                    if let manualPlace { AppLocationLabel(title: manualPlace.label).font(.footnote).foregroundStyle(.secondary) }
                    Text("This location will not be added to the court catalog.").font(.footnote).foregroundStyle(.secondary)
                } else {
                    TextField("City, address or ZIP code", text: $query)
                        .onChange(of: query) { _, _ in
                            invalidateCourtSearch()
                            courts = []
                            selected = nil
                            pendingCourtSelectionID = nil
                            selectedCourtSearchPlace = nil
                            courtLocationSuggestions = []
                            courtError = nil
                            suggestionError = nil
                            confirmAccess = false
                        }
                        .task(id: query) {
                            try? await Task.sleep(for: .milliseconds(350))
                            guard !Task.isCancelled else { return }
                            await loadPlaceSuggestions(for: query, manualAddress: false)
                        }
                        .submitLabel(.search)
                        .onSubmit { Task { await searchCourts() } }
                    ForEach(courtLocationSuggestions) { suggestion in
                        placeSuggestionRow(suggestion) {
                            selectedCourtSearchPlace = suggestion.place
                            courtLocationSuggestions = []
                            courtError = nil
                        }
                    }
                    if let suggestionError {
                        Text(suggestionError).font(.footnote).foregroundStyle(.secondary)
                    }
                    if let selectedCourtSearchPlace {
                        AppLocationLabel(title: selectedCourtSearchPlace.label)
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    Button(finding ? "Finding courts…" : "Find courts") { Task { await searchCourts() } }
                        .disabled(finding)
                    ForEach(courts) { court in
                        Button {
                            if let selectionToken = court.selectionToken {
                                selected = CreateCourt(id: court.id, name: court.name, access: court.access,
                                                       distanceMiles: court.distanceMiles, courtCount: court.courtCount,
                                                       selectionToken: selectionToken)
                                pendingCourtSelectionID = nil
                            } else {
                                selected = nil
                                pendingCourtSelectionID = court.id
                                if !finding {
                                    Task { await searchCourts(selectingCourtID: court.id) }
                                }
                            }
                            confirmAccess = false
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(court.name).foregroundStyle(.primary)
                                    let count = court.courtCount ?? 1
                                    Text("\(count) \(count == 1 ? "court" : "courts") · \(court.distanceMiles.formatted()) miles · \(court.access == "public" ? "Public access" : "Check access")")
                                        .font(.caption).foregroundStyle(.secondary)
                                }
                                Spacer()
                                if selected?.id == court.id || pendingCourtSelectionID == court.id {
                                    Image(systemName: "checkmark.circle.fill")
                                }
                            }
                            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)
                        .accessibilityAddTraits(selected?.id == court.id ? .isSelected : [])
                    }
                }
                if let courtError {
                    Label(courtError, systemImage: "exclamationmark.circle")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .disabled(busy || pendingBody != nil)

            Section("2. Plan your game") {
                if groupID == nil {
                    Picker("Visibility", selection: $visibility) {
                        Text("Public").tag("public")
                        Text("Unlisted").tag("unlisted")
                        Text("Group event").tag("group")
                    }
                } else {
                    Label("Members-only group game", systemImage: "person.2.fill")
                        .font(.headline)
                }
                if visibility == "group" {
                    if groupsLoading { ProgressView("Checking your groups…") }
                    if let groupsError {
                        Text(groupsError).font(.footnote).foregroundStyle(.secondary)
                    } else if !groupsLoading && hostingGroups.isEmpty {
                        Text("You need an active Owner, Co-owner or Organizer role to host a group event.")
                            .font(.footnote).foregroundStyle(.secondary)
                    }
                    if !hostingGroups.isEmpty {
                        if groupID == nil {
                            Picker("Group", selection: $selectedGroupID) {
                                Text("Choose a group").tag("")
                                ForEach(hostingGroups) { group in
                                    Text(group.name).tag(group.id)
                                }
                            }
                        }
                        if let group = hostingGroups.first(where: { $0.id == selectedGroupID }) {
                            if groupID != nil { Text(group.name).font(.headline) }
                            Text("Only approved active group members can view or join this game, whether the group is public or private.")
                                .font(.footnote).foregroundStyle(.secondary)
                        }
                    }
                    Button("Refresh groups") { Task { await loadHostingGroups() } }
                        .disabled(groupsLoading)
                    Text("Active group members can join directly while places are available. Access is checked again when creating the event.")
                        .font(.footnote).foregroundStyle(.secondary)
                } else {
                    Text("Both require host approval. Unlisted games are excluded from public searches.")
                        .font(.footnote).foregroundStyle(.secondary)
                }
                TextField("Game title", text: $title)
                DatePicker("Start", selection: $start, in: Date()..., displayedComponents: [.date, .hourAndMinute])
                    .environment(\.timeZone, TimeZone(identifier: timeZone) ?? .current)
                Picker("Court time zone", selection: $timeZone) {
                    ForEach(TimeZone.knownTimeZoneIdentifiers, id: \.self) { Text($0.replacingOccurrences(of: "_", with: " ")).tag($0) }
                }
                Text("Choose the court's time zone. Games must be within 180 days.").font(.footnote).foregroundStyle(.secondary)
                Picker("Duration", selection: $duration) {
                    ForEach(Array(stride(from: 30, through: 240, by: 15)), id: \.self) { Text("\($0) minutes").tag($0) }
                }
                Picker("Format", selection: $format) {
                    Text("Singles").tag("singles")
                    Text("Doubles").tag("doubles")
                }
                Stepper("Courts planned: \(courtCount)", value: $courtCount, in: 1...16)
                Stepper("Player capacity: \(capacity)", value: $capacity, in: minimumCapacity...128)
                Text("Capacity includes you and approved guests. This does not reserve courts.").font(.footnote).foregroundStyle(.secondary)
                Picker("Repeat weekly", selection: $repeatWeeks) {
                    Text("One game only").tag(1)
                    ForEach(2...12, id: \.self) { Text("\($0) weeks total").tag($0) }
                }
                Picker("Skill preference", selection: $skill) {
                    Text("Any skill level").tag("any")
                    Text("Beginner").tag("beginner")
                    Text("Intermediate").tag("intermediate")
                    Text("Advanced").tag("advanced")
                }
                TextField("Notes (optional)", text: $notes, axis: .vertical)
                if needsAccessConfirmation {
                    Toggle("I will check this court is available for public play", isOn: $confirmAccess)
                }
                Toggle("I understand this game does not reserve a court", isOn: $acknowledge)
            }
            .disabled(busy || pendingBody != nil)
            .onChange(of: format) { _, _ in capacity = minimumCapacity }
            .onChange(of: courtCount) { _, _ in capacity = minimumCapacity }
            .onChange(of: manual) { _, _ in
                invalidateCourtSearch()
                courtLocationSuggestions = []
                manualAddressSuggestions = []
                selectedCourtSearchPlace = nil
                selectedManualAddress = ""
                pendingCourtSelectionID = nil
                courtError = nil
                suggestionError = nil
                confirmAccess = false
            }

            Section {
                if let error { Text(error).foregroundStyle(.red) }
                if busy {
                    ProgressView("Creating game…")
                } else if pendingBody != nil {
                    Text("The result is uncertain. Retry this exact submission to avoid creating a duplicate.")
                        .font(.footnote).foregroundStyle(.secondary)
                    Button("Retry submission") { Task { await submit() } }.disabled(busy)
                } else {
                    Button(busy ? "Creating…" : "Create game") { Task { await submit() } }
                        .disabled(!canCreate)
                }
            }
        }
    }

    private func clearHostingGroups() {
        groupsGeneration = UUID()
        hostingGroups = []
        selectedGroupID = ""
        groupsLoading = false
        groupsError = nil
    }

    @MainActor private func loadHostingGroups() async {
        guard let actor = account.player?.id, scenePhase == .active else { clearHostingGroups(); return }
        let generation = UUID()
        groupsGeneration = generation
        groupsLoading = true
        groupsError = nil
        defer { if groupsGeneration == generation { groupsLoading = false } }
        do {
            let result: CommunityGroupPage = try await NativeCommunityAPI.shared.request("groups/mine")
            guard groupsGeneration == generation, account.player?.id == actor, scenePhase == .active, !Task.isCancelled else { return }
            hostingGroups = result.groups.filter { $0.canSuggestGameHosting && (groupID == nil || $0.id == groupID) }
            if groupID != nil {
                selectedGroupID = hostingGroups.first?.id ?? ""
                if selectedGroupID.isEmpty {
                    groupsError = "Hosting access to this group is no longer available. Refresh or return to group details."
                }
            } else if !hostingGroups.contains(where: { $0.id == selectedGroupID }) { selectedGroupID = "" }
        } catch {
            guard groupsGeneration == generation, account.player?.id == actor, scenePhase == .active, !Task.isCancelled else { return }
            hostingGroups = []
            selectedGroupID = ""
            groupsError = error.localizedDescription
        }
    }

    private func invalidateCourtSearch() {
        searchToken = UUID()
        finding = false
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

    @MainActor private func loadPlaceSuggestions(for input: String, manualAddress isManualAddress: Bool) async {
        let text = input.trimmingCharacters(in: .whitespacesAndNewlines)
        suggestionError = nil
        if isManualAddress, manualPlace?.label == text {
            manualAddressSuggestions = []
            return
        }
        guard text.count >= 3 else {
            if isManualAddress { manualAddressSuggestions = [] }
            else { courtLocationSuggestions = [] }
            return
        }
        do {
            let results = try await OpenCourtsAPI.shared.suggestions(for: text, preferredCountryCode: place.countryCode)
            guard !Task.isCancelled,
                  text == input.trimmingCharacters(in: .whitespacesAndNewlines),
                  manual == isManualAddress else { return }
            if isManualAddress { manualAddressSuggestions = results }
            else { courtLocationSuggestions = results }
            suggestionError = results.isEmpty ? "No address suggestions found. Continue typing or choose Find courts." : nil
        } catch {
            guard !Task.isCancelled else { return }
            if isManualAddress { manualAddressSuggestions = [] }
            else { courtLocationSuggestions = [] }
            suggestionError = "Address suggestions are unavailable right now. Continue typing or choose Find courts."
        }
    }

    @MainActor private func searchCourts(selectingCourtID: String? = nil) async {
        let token = UUID(); searchToken = token; finding = true; courtError = nil; courts = []; selected = nil
        pendingCourtSelectionID = selectingCourtID
        defer { if searchToken == token { finding = false } }
        do {
            let text = query.trimmingCharacters(in: .whitespacesAndNewlines)
            let center: Place
            if text.isEmpty { center = place }
            else if let selectedCourtSearchPlace { center = selectedCourtSearchPlace }
            else { center = try await OpenCourtsAPI.shared.findPlace(text) }
            guard searchToken == token, !Task.isCancelled,
                  let accountID = account.player?.id else { return }
            let cacheKey = CreateGameCourtCache.key(accountID: accountID, place: center)
            if let cached = CreateGameCourtCache.entry(for: cacheKey) {
                courts = cached.courts
                pendingCourtSelectionID = nil
                courtError = nil
            }
            var items = [URLQueryItem(name: "lat", value: String(center.lat)), URLQueryItem(name: "lon", value: String(center.lon))]
            if let country = center.countryCode { items.append(URLQueryItem(name: "country", value: country.lowercased())) }
            // Discovery can include provider lookup followed by bounded context enrichment.
            let result: CreateCourtPage = try await NativeCommunityAPI.shared.request("games/courts", query: items, timeout: 45)
            guard searchToken == token, !Task.isCancelled else { return }
            let selectedID = selected?.id ?? pendingCourtSelectionID
            courts = result.courts
            CreateGameCourtCache.save(result.courts, for: cacheKey)
            if let selectedID { selected = result.courts.first { $0.id == selectedID } }
            pendingCourtSelectionID = nil
            if selectedID != nil, selected == nil {
                courtError = "That court is no longer available. Choose one of the refreshed results."
            }
            if courts.isEmpty { courtError = "No eligible courts found. Try another area or enter a court manually." }
        } catch {
            if searchToken == token && !Task.isCancelled {
                pendingCourtSelectionID = nil
                selected = nil
                self.courtError = error.localizedDescription
            }
        }
    }

    @MainActor private func locateManual() async {
        let token = UUID(); searchToken = token; finding = true; courtError = nil; manualPlace = nil
        let address = manualAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        defer { if searchToken == token { finding = false } }
        do {
            let result = try await OpenCourtsAPI.shared.findPlace(address)
            guard searchToken == token, address == manualAddress.trimmingCharacters(in: .whitespacesAndNewlines), !Task.isCancelled else { return }
            manualPlace = result
        } catch { if searchToken == token && !Task.isCancelled { self.courtError = error.localizedDescription } }
    }

    @MainActor private func submit() async {
        guard !busy, scenePhase == .active, pendingBody != nil || canCreate else { return }
        guard let playerID = account.player?.id, pendingPlayerID == nil || pendingPlayerID == playerID else {
            error = "Sign in to the original account before retrying this submission."
            return
        }
        busy = true; error = nil
        defer { busy = false }
        do {
            let body: Data
            if let pendingBody { body = pendingBody }
            else {
                if visibility == "group" {
                    let result: CommunityGroupPage = try await NativeCommunityAPI.shared.request("groups/mine")
                    guard account.player?.id == playerID, scenePhase == .active, !Task.isCancelled,
                          result.groups.contains(where: { $0.id == selectedGroupID && $0.canSuggestGameHosting }) else {
                        clearHostingGroups()
                        throw NSError(domain: "OpenCourts", code: 403, userInfo: [NSLocalizedDescriptionKey: "Group hosting access changed. Refresh your groups and choose an eligible group."])
                    }
                }
                let formatter = DateFormatter()
                formatter.locale = Locale(identifier: "en_US_POSIX")
                formatter.timeZone = TimeZone(identifier: timeZone)
                formatter.dateFormat = "yyyy-MM-dd'T'HH:mm"
                var payload: [String: Any] = ["title": title.trimmingCharacters(in: .whitespacesAndNewlines), "visibility": visibility,
                    "joinPolicy": visibility == "group" ? "instant" : "approval", "startLocal": formatter.string(from: start), "timeZone": timeZone,
                    "durationMinutes": duration, "format": format, "capacity": capacity, "courtCount": courtCount,
                    "repeatWeeks": repeatWeeks, "skillPreference": skill, "notes": notes, "requestId": UUID().uuidString,
                    "acknowledgeNoReservation": acknowledge, "confirmAccess": confirmAccess]
                if visibility == "group" { payload["groupId"] = selectedGroupID }
                if manual, let manualPlace {
                    payload["manualCourt"] = ["name": manualName.trimmingCharacters(in: .whitespacesAndNewlines),
                        "address": manualAddress.trimmingCharacters(in: .whitespacesAndNewlines), "lat": manualPlace.lat, "lon": manualPlace.lon]
                } else if let selected, let selectionToken = selected.selectionToken {
                    payload["courtToken"] = selectionToken
                }
                body = try JSONSerialization.data(withJSONObject: payload)
                pendingBody = body
                pendingPlayerID = playerID
            }
            let result: CommunityGameDetail = try await NativeCommunityAPI.shared.request("games", method: "POST", body: body)
            // Preserve the exact retry body if a response arrives after account/lifecycle changes.
            guard account.player?.id == playerID, scenePhase == .active else { return }
            pendingBody = nil
            pendingPlayerID = nil
            createdGame = result.game
            store.recordValueUse()
            created()
        } catch {
            let nsError = error as NSError
            if nsError.domain == "OpenCourts", (400..<500).contains(nsError.code), nsError.code != 408 {
                pendingBody = nil
                pendingPlayerID = nil
            }
            self.error = error.localizedDescription
        }
    }
}
