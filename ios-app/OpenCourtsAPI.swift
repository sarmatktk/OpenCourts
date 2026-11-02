import Foundation
import CoreLocation

actor OpenCourtsAPI {
    static let shared = OpenCourtsAPI()
    private let baseURL = URL(string: "https://opencourts.us")!
    private let decoder = JSONDecoder()

    func suggestions(for query: String) async throws -> [PlaceSuggestion] {
        guard query.trimmingCharacters(in: .whitespacesAndNewlines).count >= 3 else { return [] }
        let response: SuggestionsResponse = try await get(path: "/api/suggest", query: [("q", query), ("v", "6")])
        return response.suggestions ?? []
    }

    func findPlace(_ query: String) async throws -> Place {
        let response: GeocodeResponse = try await get(path: "/api/geocode", query: [("q", query), ("v", "6")])
        guard let result = response.result, let lat = Double(result.lat), let lon = Double(result.lon) else {
            throw APIError.message("We couldn’t find that place. Try a U.S. city, state, or ZIP code.")
        }
        return Place(label: result.displayName, lat: lat, lon: lon)
    }

    func courts(near place: Place) async throws -> [Court] {
        let response: ElementsResponse = try await get(path: "/api/courts", query: [("lat", String(place.lat)), ("lon", String(place.lon))])
        let publicCourts = response.elements.compactMap(normalizeCourt).filter { $0.access != .restricted }
        return groupCourtsByVenue(publicCourts)
    }

    func weather(near place: Place) async throws -> WeatherData {
        try await get(path: "/api/weather", query: [("lat", String(place.lat)), ("lon", String(place.lon))])
    }

    func alerts(near place: Place) async throws -> WeatherAlertData {
        try await get(path: "/api/weather-alerts", query: [("lat", String(place.lat)), ("lon", String(place.lon))])
    }

    func rain(for courts: [Court]) async throws -> [RainAssessment] {
        var all: [RainAssessment] = []
        for start in stride(from: 0, to: min(courts.count, 50), by: 12) {
            let batch = Array(courts[start..<min(start + 12, min(courts.count, 50))])
            var request = URLRequest(url: baseURL.appending(path: "/api/rain"))
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONEncoder().encode(RainRequest(courts: batch.map { .init(id: $0.id, lat: $0.lat, lon: $0.lon) }))
            let response: RainResponse = try await send(request)
            all.append(contentsOf: response.assessments)
        }
        return all
    }

    private func get<T: Decodable>(path: String, query: [(String, String)]) async throws -> T {
        var components = URLComponents(url: baseURL.appending(path: path), resolvingAgainstBaseURL: false)!
        components.queryItems = query.map { URLQueryItem(name: $0.0, value: $0.1) }
        return try await send(URLRequest(url: components.url!))
    }

    private func send<T: Decodable>(_ request: URLRequest) async throws -> T {
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, 200..<300 ~= http.statusCode else {
            throw APIError.message("OpenCourts data is temporarily unavailable. Please try again.")
        }
        return try decoder.decode(T.self, from: data)
    }

    private func normalizeCourt(_ element: OSMElement) -> Court? {
        let tags = element.tags ?? [:]
        guard ["pitch", "sports_centre"].contains(tags["leisure"] ?? ""),
              (tags["sport"] ?? "").split(separator: ";").contains("tennis"),
              let lat = element.lat ?? element.center?.lat,
              let lon = element.lon ?? element.center?.lon else { return nil }
        let access: Court.Access = ["private", "members", "customers", "fee", "no"].contains(tags["access"] ?? "") || tags["fee"] == "yes" ? .restricted : (["yes", "public", "permissive"].contains(tags["access"] ?? "") ? .publicAccess : .unknown)
        let lighting: Court.Lighting = tags["lit"] == "yes" || tags["lighting"] == "yes" ? .yes : (tags["lit"] == "no" || tags["lighting"] == "no" ? .no : .unknown)
        let name = tags["name"] ?? tags["name:en"] ?? "Tennis courts"
        let addressLine = [tags["addr:housenumber"], tags["addr:street"]].compactMap { $0 }.joined(separator: " ")
        let nearbyPlace = tags["opencourts:nearby_place"]
        let nearbyStreet = tags["opencourts:nearby_street"]
        let address = !addressLine.isEmpty ? addressLine : nearbyPlace.map { "At \($0)" } ?? nearbyStreet.map { "Near \($0)" }
        return Court(id: "osm-\(element.type)-\(element.id)", name: name, lat: lat, lon: lon, lighting: lighting, access: access, surface: tags["surface"], courts: Int(tags["count"] ?? tags["courts:count"] ?? ""), sheltered: tags["indoor"] == "yes" || tags["covered"] == "yes", address: address, addressApprox: addressLine.isEmpty && address != nil, contextName: nearbyPlace.map { "At \($0)" }, sourceURL: URL(string: "https://www.openstreetmap.org/\(element.type)/\(element.id)")!)
    }

    private func groupCourtsByVenue(_ courts: [Court]) -> [Court] {
        var groups: [[Court]] = []

        for court in courts {
            guard let venue = venueName(for: court) else {
                groups.append([court])
                continue
            }

            if let index = groups.firstIndex(where: { members in
                guard let first = members.first,
                      venueName(for: first)?.localizedCaseInsensitiveCompare(venue) == .orderedSame,
                      first.surface?.lowercased() == court.surface?.lowercased(),
                      first.lighting == court.lighting,
                      first.access == court.access,
                      first.sheltered == court.sheltered else {
                    return false
                }

                let centerLat = members.map(\.lat).reduce(0, +) / Double(members.count)
                let centerLon = members.map(\.lon).reduce(0, +) / Double(members.count)
                return distanceMiles(
                    from: CLLocationCoordinate2D(latitude: centerLat, longitude: centerLon),
                    to: CLLocationCoordinate2D(latitude: court.lat, longitude: court.lon)
                ) <= 0.15
            }) {
                groups[index].append(court)
            } else {
                groups.append([court])
            }
        }

        return groups.map(mergedVenue)
    }

    private func venueName(for court: Court) -> String? {
        if let contextName = court.contextName,
           contextName.lowercased().hasPrefix("at ") {
            return String(contextName.dropFirst(3)).trimmingCharacters(in: .whitespacesAndNewlines)
        }

        let normalizedName = court.name.trimmingCharacters(in: .whitespacesAndNewlines)
        let lowercased = normalizedName.lowercased()
        let generic = lowercased == "tennis courts"
            || lowercased == "tennis court"
            || lowercased.range(of: #"^(?:tennis\s+)?court\s*#?\s*\d+$"#, options: .regularExpression) != nil
        return generic ? nil : normalizedName
    }

    private func mergedVenue(_ members: [Court]) -> Court {
        guard members.count > 1, let first = members.first else {
            return members[0]
        }

        let venue = venueName(for: first) ?? first.name
        let centerLat = members.map(\.lat).reduce(0, +) / Double(members.count)
        let centerLon = members.map(\.lon).reduce(0, +) / Double(members.count)
        let explicitCounts = members.compactMap(\.courts).filter { $0 > 1 }
        let courtCount = explicitCounts.isEmpty
            ? members.reduce(0) { $0 + ($1.courts ?? 1) }
            : max(members.count, explicitCounts.max() ?? members.count)
        let mostCommonAddress = Dictionary(grouping: members.compactMap(\.address), by: { $0 })
            .max { $0.value.count < $1.value.count }?.key

        return Court(
            id: "venue-\(first.id)",
            name: venue,
            lat: centerLat,
            lon: centerLon,
            lighting: first.lighting,
            access: first.access,
            surface: first.surface,
            courts: courtCount,
            sheltered: first.sheltered,
            address: mostCommonAddress,
            addressApprox: members.contains { $0.address == mostCommonAddress && $0.addressApprox },
            contextName: nil,
            sourceURL: first.sourceURL
        )
    }

    private func distanceMiles(
        from first: CLLocationCoordinate2D,
        to second: CLLocationCoordinate2D
    ) -> Double {
        CLLocation(latitude: first.latitude, longitude: first.longitude)
            .distance(from: CLLocation(latitude: second.latitude, longitude: second.longitude)) / 1_609.344
    }
}

enum APIError: LocalizedError {
    case message(String)
    var errorDescription: String? { if case .message(let value) = self { value } else { nil } }
}

private nonisolated struct SuggestionsResponse: Decodable { let suggestions: [PlaceSuggestion]? }
private nonisolated struct GeocodeResponse: Decodable {
    nonisolated struct Result: Decodable {
        let displayName: String
        let lat: String
        let lon: String
        enum CodingKeys: String, CodingKey { case displayName = "display_name"; case lat, lon }
    }
    let result: Result?
}
private nonisolated struct ElementsResponse: Decodable { let elements: [OSMElement] }
private nonisolated struct OSMElement: Decodable {
    nonisolated struct Center: Decodable { let lat: Double; let lon: Double }
    let type: String
    let id: Int
    let lat: Double?
    let lon: Double?
    let center: Center?
    let tags: [String: String]?
}
private nonisolated struct RainRequest: Encodable {
    nonisolated struct Item: Encodable { let id: String; let lat: Double; let lon: Double }
    let courts: [Item]
}
private nonisolated struct RainResponse: Decodable { let assessments: [RainAssessment] }
