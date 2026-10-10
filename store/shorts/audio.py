"""Soundtrack for short1: the app's alert cue in the right ear at 5.2 s, recovery chime at 8.2 s,
a quiet pad underneath. Mirrors CuePlayer.swift's tones."""
import sys, wave
import numpy as np

SR = 48000
DUR = 15.0
out = np.zeros((int(SR * DUR), 2))

def tone(notes, amp):
    parts = []
    for freq, dur in notes:
        n = int(dur * SR)
        t = np.arange(n) / SR
        wave_ = np.sin(2 * np.pi * freq * t) if freq else np.zeros(n)
        env = np.ones(n)
        a, r = min(int(0.005 * SR), n // 2), min(int(0.03 * SR), n // 2)
        env[:a] = np.linspace(0, 1, a); env[n - r:] = np.linspace(1, 0, r)
        parts.append(wave_ * env * amp)
    return np.concatenate(parts)

def place(sig, at, pan):  # pan -1 left .. 1 right
    i = int(at * SR)
    l, r = (1 - pan) / 2, (1 + pan) / 2
    out[i:i + len(sig), 0] += sig * l
    out[i:i + len(sig), 1] += sig * r

alert = tone([(880, 0.11), (0, 0.06), (660, 0.16)], 0.55)
good = tone([(660, 0.09), (990, 0.13)], 0.4)
place(alert, 5.2, 0.85)
place(good, 8.25, 0)
place(tone([(660, 0.09), (990, 0.18)], 0.3), 12.75, 0)

# Soft pad (A2 + E3) with slow fades.
t = np.arange(len(out)) / SR
pad = (np.sin(2 * np.pi * 110 * t) + 0.6 * np.sin(2 * np.pi * 164.8 * t) + 0.3 * np.sin(2 * np.pi * 220 * t)) * 0.035
pad *= np.clip(t / 1.5, 0, 1) * np.clip((DUR - t) / 1.5, 0, 1)
out += pad[:, None]

out = np.clip(out, -1, 1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype('<i2').tobytes())
