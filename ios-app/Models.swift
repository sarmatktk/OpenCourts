import Foundation
import CoreLocation

nonisolated struct Place: Codable, Equatable, Sendable {
    let label: String
    let lat: Double
    let lon: Double
    static let fairfax = Place(label: "Fairfax, Virginia", lat: 38.8462, lon: -77.3064)
}

nonisolated struct PlaceSuggestion: Codable, Identifiable, Sendable {
    let title: String
    let detail: String
    let label: String
    let lat: Double
    let lon: Double
    var id: String { "\(lat),\(lon)" }
    var place: Place { Place(label: label, lat: lat, lon: lon) }
}

struct Court: Identifiable, Hashable, Sendable {
    enum Lighting: String, Sendable { case yes, no, unknown }
    enum Access: String, Sendable { case publicAccess = "public", restricted, unknown }
    let id: String
    let name: String
    let lat: Double
    let lon: Double
    let lighting: Lighting
    let access: Access
    let surface: String?
    let courts: Int?
    let sheltered: Bool
    let address: String?
    let addressApprox: Bool
    let contextName: String?
    let sourceURL: URL

    func distance(from place: Place) -> Double {
        CLLocation(latitude: lat, longitude: lon).distance(from: CLLocation(latitude: place.lat, longitude: place.lon)) / 1_609.344
    }
}

nonisolated struct Forecast: Codable, Identifiable, Sendable {
    let time: String
    let endTime: String?
    let temp: Double
    let wind: Double
    let precip: Double
    let humidity: Double?
    let heatIndex: Double?
    let winterRisk: String?
    let short: String
    let icon: String
    var id: String { time }
}

nonisolated struct WeatherData: Codable, Sendable {
    let periods: [Forecast]
    let outlook: [Forecast]
    let timeZone: String
}

nonisolated struct WeatherAlertData: Codable, Sendable {
    let supported: Bool
    let alerts: [WeatherAlert]
}

nonisolated struct WeatherAlert: Codable, Identifiable, Sendable {
    let id: String
    let event: String
    let severity: String
    let headline: String
    let area: String
    let effective: String?
    let ends: String?
    let url: URL?
}

nonisolated struct RainAssessment: Codable, Identifiable, Sendable {
    let courtId: String
    let rain1h: Double?
    let rain3h: Double?
    let rain6h: Double?
    let score: Int
    let confidence: String
    let summary: String
    var id: String { courtId }
}

enum CourtSort: String, CaseIterable, Identifiable {
    case near = "Nearest"
    case lighted = "Lighted first"
    var id: Self { self }
}

enum SearchRadius: String, CaseIterable, Identifiable {
    case all = "Any distance"
    case five = "Within 5 mi"
    case ten = "Within 10 mi"
    case twentyFive = "Within 25 mi"
    var id: Self { self }
    var miles: Double? {
        switch self { case .all: nil; case .five: 5; case .ten: 10; case .twentyFive: 25 }
    }
}
