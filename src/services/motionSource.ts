import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';

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

export type MotionSourceKind = 'airpods' | 'phone' | 'demo';

export interface MotionSource {
  readonly kind: MotionSourceKind;
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
      // 0–14s gentle sway, 14–24s lean right, 24–30s sway with a nod, 30–40s lean left
      const lean = cycle >= 14 && cycle < 24 ? 14 : cycle >= 30 ? -13 : 0;
      const tilt = lean + 3 * Math.sin(t * 0.9);
      const nod = cycle >= 25 && cycle < 29 ? 18 : 0;
      listeners.onSample({
        timestamp: t,
        quaternion: { x: 0, y: 0, z: 0, w: 1 },
        gravity: demoGravity(tilt, nod),
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

/**
 * The iPhone's own motion sensor standing in for the head, so the app can be tried in Expo Go
 * (which doesn't contain the AirPods module). Tilt the phone like a head; calibration learns the axis.
 */
class PhoneMotionSource implements MotionSource {
  readonly kind = 'phone';
  private subscription: { remove(): void } | null = null;
  private authorization: AuthorizationStatus = 'notDetermined';

  isAvailable(): boolean {
    return true;
  }

  getAuthorizationStatus(): AuthorizationStatus {
    return this.authorization;
  }

  async start(listeners: MotionSourceListeners): Promise<void> {
    await this.stop();
    const permission = await DeviceMotion.requestPermissionsAsync();
    this.authorization = permission.granted ? 'authorized' : 'denied';
    if (!permission.granted) throw new Error('동작 및 피트니스 권한이 필요해요.');
    if (!(await DeviceMotion.isAvailableAsync())) throw new Error('이 기기에서는 모션 센서를 사용할 수 없어요.');

    DeviceMotion.setUpdateInterval(40);
    // "Connected" follows from samples arriving (see MonitorController.handleSample).
    this.subscription = DeviceMotion.addListener((m) => listeners.onSample(toSample(m)));
  }

  async stop(): Promise<void> {
    this.subscription?.remove();
    this.subscription = null;
  }
}

const G = 9.81;
const DEG_TO_RAD = Math.PI / 180;

function toSample(m: DeviceMotionMeasurement): MotionSample {
  const total = m.accelerationIncludingGravity;
  const user = m.acceleration ?? { x: 0, y: 0, z: 0 };
  const rate = m.rotationRate ?? { alpha: 0, beta: 0, gamma: 0 };
  return {
    timestamp: Date.now() / 1000,
    quaternion: { x: 0, y: 0, z: 0, w: 1 },
    gravity: { x: (total.x - user.x) / G, y: (total.y - user.y) / G, z: (total.z - user.z) / G },
    rotationRate: { x: rate.beta * DEG_TO_RAD, y: rate.gamma * DEG_TO_RAD, z: rate.alpha * DEG_TO_RAD },
    userAcceleration: { x: user.x / G, y: user.y / G, z: user.z / G },
    sensorLocation: 'default',
  };
}

/** Whether the AirPods native module is in this binary (false in Expo Go). */
export const hasAirPodsModule = HeadphoneMotion !== null;

/** Sources the user can pick from in this binary. */
export const selectableSourceKinds: MotionSourceKind[] = hasAirPodsModule ? ['airpods'] : ['phone', 'demo'];

export function createMotionSource(kind: MotionSourceKind): MotionSource {
  if (kind === 'airpods' && hasAirPodsModule) return new AirPodsMotionSource();
  if (kind === 'demo') return new DemoMotionSource();
  return hasAirPodsModule ? new AirPodsMotionSource() : new PhoneMotionSource();
}
