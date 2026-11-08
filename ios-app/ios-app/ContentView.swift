import SwiftUI
import StoreKit
import MapKit
#if os(iOS) || os(tvOS) || os(visionOS)
import UIKit
#elseif os(macOS)
import AppKit
#endif

private enum Brand {
    static let green = Color(red: 18/255, green: 61/255, blue: 50/255)
    static let lime = Color(red: 220/255, green: 233/255, blue: 175/255)
    static let accent = Color(red: 105/255, green: 139/255, blue: 66/255)
    #if os(iOS) || os(tvOS) || os(visionOS)
    static let background = Color(uiColor: .systemBackground)
    static let surface = Color(uiColor: .secondarySystemBackground)
    #elseif os(macOS)
    static let background = Color(nsColor: .windowBackgroundColor)
    static let surface = Color(nsColor: .controlBackgroundColor)
    #endif
}

private enum AppDestination: String, CaseIterable, Identifiable {
    case map = "Map"
    case courts = "Courts"
    case dryCourts = "Dry Courts"
    case weather = "Weather"

    var id: Self { self }

    var systemImage: String {
        switch self {
        case .map: "map.fill"
        case .courts: "list.bullet"
        case .dryCourts: "cloud.rain"
        case .weather: "cloud.sun.fill"
        }
    }
}

struct ContentView: View {
    @State private var store = OpenCourtsStore()
    @State private var destination: AppDestination = .map
    @State private var searchPresented = false
    @State private var hasCompletedInitialLoad = false
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.requestReview) private var requestReview

    var body: some View {
        ZStack(alignment: .bottom) {
            VStack(spacing: 0) {
                AppHeader(store: store)
                if let message = store.refreshErrorMessage {
                    RefreshStatusBanner(message: message, lastUpdated: store.lastUpdated) {
                        Task { await store.load() }
                    }
                }
                AppScreen(destination: destination, store: store)
                    .safeAreaPadding(.bottom, 72)
                    .refreshable {
                        await store.load()
                    }
            }
            BottomNavigation(selection: $destination) {
                searchPresented = true
            }
                .padding(.horizontal, 14)
                .padding(.bottom, 8)
        }
        .background(Brand.background)
        .tint(Brand.accent)
        .task {
            guard !hasCompletedInitialLoad else { return }
            await store.load()
            hasCompletedInitialLoad = true
        }
        .onChange(of: destination) { _, newDestination in
            if newDestination == .dryCourts || newDestination == .weather {
                store.recordValueUse()
            }
        }
        .onChange(of: scenePhase) { _, newPhase in
            guard newPhase == .active, hasCompletedInitialLoad, !store.isLoading else { return }
            Task {
                await store.load()
                await requestReviewIfAppropriate()
            }
        }
        .sheet(isPresented: $searchPresented) {
            SearchSheet(store: store)
        }
    }

    private func requestReviewIfAppropriate() async {
        guard store.shouldRequestReview else { return }
        try? await Task.sleep(for: .seconds(1.5))
        guard scenePhase == .active, !store.isLoading, store.shouldRequestReview else { return }
        store.markReviewPrompted()
        requestReview()
    }
}

private struct RefreshStatusBanner: View {
    let message: String
    let lastUpdated: Date?
    let retry: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Image(systemName: "arrow.clockwise.circle")
                .foregroundStyle(.orange)
            VStack(alignment: .leading, spacing: 3) {
                Text(message)
                    .font(.footnote.weight(.semibold))
                if let lastUpdated {
                    Text("Last updated \(lastUpdated, format: .dateTime.hour().minute())")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
            Spacer(minLength: 4)
            Button("Retry", action: retry)
                .font(.footnote.weight(.bold))
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.orange.opacity(0.12), in: RoundedRectangle(cornerRadius: 14))
        .overlay {
            RoundedRectangle(cornerRadius: 14)
                .stroke(.orange.opacity(0.3), lineWidth: 0.8)
        }
        .padding(.horizontal, 20)
        .padding(.top, 8)
    }
}

private struct AppScreen: View {
    let destination: AppDestination
    let store: OpenCourtsStore

    var body: some View {
        switch destination {
        case .map:
            CourtsScreen(store: store, mode: .map)
        case .courts:
            CourtsScreen(store: store, mode: .list)
        case .dryCourts:
            ScrollView {
                RainPlannerSection(store: store)
            }
        case .weather:
            ScrollView {
                WeatherSection(store: store)
                AboutSection()
            }
        }
    }
}

private struct CourtsScreen: View {
    let store: OpenCourtsStore
    let mode: ExploreMode

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                if let error = store.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .padding()
                }
                ExploreSection(store: store, mode: mode)
            }
        }
    }
}

private struct BottomNavigation: View {
    @Binding var selection: AppDestination
    let searchAction: () -> Void

    var body: some View {
        ZStack(alignment: .top) {
            HStack(spacing: 3) {
                ForEach([AppDestination.map, .courts]) { destination in
                    BottomDestinationButton(
                        destination: destination,
                        isSelected: selection == destination
                    ) {
                        select(destination)
                    }
                }

                Color.clear
                    .frame(width: 58, height: 1)
                    .accessibilityHidden(true)

                ForEach([AppDestination.dryCourts, .weather]) { destination in
                    BottomDestinationButton(
                        destination: destination,
                        isSelected: selection == destination
                    ) {
                        select(destination)
                    }
                }
            }
            .padding(6)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay { Capsule().stroke(.separator.opacity(0.75), lineWidth: 0.8) }
            .shadow(color: .black.opacity(0.15), radius: 14, y: 6)

            Button("Search courts", systemImage: "magnifyingglass", action: searchAction)
                .labelStyle(.iconOnly)
                .font(.title2.weight(.bold))
                .foregroundStyle(.white)
                .frame(width: 58, height: 58)
                .background(Brand.green, in: Circle())
                .overlay { Circle().stroke(.white.opacity(0.7), lineWidth: 3) }
                .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
                .offset(y: -18)
                .accessibilityHint("Opens location search")
        }
    }

    private func select(_ destination: AppDestination) {
        withAnimation(.easeOut(duration: 0.18)) {
            selection = destination
        }
    }
}

private struct BottomDestinationButton: View {
    let destination: AppDestination
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 3) {
                Image(systemName: destination.systemImage)
                    .font(.system(size: 17, weight: .semibold))
                Text(destination.rawValue)
                    .font(.system(size: 9, weight: .semibold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.75)
            }
            .foregroundStyle(isSelected ? Brand.accent : .secondary)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(
                isSelected ? Brand.accent.opacity(0.14) : .clear,
                in: RoundedRectangle(cornerRadius: 16)
            )
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

private struct AppHeader: View {
    let store: OpenCourtsStore
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        HStack {
            OpenCourtsLogo()
            Spacer()
            Button("Use my location", systemImage: "location.fill") {
                store.requestLocation()
            }
            .labelStyle(.iconOnly)
            .font(.title3)
            .frame(width: 44, height: 44)
            .background(headerSurface, in: Circle())
            .overlay {
                Circle()
                    .stroke(headerBorderColor)
            }
            .accessibilityLabel("Use my location")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 4)
        .background(headerSurface)
    }

    private var headerSurface: Color {
        colorScheme == .dark
            ? Color(red: 13/255, green: 31/255, blue: 24/255)
            : .white
    }

    private var headerBorderColor: Color {
        colorScheme == .dark
            ? Color(red: 43/255, green: 56/255, blue: 48/255)
            : Color(red: 230/255, green: 235/255, blue: 229/255)
    }
}

private struct OpenCourtsLogo: View {
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        HStack(spacing: 10) {
            ZStack {
                Circle()
                    .stroke(markBorderColor, lineWidth: 1)
                OpenCourtsTennisGlyph(color: markColor)
                    .frame(width: 20, height: 20)
            }
            .frame(width: 40, height: 40)

            HStack(spacing: 0) {
                Text("open")
                    .fontWeight(.heavy)
                    .foregroundStyle(.primary)
                Text("courts")
                    .fontWeight(.medium)
                    .foregroundStyle(mutedWordColor)
            }
            .font(.title3)
            .tracking(-0.8)
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("OpenCourts")
    }

    private var markColor: Color {
        colorScheme == .dark
            ? Color(red: 220/255, green: 233/255, blue: 175/255)
            : Color(red: 18/255, green: 61/255, blue: 50/255)
    }

    private var markBorderColor: Color {
        colorScheme == .dark
            ? Color(red: 52/255, green: 75/255, blue: 64/255)
            : Color(red: 220/255, green: 227/255, blue: 221/255)
    }

    private var mutedWordColor: Color {
        colorScheme == .dark
            ? Color(red: 165/255, green: 177/255, blue: 169/255)
            : Color(red: 116/255, green: 128/255, blue: 120/255)
    }
}

private struct OpenCourtsTennisGlyph: View {
    let color: Color

    var body: some View {
        Canvas { context, size in
            let scale = min(size.width, size.height) / 24
            let offsetX = (size.width - 24 * scale) / 2
            let offsetY = (size.height - 24 * scale) / 2

            func point(_ x: Double, _ y: Double) -> CGPoint {
                CGPoint(x: offsetX + x * scale, y: offsetY + y * scale)
            }

            let ballRect = CGRect(
                x: offsetX + 3 * scale,
                y: offsetY + 3 * scale,
                width: 18 * scale,
                height: 18 * scale
            )
            let ball = Path(ellipseIn: ballRect)
            context.stroke(ball, with: .color(color), lineWidth: 1.8 * scale)

            var leftSeam = Path()
            leftSeam.move(to: point(6, 4.9))
            leftSeam.addCurve(
                to: point(10, 12),
                control1: point(8.5, 7.1),
                control2: point(10, 9.5)
            )
            leftSeam.addCurve(
                to: point(6, 19.1),
                control1: point(10, 14.5),
                control2: point(8.5, 16.9)
            )
            context.stroke(leftSeam, with: .color(color), lineWidth: 1.5 * scale)

            var rightSeam = Path()
            rightSeam.move(to: point(18, 4.9))
            rightSeam.addCurve(
                to: point(14, 12),
                control1: point(15.5, 7.1),
                control2: point(14, 9.5)
            )
            rightSeam.addCurve(
                to: point(18, 19.1),
                control1: point(14, 14.5),
                control2: point(15.5, 16.9)
            )
            context.stroke(rightSeam, with: .color(color), lineWidth: 1.5 * scale)
        }
        .accessibilityHidden(true)
    }
}

private struct SearchSheet: View {
    @Bindable var store: OpenCourtsStore
    @Environment(\.dismiss) private var dismiss
    @FocusState private var searchFocused: Bool

    var body: some View {
        NavigationStack {
            VStack(spacing: 14) {
                HStack {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)
                    TextField("City, ZIP code, or address", text: $store.query)
                        .textInputAutocapitalization(.words)
                        .submitLabel(.search)
                        .focused($searchFocused)
                        .onSubmit { Task { await submit() } }
                        .task(id: store.query) {
                            try? await Task.sleep(for: .milliseconds(500))
                            guard !Task.isCancelled else { return }
                            await store.updateSuggestions()
                        }
                    if store.isLoading {
                        ProgressView().controlSize(.small)
                    }
                    Button("Search", systemImage: "arrow.right") {
                        Task { await submit() }
                    }
                    .labelStyle(.iconOnly)
                }
                .padding(13)
                .background(Brand.surface, in: RoundedRectangle(cornerRadius: 12))
                .overlay { RoundedRectangle(cornerRadius: 12).stroke(.separator) }

                if let error = store.errorMessage {
                    Label(error, systemImage: "exclamationmark.triangle")
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                ScrollView {
                    LazyVStack(spacing: 0) {
                        ForEach(store.suggestions) { suggestion in
                            Button {
                                Task {
                                    await store.select(suggestion)
                                    dismiss()
                                }
                            } label: {
                                HStack(spacing: 12) {
                                    Image(systemName: "mappin.circle.fill")
                                        .foregroundStyle(Brand.accent)
                                    VStack(alignment: .leading, spacing: 3) {
                                        Text(suggestion.title).fontWeight(.semibold)
                                        Text(suggestion.detail)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(.tertiary)
                                }
                                .padding(.vertical, 11)
                                .contentShape(Rectangle())
                            }
                            .buttonStyle(.plain)
                            Divider()
                        }
                    }
                }

                VStack(alignment: .leading, spacing: 10) {
                    Label(store.place.label, systemImage: "mappin.and.ellipse")
                        .font(.footnote)
                        .foregroundStyle(.secondary)
                    Button("Use my current location", systemImage: "location.fill") {
                        store.requestLocation()
                        dismiss()
                    }
                    .buttonStyle(.borderedProminent)
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
            }
            .padding(20)
            .navigationTitle("Find courts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { searchFocused = true }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    private func submit() async {
        await store.submitSearch()
        if store.errorMessage == nil {
            dismiss()
        }
    }
}

private enum ExploreMode {
    case map
    case list
}

private struct ExploreSection: View {
    @Bindable var store: OpenCourtsStore
    let mode: ExploreMode
    @State private var filtersPresented = false

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            SectionHeading(kicker: "EXPLORE", title: "Courts near you.", detail: "\(store.filteredCourts.count) courts around \(store.place.label)")

            HStack(spacing: 12) {
                Button("Filters", systemImage: "slider.horizontal.3") {
                    filtersPresented = true
                }
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 13)
                .padding(.vertical, 9)
                .background(Brand.background, in: Capsule())
                .overlay { Capsule().stroke(.separator.opacity(0.55), lineWidth: 0.7) }

                Spacer()

                if mode == .list {
                    Picker("Sort", selection: $store.sort) {
                        ForEach(CourtSort.allCases) { Text($0.rawValue).tag($0) }
                    }
                    .font(.subheadline.weight(.semibold))
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(Brand.background, in: Capsule())
                }
            }
            .sheet(isPresented: $filtersPresented) { FilterSheet(store: store) }

            if store.isLoading && store.courts.isEmpty {
                ProgressView("Finding nearby courts…")
                    .frame(maxWidth: .infinity)
                    .padding()
            } else if mode == .map {
                ExploreMapView(store: store)
            } else {
                CourtListView(store: store)
            }
        }
        .padding(20)
        .background(Brand.surface)
        .sheet(item: $store.selectedCourt) { court in
            CourtDetail(court: court, rain: store.rain.first { $0.courtId == court.id }, store: store)
        }
    }
}

private struct ExploreMapView: View {
    @Bindable var store: OpenCourtsStore
    @State private var selectedID: String?
    @State private var previewCourt: Court?
    @State private var selectedAlert: WeatherAlert?

    var body: some View {
        Map(
            initialPosition: .region(
                .init(
                    center: .init(latitude: store.place.lat, longitude: store.place.lon),
                    span: .init(latitudeDelta: 0.10, longitudeDelta: 0.10)
                )
            ),
            selection: $selectedID
        ) {
            Marker("Search center", coordinate: .init(latitude: store.place.lat, longitude: store.place.lon))
                .tint(.orange)
            ForEach(store.filteredCourts) { court in
                Marker(court.name, systemImage: "tennisball.fill", coordinate: .init(latitude: court.lat, longitude: court.lon))
                    .tint(court.lighting == .yes ? Brand.accent : court.lighting == .no ? .gray : Color.gray.opacity(0.55))
                    .tag(court.id)
            }
        }
        .mapControls { MapCompass(); MapScaleView() }
        .mapStyle(.standard(pointsOfInterest: .excludingAll))
        .id("\(store.place.lat),\(store.place.lon)")
        .frame(height: 520)
        .clipShape(RoundedRectangle(cornerRadius: 18))
        .overlay(alignment: .topLeading) {
            VStack(alignment: .leading, spacing: 8) {
                MapLegend()
                if let alert = store.alerts.first {
                    MapAdvisoryBanner(alert: alert) {
                        selectedAlert = alert
                    }
                }
            }
            .padding(10)
        }
        .overlay(alignment: .bottom) {
            if let previewCourt {
                MapCourtPreview(court: previewCourt, place: store.place) {
                    store.selectedCourt = previewCourt
                }
                .padding(12)
                .padding(.bottom, 92)
                .transition(.move(edge: .bottom).combined(with: .opacity))
            }
        }
        .shadow(color: .black.opacity(0.10), radius: 12, y: 5)
        .onChange(of: selectedID) { _, value in
            withAnimation(.spring(response: 0.32, dampingFraction: 0.86)) {
                previewCourt = store.courts.first { $0.id == value }
            }
        }
        .onChange(of: store.place) {
            selectedID = nil
            previewCourt = nil
        }
        .sheet(item: $selectedAlert) { alert in
            WeatherAdvisoryDetail(alert: alert)
        }
    }
}

private struct MapCourtPreview: View {
    let court: Court
    let place: Place
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 13) {
                Image(systemName: "tennisball.fill")
                    .font(.title2)
                    .foregroundStyle(Brand.green)
                    .frame(width: 46, height: 46)
                    .background(Brand.lime, in: Circle())

                VStack(alignment: .leading, spacing: 4) {
                    Text(court.name)
                        .font(.headline)
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    HStack(spacing: 8) {
                        Label(
                            "\(court.distance(from: place).formatted(.number.precision(.fractionLength(1)))) mi",
                            systemImage: "location.fill"
                        )
                        Label(
                            court.lighting == .yes ? "Lighted" : court.lighting == .no ? "Unlighted" : "Unknown",
                            systemImage: court.lighting == .yes ? "lightbulb.fill" : "lightbulb.slash"
                        )
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer(minLength: 4)

                Image(systemName: "chevron.right")
                    .font(.subheadline.weight(.bold))
                    .foregroundStyle(Brand.accent)
                    .frame(width: 32, height: 32)
                    .background(Brand.accent.opacity(0.12), in: Circle())
            }
            .padding(12)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 17))
            .overlay {
                RoundedRectangle(cornerRadius: 17)
                    .stroke(.white.opacity(0.55), lineWidth: 0.7)
            }
            .shadow(color: .black.opacity(0.16), radius: 10, y: 5)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens full court details")
    }
}

private struct MapAdvisoryBanner: View {
    let alert: WeatherAlert
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: "exclamationmark.triangle.fill")
                    .font(.headline)
                    .foregroundStyle(.orange)
                    .frame(width: 34, height: 34)
                    .background(.orange.opacity(0.14), in: Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text(alert.event)
                        .font(.caption.weight(.bold))
                        .foregroundStyle(.primary)
                        .lineLimit(1)
                    Text(alert.severity)
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(.orange)
                }

                Spacer(minLength: 5)

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
            }
            .padding(9)
            .frame(maxWidth: 285)
            .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 13))
            .overlay {
                RoundedRectangle(cornerRadius: 13)
                    .stroke(.orange.opacity(0.32), lineWidth: 0.8)
            }
            .shadow(color: .black.opacity(0.12), radius: 7, y: 3)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Opens weather advisory details")
    }
}

private struct WeatherAdvisoryDetail: View {
    let alert: WeatherAlert
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    HStack(spacing: 13) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .font(.title2)
                            .foregroundStyle(.orange)
                            .frame(width: 50, height: 50)
                            .background(.orange.opacity(0.14), in: Circle())

                        VStack(alignment: .leading, spacing: 4) {
                            Text(alert.severity)
                                .font(.caption.weight(.bold))
                                .foregroundStyle(.orange)
                            Text(alert.event)
                                .font(.title2.weight(.bold))
                        }
                    }

                    Text(alert.headline)
                        .font(.body)

                    VStack(alignment: .leading, spacing: 12) {
                        Label(alert.area, systemImage: "map.fill")
                        if let effective = alert.effective {
                            Label("Effective: \(effective)", systemImage: "clock.fill")
                        }
                        if let ends = alert.ends {
                            Label("Ends: \(ends)", systemImage: "clock.badge.checkmark.fill")
                        }
                    }
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(16)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Brand.surface, in: RoundedRectangle(cornerRadius: 16))

                    if let url = alert.url {
                        Link(destination: url) {
                            Label("View official advisory", systemImage: "arrow.up.right.square")
                                .font(.headline)
                                .foregroundStyle(.white)
                                .frame(maxWidth: .infinity, minHeight: 50)
                                .background(.orange, in: RoundedRectangle(cornerRadius: 14))
                        }
                    }

                    Label(
                        "Conditions can change quickly. Follow official guidance before traveling or playing.",
                        systemImage: "info.circle"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding(20)
            }
            .navigationTitle("Weather advisory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }
}

private struct MapLegend: View {
    var body: some View {
        HStack(spacing: 9) {
            MapLegendRow(color: Brand.accent, label: "Lighted")
            MapLegendRow(color: .gray, label: "Unlighted")
            MapLegendRow(color: .gray.opacity(0.55), label: "Unknown")
            MapLegendRow(color: .orange, label: "Center", systemImage: "mappin.circle.fill")
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 10))
        .overlay {
            RoundedRectangle(cornerRadius: 10)
                .stroke(.separator.opacity(0.65), lineWidth: 0.5)
        }
        .shadow(color: .black.opacity(0.12), radius: 5, y: 2)
    }
}

private struct MapLegendRow: View {
    let color: Color
    let label: LocalizedStringKey
    var systemImage = "tennisball.fill"

    var body: some View {
        Label {
            Text(label)
                .font(.caption2.weight(.semibold))
                .lineLimit(1)
                .minimumScaleFactor(0.75)
        } icon: {
            Image(systemName: systemImage)
                .foregroundStyle(color)
                .frame(width: 16)
        }
    }
}

private struct CourtListView: View {
    @Bindable var store: OpenCourtsStore

    var body: some View {
        LazyVStack(spacing: 14) {
            ForEach(store.filteredCourts) { court in
                CourtRow(
                    court: court,
                    place: store.place,
                    rain: store.rain.first { $0.courtId == court.id }
                ) {
                    store.selectedCourt = court
                }
            }
        }
    }
}

private struct FilterSheet: View {
    @Bindable var store: OpenCourtsStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section("Amenities") {
                    Toggle("Lights listed", isOn: $store.lightedOnly)
                    Toggle("Public access listed", isOn: $store.publicOnly)
                }
                Section("Distance") {
                    Picker("Radius", selection: $store.radius) {
                        ForEach(SearchRadius.allCases) { Text($0.rawValue).tag($0) }
                    }
                }
                Section("Surface") {
                    Picker("Surface", selection: $store.surface) {
                        ForEach(store.surfaces, id: \.self) { Text($0.replacingOccurrences(of: "_", with: " ")).tag($0) }
                    }
                }
                Button("Reset filters") {
                    store.lightedOnly = false; store.publicOnly = false; store.radius = .all; store.surface = "Any surface"
                }
            }
            .navigationTitle("Court filters")
            .toolbar { ToolbarItem(placement: .confirmationAction) { Button("Done") { dismiss() } } }
        }
        .presentationDetents([.medium, .large])
    }
}

private struct CourtRow: View {
    let court: Court
    let place: Place
    let rain: RainAssessment?
    let action: () -> Void
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 14) {
                HStack(alignment: .top, spacing: 12) {
                    Image(systemName: "tennisball.fill")
                        .font(.title2)
                        .foregroundStyle(Brand.green)
                        .frame(width: 46, height: 46)
                        .background(Brand.lime, in: Circle())

                    VStack(alignment: .leading, spacing: 4) {
                        Text(court.name)
                            .font(.headline)
                            .foregroundStyle(.primary)
                            .lineLimit(2)
                        Text(court.contextName ?? court.address ?? "Location details unavailable")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 6)

                    VStack(alignment: .trailing, spacing: 3) {
                        Text(court.distance(from: place), format: .number.precision(.fractionLength(1)))
                            .font(.headline.weight(.bold))
                            .foregroundStyle(colorScheme == .dark ? Brand.lime : Brand.green)
                        Text("MILES")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(colorScheme == .dark ? .white.opacity(0.78) : .secondary)
                    }
                }

                HStack(spacing: 7) {
                    CourtBadge(
                        text: court.lighting == .yes ? "Lighted" : court.lighting == .no ? "Unlighted" : "Lights unknown",
                        systemImage: court.lighting == .yes ? "lightbulb.fill" : "lightbulb.slash"
                    )
                    CourtBadge(
                        text: court.courts.map { "\($0) courts" } ?? "Court",
                        systemImage: "square.grid.2x2"
                    )
                    if let rain {
                        CourtBadge(
                            text: rain.score >= 70 ? "Likely dry" : "Check surface",
                            systemImage: rain.score >= 70 ? "sun.max.fill" : "cloud.rain.fill",
                            emphasized: rain.score >= 70
                        )
                    }
                }

                HStack {
                    Label(
                        court.access == .publicAccess ? "Public access listed" : "Access not confirmed",
                        systemImage: "person.2.fill"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)

                    Spacer()

                    Image(systemName: "arrow.up.right")
                        .font(.caption.weight(.bold))
                        .foregroundStyle(Brand.accent)
                }
            }
            .padding(16)
            .background(Brand.background, in: RoundedRectangle(cornerRadius: 18))
            .overlay {
                RoundedRectangle(cornerRadius: 18)
                    .stroke(.separator.opacity(0.5), lineWidth: 0.7)
            }
            .shadow(color: .black.opacity(0.06), radius: 10, y: 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }
}

private struct CourtBadge: View {
    let text: String
    let systemImage: String
    var emphasized = false
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Label(text, systemImage: systemImage)
            .font(.caption2.weight(.semibold))
            .lineLimit(1)
            .padding(.horizontal, 8)
            .padding(.vertical, 6)
            .foregroundStyle(emphasized ? (colorScheme == .dark ? Brand.green : Brand.green) : .primary)
            .background(
                emphasized ? Brand.lime : Brand.surface,
                in: Capsule()
            )
    }
}

private struct CourtDetail: View {
    let court: Court
    let rain: RainAssessment?
    let store: OpenCourtsStore
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 18) {
                    CourtDetailHero(
                        name: court.name,
                        location: court.contextName ?? court.address ?? "Address not listed",
                        distance: court.distance(from: store.place),
                        lighting: court.lighting
                    )
                    CourtAmenityCard(court: court)
                    if let rain {
                        CourtRainCard(rain: rain)
                    }
                    CourtDetailActions(
                        sourceURL: court.sourceURL,
                        directionsAction: { store.directions(to: court) }
                    )
                }
                .padding(.horizontal, 18)
                .padding(.top, 8)
                .padding(.bottom, 28)
            }
            .background(Brand.surface)
            .navigationTitle("Court details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .fontWeight(.semibold)
                }
            }
        }
        .presentationDetents([.fraction(0.68), .large])
        .presentationDragIndicator(.visible)
        .presentationCornerRadius(28)
    }
}

private struct CourtDetailHero: View {
    let name: String
    let location: String
    let distance: Double
    let lighting: Court.Lighting

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            HStack(alignment: .top, spacing: 14) {
                Image(systemName: "tennisball.fill")
                    .font(.title.weight(.semibold))
                    .foregroundStyle(Brand.green)
                    .frame(width: 58, height: 58)
                    .background(Brand.lime, in: Circle())

                VStack(alignment: .leading, spacing: 5) {
                    Text(name)
                        .font(.title2.weight(.bold))
                        .foregroundStyle(.white)
                    Text(location)
                        .font(.subheadline)
                        .foregroundStyle(.white.opacity(0.72))
                }
            }

            HStack(spacing: 12) {
                Label {
                    Text(distance, format: .number.precision(.fractionLength(1)))
                    + Text(" mi away")
                } icon: {
                    Image(systemName: "location.fill")
                }
                Spacer()
                Label(
                    lighting == .yes ? "Lighted" : lighting == .no ? "Unlighted" : "Lights unknown",
                    systemImage: lighting == .yes ? "lightbulb.fill" : "lightbulb.slash.fill"
                )
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white.opacity(0.9))
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Brand.green, Brand.green.opacity(0.84)],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 22)
        )
        .shadow(color: Brand.green.opacity(0.22), radius: 16, y: 8)
    }
}

private struct CourtAmenityCard: View {
    let court: Court

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("COURT FEATURES")
                .font(.caption2.weight(.bold))
                .tracking(1.3)
                .foregroundStyle(Brand.accent)

            HStack(spacing: 10) {
                CourtFeature(
                    title: court.access == .publicAccess ? "Public" : "Access unknown",
                    systemImage: "person.2.fill"
                )
                CourtFeature(
                    title: court.courts.map { "\($0) courts" } ?? "Court count unknown",
                    systemImage: "square.grid.2x2.fill"
                )
            }

            HStack(spacing: 10) {
                CourtFeature(
                    title: court.surface?.replacingOccurrences(of: "_", with: " ") ?? "Surface unknown",
                    systemImage: "square.fill"
                )
                CourtFeature(
                    title: court.sheltered ? "Sheltered" : "Outdoor",
                    systemImage: court.sheltered ? "umbrella.fill" : "sun.max.fill"
                )
            }
        }
        .padding(18)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(.separator.opacity(0.55), lineWidth: 0.7)
        }
    }
}

private struct CourtFeature: View {
    let title: String
    let systemImage: String

    var body: some View {
        Label(title, systemImage: systemImage)
            .font(.subheadline.weight(.medium))
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .padding(.horizontal, 12)
            .background(Brand.surface, in: RoundedRectangle(cornerRadius: 12))
    }
}

private struct CourtRainCard: View {
    let rain: RainAssessment

    var body: some View {
        HStack(spacing: 16) {
            ZStack {
                Circle()
                    .stroke(Brand.accent.opacity(0.18), lineWidth: 7)
                Circle()
                    .trim(from: 0, to: Double(rain.score) / 100)
                    .stroke(Brand.accent, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(rain.score)")
                    .font(.title3.weight(.bold))
            }
            .frame(width: 72, height: 72)

            VStack(alignment: .leading, spacing: 5) {
                Label("RECENT PRECIPITATION", systemImage: "cloud.rain.fill")
                    .font(.caption2.weight(.bold))
                    .tracking(1.1)
                    .foregroundStyle(Brand.accent)
                Text(rain.summary)
                    .font(.headline)
                Text("Radar confidence: \(rain.confidence)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer(minLength: 0)
        }
        .padding(18)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(.separator.opacity(0.55), lineWidth: 0.7)
        }
    }
}

private struct CourtDetailActions: View {
    let sourceURL: URL
    let directionsAction: () -> Void
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 12) {
            Button("Get directions", systemImage: "arrow.triangle.turn.up.right.diamond.fill", action: directionsAction)
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity, minHeight: 52)
                .background(Brand.accent, in: RoundedRectangle(cornerRadius: 15))

            Link(destination: sourceURL) {
                Label("View source on OpenStreetMap", systemImage: "arrow.up.right.square")
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(.secondary)
            }
        }
    }
}

private struct RainPlannerSection: View {
    let store: OpenCourtsStore

    var body: some View {
        VStack(alignment: .leading, spacing: 18) {
            SectionHeading(
                kicker: "RECENT PRECIPITATION · NEARBY COURTS",
                title: "Your best bets for a dry court.",
                detail: "Radar estimates are compared across nearby public courts."
            )

            ForEach(Array(store.rainRecommendations.enumerated()), id: \.element.0.id) { index, item in
                DryCourtCard(
                    rank: index + 1,
                    court: item.0,
                    rain: item.1,
                    distance: item.0.distance(from: store.place),
                    directionsAction: { store.directions(to: item.0) }
                )
            }

            if store.rainRecommendations.isEmpty {
                WeatherEmptyCard(
                    isLoading: store.isLoading,
                    loadingText: "Checking recent rainfall near public courts…",
                    emptyText: "No consistent radar readings are available right now."
                )
            }

            Label(
                "Radar cannot confirm shade, drainage, or the court’s current surface. Check conditions before you go.",
                systemImage: "info.circle"
            )
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(20)
    }
}

private struct DryCourtCard: View {
    let rank: Int
    let court: Court
    let rain: RainAssessment
    let distance: Double
    let directionsAction: () -> Void
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(alignment: .top, spacing: 13) {
                ZStack {
                    Circle()
                        .stroke(Brand.accent.opacity(0.17), lineWidth: 7)
                    Circle()
                        .trim(from: 0, to: Double(rain.score) / 100)
                        .stroke(Brand.accent, style: StrokeStyle(lineWidth: 7, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                    Text("\(rain.score)")
                        .font(.title3.weight(.bold))
                        .foregroundStyle(colorScheme == .dark ? Brand.lime : Brand.green)
                }
                .frame(width: 68, height: 68)

                VStack(alignment: .leading, spacing: 5) {
                    HStack(spacing: 7) {
                        Label(
                            rank == 1 ? "BEST OPTION" : "TOP PICK \(rank)",
                            systemImage: rank == 1 ? "trophy.fill" : "medal.fill"
                        )
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(rank == 1 ? (colorScheme == .dark ? Brand.lime : Brand.green) : Brand.accent)
                    }
                    Text(court.name)
                        .font(.headline)
                        .lineLimit(2)
                    Label(
                        "\(distance.formatted(.number.precision(.fractionLength(1)))) mi away",
                        systemImage: "location.fill"
                    )
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer(minLength: 4)

                Image(systemName: rain.score >= 70 ? "sun.max.fill" : "cloud.sun.fill")
                    .font(.title2)
                    .foregroundStyle(rain.score >= 70 ? .orange : Brand.accent)
            }

            Text(rain.score >= 70 ? "Likely dry" : "Check the surface")
                .font(.subheadline.weight(.bold))
                .foregroundStyle(surfaceStatusColor)

            RainfallTimeline(rain: rain)

            ViewThatFits(in: .horizontal) {
                HStack(spacing: 8) {
                    courtBadges
                    Spacer(minLength: 0)
                    directionsButton
                }

                VStack(alignment: .trailing, spacing: 10) {
                    HStack(spacing: 8) {
                        courtBadges
                        Spacer(minLength: 0)
                    }
                    directionsButton
                }
            }
        }
        .padding(17)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 20))
        .overlay {
            RoundedRectangle(cornerRadius: 20)
                .stroke(rank == 1 ? Brand.accent.opacity(0.55) : Color.secondary.opacity(0.18), lineWidth: rank == 1 ? 1.2 : 0.7)
        }
        .shadow(color: .black.opacity(rank == 1 ? 0.10 : 0.05), radius: 12, y: 5)
    }

    @ViewBuilder
    private var courtBadges: some View {
        CourtBadge(
            text: court.lighting == .yes ? "Lighted" : court.lighting == .no ? "Unlighted" : "Lights unknown",
            systemImage: court.lighting == .yes ? "lightbulb.fill" : "lightbulb.slash"
        )
        if let count = court.courts {
            CourtBadge(text: "\(count) courts", systemImage: "square.grid.2x2")
        }
    }

    private var directionsButton: some View {
        Button(action: directionsAction) {
            Label("Directions", systemImage: "arrow.triangle.turn.up.right.diamond.fill")
                .font(.caption.weight(.bold))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
                .foregroundStyle(Brand.green)
                .padding(.horizontal, 13)
                .padding(.vertical, 8)
                .background(Brand.lime, in: Capsule())
        }
        .buttonStyle(.plain)
        .fixedSize(horizontal: true, vertical: false)
    }

    private var surfaceStatusColor: Color {
        if rain.score >= 70 {
            return colorScheme == .dark ? Brand.lime : Brand.green
        }

        return colorScheme == .dark
            ? Color(red: 1.0, green: 0.72, blue: 0.28)
            : Color(red: 0.70, green: 0.30, blue: 0.0)
    }
}

private struct RainfallTimeline: View {
    let rain: RainAssessment

    var body: some View {
        HStack(spacing: 8) {
            RainAmountPill(period: "1H", amount: rain.rain1h)
            RainAmountPill(period: "3H", amount: rain.rain3h)
            RainAmountPill(period: "6H", amount: rain.rain6h)
        }
    }
}

private struct RainAmountPill: View {
    let period: LocalizedStringKey
    let amount: Double?

    var body: some View {
        VStack(spacing: 3) {
            Label {
                Text(period)
            } icon: {
                Image(systemName: "drop.fill")
                    .foregroundStyle(.blue)
            }
            .font(.caption2.weight(.bold))
            Text(amount.map { "\($0.formatted(.number.precision(.fractionLength(3)))) in" } ?? "—")
                .font(.caption.weight(.semibold))
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 9)
        .background(Brand.surface, in: RoundedRectangle(cornerRadius: 11))
    }
}

private struct WeatherSection: View {
    let store: OpenCourtsStore
    @State private var hourlyForecastExpanded = true

    private var daytime: [Forecast] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: store.weatherTimeZone) ?? .current
        return WeatherWinterCaution.applying(to: store.forecasts).filter { forecast in
            guard let date = ISO8601DateFormatter().date(from: forecast.time) else { return false }
            let hour = calendar.component(.hour, from: date)
            return hour >= 8 && hour <= 18
        }
    }

    private var dailyBest: [DailyBestForecast] {
        DailyForecastPlanner.bestByDay(from: daytime, timeZoneIdentifier: store.weatherTimeZone)
    }

    private var forecastWindows: [ForecastWindow] {
        ForecastWindowPlanner.windows(from: daytime, timeZoneIdentifier: store.weatherTimeZone)
    }

    private var bestForecast: Forecast? {
        dailyBest.max { $0.score < $1.score }?.forecast
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            SectionHeading(
                kicker: "7-DAY WEATHER",
                title: "Plan the perfect time to play.",
                detail: "\(store.place.label) · daylight forecast windows"
            )

            if let current = store.forecasts.first {
                CurrentWeatherHero(forecast: current, location: store.place.label)
            }

            if let bestForecast {
                BestPlayWindowCard(forecast: bestForecast)
            }

            ForEach(store.alerts.prefix(2)) { alert in
                WeatherAlertCard(alert: alert)
            }

            if !dailyBest.isEmpty {
                HStack {
                    Text("BEST TENNIS WINDOWS")
                        .font(.caption2.weight(.bold))
                        .tracking(1.2)
                        .foregroundStyle(Brand.accent)
                    Spacer()
                    Text("Best daylight hour each day")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                VStack(spacing: 10) {
                    ForEach(dailyBest) { item in
                        DailyBestForecastRow(
                            item: item,
                            isBestOverall: item.forecast.id == bestForecast?.id
                        )
                    }
                }

                Button {
                    withAnimation(.easeInOut(duration: 0.22)) {
                        hourlyForecastExpanded.toggle()
                    }
                } label: {
                    Label(
                        hourlyForecastExpanded ? "Hide forecast windows" : "View forecast windows",
                        systemImage: hourlyForecastExpanded ? "chevron.up" : "clock"
                    )
                    .font(.subheadline.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 12)
                    .background(Brand.background, in: RoundedRectangle(cornerRadius: 14))
                    .overlay {
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(.separator.opacity(0.55), lineWidth: 0.7)
                    }
                }
                .buttonStyle(.plain)

                if hourlyForecastExpanded {
                    VStack(alignment: .leading, spacing: 10) {
                        Text("DAYLIGHT FORECAST WINDOWS")
                            .font(.caption2.weight(.bold))
                            .tracking(1.2)
                            .foregroundStyle(Brand.accent)

                        LazyVGrid(
                            columns: [
                                GridItem(.flexible(), spacing: 10),
                                GridItem(.flexible(), spacing: 10)
                            ],
                            spacing: 10
                        ) {
                            ForEach(forecastWindows) { window in
                                ForecastWindowCard(window: window)
                            }
                        }
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            } else {
                WeatherEmptyCard(
                    isLoading: store.isLoading,
                    loadingText: "Loading the local forecast…",
                    emptyText: "Forecast data is unavailable right now."
                )
            }

            Label(
                "Play scores combine temperature, wind, rain probability, and winter risk.",
                systemImage: "info.circle"
            )
            .font(.caption)
            .foregroundStyle(.secondary)
        }
        .padding(20)
        .background(Brand.surface)
    }
}

private struct CurrentWeatherHero: View {
    let forecast: Forecast
    let location: String

    var body: some View {
        HStack(spacing: 16) {
            Image(systemName: WeatherSymbol.name(for: forecast))
                .font(.system(.largeTitle, design: .rounded, weight: .semibold))
                .symbolRenderingMode(.multicolor)
                .frame(width: 64, height: 64)
                .background(.white.opacity(0.14), in: Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text(location)
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.72))
                    .lineLimit(1)
                Text("\(Int(forecast.temp.rounded()))°")
                    .font(.system(.largeTitle, design: .rounded, weight: .bold))
                    .foregroundStyle(.white)
                Text(forecast.short)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white.opacity(0.9))
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 10) {
                Label("\(Int(forecast.precip.rounded()))%", systemImage: "drop.fill")
                Label("\(Int(forecast.wind.rounded())) mph", systemImage: "wind")
                if let humidity = forecast.humidity {
                    Label("\(Int(humidity.rounded()))%", systemImage: "humidity.fill")
                }
            }
            .font(.caption.weight(.semibold))
            .foregroundStyle(.white.opacity(0.9))
        }
        .padding(20)
        .background(
            LinearGradient(
                colors: [Brand.green, Brand.accent],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            ),
            in: RoundedRectangle(cornerRadius: 22)
        )
        .shadow(color: Brand.green.opacity(0.20), radius: 16, y: 7)
    }
}

private struct BestPlayWindowCard: View {
    let forecast: Forecast

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: "figure.tennis")
                .font(.title2.weight(.semibold))
                .foregroundStyle(Brand.green)
                .frame(width: 50, height: 50)
                .background(Brand.lime, in: Circle())

            VStack(alignment: .leading, spacing: 4) {
                Text("BEST TIME TO PLAY")
                    .font(.caption2.weight(.bold))
                    .tracking(1.1)
                    .foregroundStyle(Brand.accent)
                Text(ForecastDate.label(for: forecast.time))
                    .font(.headline)
                Text("\(forecast.short) · \(Int(forecast.temp.rounded()))°F")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            PlayScoreDisplay(score: WeatherPlayScore.value(for: forecast))
        }
        .padding(16)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .stroke(Brand.accent.opacity(0.35), lineWidth: 0.8)
        }
    }
}

private struct DailyBestForecast: Identifiable {
    let day: Date
    let forecast: Forecast
    let score: Int

    var id: String { forecast.id }
}

private enum WeatherWinterCaution {
    private struct Lingering {
        let type: String
        var until: Date
        var warmHours: Double
    }

    static func applying(to forecasts: [Forecast]) -> [Forecast] {
        guard !forecasts.contains(where: { $0.winterCaution != nil }) else { return forecasts }

        var lingering: Lingering?
        var previousEnd = Date.distantPast
        let ordered = forecasts.sorted { $0.time < $1.time }
        return ordered.map { forecast in
            guard let start = ISO8601DateFormatter().date(from: forecast.time) else { return forecast }
            let end = forecast.endTime.flatMap { ISO8601DateFormatter().date(from: $0) }
                ?? start.addingTimeInterval(60 * 60)
            guard end > start else { return forecast }

            if let active = lingering,
               (start >= active.until || start.timeIntervalSince(previousEnd) > 90 * 60) {
                lingering = nil
            }
            previousEnd = end

            if let winterRisk = forecast.winterRisk {
                let type = winterRisk == "ice" || lingering?.type == "ice" ? "ice" : "snow"
                lingering = Lingering(
                    type: type,
                    until: max(lingering?.until ?? .distantPast, end.addingTimeInterval((type == "ice" ? 36 : 24) * 60 * 60)),
                    warmHours: 0
                )
                return forecast.withWinterCaution(type: type, lingering: false)
            }

            guard var active = lingering else { return forecast }
            let warmThreshold = active.type == "ice" ? 50.0 : 45.0
            let warm = forecast.temp.isFinite && forecast.temp >= warmThreshold
                && forecast.precip.isFinite && forecast.precip < 20
            let hours = min(2, max(0, end.timeIntervalSince(start) / 60 / 60))
            active.warmHours = warm ? active.warmHours + hours : 0
            if active.warmHours >= 6 {
                lingering = nil
                return forecast
            }
            lingering = active
            return forecast.withWinterCaution(type: active.type, lingering: true)
        }
    }
}

private extension Forecast {
    func withWinterCaution(type: String, lingering: Bool) -> Forecast {
        Forecast(
            time: time,
            endTime: endTime,
            temp: temp,
            wind: wind,
            precip: precip,
            humidity: humidity,
            heatIndex: heatIndex,
            winterRisk: winterRisk,
            winterCaution: WinterCaution(type: type, lingering: lingering),
            short: short,
            icon: icon
        )
    }
}

private enum DailyForecastPlanner {
    static func bestByDay(from forecasts: [Forecast], timeZoneIdentifier: String) -> [DailyBestForecast] {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: timeZoneIdentifier) ?? .current
        var bestForecasts: [Date: Forecast] = [:]

        for forecast in forecasts {
            guard let date = ISO8601DateFormatter().date(from: forecast.time) else { continue }
            let day = calendar.startOfDay(for: date)
            if let current = bestForecasts[day],
               WeatherPlayScore.value(for: current) >= WeatherPlayScore.value(for: forecast) {
                continue
            }
            bestForecasts[day] = forecast
        }

        return bestForecasts
            .map { day, forecast in
                DailyBestForecast(
                    day: day,
                    forecast: forecast,
                    score: WeatherPlayScore.value(for: forecast)
                )
            }
            .sorted { $0.day < $1.day }
    }
}

private struct DailyBestForecastRow: View {
    let item: DailyBestForecast
    let isBestOverall: Bool

    var body: some View {
        HStack(spacing: 13) {
            Image(systemName: WeatherSymbol.name(for: item.forecast))
                .font(.title2)
                .symbolRenderingMode(.multicolor)
                .frame(width: 46, height: 46)
                .background(Brand.surface, in: Circle())

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 7) {
                    Text(item.day, format: .dateTime.weekday(.wide).month(.abbreviated).day())
                        .font(.subheadline.weight(.bold))
                    if isBestOverall {
                        Text("BEST OVERALL")
                            .font(.system(size: 8, weight: .bold))
                            .foregroundStyle(Brand.green)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 3)
                            .background(Brand.lime, in: Capsule())
                    }
                }

                Text("Best around \(ForecastDate.timeLabel(for: item.forecast.time)) · \(Int(item.forecast.temp.rounded()))°F")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                HStack(spacing: 10) {
                    Label("\(Int(item.forecast.precip.rounded()))%", systemImage: "drop.fill")
                    Label("\(Int(item.forecast.wind.rounded())) mph", systemImage: "wind")
                }
                .font(.caption2)
                .foregroundStyle(.secondary)
            }

            Spacer(minLength: 4)

            PlayScoreDisplay(score: item.score)
        }
        .padding(14)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 17))
        .overlay {
            RoundedRectangle(cornerRadius: 17)
                .stroke(
                    isBestOverall ? Brand.accent.opacity(0.5) : Color.secondary.opacity(0.16),
                    lineWidth: isBestOverall ? 1.1 : 0.7
                )
        }
    }
}

private struct PlayScoreDisplay: View {
    let score: Int
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        VStack(spacing: 2) {
            Text("\(score)")
                .font(.title2.weight(.heavy))
                .foregroundStyle(scoreColor)
            Text("SCORE")
                .font(.system(size: 8, weight: .bold))
                .foregroundStyle(.primary.opacity(0.68))
        }
        .frame(width: 62, height: 58)
        .background(scoreColor.opacity(colorScheme == .dark ? 0.14 : 0.10), in: RoundedRectangle(cornerRadius: 13))
    }

    private var scoreColor: Color {
        if colorScheme == .dark {
            if score >= 80 {
                return Color(red: 213/255, green: 243/255, blue: 106/255)
            }
            if score >= 60 {
                return Color(red: 255/255, green: 190/255, blue: 82/255)
            }
            return Color(red: 255/255, green: 118/255, blue: 111/255)
        }

        if score >= 80 {
            return Color(red: 69/255, green: 103/255, blue: 38/255)
        }
        if score >= 60 {
            return Color(red: 151/255, green: 88/255, blue: 0)
        }
        return Color(red: 181/255, green: 55/255, blue: 50/255)
    }
}

private struct ForecastWindow: Identifiable {
    let forecasts: [Forecast]

    var id: String { forecasts[0].id }
    var representative: Forecast { forecasts[0] }
    var score: Int {
        guard let first = forecasts.first else { return 0 }
        guard forecasts.count > 1 else { return WeatherPlayScore.value(for: first) }

        let averageHumidity = forecasts.compactMap(\.humidity)
        let combined = Forecast(
            time: first.time,
            endTime: forecasts.last?.endTime,
            temp: forecasts.map(\.temp).reduce(0, +) / Double(forecasts.count),
            wind: forecasts.map(\.wind).reduce(0, +) / Double(forecasts.count),
            precip: forecasts.map(\.precip).reduce(0, +) / Double(forecasts.count),
            humidity: averageHumidity.count == forecasts.count
                ? averageHumidity.reduce(0, +) / Double(averageHumidity.count)
                : nil,
            heatIndex: nil,
            winterRisk: forecasts.first(where: { $0.winterRisk != nil })?.winterRisk,
            winterCaution: forecasts.first(where: { $0.winterCaution != nil })?.winterCaution,
            short: first.short,
            icon: first.icon
        )
        return WeatherPlayScore.value(for: combined)
    }
    var averageTemperature: Double {
        forecasts.map(\.temp).reduce(0, +) / Double(forecasts.count)
    }
    var maximumRainChance: Double { forecasts.map(\.precip).max() ?? 0 }
    var maximumWind: Double { forecasts.map(\.wind).max() ?? 0 }
}

private enum ForecastWindowPlanner {
    static func windows(from forecasts: [Forecast], timeZoneIdentifier: String) -> [ForecastWindow] {
        let sorted = forecasts.sorted { $0.time < $1.time }
        var groups: [[Forecast]] = []

        for forecast in sorted {
            if let lastGroup = groups.last,
               let previous = lastGroup.last,
               canMerge(previous, with: forecast, timeZoneIdentifier: timeZoneIdentifier) {
                groups[groups.count - 1].append(forecast)
            } else {
                groups.append([forecast])
            }
        }

        return groups.map { ForecastWindow(forecasts: $0) }
    }

    private static func canMerge(_ previous: Forecast, with next: Forecast, timeZoneIdentifier: String) -> Bool {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: timeZoneIdentifier) ?? .current
        guard
            let previousDate = ISO8601DateFormatter().date(from: previous.time),
            let nextDate = ISO8601DateFormatter().date(from: next.time),
            calendar.isDate(previousDate, inSameDayAs: nextDate)
        else {
            return false
        }

        let gap = nextDate.timeIntervalSince(previousDate)
        return gap > 0
            && gap <= 7_200
            && WeatherSymbol.name(for: previous) == WeatherSymbol.name(for: next)
            && abs(previous.temp - next.temp) <= 4
            && abs(previous.wind - next.wind) <= 5
            && abs(previous.precip - next.precip) <= 15
    }
}

private struct ForecastWindowCard: View {
    let window: ForecastWindow

    var body: some View {
        VStack(alignment: .leading, spacing: 11) {
            HStack(alignment: .top, spacing: 5) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(ForecastDate.dayLabel(for: window.representative.time))
                        .font(.caption2.weight(.bold))
                        .foregroundStyle(.secondary)
                    Text(ForecastDate.windowLabel(for: window.forecasts))
                        .font(.caption.weight(.bold))
                }
                Spacer(minLength: 2)
                Text("\(window.score)")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(window.score >= 70 ? Brand.green : .orange)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(
                        window.score >= 70 ? Brand.lime.opacity(0.75) : Color.orange.opacity(0.12),
                        in: Capsule()
                    )
            }

            HStack {
                Image(systemName: WeatherSymbol.name(for: window.representative))
                    .font(.title2)
                    .symbolRenderingMode(.multicolor)
                Spacer()
                Text("\(Int(window.averageTemperature.rounded()))°")
                    .font(.title2.weight(.bold))
            }

            Text(window.representative.short)
                .font(.caption.weight(.semibold))
                .lineLimit(2)

            Divider()

            Label("\(Int(window.maximumRainChance.rounded()))% rain", systemImage: "drop.fill")
            Label("Up to \(Int(window.maximumWind.rounded())) mph", systemImage: "wind")
        }
        .font(.caption2)
        .frame(maxWidth: .infinity, minHeight: 184, alignment: .topLeading)
        .padding(14)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 17))
        .overlay {
            RoundedRectangle(cornerRadius: 17)
                .stroke(.separator.opacity(0.5), lineWidth: 0.7)
        }
        .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }
}

private struct ForecastCard: View {
    let forecast: Forecast

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 6) {
                Text(ForecastDate.label(for: forecast.time))
                    .font(.caption.weight(.bold))
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
                Spacer(minLength: 2)
                Text("\(WeatherPlayScore.value(for: forecast))")
                    .font(.caption.weight(.bold))
                    .foregroundStyle(WeatherPlayScore.value(for: forecast) >= 70 ? Brand.green : .orange)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 3)
                    .background(
                        WeatherPlayScore.value(for: forecast) >= 70 ? Brand.lime.opacity(0.75) : Color.orange.opacity(0.12),
                        in: Capsule()
                    )
            }

            Image(systemName: WeatherSymbol.name(for: forecast))
                .font(.title)
                .symbolRenderingMode(.multicolor)

            Text("\(Int(forecast.temp.rounded()))°")
                .font(.title2.weight(.bold))
            Text(forecast.short)
                .font(.caption.weight(.semibold))
                .lineLimit(2)

            Divider()

            Label("\(Int(forecast.precip.rounded()))% rain", systemImage: "drop.fill")
            Label("\(Int(forecast.wind.rounded())) mph", systemImage: "wind")
        }
        .font(.caption2)
        .frame(maxWidth: .infinity, minHeight: 190, alignment: .topLeading)
        .padding(14)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 17))
        .overlay {
            RoundedRectangle(cornerRadius: 17)
                .stroke(.separator.opacity(0.5), lineWidth: 0.7)
        }
        .shadow(color: .black.opacity(0.05), radius: 8, y: 3)
    }
}

private struct WeatherAlertCard: View {
    let alert: WeatherAlert

    var body: some View {
        Label {
            VStack(alignment: .leading, spacing: 4) {
                Text(alert.event)
                    .font(.headline)
                Text(alert.headline)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(3)
            }
        } icon: {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.title2)
                .foregroundStyle(.orange)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.orange.opacity(0.10), in: RoundedRectangle(cornerRadius: 17))
        .overlay {
            RoundedRectangle(cornerRadius: 17)
                .stroke(.orange.opacity(0.25), lineWidth: 0.8)
        }
    }
}

private struct WeatherEmptyCard: View {
    let isLoading: Bool
    let loadingText: LocalizedStringKey
    let emptyText: LocalizedStringKey

    var body: some View {
        HStack(spacing: 12) {
            if isLoading {
                ProgressView()
            } else {
                Image(systemName: "cloud.slash.fill")
                    .foregroundStyle(.secondary)
            }
            Text(isLoading ? loadingText : emptyText)
                .font(.footnote)
                .foregroundStyle(.secondary)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Brand.background, in: RoundedRectangle(cornerRadius: 16))
    }
}

private enum WeatherPlayScore {
    nonisolated private static let heatIndexDisplayThreshold = 90.0

    nonisolated static func value(for forecast: Forecast) -> Int {
        let temperaturePenalty: Double
        if forecast.temp < 60 {
            temperaturePenalty = (60 - forecast.temp) * 4.2
        } else {
            let apparent = forecast.humidity.map { heatIndex(forecast.temp, humidity: $0) } ?? forecast.temp
            temperaturePenalty = max(0, min(apparent, heatIndexDisplayThreshold) - 78) * 3.7
                + max(0, apparent - heatIndexDisplayThreshold) * 2.5
        }
        let windPenalty = min(40, max(0, forecast.wind - 8) * 2.2)
        let rainPenalty = 70 * pow(max(0, min(100, forecast.precip)) / 100, 1.5)
        let raw = Int(max(0, min(100, 100 - temperaturePenalty - windPenalty - rainPenalty)).rounded())
        return forecast.winterRisk == nil && forecast.winterCaution == nil ? raw : min(20, raw)
    }

    nonisolated private static func heatIndex(_ temperature: Double, humidity: Double) -> Double {
        guard temperature.isFinite, humidity.isFinite, (0...100).contains(humidity) else { return temperature }

        let simple = 0.5 * (temperature + 61 + (temperature - 68) * 1.2 + humidity * 0.094)
        let initial = (simple + temperature) / 2
        guard initial >= 80 else { return initial.rounded() }

        let t = temperature
        let rh = humidity
        var index = -42.379 + 2.04901523 * t + 10.14333127 * rh
            - 0.22475541 * t * rh - 0.00683783 * t * t
            - 0.05481717 * rh * rh + 0.00122874 * t * t * rh
            + 0.00085282 * t * rh * rh - 0.00000199 * t * t * rh * rh
        if rh < 13, (80...112).contains(t) {
            index -= ((13 - rh) / 4) * sqrt(max(0, (17 - abs(t - 95)) / 17))
        }
        if rh > 85, (80...87).contains(t) {
            index += ((rh - 85) / 10) * ((87 - t) / 5)
        }
        return index.rounded()
    }
}

private enum WeatherSymbol {
    static func name(for forecast: Forecast) -> String {
        let condition = forecast.short.lowercased()
        if condition.contains("thunder") { return "cloud.bolt.rain.fill" }
        if condition.contains("snow") || condition.contains("ice") { return "cloud.snow.fill" }
        if condition.contains("rain") || condition.contains("shower") { return "cloud.rain.fill" }
        if condition.contains("cloud") || condition.contains("overcast") { return "cloud.fill" }
        if condition.contains("partly") { return "cloud.sun.fill" }
        return "sun.max.fill"
    }
}

private enum ForecastDate {
    static func label(for value: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: value) else { return value }
        return date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day().hour())
    }

    static func timeLabel(for value: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: value) else { return value }
        return date.formatted(.dateTime.hour())
    }

    static func dayLabel(for value: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: value) else { return value }
        return date.formatted(.dateTime.weekday(.abbreviated).month(.abbreviated).day())
    }

    static func windowLabel(for forecasts: [Forecast]) -> String {
        guard
            let first = forecasts.first,
            let last = forecasts.last,
            let start = ISO8601DateFormatter().date(from: first.time)
        else {
            return "Forecast window"
        }

        let parsedEnd = last.endTime.flatMap { ISO8601DateFormatter().date(from: $0) }
        let fallbackEnd = ISO8601DateFormatter().date(from: last.time).flatMap {
            Calendar.current.date(byAdding: .hour, value: 1, to: $0)
        }
        let end = parsedEnd ?? fallbackEnd ?? start
        let startLabel = start.formatted(.dateTime.hour())
        let endLabel = end.formatted(.dateTime.hour())
        return startLabel == endLabel ? startLabel : "\(startLabel)–\(endLabel)"
    }
}

private struct SectionHeading: View {
    let kicker: String
    let title: String
    let detail: String
    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Text(kicker).font(.caption2.weight(.bold)).tracking(1.2).foregroundStyle(Brand.accent)
            Text(title).font(.system(.title2, design: .serif))
            Text(detail).font(.footnote).foregroundStyle(.secondary)
        }
    }
}

private struct AboutSection: View {
    var body: some View {
        let currentYear = Calendar.current.component(.year, from: .now)

        VStack(alignment: .leading, spacing: 12) {
            SectionHeading(kicker: "ABOUT OPENCOURTS", title: "A local guide to tennis.", detail: "Court locations and amenities come from OpenStreetMap. Access and opening hours can change; check with the venue before visiting.")
            Link("Privacy", destination: URL(string: "https://opencourts.us/privacy")!)
            Link("Contact", destination: URL(string: "https://opencourts.us/contact")!)
            Link("© OpenStreetMap contributors", destination: URL(string: "https://www.openstreetmap.org/copyright")!)
            Text("Find Your Court. Play Your Game.  © \(currentYear) OpenCourts")
                .font(.caption)
                .foregroundStyle(.secondary)
                .padding(.top)
        }
        .padding(20)
    }
}

#Preview { ContentView() }
