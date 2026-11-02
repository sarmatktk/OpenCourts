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
    var alerts: [WeatherAlert] = []
    var rain: [RainAssessment] = []
    var selectedCourt: Court?
    var isLoading = false
    var errorMessage: String?
    var lightedOnly = false
    var publicOnly = false
    var radius: SearchRadius = .all
    var surface = "Any surface"
    var sort: CourtSort = .near
    private let locationManager = CLLocationManager()

    override init() {
        super.init()
        locationManager.delegate = self
        if let data = UserDefaults.standard.data(forKey: "opencourts.place"),
           let saved = try? JSONDecoder().decode(Place.self, from: data) { place = saved }
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
        isLoading = true
        errorMessage = nil
        selectedCourt = nil
        do {
            async let courtsTask = OpenCourtsAPI.shared.courts(near: place)
            async let weatherTask = OpenCourtsAPI.shared.weather(near: place)
            async let alertsTask = OpenCourtsAPI.shared.alerts(near: place)
            let (loadedCourts, weather, alertData) = try await (courtsTask, weatherTask, alertsTask)
            courts = loadedCourts
            forecasts = weather.periods
            alerts = alertData.alerts
            rain = (try? await OpenCourtsAPI.shared.rain(for: Array(loadedCourts.sorted { $0.distance(from: place) < $1.distance(from: place) }.prefix(50)))) ?? []
        } catch { errorMessage = error.localizedDescription }
        isLoading = false
    }

    func updateSuggestions() async {
        do { suggestions = try await OpenCourtsAPI.shared.suggestions(for: query) }
        catch { suggestions = [] }
    }
    func submitSearch() async {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        do { await load(try await OpenCourtsAPI.shared.findPlace(query)) }
        catch { errorMessage = error.localizedDescription }
        suggestions = []
    }
    func select(_ suggestion: PlaceSuggestion) async {
        query = ""; suggestions = []; await load(suggestion.place)
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
