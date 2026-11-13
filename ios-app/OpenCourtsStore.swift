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
    private let valueUsesKey = "opencourts.review-value-uses"
    private let reviewPromptedVersionKey = "opencourts.review-prompted-version"
    private var suggestionRequestID = 0
    private var loadRequestID = 0

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
        let previousPlace = place
        if let newPlace {
            place = newPlace
            if newPlace != previousPlace,
               newPlace.countryCode?.lowercased() != "us" || previousPlace.countryCode?.lowercased() != "us" {
                courts = []
                forecasts = []
                alerts = []
                rain = []
                lastUpdated = nil
            }
            if let data = try? JSONEncoder().encode(newPlace) { UserDefaults.standard.set(data, forKey: "opencourts.place") }
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
        let authorizationStatus = locationManager.authorizationStatus
        guard CLLocationManager.locationServicesEnabled(),
              authorizationStatus != .denied,
              authorizationStatus != .restricted else {
            locationAlertMessage = "Turn on Location Services for OpenCourts in Settings > Privacy & Security > Location Services, then try again."
            return
        }

        locationAlertMessage = nil
        locationManager.requestWhenInUseAuthorization()
        locationManager.requestLocation()
    }
    nonisolated func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        Task { @MainActor in await load(Place(label: "Your location", lat: location.coordinate.latitude, lon: location.coordinate.longitude, countryCode: nil)) }
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
