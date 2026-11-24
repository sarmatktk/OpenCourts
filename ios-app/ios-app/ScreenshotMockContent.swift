#if DEBUG
import Foundation

/// Debug-only privacy fixture for capturing the real app screens without showing backend content.
enum ScreenshotMockContent {
    static var isEnabled: Bool {
        ProcessInfo.processInfo.arguments.contains("--app-store-screenshots")
    }

    static func sanitized(_ data: Data) -> Data {
        guard isEnabled,
              let json = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed]),
              let safe = transform(json, key: "", parent: "") as? NSObject,
              JSONSerialization.isValidJSONObject(safe),
              let result = try? JSONSerialization.data(withJSONObject: safe, options: [.fragmentsAllowed, .sortedKeys])
        else { return data }
        return result
    }

    static let sampleGames: [CommunityGame] = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let firstStart = Calendar(identifier: .gregorian).date(byAdding: .day, value: 6, to: Date()) ?? Date()
        let start = Calendar.current.date(bySettingHour: 9, minute: 0, second: 0, of: firstStart) ?? firstStart
        let end = Calendar.current.date(byAdding: .minute, value: 90, to: start) ?? start
        func iso(_ date: Date) -> String { formatter.string(from: date) }
        func game(id: String, title: String, at start: Date, ends end: Date, capacity: Int, players: Int, group: String? = nil) -> CommunityGame {
            CommunityGame(
                id: id, title: title,
                court: .init(id: "court-\(id)", name: "Maplewood Tennis Center", lat: 39.0, lon: -76.6, access: "public"),
                startsAt: iso(start), endsAt: iso(end), timeZone: "America/New_York", format: "Doubles",
                capacity: capacity, playerCount: players, courtCount: 1, skillPreference: "Any", status: "open",
                visibility: "public", groupVisibility: nil, groupId: nil, groupName: group,
                joined: false, isOrganizer: false, requestStatus: nil, seriesId: nil, seriesWeek: nil,
                seriesWeeks: nil, organizer: .init(id: "sample-organizer", displayName: "Jordan Lee"),
                organizerPlaying: true, notes: nil, distanceMiles: nil
            )
        }
        return (0..<6).map { index in
            let gameStart = Calendar.current.date(byAdding: .day, value: index, to: start) ?? start
            let gameEnd = Calendar.current.date(byAdding: .minute, value: 90, to: gameStart) ?? end
            let titles = ["Weekend doubles", "Morning rally", "Friendly match", "Saturday social", "Court time", "Evening doubles"]
            return game(id: "sample-game-\(index + 1)", title: titles[index], at: gameStart,
                        ends: gameEnd, capacity: 4, players: index.isMultiple(of: 2) ? 3 : 2)
        }
    }()

    static let sampleGroups = [
        CommunityGroup(id: "sample-group-1", name: "Riverside Tennis Club",
                       publicDescription: "Friendly local tennis games for players of all levels.",
                       generalLocation: "Bethesda, MD", visibility: "public", membershipStatus: nil, role: nil, status: "active"),
        CommunityGroup(id: "sample-group-2", name: "Weekend Rally Club",
                       publicDescription: "Find a game and meet local players.",
                       generalLocation: "Bethesda, MD", visibility: "public", membershipStatus: nil, role: nil, status: "active"),
        CommunityGroup(id: "sample-group-3", name: "Court Friends",
                       publicDescription: "A welcoming group for casual weekly matches.",
                       generalLocation: "Bethesda, MD", visibility: "public", membershipStatus: nil, role: nil, status: "active"),
        CommunityGroup(id: "sample-group-4", name: "Capital City Tennis",
                       publicDescription: "Meet nearby players and organize a game.",
                       generalLocation: "Bethesda, MD", visibility: "public", membershipStatus: nil, role: nil, status: "active")
    ]

    private static func transform(_ value: Any, key: String, parent: String) -> Any {
        if let dictionary = value as? [String: Any] {
            let identifier = dictionary["id"] as? String ?? ""
            let name = sampleName(for: identifier)
            return dictionary.mapValues { $0 }.reduce(into: [String: Any]()) { result, entry in
                let field = entry.key
                if isPrivateImageField(field) {
                    result[field] = NSNull()
                } else if let text = entry.value as? String {
                    result[field] = replacement(for: text, field: field, parent: key, objectName: name)
                } else {
                    result[field] = transform(entry.value, key: field, parent: key)
                }
            }
        }
        if let array = value as? [Any] {
            return array.map { transform($0, key: key, parent: parent) }
        }
        return value
    }

    private static func replacement(for original: String, field: String, parent: String, objectName: String) -> Any {
        switch field.lowercased() {
        case "displayname", "authorname", "hostname", "hostdisplayname", "playername", "createdbyname":
            return objectName
        case "groupname": return "Riverside Tennis Club"
        case "title": return parent.lowercased().contains("discussion") ? "Weekend court update" : "Saturday doubles"
        case "name":
            if parent.lowercased().contains("court") || parent.lowercased() == "tags" { return "Maplewood Tennis Center" }
            if parent.lowercased().contains("group") { return "Riverside Tennis Club" }
            return objectName
        case "publicdescription", "description", "bio", "notes", "organizernotes":
            return "Friendly local tennis games for players of all levels."
        case "generallocation", "location", "address", "addressline": return "Bethesda, MD"
        case "content", "message", "body", "text", "previewtext", "excerpt", "lastmessage": return "Looking forward to playing together!"
        case "email": return "jordan.lee@example.com"
        case "username", "handle": return "jordanlee"
        case "startsat": return "2026-12-05T14:00:00.000Z"
        case "endsat": return "2026-12-05T16:00:00.000Z"
        default:
            if field.lowercased().contains("photo") || field.lowercased().contains("avatar") || field.lowercased().contains("image") || field.lowercased().contains("cover") {
                return NSNull()
            }
            return original
        }
    }

    private static func isPrivateImageField(_ field: String) -> Bool {
        let name = field.lowercased()
        return name.contains("photo") || name.contains("avatar") || name.contains("image") || name.contains("cover")
    }

    private static func sampleName(for id: String) -> String {
        let people = ["Jordan Lee", "Taylor Morgan", "Alex Rivera", "Casey Brooks"]
        let index = id.utf8.reduce(0) { ($0 + Int($1)) % people.count }
        return people[index]
    }
}
#endif
