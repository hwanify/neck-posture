import ActivityKit
import Foundation
import UIKit

/// Must match `PostureActivityAttributes` in targets/posture-activity (ActivityKit pairs them by type name).
struct PostureActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {}

  var startedAt: Date
  var title: String
  var stopTitle: String
}

/// The session's Live Activity. Started once and ended once; it never needs updates because the
/// timer counts on its own.
final class PostureLiveActivity {
  private var terminateObserver: NSObjectProtocol?

  init() {
    // Swiping the app away ends the session, so take the card down with it. The app is running
    // (background audio) when that happens, so iOS delivers willTerminate; wait briefly for the end.
    terminateObserver = NotificationCenter.default.addObserver(
      forName: UIApplication.willTerminateNotification, object: nil, queue: nil
    ) { [weak self] _ in
      self?.endAllAndWait(timeout: 2)
    }
  }

  deinit {
    if let terminateObserver { NotificationCenter.default.removeObserver(terminateObserver) }
  }

  /// Returns false when Live Activities are turned off for the app.
  func start(startedAt: Date, title: String, stopTitle: String) throws -> Bool {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    endAll()
    _ = try Activity.request(
      attributes: PostureActivityAttributes(startedAt: startedAt, title: title, stopTitle: stopTitle),
      content: ActivityContent(state: PostureActivityAttributes.ContentState(), staleDate: nil),
      pushType: nil
    )
    return true
  }

  /// Ends the session's activity, and any left over from a previous run of the app.
  func endAll() {
    for activity in Activity<PostureActivityAttributes>.activities {
      Task { @MainActor in await activity.end(nil, dismissalPolicy: .immediate) }
    }
  }

  private func endAllAndWait(timeout: TimeInterval) {
    let activities = Activity<PostureActivityAttributes>.activities
    guard !activities.isEmpty else { return }
    let done = DispatchSemaphore(value: 0)
    Task.detached {
      for activity in activities {
        await activity.end(nil, dismissalPolicy: .immediate)
      }
      done.signal()
    }
    _ = done.wait(timeout: .now() + timeout)
  }
}
