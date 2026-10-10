import ActivityKit
import Foundation

/// Must match `PostureActivityAttributes` in targets/posture-activity (ActivityKit pairs them by type name).
struct PostureActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {}

  var startedAt: Date
  var title: String
}

/// The session's Live Activity. Started once and ended once; it never needs updates because the
/// timer counts on its own.
final class PostureLiveActivity {
  /// Returns false when Live Activities are turned off for the app.
  func start(startedAt: Date, title: String) throws -> Bool {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    endAll()
    _ = try Activity.request(
      attributes: PostureActivityAttributes(startedAt: startedAt, title: title),
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
}
