// Original procedural score + SFX for "Everything Connected". Deterministic (seeded). Output: out/score_raw.wav (48 kHz stereo)
const fs = require('fs'), path = require('path');
const SR = 48000, DUR = 30, N = SR * DUR;
const L = new Float32Array(N), R = new Float32Array(N);
let seed = 0x5eed7;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const TAU = Math.PI * 2;
function add(i, l, r) { if (i >= 0 && i < N) { L[i] += l; R[i] += r === undefined ? l : r; } }

// ---- pad: additive soft-saw, crossfaded chords
const CH = [ // [start, end, midi notes]
  [0, 4.2, [45, 52, 57]],            // A drone, tension
  [4.0, 8.2, [41, 53, 57, 60, 64]],  // Fmaj7
  [8.0, 10.2, [41, 53, 57, 60]],     // F
  [10.0, 12.2, [45, 52, 57, 60, 64]],// Am
  [12.0, 14.2, [43, 50, 55, 59, 62]],// G
  [14.0, 16.2, [48, 55, 60, 64, 67]],// C
  [16.0, 18.2, [43, 50, 55, 59, 62]],// G
  [18.0, 20.2, [45, 52, 57, 60, 64]],// Am
  [20.0, 22.7, [41, 53, 57, 60, 64]],// Fmaj7
  [22.5, 25.2, [43, 50, 55, 62, 67]],// G
  [25.0, 30, [48, 55, 62, 64, 67, 71]], // Cmaj9 resolution
];
for (const [a, b, notes] of CH) {
  const i0 = Math.floor(a * SR), i1 = Math.min(N, Math.floor(b * SR));
  notes.forEach((m, k) => {
    const f = mtof(m);
    const det = [0.997, 1.003];
    const amp = (m < 50 ? 0.05 : 0.028);
    for (let i = i0; i < i1; i++) {
      const t = (i - i0) / SR, T = i / SR;
      let env = Math.min(1, t / 0.6) * Math.min(1, (b - T) / 0.5);
      if (a === 0) env *= Math.min(1, T / 1.2);
      const bright = 0.35 + 0.65 * Math.min(1, Math.max(0, (T - 4) / 16)); // opens up over the film
      let sl = 0, sr = 0;
      for (let h = 1; h <= 6; h++) {
        const g = Math.pow(1 / h, 1.6) * (h === 1 ? 1 : bright);
        sl += g * Math.sin(TAU * f * det[0] * h * T + k);
        sr += g * Math.sin(TAU * f * det[1] * h * T + k * 1.7);
      }
      const trem = 1 + 0.08 * Math.sin(TAU * 0.25 * T + k);
      add(i, sl * amp * env * trem, sr * amp * env * trem);
    }
  });
}
// final fade
// ---- tension pulse (S1) and low riser
for (let i = 0; i < 4.4 * SR; i++) {
  const T = i / SR, beat = (T % 0.5) / 0.5;
  const e = Math.exp(-beat * 9) * Math.min(1, T / 0.5);
  add(i, 0.14 * e * Math.sin(TAU * 55 * T) * (1 - Math.max(0, T - 3.9) / 0.5));
}
function riser(a, b, g) { for (let i = a * SR; i < b * SR; i++) { const p = (i / SR - a) / (b - a); const n = rnd() * 2 - 1; add(i | 0, g * p * p * n * 0.25, g * p * p * (rnd() * 2 - 1) * 0.25); } }
// ---- percussion
function kick(t0, g = 1) { const i0 = Math.floor(t0 * SR); let ph = 0; for (let j = 0; j < 0.35 * SR; j++) { const t = j / SR; const f = 45 + 85 * Math.exp(-t * 30); ph += TAU * f / SR; add(i0 + j, g * 0.42 * Math.exp(-t * 9) * Math.sin(ph)); } }
function hat(t0, g = 1, len = 0.04) { const i0 = Math.floor(t0 * SR); let p = 0; for (let j = 0; j < len * SR; j++) { const n = rnd() * 2 - 1; const hp = n - p; p = n; const e = Math.exp(-j / SR * 90); add(i0 + j, g * 0.07 * hp * e, g * 0.07 * hp * e * 0.8); } }
function bass(t0, m, len, g = 1) { const f = mtof(m), i0 = Math.floor(t0 * SR); for (let j = 0; j < len * SR; j++) { const t = j / SR; const e = Math.min(1, t / 0.01) * Math.exp(-t * 4); const s = Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t); add(i0 + j, g * 0.16 * e * s); } }
const ROOT = (T) => { for (const [a, b, n] of CH) if (T >= a + 0.1 && T < b - 0.1) return n[0]; return 41; };
for (let T = 8.0; T < 25.0; T += 0.5) {
  const half = T >= 20 && T < 25;
  if (!half || Math.abs((T * 2) % 2) < 0.01) kick(T, T < 14 ? 0.85 : 1);
  hat(T + 0.25, T < 14 ? 0.8 : 1);
  if (T >= 14 && T < 20) { hat(T + 0.125, 0.35, 0.025); hat(T + 0.375, 0.35, 0.025); }
  bass(T, ROOT(T) - 12 + 12, 0.45, half ? 0.6 : 0.9);
  bass(T + 0.25, ROOT(T) - 12 + 12, 0.2, 0.45);
}
// ---- arp (S4 ecosystem)
function pluck(t0, m, g = 1, len = 0.5, pan = 0) { const f = mtof(m), i0 = Math.floor(t0 * SR); for (let j = 0; j < len * SR; j++) { const t = j / SR; const e = Math.min(1, t / 0.004) * Math.exp(-t * 7); const s = Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 12) + 0.1 * Math.sin(TAU * 3 * f * t) * Math.exp(-t * 20); add(i0 + j, g * 0.06 * e * s * (1 - pan), g * 0.06 * e * s * (1 + pan)); } }
for (let T = 14.0, k = 0; T < 20; T += 0.25, k++) { const n = CH.find((c) => T >= c[0] + 0.1 && T < c[1] - 0.1)[2]; const m = n[1 + (k % (n.length - 1))] + 12; pluck(T, m, 0.55, 0.4, Math.sin(k) * 0.4); }
// ---- SFX
function click(t0, g = 1, f = 2400) { const i0 = Math.floor(t0 * SR); for (let j = 0; j < 0.03 * SR; j++) { const t = j / SR; const e = Math.exp(-t * 260); add(i0 + j, g * 0.22 * e * Math.sin(TAU * f * t) + g * 0.05 * e * (rnd() * 2 - 1)); } }
function chime(t0, ms, g = 1, len = 1.6) { ms.forEach((m, k) => { const f = mtof(m), i0 = Math.floor((t0 + k * 0.045) * SR); for (let j = 0; j < len * SR; j++) { const t = j / SR; const e = Math.min(1, t / 0.003) * Math.exp(-t * 3.2); const s = Math.sin(TAU * f * t) + 0.35 * Math.sin(TAU * f * 2.01 * t) * Math.exp(-t * 6) + 0.12 * Math.sin(TAU * f * 3.98 * t) * Math.exp(-t * 9); add(i0 + j, g * 0.07 * e * s * (k % 2 ? 0.8 : 1.1), g * 0.07 * e * s * (k % 2 ? 1.1 : 0.8)); } }); }
function whoosh(t0, len, g = 1, rev = false) { const i0 = Math.floor(t0 * SR); let lp = 0, lp2 = 0; for (let j = 0; j < len * SR; j++) { const p = j / (len * SR); const env = rev ? p * p : Math.sin(Math.PI * p) ** 2; const a = 0.02 + 0.2 * Math.sin(Math.PI * p); const n = rnd() * 2 - 1; lp += a * (n - lp); lp2 += a * (lp - lp2); add(i0 + j, g * 0.5 * env * lp2 * (1 - p * 0.6), g * 0.5 * env * lp2 * (0.4 + p * 0.6)); } }
function impact(t0, g = 1) { const i0 = Math.floor(t0 * SR); let ph = 0; for (let j = 0; j < 2.2 * SR; j++) { const t = j / SR; const f = 38 + 60 * Math.exp(-t * 8); ph += TAU * f / SR; add(i0 + j, g * 0.5 * Math.exp(-t * 2.2) * Math.sin(ph)); } }
function tone(t0, len, f0, f1, g = 1) { const i0 = Math.floor(t0 * SR); let ph = 0; for (let j = 0; j < len * SR; j++) { const p = j / (len * SR); const f = f0 * Math.pow(f1 / f0, p); ph += TAU * f / SR; add(i0 + j, g * 0.035 * Math.sin(Math.PI * p) * Math.sin(ph), g * 0.035 * Math.sin(Math.PI * p) * Math.sin(ph * 1.003)); } }
// S1
[0.25, 0.45, 0.65].forEach((t) => click(t, 0.5, 1800));
click(1.35, 0.9, 2600); tone(1.5, 1.0, 700, 900, 1); click(2.6, 0.6, 900); tone(2.6, 0.6, 500, 300, 0.8);
riser(2.4, 4.1, 0.5);
// S2
chime(4.35, [69, 76], 0.8); tone(4.4, 1.0, 400, 1200, 1.1);
[4.75, 5.05, 5.35].forEach((t, k) => click(t, 0.6, 2000 + k * 300));
whoosh(5.4, 1.0, 0.55); impact(6.35, 0.9); chime(6.4, [60, 67, 72, 76], 1.1, 2.4);
whoosh(7.7, 0.9, 0.35);
// S3
click(8.85, 1, 2800); chime(8.9, [72], 0.6, 0.6);
[[9.2, 10.0, 0], [10.2, 11.0, 1], [11.2, 12.0, 2]].forEach(([a, b, k]) => { tone(a, b - a, 600 + k * 120, 900 + k * 160, 1.2); });
[[10.0, 76], [11.0, 79], [12.0, 84]].forEach(([t, m]) => { click(t, 0.9, 3000); chime(t, [m], 0.75, 0.7); });
riser(12.4, 14.0, 0.35);
// S4
whoosh(13.8, 1.2, 0.45);
for (let i = 0; i < 6; i++) click(15.0 + i * 0.14, 0.45, 1900 + i * 150);
for (let i = 0; i < 6; i++) chime(16.85 + i * 0.5, [79 + [0, 2, 4, 7, 9, 12][i]], 0.35, 0.5);
// S5
whoosh(19.9, 1.1, 0.7); click(21.87, 0.8, 2400); whoosh(22.05, 0.8, 0.35);
[23.05, 23.35, 23.65].forEach((t, k) => chime(t, [84 + k * 3], 0.3, 0.5)); whoosh(23.95, 0.65, 0.3);
// S6
whoosh(24.9, 0.7, 0.6, true); tone(25.5, 0.9, 1400, 500, 1.0);
for (let i = 0; i < 7; i++) chime(26.25 + i * 0.07, [84 + [0, 2, 4, 7, 9, 11, 12][i]], 0.28, 0.9);
impact(26.45, 1.0); chime(26.5, [48, 55, 64, 71, 76], 1.0, 3.2);

// ---- master: gentle bus compression + fade-out
let env = 0;
for (let i = 0; i < N; i++) {
  const T = i / SR;
  const fade = T > 28.3 ? Math.max(0, 1 - (T - 28.3) / 1.7) ** 1.5 : 1;
  const fin = Math.min(1, T / 0.05);
  const a = Math.max(Math.abs(L[i]), Math.abs(R[i]));
  env = a > env ? a : env * 0.9995;
  const gr = env > 0.5 ? 0.5 / env + (1 - 0.5 / env) * 0.4 : 1;
  L[i] = Math.tanh(L[i] * gr * 1.1) * fade * fin; R[i] = Math.tanh(R[i] * gr * 1.1) * fade * fin;
}
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0); buf.writeUInt32LE(36 + N * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) { buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32000), 44 + i * 4); buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32000), 46 + i * 4); }
fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'out/score_raw.wav'), buf);
