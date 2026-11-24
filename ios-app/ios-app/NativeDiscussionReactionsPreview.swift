#if DEBUG
import SwiftUI

#Preview("Discussion reactions · Large text") {
    let post = NativeDiscussionContent(id: "preview", authorId: "preview-author", displayName: "Alex",
        authorRole: nil, body: "Saturday doubles", title: "Court plans", createdAt: 0, updatedAt: 0,
        version: 1, likes: 124, liked: 1, locked: 0, muted: 0, commentCount: 3)
    NavigationStack {
        List {
            Section("Discussion") {
                NativeDiscussionReactions(groupID: "preview", postID: "preview", content: post,
                    reply: false, locked: false, revision: UUID()) {}
            }
            Section("Reply in a locked discussion") {
                NativeDiscussionReactions(groupID: "preview", postID: "preview", content: post,
                    reply: true, locked: true, revision: UUID()) {}
            }
        }
        .navigationTitle("Discussion")
    }
    .environment(NativeAccountStore())
    .environment(\.dynamicTypeSize, .accessibility3)
    .preferredColorScheme(.dark)
}
#endif
