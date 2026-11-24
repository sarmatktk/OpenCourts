#if DEBUG
import SwiftUI

struct NativeChatReportPreview: View {
    @State private var category: NativeChatReportCategory = .other
    @State private var details = ""
    @State private var confirm = false
    @State private var previewNotice = false

    var body: some View {
        NavigationStack {
            NativeChatReportForm(
                message: .init(id: "preview", seq: 1, kind: "message", authorId: "preview-other",
                    displayName: "Alex Chen", body: "Example message for the report form layout.",
                    createdAt: 1795366800000, hiddenAt: nil),
                category: $category, details: $details, busy: false, checkingAccess: false
            ) { confirm = true }
            .navigationTitle("Report message")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("Close") {} } }
            .alert("Submit this report to site moderators?", isPresented: $confirm) {
                Button("Submit report") { previewNotice = true }
                Button("Keep editing", role: .cancel) {}
            }
            .alert("Preview only", isPresented: $previewNotice) {
                Button("OK", role: .cancel) {}
            } message: { Text("No report was sent.") }
        }
    }
}

#Preview("Report form") {
    NativeChatReportPreview()
}
#endif
