export type Vector3 = { x: number; y: number; z: number };
export type Quaternion = { x: number; y: number; z: number; w: number };

export type MotionSample = {
  /** Seconds since device boot (CMDeviceMotion.timestamp). */
  timestamp: number;
  quaternion: Quaternion;
  gravity: Vector3;
  /** rad/s */
  rotationRate: Vector3;
  /** g */
  userAcceleration: Vector3;
  /** Which earbud the sensor data comes from. */
  sensorLocation: 'default' | 'left' | 'right';
};

export type ConnectionChangeEvent = { connected: boolean };
export type MotionErrorEvent = { code: number; domain: string; message: string };

export type AuthorizationStatus = 'notDetermined' | 'restricted' | 'denied' | 'authorized';
export type CueKind = 'alert' | 'good' | 'tick';

export type HeadphoneMotionEvents = {
  onMotion: (sample: MotionSample) => void;
  onConnectionChange: (event: ConnectionChangeEvent) => void;
  onError: (event: MotionErrorEvent) => void;
};

export type LiveActivityStatus = 'good' | 'tilting' | 'alerted' | 'paused';
