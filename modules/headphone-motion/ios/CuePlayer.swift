import AVFoundation

enum CueKind: String {
  case alert
  case good
  case tick
}

/// Plays short synthesized tones panned to one ear, and optionally loops silence
/// so the app keeps running (and receiving headphone motion) in the background.
/// All audio is mixed with other apps, so the user's music is never interrupted.
final class CuePlayer {
  private let engine = AVAudioEngine()
  private let cueNode = AVAudioPlayerNode()
  private let silenceNode = AVAudioPlayerNode()
  private let format: AVAudioFormat
  private let lock = NSRecursiveLock()
  private var keepAlive = false
  private var buffers: [CueKind: AVAudioPCMBuffer] = [:]
  private var observers: [NSObjectProtocol] = []
  private lazy var silenceBuffer: AVAudioPCMBuffer = makeBuffer(notes: [(0, 1.0)], amplitude: 0)

  init() {
    format = AVAudioFormat(standardFormatWithSampleRate: 44_100, channels: 1)!
    engine.attach(cueNode)
    engine.attach(silenceNode)
    engine.connect(cueNode, to: engine.mainMixerNode, format: format)
    engine.connect(silenceNode, to: engine.mainMixerNode, format: format)

    let center = NotificationCenter.default
    observers = [
      center.addObserver(
        forName: AVAudioSession.interruptionNotification,
        object: AVAudioSession.sharedInstance(),
        queue: nil
      ) { [weak self] notification in
        guard
          let rawType = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
          AVAudioSession.InterruptionType(rawValue: rawType) == .ended
        else { return }
        self?.restartIfKeepingAlive()
      },
      // Fired when the output route changes (e.g. AirPods connect/disconnect); the engine stops itself.
      center.addObserver(forName: .AVAudioEngineConfigurationChange, object: engine, queue: nil) { [weak self] _ in
        self?.restartIfKeepingAlive()
      }
    ]
  }

  deinit {
    observers.forEach { NotificationCenter.default.removeObserver($0) }
  }

  func setKeepAlive(_ enabled: Bool) throws {
    lock.lock()
    defer { lock.unlock() }
    keepAlive = enabled
    if enabled {
      try startEngineIfNeeded()
      startSilenceLoop()
    } else {
      silenceNode.stop()
    }
  }

  func play(kind: CueKind, pan: Float, volume: Float) throws {
    lock.lock()
    defer { lock.unlock() }
    try startEngineIfNeeded()
    let buffer = buffers[kind] ?? makeCueBuffer(kind)
    buffers[kind] = buffer
    cueNode.pan = max(-1, min(1, pan))
    cueNode.volume = max(0, min(1, volume))
    cueNode.scheduleBuffer(buffer, at: nil, options: .interrupts, completionHandler: nil)
    if !cueNode.isPlaying {
      cueNode.play()
    }
  }

  // MARK: - Engine

  private func startEngineIfNeeded() throws {
    let session = AVAudioSession.sharedInstance()
    try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
    try session.setActive(true)
    if !engine.isRunning {
      engine.prepare()
      try engine.start()
    }
  }

  private func startSilenceLoop() {
    silenceNode.stop()
    silenceNode.scheduleBuffer(silenceBuffer, at: nil, options: .loops, completionHandler: nil)
    silenceNode.play()
  }

  private func restartIfKeepingAlive() {
    lock.lock()
    defer { lock.unlock() }
    guard keepAlive else { return }
    do {
      try startEngineIfNeeded()
      startSilenceLoop()
    } catch {
      NSLog("[HeadphoneMotion] Failed to restart audio engine: \(error)")
    }
  }

  // MARK: - Tone synthesis

  private func makeCueBuffer(_ kind: CueKind) -> AVAudioPCMBuffer {
    switch kind {
    case .alert:
      // Two descending beeps: "tilted, come back".
      return makeBuffer(notes: [(880, 0.11), (0, 0.06), (660, 0.16)], amplitude: 0.5)
    case .good:
      // Rising pair: "nice, you're straight again".
      return makeBuffer(notes: [(660, 0.09), (990, 0.13)], amplitude: 0.35)
    case .tick:
      return makeBuffer(notes: [(1200, 0.04)], amplitude: 0.3)
    }
  }

  /// Builds a mono buffer from (frequency Hz, duration s) notes; frequency 0 is a rest.
  private func makeBuffer(notes: [(Double, Double)], amplitude: Float) -> AVAudioPCMBuffer {
    let sampleRate = format.sampleRate
    let totalFrames = notes.reduce(0) { $0 + Int($1.1 * sampleRate) }
    let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: AVAudioFrameCount(max(totalFrames, 1)))!
    buffer.frameLength = AVAudioFrameCount(max(totalFrames, 1))
    let samples = buffer.floatChannelData![0]

    var offset = 0
    for (frequency, duration) in notes {
      let frames = Int(duration * sampleRate)
      let attack = min(Int(0.005 * sampleRate), frames / 2)
      let release = min(Int(0.03 * sampleRate), frames / 2)
      for i in 0..<frames {
        var envelope: Float = 1
        if i < attack {
          envelope = Float(i) / Float(max(attack, 1))
        } else if i >= frames - release {
          envelope = Float(frames - i) / Float(max(release, 1))
        }
        let phase = 2 * Double.pi * frequency * Double(i) / sampleRate
        samples[offset + i] = frequency > 0 ? amplitude * envelope * Float(sin(phase)) : 0
      }
      offset += frames
    }
    return buffer
  }
}
