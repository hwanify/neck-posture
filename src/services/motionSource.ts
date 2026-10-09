import HeadphoneMotion, {
  type AuthorizationStatus,
  type MotionErrorEvent,
  type MotionSample,
} from '../../modules/headphone-motion';
import { demoGravity } from '../engine';

export type MotionSourceListeners = {
  onSample: (sample: MotionSample) => void;
  onConnectionChange: (connected: boolean) => void;
  onError: (error: MotionErrorEvent) => void;
};

export interface MotionSource {
  readonly kind: 'airpods' | 'demo';
  isAvailable(): boolean;
  getAuthorizationStatus(): AuthorizationStatus;
  start(listeners: MotionSourceListeners): Promise<void>;
  stop(): Promise<void>;
}

/** Real AirPods head motion through the native module. */
class AirPodsMotionSource implements MotionSource {
  readonly kind = 'airpods';
  private subscriptions: { remove(): void }[] = [];

  isAvailable(): boolean {
    return HeadphoneMotion?.isAvailable() ?? false;
  }

  getAuthorizationStatus(): AuthorizationStatus {
    return HeadphoneMotion?.getAuthorizationStatus() ?? 'restricted';
  }

  async start(listeners: MotionSourceListeners): Promise<void> {
    if (!HeadphoneMotion) throw new Error('HeadphoneMotion native module is missing');
    await this.stop();
    this.subscriptions = [
      HeadphoneMotion.addListener('onMotion', listeners.onSample),
      HeadphoneMotion.addListener('onConnectionChange', (e) => listeners.onConnectionChange(e.connected)),
      HeadphoneMotion.addListener('onError', listeners.onError),
    ];
    await HeadphoneMotion.startUpdates();
  }

  async stop(): Promise<void> {
    this.subscriptions.forEach((s) => s.remove());
    this.subscriptions = [];
    await HeadphoneMotion?.stopUpdates();
  }
}

/**
 * Synthetic head motion for running the UI without AirPods (Expo Go, simulator, tests).
 * Slowly sways left/right with occasional long tilts so alerts can be seen.
 */
class DemoMotionSource implements MotionSource {
  readonly kind = 'demo';
  private timer: ReturnType<typeof setInterval> | null = null;

  isAvailable(): boolean {
    return true;
  }

  getAuthorizationStatus(): AuthorizationStatus {
    return 'authorized';
  }

  async start(listeners: MotionSourceListeners): Promise<void> {
    await this.stop();
    const t0 = Date.now() / 1000;
    listeners.onConnectionChange(true);
    this.timer = setInterval(() => {
      const t = Date.now() / 1000 - t0;
      const cycle = t % 40;
      // 0–14s gentle sway, 14–24s lean right, 24–30s sway, 30–40s lean left
      const lean = cycle >= 14 && cycle < 24 ? 14 : cycle >= 30 ? -13 : 0;
      const tilt = lean + 3 * Math.sin(t * 0.9);
      listeners.onSample({
        timestamp: t,
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        gravity: demoGravity(tilt),
        rotationRate: { x: 0, y: 0, z: 0.05 },
        userAcceleration: { x: 0, y: 0, z: 0 },
        sensorLocation: 'default',
      });
    }, 40);
  }

  async stop(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}

/** AirPods when the native module is in the binary, otherwise a demo source. */
export function createMotionSource(): MotionSource {
  return HeadphoneMotion ? new AirPodsMotionSource() : new DemoMotionSource();
}
