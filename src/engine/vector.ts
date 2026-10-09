import type { Vector3 } from '../../modules/headphone-motion';

export type { Vector3 };

export const RAD_TO_DEG = 180 / Math.PI;

export const vec = (x: number, y: number, z: number): Vector3 => ({ x, y, z });
export const add = (a: Vector3, b: Vector3): Vector3 => vec(a.x + b.x, a.y + b.y, a.z + b.z);
export const sub = (a: Vector3, b: Vector3): Vector3 => vec(a.x - b.x, a.y - b.y, a.z - b.z);
export const scale = (a: Vector3, s: number): Vector3 => vec(a.x * s, a.y * s, a.z * s);
export const dot = (a: Vector3, b: Vector3): number => a.x * b.x + a.y * b.y + a.z * b.z;
export const cross = (a: Vector3, b: Vector3): Vector3 =>
  vec(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
export const length = (a: Vector3): number => Math.sqrt(dot(a, a));

export function normalize(a: Vector3): Vector3 {
  const len = length(a);
  return len > 1e-9 ? scale(a, 1 / len) : vec(0, 0, 0);
}

/** Unsigned angle between two vectors, in degrees. */
export function angleBetweenDeg(a: Vector3, b: Vector3): number {
  const c = dot(normalize(a), normalize(b));
  return Math.acos(Math.max(-1, Math.min(1, c))) * RAD_TO_DEG;
}

/** Removes the component of `a` along unit vector `axis`. */
export const projectOntoPlane = (a: Vector3, axis: Vector3): Vector3 => sub(a, scale(axis, dot(a, axis)));

/** Rotates `v` around unit `axis` by `deg` degrees (Rodrigues). */
export function rotateAround(v: Vector3, axis: Vector3, deg: number): Vector3 {
  const r = deg / RAD_TO_DEG;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return add(add(scale(v, cos), scale(cross(axis, v), sin)), scale(axis, dot(axis, v) * (1 - cos)));
}
