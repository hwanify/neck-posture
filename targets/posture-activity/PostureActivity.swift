import ActivityKit
import SwiftUI
import WidgetKit

/// Must match `PostureActivityAttributes` in modules/headphone-motion (ActivityKit pairs them by type name).
/// Everything is fixed at start and the timer runs on its own, so the activity never needs updates
/// (updates sent while the phone is locked weren't applied reliably).
struct PostureActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {}

  var startedAt: Date
  /// Already localized by the app, e.g. "측정 중".
  var title: String
}

@main
struct PostureWidgets: WidgetBundle {
  var body: some Widget {
    PostureLiveActivity()
  }
}

struct PostureLiveActivity: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: PostureActivityAttributes.self) { context in
      HStack(spacing: 16) {
        LevelMark(width: 44)
          .frame(width: 52, height: 32)
        Text(context.attributes.title)
          .font(.system(size: 17, weight: .semibold))
          .foregroundStyle(Palette.text)
        Spacer(minLength: 8)
        Text(context.attributes.startedAt, style: .timer)
          .font(.system(size: 17, weight: .medium))
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .foregroundStyle(Palette.subtext)
      }
      .padding(.horizontal, 20)
      .padding(.vertical, 18)
      .activityBackgroundTint(.black)
      .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          LevelMark(width: 36)
            .frame(height: 32)
            .padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.center) {
          Text(context.attributes.title)
            .font(.system(size: 15, weight: .semibold))
            .foregroundStyle(Palette.text)
        }
        DynamicIslandExpandedRegion(.trailing) {
          Text(context.attributes.startedAt, style: .timer)
            .font(.system(size: 15, weight: .medium))
            .monospacedDigit()
            .multilineTextAlignment(.trailing)
            .foregroundStyle(Palette.subtext)
            .frame(maxWidth: 64)
            .padding(.trailing, 6)
        }
      } compactLeading: {
        LevelMark(width: 18)
      } compactTrailing: {
        Text(context.attributes.startedAt, style: .timer)
          .font(.system(size: 13, weight: .medium))
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .frame(maxWidth: 44)
          .foregroundStyle(Palette.text)
      } minimal: {
        LevelMark(width: 16)
      }
    }
  }
}

private enum Palette {
  static let text = Color(white: 0.95)
  static let subtext = Color(white: 0.56)
  static let horizon = Color(white: 0.29)
}

/// The app icon's mark: a tilted white line over a faint horizon, with a dot at the pivot.
private struct LevelMark: View {
  let width: CGFloat

  var body: some View {
    ZStack {
      Rectangle()
        .fill(Palette.horizon)
        .frame(width: width * 1.2, height: 1)
      Capsule()
        .fill(Palette.text)
        .frame(width: width, height: max(1.5, width / 24))
        .rotationEffect(.degrees(-12))
      Circle()
        .fill(Palette.text)
        .frame(width: max(4, width / 9), height: max(4, width / 9))
    }
  }
}
