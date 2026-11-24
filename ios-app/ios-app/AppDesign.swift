import SwiftUI

nonisolated private struct CommunityDockHeightKey: EnvironmentKey {
    static let defaultValue: CGFloat = 0
}

nonisolated private struct CommunityChatOpenKey: EnvironmentKey {
    static let defaultValue: Binding<Bool> = .constant(false)
}

nonisolated private struct CommunityPlaceKey: EnvironmentKey {
    static let defaultValue: Place? = nil
}

extension EnvironmentValues {
    var communityPlace: Place? {
        get { self[CommunityPlaceKey.self] }
        set { self[CommunityPlaceKey.self] = newValue }
    }

    var communityDockHeight: CGFloat {
        get { self[CommunityDockHeightKey.self] }
        set { self[CommunityDockHeightKey.self] = newValue }
    }

    var communityChatOpen: Binding<Bool> {
        get { self[CommunityChatOpenKey.self] }
        set { self[CommunityChatOpenKey.self] = newValue }
    }
}

struct AppLocationLabel: View {
    let title: String

    var body: some View {
        Label(title, systemImage: "mappin")
            .labelStyle(.titleAndIcon)
            .symbolRenderingMode(.monochrome)
    }
}

struct AppFloatingBar<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        HStack(spacing: 3) { content }
            .padding(6)
            .background(.ultraThinMaterial, in: Capsule())
            .overlay { Capsule().stroke(.separator.opacity(0.75), lineWidth: 0.8) }
            .shadow(color: .black.opacity(0.15), radius: 14, y: 6)
    }
}

/// Filled actions keep their icon and title legible inside List and Form.
struct AppPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline.weight(.semibold))
            .symbolRenderingMode(.monochrome)
            .foregroundStyle(.white)
            .tint(.white)
            .listItemTint(.white)
            .frame(maxWidth: .infinity, minHeight: 44)
            .padding(.horizontal, 16)
            .padding(.vertical, 2)
            .background(Brand.actionFill.opacity(isEnabled ? 1 : 0.4), in: RoundedRectangle(cornerRadius: 14))
            .opacity(configuration.isPressed ? 0.8 : 1)
    }
}

/// Consistent hit targets and symbol treatment for both app toolbars.
struct AppToolbarIcon: View {
    let title: String
    let icon: String

    var body: some View {
        Label(title, systemImage: icon)
            .labelStyle(.iconOnly)
            .symbolRenderingMode(.monochrome)
            .font(.body.weight(.medium))
            .frame(width: 44, height: 44)
    }
}

/// Shared visual treatment for the Courts and Play Together navigation.
struct AppTabLabel: View {
    let title: String
    let icon: String
    let isSelected: Bool

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .symbolVariant(isSelected ? .fill : .none)
                .symbolRenderingMode(.monochrome)
                .font(.system(.body, weight: .semibold))
                .frame(height: 22)
            Text(title)
                .font(.caption2.weight(.medium))
                .lineLimit(1)
                .minimumScaleFactor(0.85)
        }
        .foregroundStyle(isSelected ? Brand.accent : Color.secondary)
        .frame(maxWidth: .infinity)
        .frame(minHeight: 48)
        .padding(.horizontal, 2)
        .background(isSelected ? Brand.accent.opacity(0.12) : .clear, in: Capsule())
        .contentShape(Rectangle())
    }
}
