import ActivityKit
import Foundation

/// Must match `PostureActivityAttributes` in targets/posture-activity (ActivityKit pairs them by type name).
struct PostureActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    var angle: Double
    var status: String
    var goodPercent: Int
  }

  var startedAt: Date
}

/// Starts, updates and ends the session's Live Activity (Lock Screen + Dynamic Island).
final class PostureLiveActivity {
  /// Without an update for this long the activity shows "측정 중단됨" (app was killed).
  private static let staleAfter: TimeInterval = 90

  private var activity: Activity<PostureActivityAttributes>?

  /// Returns false when the user turned Live Activities off for the app.
  func start(startedAt: Date, state: PostureActivityAttributes.ContentState) throws -> Bool {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    endAll()
    activity = try Activity.request(
      attributes: PostureActivityAttributes(startedAt: startedAt),
      content: content(state),
      pushType: nil
    )
    return true
  }

  func update(_ state: PostureActivityAttributes.ContentState) {
    guard let activity else { return }
    let next = content(state)
    Task { await activity.update(next) }
  }

  /// Also clears activities left over from a previous run of the app.
  func endAll() {
    activity = nil
    for existing in Activity<PostureActivityAttributes>.activities {
      Task { await existing.end(nil, dismissalPolicy: .immediate) }
    }
  }

  private func content(_ state: PostureActivityAttributes.ContentState) -> ActivityContent<PostureActivityAttributes.ContentState> {
    ActivityContent(state: state, staleDate: Date().addingTimeInterval(Self.staleAfter))
  }
}
