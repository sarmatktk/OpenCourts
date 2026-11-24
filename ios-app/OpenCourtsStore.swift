import Foundation
import Observation
import CoreLocation
import MapKit

@MainActor
@Observable
final class OpenCourtsStore: NSObject, CLLocationManagerDelegate {
    var place: Place = .fairfax
    var query = ""
    var suggestions: [PlaceSuggestion] = []
    var suggestionError: String?
    var courts: [Court] = []
    var forecasts: [Forecast] = []
    var weatherTimeZone = "America/New_York"
    var weatherSource: String?
    var weatherAttributionURL: URL?
    var alerts: [WeatherAlert] = []
    var rain: [RainAssessment] = []
    var selectedCourt: Court?
    var isLoading = false
    var errorMessage: String?
    var locationAlertMessage: String?
    var refreshErrorMessage: String?
    var lastUpdated: Date?
    var isShowingStaleData = false
    var lightedOnly = false
    var publicOnly = false
    var radius: SearchRadius = .all
    var surface = "Any surface"
    var sort: CourtSort = .near
    private let locationManager = CLLocationManager()
    private let cacheKey = "opencourts.cached-data"
    private let courtCacheLifetime: TimeInterval = 3 * 24 * 60 * 60
    private let valueUsesKey = "opencourts.review-value-uses"
    private let reviewPromptedVersionKey = "opencourts.review-prompted-version"
    private var suggestionRequestID = 0
    private var loadRequestID = 0
    private var isLocationRequestInProgress = false

    private struct CachedData: Codable {
        let place: Place
        let courts: [Court]
        let updatedAt: Date
    }

    override init() {
        super.init()
        locationManager.delegate = self
        #if DEBUG
        if ScreenshotMockContent.isEnabled {
            place = Self.screenshotPlace
            courts = Self.screenshotCourts
            lastUpdated = Date()
            return
        }
        #endif
        if let data = UserDefaults.standard.data(forKey: "opencourts.place"),
           let saved = try? JSONDecoder().decode(Place.self, from: data) { place = saved }
        loadCachedData()
    }

    var shouldRequestReview: Bool {
        let uses = UserDefaults.standard.integer(forKey: valueUsesKey)
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
        return uses >= 2 && UserDefaults.standard.string(forKey: reviewPromptedVersionKey) != version
    }

    func recordValueUse() {
        UserDefaults.standard.set(UserDefaults.standard.integer(forKey: valueUsesKey) + 1, forKey: valueUsesKey)
    }

    func markReviewPrompted() {
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "unknown"
        UserDefaults.standard.set(version, forKey: reviewPromptedVersionKey)
    }

    private func loadCachedData() {
        guard let data = UserDefaults.standard.data(forKey: cacheKey),
              let cached = try? JSONDecoder().decode(CachedData.self, from: data) else { return }
        guard Date().timeIntervalSince(cached.updatedAt) < courtCacheLifetime else {
            UserDefaults.standard.removeObject(forKey: cacheKey)
            return
        }
        guard cached.place == place else { return }

        courts = cached.courts
        lastUpdated = cached.updatedAt
        isShowingStaleData = true
    }

    private func saveCachedData() {
        let cached = CachedData(
            place: place,
            courts: courts,
            updatedAt: lastUpdated ?? Date()
        )
        if let data = try? JSONEncoder().encode(cached) {
            UserDefaults.standard.set(data, forKey: cacheKey)
        }
    }

    var surfaces: [String] { ["Any surface"] + Array(Set(courts.compactMap(\.surface))).sorted() }
    var filteredCourts: [Court] {
        courts.filter { court in
            (!lightedOnly || court.lighting == .yes)
            && (!publicOnly || court.access == .publicAccess)
            && (radius.miles.map { court.distance(from: place) <= $0 } ?? true)
            && (surface == "Any surface" || court.surface == surface)
        }.sorted {
            if sort == .lighted, ($0.lighting == .yes) != ($1.lighting == .yes) { return $0.lighting == .yes }
            return $0.distance(from: place) < $1.distance(from: place)
        }
    }
    var rainRecommendations: [(Court, RainAssessment)] {
        Array(rain.compactMap { result in courts.first(where: { $0.id == result.courtId }).map { ($0, result) } }
            .filter { $0.1.confidence != "Low" }.sorted { $0.1.score > $1.1.score }.prefix(3))
    }

    func load(_ newPlace: Place? = nil) async {
        #if DEBUG
        if ScreenshotMockContent.isEnabled {
            place = Self.screenshotPlace
            courts = Self.screenshotCourts
            forecasts = []
            alerts = []
            rain = []
            errorMessage = nil
            refreshErrorMessage = nil
            lastUpdated = Date()
            isLoading = false
            return
        }
        #endif
        let previousPlace = place
        let requestedPlace = newPlace ?? place
        let inferredCountry: String?
        if let countryCode = requestedPlace.countryCode {
            inferredCountry = countryCode
        } else {
            inferredCountry = await OpenCourtsAPI.shared.internationalCountryCode(for: requestedPlace.label)
        }
        let resolvedPlace = Place(label: requestedPlace.label, lat: requestedPlace.lat, lon: requestedPlace.lon, countryCode: inferredCountry)
        place = resolvedPlace
        if resolvedPlace != previousPlace,
           (resolvedPlace.countryCode?.lowercased() != "us" || previousPlace.countryCode?.lowercased() != "us") {
            courts = []
            forecasts = []
            alerts = []
            rain = []
            lastUpdated = nil
        }
        if newPlace != nil || resolvedPlace != previousPlace {
            if let data = try? JSONEncoder().encode(resolvedPlace) { UserDefaults.standard.set(data, forKey: "opencourts.place") }
        }
        loadRequestID += 1
        let requestID = loadRequestID
        let hadExistingData = !courts.isEmpty || !forecasts.isEmpty
        isLoading = true
        errorMessage = nil
        refreshErrorMessage = nil
        selectedCourt = nil

        if place.countryCode?.lowercased() != "us" {
            await loadInternational(hadExistingData: hadExistingData, requestID: requestID)
            isLoading = false
            return
        }

        do {
            async let courtsTask = OpenCourtsAPI.shared.courts(near: place)
            async let weatherTask = OpenCourtsAPI.shared.weather(near: place)
            async let alertsTask = OpenCourtsAPI.shared.alerts(near: place)
            let (loadedCourts, weather, alertData) = try await (courtsTask, weatherTask, alertsTask)
            guard requestID == loadRequestID else { return }
            courts = loadedCourts
            forecasts = weather.periods
            weatherTimeZone = weather.timeZone
            weatherSource = weather.source
            weatherAttributionURL = weather.attributionURL
            alerts = alertData.alerts
            if let loadedRain = try? await OpenCourtsAPI.shared.rain(for: Array(loadedCourts.sorted { $0.distance(from: place) < $1.distance(from: place) }.prefix(50))) {
                rain = loadedRain
            }
            lastUpdated = Date()
            isShowingStaleData = false
            saveCachedData()
        } catch {
            errorMessage = error.localizedDescription
            if hadExistingData {
                isShowingStaleData = true
                refreshErrorMessage = "Couldn’t refresh. Showing your last successful data."
            }
        }
        isLoading = false
    }

    #if DEBUG
    private static let screenshotPlace = Place(label: "Bethesda, MD", lat: 38.9847, lon: -77.0947, countryCode: "us")
    private static let screenshotCourts = [
        Court(id: "mock-maplewood-1", name: "Maplewood Tennis Center", lat: 38.9910, lon: -77.1010,
              lighting: .yes, access: .publicAccess, surface: "Hard", courts: 6, sheltered: false,
              address: "Bethesda, MD", addressApprox: true, contextName: nil, sourceURL: URL(string: "https://opencourts.us")!),
        Court(id: "mock-cedar-grove-1", name: "Cedar Grove Courts", lat: 38.9778, lon: -77.0810,
              lighting: .no, access: .publicAccess, surface: "Hard", courts: 4, sheltered: false,
              address: "Bethesda, MD", addressApprox: true, contextName: nil, sourceURL: URL(string: "https://opencourts.us")!),
        Court(id: "mock-river-park-1", name: "River Park Courts", lat: 38.9701, lon: -77.1093,
              lighting: .yes, access: .publicAccess, surface: "Clay", courts: 3, sheltered: false,
              address: "Bethesda, MD", addressApprox: true, contextName: nil, sourceURL: URL(string: "https://opencourts.us")!)
    ]
    #endif

    private func loadInternational(hadExistingData: Bool, requestID: Int) async {
        var loadedCourts: [Court]?
        var weather: WeatherData?
        var firstError: Error?

        do {
            loadedCourts = try await OpenCourtsAPI.shared.courts(near: place)
        } catch {
            firstError = error
        }

        do {
            weather = try await OpenCourtsAPI.shared.weather(near: place)
        } catch {
            if firstError == nil { firstError = error }
        }

        guard requestID == loadRequestID else { return }
        if let loadedCourts {
            courts = loadedCourts
        }
        if let weather {
            forecasts = weather.periods
            weatherTimeZone = weather.timeZone
        }

        alerts = []
        rain = []
        if let loadedCourts, let weather {
            rain = internationalRainAssessments(for: loadedCourts, forecasts: weather.periods, now: Date())
        }

        if let firstError {
            errorMessage = firstError.localizedDescription
            if hadExistingData {
                isShowingStaleData = true
                refreshErrorMessage = "Couldn’t refresh. Showing your last successful data."
            }
        } else {
            lastUpdated = Date()
            isShowingStaleData = false
            saveCachedData()
        }
    }

    private func internationalRainAssessments(for courts: [Court], forecasts: [Forecast], now: Date) -> [RainAssessment] {
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let fallbackParser = ISO8601DateFormatter()
        let start = now
        let finish = now.addingTimeInterval(6 * 60 * 60)
        let intervals = forecasts.compactMap { forecast -> (Forecast, Date, Date)? in
            guard forecast.precipKnown != false,
                  let intervalStart = parser.date(from: forecast.time) ?? fallbackParser.date(from: forecast.time),
                  let explicitEnd = forecast.endTime.flatMap({ parser.date(from: $0) ?? fallbackParser.date(from: $0) }) else { return nil }
            let intervalEnd = max(explicitEnd, intervalStart.addingTimeInterval(60 * 60))
            return (forecast, intervalStart, intervalEnd)
        }.sorted { $0.1 < $1.1 }

        var cursor = start
        var weightedChance = 0.0
        var coveredSeconds = 0.0
        while cursor < finish {
            guard let interval = intervals.first(where: { $0.1 <= cursor && $0.2 > cursor }),
                  interval.0.precip.isFinite,
                  interval.0.precip >= 0,
                  interval.0.precip <= 100 else { return [] }
            let end = min(interval.2, finish)
            let duration = end.timeIntervalSince(cursor)
            weightedChance += interval.0.precip * duration
            coveredSeconds += duration
            cursor = end
        }

        guard coveredSeconds >= finish.timeIntervalSince(start) - 1 else { return [] }
        let chance = Int((weightedChance / coveredSeconds).rounded())
        return courts.map {
            RainAssessment(
                courtId: $0.id,
                rain1h: nil,
                rain3h: nil,
                rain6h: nil,
                score: 100 - chance,
                confidence: "Moderate",
                summary: "(chance)% average hourly rain chance over the next 6 hours",
                source: "forecast",
                forecastRainChance: chance
            )
        }
    }

    func updateSuggestions() async {
        let search = query.trimmingCharacters(in: .whitespacesAndNewlines)
        suggestionError = nil
        guard search.count >= 3 else {
            suggestions = []
            return
        }

        suggestionRequestID += 1
        let requestID = suggestionRequestID
        do {
            let results = try await OpenCourtsAPI.shared.suggestions(for: search, preferredCountryCode: place.countryCode)
            guard requestID == suggestionRequestID,
                  query.trimmingCharacters(in: .whitespacesAndNewlines) == search else { return }
            suggestions = results
            if results.isEmpty { suggestionError = "No address suggestions found. Continue typing or search this area." }
        } catch {
            guard requestID == suggestionRequestID else { return }
            suggestions = []
            suggestionError = "Address suggestions are unavailable right now. Continue typing or search this area."
        }
    }
    func submitSearch() async {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        suggestionRequestID += 1
        suggestions = []
        suggestionError = nil
        do { await load(try await OpenCourtsAPI.shared.findPlace(query)) }
        catch { errorMessage = error.localizedDescription }
    }
    func select(_ suggestion: PlaceSuggestion) async {
        suggestionRequestID += 1
        query = ""
        suggestions = []
        suggestionError = nil
        await load(suggestion.place)
    }
    func requestLocation() {
        let authorizationStatus = locationManager.authorizationStatus
        guard authorizationStatus != .denied,
              authorizationStatus != .restricted else {
            locationAlertMessage = "Turn on Location Services for OpenCourts in Settings > Privacy & Security > Location Services, then try again."
            return
        }

        isLocationRequestInProgress = true
        locationAlertMessage = nil
        if authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways {
            isLocationRequestInProgress = false
            locationManager.requestLocation()
        } else {
            locationManager.requestWhenInUseAuthorization()
        }
    }
    nonisolated func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        let status = manager.authorizationStatus
        Task { @MainActor in
            handleLocationAuthorization(status)
        }
    }

    private func handleLocationAuthorization(_ status: CLAuthorizationStatus) {
        guard isLocationRequestInProgress else { return }

        switch status {
        case .authorized, .authorizedWhenInUse, .authorizedAlways:
            isLocationRequestInProgress = false
            locationManager.requestLocation()
        case .denied, .restricted:
            isLocationRequestInProgress = false
            locationAlertMessage = "Turn on Location Services for OpenCourts in Settings > Privacy & Security > Location Services, then try again."
        case .notDetermined:
            break
        @unknown default:
            isLocationRequestInProgress = false
        }
    }

    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in
            let countryCode = await countryCode(for: location)
            await load(Place(label: "Your location", lat: location.coordinate.latitude, lon: location.coordinate.longitude, countryCode: countryCode))
        }
    }

    private func countryCode(for location: CLLocation) async -> String? {
        let geocoder = CLGeocoder()
        return await withCheckedContinuation { continuation in
            geocoder.reverseGeocodeLocation(location) { placemarks, _ in
                continuation.resume(returning: placemarks?.first?.isoCountryCode?.lowercased())
            }
        }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in
            if let locationError = error as? CLError, locationError.code == .denied {
                locationAlertMessage = "Turn on Location Services for OpenCourts in Settings > Privacy & Security > Location Services, then try again."
            } else {
                errorMessage = "Your location could not be determined."
            }
        }
    }
    func directions(to court: Court) {
        recordValueUse()
        let item: MKMapItem
        if #available(iOS 26.0, *) {
            item = MKMapItem(location: CLLocation(latitude: court.lat, longitude: court.lon), address: nil)
        } else {
            item = MKMapItem(placemark: MKPlacemark(coordinate: CLLocationCoordinate2D(latitude: court.lat, longitude: court.lon)))
        }
        item.name = court.name
        item.openInMaps(launchOptions: [MKLaunchOptionsDirectionsModeKey: MKLaunchOptionsDirectionsModeDriving])
    }
}
