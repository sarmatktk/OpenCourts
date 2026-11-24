import SwiftUI
import GoogleSignIn

@main struct MyApp: App {
    @UIApplicationDelegateAdaptor(NativePushAppDelegate.self) private var pushDelegate
    @Environment(\.scenePhase) private var scenePhase
    var body: some Scene {
        WindowGroup {
            ContentView()
                .onChange(of: scenePhase, initial: true) { _, phase in
                    NativePushCoordinator.shared.sceneChanged(phase)
                }
                .onOpenURL { url in
                    _ = GIDSignIn.sharedInstance.handle(url)
                }
        }
    }
}
