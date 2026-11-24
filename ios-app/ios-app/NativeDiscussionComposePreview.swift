#if DEBUG
import SwiftUI

private struct NativeDiscussionComposePreview: View {
    @State private var title = ""
    @State private var text = "Saturday morning works for me.\nI can bring a spare racket."
    let reply: Bool

    var body: some View {
        NavigationStack {
            NativeDiscussionComposeForm(title: $title, text: $text, reply: reply, busy: false, checking: false, destination: "Reston Tennis") {}
                .navigationTitle(reply ? "Reply" : "New discussion")
                .navigationBarTitleDisplayMode(.inline)
        }
    }
}

#Preview("Discussion draft") {
    NativeDiscussionComposePreview(reply: false)
}

#Preview("Reply draft · Large text") {
    NativeDiscussionComposePreview(reply: true)
        .environment(\.dynamicTypeSize, .accessibility3)
        .preferredColorScheme(.dark)
}
#endif
