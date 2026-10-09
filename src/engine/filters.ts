/** Exponential moving average with a time constant, robust to irregular sample intervals. */
export class Ema {
  private value: number | null = null;
  private lastT: number | null = null;

  constructor(private readonly tauSec: number) {}

  update(x: number, t: number): number {
    if (this.value === null || this.lastT === null || this.tauSec <= 0) {
      this.value = x;
    } else {
      const dt = Math.max(0, t - this.lastT);
      const alpha = 1 - Math.exp(-dt / this.tauSec);
      this.value += alpha * (x - this.value);
    }
    this.lastT = t;
    return this.value;
  }

  reset(): void {
    this.value = null;
    this.lastT = null;
  }
}
