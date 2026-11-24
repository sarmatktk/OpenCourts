#if DEBUG
import SwiftUI

private struct NativeDiscussionReportPreview: View {
    @State private var category: NativeChatReportCategory = .privacy
    @State private var details = "This reply includes someone's private contact details."
    private let content = NativeDiscussionContent(id: "preview", authorId: "preview-author",
        displayName: "Alex Chen", authorRole: nil, body: "A sample reply selected for review.",
        title: nil, createdAt: 0, updatedAt: 0, version: 1, likes: 0, liked: 0,
        locked: nil, muted: nil, commentCount: nil)

    var body: some View {
        NavigationStack {
            NativeDiscussionReportForm(content: content, category: $category, details: $details,
                                       busy: false, checking: false) {}
                .navigationTitle("Report reply")
                .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview("Discussion report · Large text") {
    NativeDiscussionReportPreview()
        .environment(\.dynamicTypeSize, .accessibility3)
        .preferredColorScheme(.dark)
}
#endif
