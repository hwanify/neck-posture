import ExpoModulesCore
import CoreMotion

/// Streams AirPods head motion (`CMHeadphoneMotionManager`) to JS and plays
/// short directional audio cues through the connected headphones.
public class HeadphoneMotionModule: Module {
  private let manager = CMHeadphoneMotionManager()
  private let motionQueue: OperationQueue = {
    let queue = OperationQueue()
    queue.name = "baromok.headphone-motion"
    queue.maxConcurrentOperationCount = 1
    return queue
  }()
  // `CMHeadphoneMotionManager.delegate` is weak, so the module keeps the proxy alive.
  private lazy var connectionDelegate = ConnectionDelegate { [weak self] connected in
    self?.sendEvent("onConnectionChange", ["connected": connected])
  }
  private lazy var cuePlayer = CuePlayer()
  private let liveActivity = PostureLiveActivity()

  public func definition() -> ModuleDefinition {
    Name("HeadphoneMotion")

    Events("onMotion", "onConnectionChange", "onError")

    OnCreate {
      self.manager.delegate = self.connectionDelegate
    }

    OnDestroy {
      self.manager.stopDeviceMotionUpdates()
    }

    Function("isAvailable") { () -> Bool in
      return self.manager.isDeviceMotionAvailable
    }

    Function("isActive") { () -> Bool in
      return self.manager.isDeviceMotionActive
    }

    Function("getAuthorizationStatus") { () -> String in
      switch CMHeadphoneMotionManager.authorizationStatus() {
      case .notDetermined: return "notDetermined"
      case .restricted: return "restricted"
      case .denied: return "denied"
      case .authorized: return "authorized"
      @unknown default: return "notDetermined"
      }
    }

    // The system shows the Motion & Fitness permission prompt on the first start.
    AsyncFunction("startUpdates") { () throws -> Void in
      guard self.manager.isDeviceMotionAvailable else {
        throw HeadphoneMotionUnavailableException()
      }
      if self.manager.isDeviceMotionActive {
        return
      }
      self.manager.startDeviceMotionUpdates(to: self.motionQueue) { [weak self] motion, error in
        guard let self else { return }
        if let error = error as NSError? {
          self.sendEvent("onError", [
            "code": error.code,
            "domain": error.domain,
            "message": error.localizedDescription
          ])
          return
        }
        guard let motion else { return }
        self.sendEvent("onMotion", HeadphoneMotionModule.serialize(motion))
      }
    }

    AsyncFunction("stopUpdates") {
      self.manager.stopDeviceMotionUpdates()
    }

    // Plays inaudible audio so iOS keeps the app (and motion updates) alive in the background.
    AsyncFunction("setBackgroundKeepAlive") { (enabled: Bool) in
      try self.cuePlayer.setKeepAlive(enabled)
    }

    // pan: -1 (left ear) ... 1 (right ear); volume: 0...1
    AsyncFunction("playCue") { (kind: String, pan: Double, volume: Double) in
      try self.cuePlayer.play(kind: CueKind(rawValue: kind) ?? .alert, pan: Float(pan), volume: Float(volume))
    }

    // Lock Screen / Dynamic Island "measuring" card. startedAt in ms since epoch; title already localized.
    AsyncFunction("startLiveActivity") { (startedAt: Double, title: String, stopTitle: String) -> Bool in
      return try self.liveActivity.start(
        startedAt: Date(timeIntervalSince1970: startedAt / 1000),
        title: title,
        stopTitle: stopTitle
      )
    }

    AsyncFunction("endLiveActivity") {
      self.liveActivity.endAll()
    }
  }

  private static func serialize(_ motion: CMDeviceMotion) -> [String: Any?] {
    let q = motion.attitude.quaternion
    return [
      "timestamp": motion.timestamp,
      "quaternion": ["x": q.x, "y": q.y, "z": q.z, "w": q.w],
      "gravity": ["x": motion.gravity.x, "y": motion.gravity.y, "z": motion.gravity.z],
      "rotationRate": ["x": motion.rotationRate.x, "y": motion.rotationRate.y, "z": motion.rotationRate.z],
      "userAcceleration": [
        "x": motion.userAcceleration.x,
        "y": motion.userAcceleration.y,
        "z": motion.userAcceleration.z
      ],
      "sensorLocation": sensorLocationName(motion.sensorLocation)
    ]
  }

  private static func sensorLocationName(_ location: CMDeviceMotion.SensorLocation) -> String {
    switch location {
    case .headphoneLeft: return "left"
    case .headphoneRight: return "right"
    default: return "default"
    }
  }
}

private final class ConnectionDelegate: NSObject, CMHeadphoneMotionManagerDelegate {
  private let onChange: (Bool) -> Void

  init(onChange: @escaping (Bool) -> Void) {
    self.onChange = onChange
  }

  func headphoneMotionManagerDidConnect(_ manager: CMHeadphoneMotionManager) {
    onChange(true)
  }

  func headphoneMotionManagerDidDisconnect(_ manager: CMHeadphoneMotionManager) {
    onChange(false)
  }
}

internal final class HeadphoneMotionUnavailableException: Exception {
  override var reason: String {
    "Headphone motion is not available on this device"
  }
}
