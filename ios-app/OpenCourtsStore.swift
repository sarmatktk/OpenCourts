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
    var courts: [Court] = []
    var forecasts: [Forecast] = []
    var weatherTimeZone = "America/New_York"
    var alerts: [WeatherAlert] = []
    var rain: [RainAssessment] = []
    var selectedCourt: Court?
    var isLoading = false
    var errorMessage: String?
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
    private let valueUsesKey = "opencourts.review-value-uses"
    private let reviewPromptedVersionKey = "opencourts.review-prompted-version"
    private var suggestionRequestID = 0

    private struct CachedData: Codable {
        let place: Place
        let courts: [Court]
        let forecasts: [Forecast]
        let weatherTimeZone: String?
        let alerts: [WeatherAlert]
        let rain: [RainAssessment]
        let updatedAt: Date
    }

    override init() {
        super.init()
        locationManager.delegate = self
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
        guard
            let data = UserDefaults.standard.data(forKey: cacheKey),
            let cached = try? JSONDecoder().decode(CachedData.self, from: data),
            cached.place == place
        else { return }

        courts = cached.courts
        forecasts = cached.forecasts
        weatherTimeZone = cached.weatherTimeZone ?? weatherTimeZone
        alerts = cached.alerts
        rain = cached.rain
        lastUpdated = cached.updatedAt
        isShowingStaleData = true
    }

    private func saveCachedData() {
        let cached = CachedData(
            place: place,
            courts: courts,
            forecasts: forecasts,
            weatherTimeZone: weatherTimeZone,
            alerts: alerts,
            rain: rain,
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
        if let newPlace {
            place = newPlace
            if let data = try? JSONEncoder().encode(newPlace) { UserDefaults.standard.set(data, forKey: "opencourts.place") }
        }
        let hadExistingData = !courts.isEmpty || !forecasts.isEmpty
        isLoading = true
        errorMessage = nil
        refreshErrorMessage = nil
        selectedCourt = nil
        do {
            async let courtsTask = OpenCourtsAPI.shared.courts(near: place)
            async let weatherTask = OpenCourtsAPI.shared.weather(near: place)
            async let alertsTask = OpenCourtsAPI.shared.alerts(near: place)
            let (loadedCourts, weather, alertData) = try await (courtsTask, weatherTask, alertsTask)
            courts = loadedCourts
            forecasts = weather.periods
            weatherTimeZone = weather.timeZone
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

    func updateSuggestions() async {
        let search = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard search.count >= 3 else {
            suggestions = []
            return
        }

        suggestionRequestID += 1
        let requestID = suggestionRequestID
        do {
            let results = try await OpenCourtsAPI.shared.suggestions(for: search)
            guard requestID == suggestionRequestID,
                  query.trimmingCharacters(in: .whitespacesAndNewlines) == search else { return }
            suggestions = results
        } catch {
            guard requestID == suggestionRequestID else { return }
            suggestions = []
        }
    }
    func submitSearch() async {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        suggestionRequestID += 1
        suggestions = []
        do { await load(try await OpenCourtsAPI.shared.findPlace(query)) }
        catch { errorMessage = error.localizedDescription }
    }
    func select(_ suggestion: PlaceSuggestion) async {
        suggestionRequestID += 1
        query = ""
        suggestions = []
        await load(suggestion.place)
    }
    func requestLocation() {
        locationManager.requestWhenInUseAuthorization()
        locationManager.requestLocation()
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in await load(Place(label: "Your location", lat: location.coordinate.latitude, lon: location.coordinate.longitude)) }
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        Task { @MainActor in errorMessage = "Your location could not be determined." }
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
