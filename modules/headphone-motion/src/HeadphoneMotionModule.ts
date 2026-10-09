import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { AuthorizationStatus, CueKind, HeadphoneMotionEvents } from './HeadphoneMotion.types';

declare class HeadphoneMotionModule extends NativeModule<HeadphoneMotionEvents> {
  isAvailable(): boolean;
  isActive(): boolean;
  getAuthorizationStatus(): AuthorizationStatus;
  startUpdates(): Promise<void>;
  stopUpdates(): Promise<void>;
  setBackgroundKeepAlive(enabled: boolean): Promise<void>;
  /** pan: -1 (left ear) ... 1 (right ear), volume: 0...1 */
  playCue(kind: CueKind, pan: number, volume: number): Promise<void>;
}

/** `null` when the native module isn't in the binary (Expo Go, Android, web, tests). */
export default requireOptionalNativeModule<HeadphoneMotionModule>('HeadphoneMotion');
