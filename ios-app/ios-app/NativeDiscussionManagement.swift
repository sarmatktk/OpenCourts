import SwiftUI

nonisolated enum NativeDiscussionPermission {
    static func allows(_ operation: NativeDiscussionOperation, own: Bool, canManage: Bool, reply: Bool) -> Bool {
        switch operation {
        case .edit: own
        case .delete: own || canManage
        case .lock, .unlock: canManage && !reply
        }
    }
}

nonisolated struct NativeDiscussionLockBody: Encodable, Sendable {
    let locked: Bool
}

struct NativeDiscussionLockReview: View {
    let title: String
    let locking: Bool
    let busy: Bool
    let confirm: () -> Void

    var body: some View {
        Form {
            Section("Discussion") {
                Text(title).font(.headline)
            }
            Section {
                Label(locking ? "Close replies and changes" : "Reopen replies and changes",
                      systemImage: locking ? "lock" : "lock.open")
                    .fixedSize(horizontal: false, vertical: true)
                Text(locking
                     ? "Members can still read and follow this discussion. Replies, edits and like changes will be closed. Owners and co-owners can still delete content."
                     : "Members will be able to reply, edit their own content and change likes again.")
                    .foregroundStyle(.secondary)
            }
            Section {
                Button(locking ? "Lock discussion" : "Unlock discussion") { confirm() }
                    .frame(minHeight: 44)
            } footer: {
                Text("Only the group owner and co-owners can change this setting. You can change it again later.")
            }
        }
        .disabled(busy)
    }
}

#if DEBUG
#Preview("Lock discussion · Large text") {
    NavigationStack {
        NativeDiscussionLockReview(title: "Saturday doubles at the north courts", locking: true, busy: false) {}
            .navigationTitle("Lock discussion")
            .navigationBarTitleDisplayMode(.inline)
    }
    .environment(\.dynamicTypeSize, .accessibility3)
    .preferredColorScheme(.dark)
}
#endif
