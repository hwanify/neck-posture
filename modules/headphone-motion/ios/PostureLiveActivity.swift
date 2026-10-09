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
  // Diagnostics, read from the settings screen.
  private var requested = 0
  private var applied = 0
  private var lastApplied: Date?

  /// Returns false when the user turned Live Activities off for the app.
  func start(startedAt: Date, state: PostureActivityAttributes.ContentState) throws -> Bool {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else { return false }
    endAll()
    requested = 0
    applied = 0
    lastApplied = nil
    activity = try Activity.request(
      attributes: PostureActivityAttributes(startedAt: startedAt),
      content: content(state),
      pushType: nil
    )
    return true
  }

  func update(_ state: PostureActivityAttributes.ContentState) {
    guard let activity else { return }
    requested += 1
    let next = content(state)
    // ActivityKit is driven from the main actor; updating from the module's background queue
    // can be dropped while the app runs in the background.
    Task { @MainActor in
      await activity.update(next)
      self.applied += 1
      self.lastApplied = Date()
    }
  }

  /// Also clears activities left over from a previous run of the app.
  func endAll() {
    activity = nil
    for existing in Activity<PostureActivityAttributes>.activities {
      Task { @MainActor in await existing.end(nil, dismissalPolicy: .immediate) }
    }
  }

  func info() -> [String: Any] {
    return [
      "enabled": ActivityAuthorizationInfo().areActivitiesEnabled,
      "state": activity.map { Self.stateName($0.activityState) } ?? "none",
      "requested": requested,
      "applied": applied,
      "secondsSinceApplied": lastApplied.map { -$0.timeIntervalSinceNow } ?? -1,
    ]
  }

  private func content(_ state: PostureActivityAttributes.ContentState) -> ActivityContent<PostureActivityAttributes.ContentState> {
    ActivityContent(state: state, staleDate: Date().addingTimeInterval(Self.staleAfter))
  }

  private static func stateName(_ state: ActivityState) -> String {
    switch state {
    case .active: return "active"
    case .ended: return "ended"
    case .dismissed: return "dismissed"
    case .stale: return "stale"
    @unknown default: return "unknown"
    }
  }
}
