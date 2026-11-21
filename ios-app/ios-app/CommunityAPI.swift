import Foundation

// Public discovery only. This client deliberately has no cookie/token transport or writes.
// Authenticated community features must use an approved native identity exchange first.
nonisolated struct CommunityGame: Decodable, Identifiable, Sendable {
    struct Court: Decodable, Sendable {
        let id: String
        let name: String
        let lat: Double
        let lon: Double
        let access: String
    }
    struct Organizer: Decodable, Sendable { let displayName: String }
    let id: String
    let title: String
    let court: Court
    let startsAt: String
    let endsAt: String
    let timeZone: String
    let format: String
    let capacity: Int
    let playerCount: Int
    let courtCount: Int?
    let skillPreference: String
    let status: String
    let visibility: String?
    let groupVisibility: String?
    let groupId: String?
    let groupName: String?
    let joined: Bool?
    let isOrganizer: Bool?
    let requestStatus: String?
    let seriesId: String?
    let seriesWeek: Int?
    let seriesWeeks: Int?
    let organizer: Organizer
    let organizerPlaying: Bool?
    let notes: String?
    let distanceMiles: Double?

    var startDate: Date? {
        let fractional = ISO8601DateFormatter()
        fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return fractional.date(from: startsAt) ?? ISO8601DateFormatter().date(from: startsAt)
    }
    var dateLabel: String {
        guard let date = startDate else { return "Time unavailable" }
        let formatter = DateFormatter()
        formatter.timeZone = TimeZone(identifier: timeZone) ?? TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "EEE, MMM d, h:mm a z"
        return formatter.string(from: date)
    }
}

nonisolated struct CommunityGameSearch: Sendable {
    var lat: Double?
    var lon: Double?
    var radius = 25
    var format = "any"
    var skill = "any"
    var day: Date?

    // Matches the website: date boundaries use the device's calendar/time zone.
    func queryItems(calendar: Calendar = .current) -> [URLQueryItem] {
        var items = [URLQueryItem(name: "radius", value: String(radius)),
                     URLQueryItem(name: "format", value: format),
                     URLQueryItem(name: "skill", value: skill)]
        if let lat, let lon {
            items += [URLQueryItem(name: "lat", value: String(lat)), URLQueryItem(name: "lon", value: String(lon))]
        }
        if let day {
            let start = calendar.startOfDay(for: day)
            if let end = calendar.date(byAdding: .day, value: 1, to: start) {
                let iso = ISO8601DateFormatter()
                items += [URLQueryItem(name: "from", value: iso.string(from: start)),
                          URLQueryItem(name: "to", value: iso.string(from: end))]
            }
        }
        return items
    }
}

nonisolated struct CommunityGroup: Decodable, Identifiable, Sendable {
    let id: String
    let name: String
    let publicDescription: String
    let generalLocation: String
    let visibility: String
    let membershipStatus: String?
    let role: String?
    let status: String?
}

nonisolated struct CommunityGamePage: Decodable, Sendable {
    let games: [CommunityGame]
    let nextCursor: String?
}
nonisolated struct CommunityGroupPage: Decodable, Sendable {
    let groups: [CommunityGroup]
    let next: String?
}
nonisolated struct CommunityGameDetail: Decodable, Sendable { let game: CommunityGame }
nonisolated struct CommunityGroupDetail: Decodable, Sendable {
    let group: CommunityGroup
    let archived: Bool
}

nonisolated enum CommunityError: LocalizedError {
    case unavailable, accessChanged, invalidResponse
    var errorDescription: String? {
        switch self {
        case .unavailable: "Play Together could not load. Please try again."
        case .accessChanged: "This content is no longer available. Refresh to see current listings."
        case .invalidResponse: "Play Together returned an unreadable response. Please try again."
        }
    }
}

actor CommunityAPI {
    static let shared = CommunityAPI()
    private let baseURL: URL
    private let session: URLSession

    init() {
        #if DEBUG
        baseURL = NativeCommunityAPI.origin
        #else
        baseURL = URL(string: "https://opencourts.us")!
        #endif
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpCookieStorage = nil
        configuration.httpShouldSetCookies = false
        configuration.urlCache = nil
        configuration.timeoutIntervalForRequest = 20
        session = URLSession(configuration: configuration)
    }

    func games(search: CommunityGameSearch, cursor: String?) async throws -> CommunityGamePage {
        var query = search.queryItems()
        if let cursor { query.append(URLQueryItem(name: "cursor", value: cursor)) }
        return try await get("games", query: query)
    }
    func feed(groupID: String? = nil, filter: String = "all", cursor: String? = nil) async throws -> CommunityGamePage {
        var query = [URLQueryItem(name: "filter", value: filter)]
        if let groupID {
            guard UUID(uuidString: groupID) != nil else { throw CommunityError.accessChanged }
            query.append(URLQueryItem(name: "groupId", value: groupID))
        }
        if let cursor { query.append(URLQueryItem(name: "cursor", value: cursor)) }
        return try await get("games/feed", query: query)
    }
    func groups(query: String, cursor: String?) async throws -> CommunityGroupPage {
        var items = [URLQueryItem(name: "q", value: query)]
        if let cursor { items.append(URLQueryItem(name: "before", value: cursor)) }
        return try await get("groups", query: items)
    }
    func game(id: String) async throws -> CommunityGameDetail {
        guard UUID(uuidString: id) != nil else { throw CommunityError.accessChanged }
        return try await get("games/\(id)")
    }
    func group(id: String) async throws -> CommunityGroupDetail {
        guard UUID(uuidString: id) != nil else { throw CommunityError.accessChanged }
        return try await get("groups/\(id)")
    }
    private func get<T: Decodable & Sendable>(_ path: String, query: [URLQueryItem] = []) async throws -> T {
        if await NativeCommunityAPI.shared.hasSession {
            return try await NativeCommunityAPI.shared.request(path, query: query)
        }
        var components = URLComponents(url: baseURL.appending(path: "api/\(path)"), resolvingAgainstBaseURL: false)!
        components.queryItems = query.isEmpty ? nil : query
        var request = URLRequest(url: components.url!, cachePolicy: .reloadIgnoringLocalCacheData)
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        let (data, response) = try await session.data(for: request)
        try Task.checkCancellation()
        guard let response = response as? HTTPURLResponse else { throw CommunityError.invalidResponse }
        if [401, 403, 404, 410].contains(response.statusCode) { throw CommunityError.accessChanged }
        guard response.statusCode == 200 else { throw CommunityError.unavailable }
        do { return try JSONDecoder().decode(T.self, from: data) }
        catch { throw CommunityError.invalidResponse }
    }
}
