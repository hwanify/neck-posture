import ActivityKit
import SwiftUI
import WidgetKit

/// Must match `PostureActivityAttributes` in modules/headphone-motion (ActivityKit pairs them by type name).
struct PostureActivityAttributes: ActivityAttributes {
  public struct ContentState: Codable, Hashable {
    /// Signed lateral tilt in degrees: negative = left, positive = right.
    var angle: Double
    /// good | tilting | alerted | paused
    var status: String
    var goodPercent: Int
  }

  var startedAt: Date
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
      LockScreenView(context: context)
        .activityBackgroundTint(.black)
        .activitySystemActionForegroundColor(.white)
    } dynamicIsland: { context in
      DynamicIsland {
        DynamicIslandExpandedRegion(.leading) {
          LevelLine(angle: context.state.angle, width: 44)
            .frame(height: 36)
            .padding(.leading, 6)
        }
        DynamicIslandExpandedRegion(.trailing) {
          AngleText(angle: context.state.angle, size: 26)
            .padding(.trailing, 6)
        }
        DynamicIslandExpandedRegion(.bottom) {
          HStack {
            Text(statusText(context))
              .foregroundStyle(statusColor(context))
            Spacer()
            Text(context.attributes.startedAt, style: .timer)
              .monospacedDigit()
              .multilineTextAlignment(.trailing)
              .foregroundStyle(Palette.subtext)
          }
          .font(.system(size: 13))
          .padding(.horizontal, 6)
        }
      } compactLeading: {
        LevelLine(angle: context.state.angle, width: 18)
      } compactTrailing: {
        AngleText(angle: context.state.angle, size: 13)
      } minimal: {
        AngleText(angle: context.state.angle, size: 12)
      }
    }
  }
}

private enum Palette {
  static let text = Color(white: 0.95)
  static let subtext = Color(white: 0.56)
  static let horizon = Color(white: 0.29)
}

private struct LockScreenView: View {
  let context: ActivityViewContext<PostureActivityAttributes>

  var body: some View {
    HStack(spacing: 18) {
      LevelLine(angle: context.state.angle, width: 64)
        .frame(width: 72, height: 44)
      VStack(alignment: .leading, spacing: 3) {
        AngleText(angle: context.state.angle, size: 28)
        Text(statusText(context))
          .font(.system(size: 13))
          .foregroundStyle(statusColor(context))
      }
      Spacer(minLength: 8)
      VStack(alignment: .trailing, spacing: 3) {
        Text(context.attributes.startedAt, style: .timer)
          .font(.system(size: 15, weight: .medium))
          .monospacedDigit()
          .multilineTextAlignment(.trailing)
          .foregroundStyle(Palette.text)
        Text("바른 자세 \(context.state.goodPercent)%")
          .font(.system(size: 12))
          .foregroundStyle(Palette.subtext)
      }
    }
    .padding(.horizontal, 20)
    .padding(.vertical, 16)
  }
}

/// The home screen's level line: a white line tilted with the head over a faint fixed horizon.
private struct LevelLine: View {
  let angle: Double
  let width: CGFloat

  var body: some View {
    ZStack {
      Rectangle()
        .fill(Palette.horizon)
        .frame(width: width * 1.25, height: 1)
      Capsule()
        .fill(Palette.text)
        .frame(width: width, height: 1.5)
        .rotationEffect(.degrees(max(-30, min(30, angle))))
      Circle()
        .fill(Palette.text)
        .frame(width: max(4, width / 10), height: max(4, width / 10))
    }
  }
}

private struct AngleText: View {
  let angle: Double
  let size: CGFloat

  var body: some View {
    Text("\(Int(abs(angle).rounded()))°")
      .font(.system(size: size, weight: .medium))
      .monospacedDigit()
      .foregroundStyle(Palette.text)
  }
}

private func statusText(_ context: ActivityViewContext<PostureActivityAttributes>) -> String {
  if context.isStale { return "측정 중단됨" }
  let side = context.state.angle < 0 ? "왼쪽" : "오른쪽"
  switch context.state.status {
  case "tilting": return "\(side)으로 기울어짐"
  case "alerted": return "\(side)으로 기울어짐 · 바로 세워 주세요"
  case "paused": return "일시정지"
  default: return "바른 자세"
  }
}

private func statusColor(_ context: ActivityViewContext<PostureActivityAttributes>) -> Color {
  context.state.status == "alerted" && !context.isStale ? Palette.text : Palette.subtext
}
