/* BPG — EVERYTHING CONNECTED. Deterministic timeline: render(t) is a pure function of t. */
(() => {
const DUR = 30;
const $ = (s) => document.querySelector(s);
const NS = 'http://www.w3.org/2000/svg';
// ---------- helpers ----------
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, p) => a + (b - a) * p;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const eio = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const eo = (p) => 1 - Math.pow(1 - p, 3);
const ei = (p) => p * p * p;
const expo = (p) => (p >= 1 ? 1 : 1 - Math.pow(2, -10 * p));
// closed-form damped spring, 0 -> 1
function spring(t, w = 14, z = 0.72) {
  if (t <= 0) return 0;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}
// impulse bump: 0 -> ~1 -> 0
const bump = (u) => (u <= 0 ? 0 : Math.exp(-5 * u) * (1 - Math.exp(-40 * u)) * 1.25);
// keyframes [[t,v,ease?],...]
function kf(t, k) {
  if (t <= k[0][0]) return k[0][1];
  for (let i = 1; i < k.length; i++) {
    if (t <= k[i][0]) {
      const e = k[i][2] || eio;
      return lerp(k[i - 1][1], k[i][1], e(seg(t, k[i - 1][0], k[i][0])));
    }
  }
  return k[k.length - 1][1];
}
const rp = (n) => 'Rp ' + String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
const sv = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent && parent.appendChild(e); return e; };

// ---------- icons (Lucide paths, ISC) ----------
const IC = {
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.950-1.57l1.65-7.43H5.12"/>',
  pkg: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  wallet: '<path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  layers: '<path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.830Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  trend: '<path d="M22 7 13.5 15.5 8.5 10.5 2 17"/><path d="M16 7h6v6"/>',
  cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
};
const icon = (k, c) => `<svg viewBox="0 0 24 24" stroke="${c}">${IC[k]}</svg>`;

// ---------- build: workflow panels (illustrative data) ----------
const cardsEl = $('#cards');
const W = 380, H = 300;
function panel(id, ic, col, bg, eb, ttl, body) {
  const c = el('div', 'card', `<div class="hd"><div class="tile">${icon(ic, '#B8924A')}</div><div><div class="eb">${eb}</div><div class="ttl">${ttl}</div></div><div class="trx" id="${id}-trx"></div></div>${body}<div class="ring"></div>`);
  c.style.width = W + 'px'; c.style.height = H + 'px'; c.id = id;
  cardsEl.appendChild(c); return c;
}
const P = {
  pos: panel('pos', 'cart', '#B8924A', '#F6EEDC', 'Kasir · Outlet 01', 'Penjualan',
    `<div class="row"><span>Kopi Susu <span class="mono">2×</span></span><b class="mono">Rp 56.000</b></div>
     <div class="row"><span>Roti Bakar <span class="mono">1×</span></span><b class="mono">Rp 32.000</b></div>
     <div class="row"><span>Air Mineral <span class="mono">1×</span></span><b class="mono">Rp 12.000</b></div>
     <div class="div"></div><div class="row"><b>Total</b><b class="mono">Rp 100.000</b></div>
     <div class="btn" id="pos-btn">Bayar</div>`),
  inv: panel('inv', 'pkg', '#8E6A2D', '#FDF5E3', 'Gudang', 'Stok Produk',
    `<div class="row" id="inv-r0"><span>Kopi Susu</span><span><b class="mono" id="inv-0">48</b><small>pcs</small></span></div>
     <div class="row" id="inv-r1"><span>Roti Bakar</span><span><b class="mono" id="inv-1">24</b><small>pcs</small></span></div>
     <div class="row" id="inv-r2"><span>Air Mineral</span><span><b class="mono" id="inv-2">120</b><small>pcs</small></span></div>
     <div class="chip" id="inv-chip"><span class="dot"></span><span>Belum diperbarui</span></div>`),
  fin: panel('fin', 'wallet', '#2774C8', '#EAF3FD', 'Keuangan', 'Jurnal Kas',
    `<div class="row"><span>Setoran kas awal</span><b class="mono">Rp 1.000.000</b></div>
     <div class="row"><span>Pembelian bahan</span><b class="mono">−Rp 450.000</b></div>
     <div id="fin-new" style="overflow:hidden;height:0"><div class="row" style="background:#F6EEDC"><span style="color:#8E6A2D;font-weight:500">Penjualan TRX-0219</span><b class="mono" style="color:#8E6A2D">+Rp 100.000</b></div></div>
     <div class="chip" id="fin-chip"><span class="dot"></span><span>Menunggu entri</span></div>`),
  dash: panel('dash', 'chart', '#7657D6', '#F1EEFD', 'Manajemen', 'Ringkasan Hari Ini',
    `<div class="eb" style="letter-spacing:.06em">Penjualan hari ini</div>
     <div style="font-size:30px;font-weight:600;letter-spacing:-.02em;margin-top:4px;color:#202331" class="mono" id="dash-v">Rp 2.340.000</div>
     <div class="bars" id="dash-bars">${[0.42, 0.58, 0.5, 0.7, 0.62, 0.8, 0.55].map((h) => `<i style="height:${h * 100}%"></i>`).join('')}</div>
     <div class="row" style="padding:8px 0 0"><span>Transaksi</span><b class="mono" id="dash-n">41</b></div>`),
};
const bars = [...document.querySelectorAll('#dash-bars i')];

// ---------- build: product ecosystem (names/taglines from bintangpituglobal.com) ----------
const PRODUCTS = [
  { eb: 'PITUONE POS', t: 'Omni-channel POS', g: 'Kasir cepat offline dan multi-cabang', ic: 'cart', c: '#B8924A', bg: '#F6EEDC' },
  { eb: 'ERP', t: 'BPG Enterprise ERP', g: 'Stok, gudang, dan pembukuan terpadu', ic: 'layers', c: '#B8924A', bg: '#FDF5E3' },
  { eb: 'PITUONE KARAJA', t: 'Human Capital Module', g: 'Absensi wajah, lembur, dan gaji', ic: 'users', c: '#7657D6', bg: '#F1EEFD' },
  { eb: 'CRM', t: 'BPG Smart CRM', g: 'Lacak prospek dan riwayat chat', ic: 'trend', c: '#2774C8', bg: '#EAF3FD' },
  { eb: 'Infrastruktur', t: 'SaaS & Cloud Infrastructure', g: 'Server andal, cepat, dan aman', ic: 'cloud', c: '#2774C8', bg: '#EAF3FD' },
  { eb: 'Layanan', t: 'Web & Mobile App', g: 'Pengembangan khusus untuk integrasi', ic: 'monitor', c: '#1F7F86', bg: '#E6F5F5' },
];
const PC = PRODUCTS.map((p) => {
  const c = el('div', 'card pc', `<div class="eb">${p.eb}</div><div class="ttl">${p.t}</div><div class="tg">${p.g}</div><div class="tile">${icon(p.ic, '#B8924A')}</div><div class="ring"></div>`);
  cardsEl.appendChild(c); return c;
});
const hub = el('div', 'card', `<div style="display:flex;gap:16px;align-items:center"><img src="assets/logo_badge.png" style="width:64px;height:64px"/><div><div class="eb" style="color:#8E6A2D">BPG SUITE</div><div class="ttl" style="font-size:24px">Satu basis data</div></div></div><div style="font-size:15px;color:#696D78;margin-top:18px;line-height:1.4">Sekali catat, dipakai semua divisi.</div><div class="ring" style="opacity:1;border-width:1.5px"></div>`);
hub.style.width = '320px'; hub.style.height = '200px'; cardsEl.appendChild(hub);

// ---------- svg layers ----------
const back = $('#back'), front = $('#front');
const brk = [0, 1, 2, 3].map(() => sv('line', { stroke: '#E2D3B3', 'stroke-width': 2.5, 'stroke-dasharray': '7 7', 'stroke-linecap': 'round' }, back));
const goldLine = sv('path', { fill: 'none', stroke: '#B8924A', 'stroke-width': 3, 'stroke-linecap': 'round' }, back);
const goldLineF = sv('path', { fill: 'none', stroke: '#B8924A', 'stroke-width': 3, 'stroke-linecap': 'round' }, front);
const tipHalo = sv('circle', { r: 15, fill: 'rgba(217,184,119,.16)' }, front);
const tipDot = sv('circle', { r: 6.5, fill: '#B8924A', stroke: '#fff', 'stroke-width': 2.5 }, front);
const tracks = [0, 1, 2].map(() => sv('path', { fill: 'none', stroke: '#E2D3B3', 'stroke-width': 2, 'stroke-linecap': 'round' }, back));
const lit = [0, 1, 2].map(() => sv('path', { fill: 'none', stroke: '#B8924A', 'stroke-width': 3, 'stroke-linecap': 'round' }, back));
const spokes = PRODUCTS.map(() => sv('line', { stroke: '#E2D3B3', 'stroke-width': 1.5 }, back));
const spokeDot = sv('circle', { r: 5.5, fill: '#B8924A', stroke: '#fff', 'stroke-width': 2 }, back);
const pulses = [0, 1, 2].map(() => sv('circle', { fill: 'none', stroke: '#D9B877', 'stroke-width': 2 }, back));
const mix = (a, b, p) => { const h = (c, i) => parseInt(c.slice(1 + i * 2, 3 + i * 2), 16); return `rgb(${[0, 1, 2].map((i) => Math.round(lerp(h(a, i), h(b, i), clamp(p)))).join(',')})`; };
const hepta = sv('path', { fill: 'none', stroke: '#D9B877', 'stroke-width': 1.4, 'stroke-linejoin': 'round' }, front);
const heptaRing = sv('circle', { fill: 'none', stroke: 'rgba(217,184,119,.5)', 'stroke-width': 1 }, front);
const STAR = 'M0,-1 C.1,-.1 .1,-.1 1,0 C.1,.1 .1,.1 0,1 C-.1,.1 -.1,.1 -1,0 C-.1,-.1 -.1,-.1 0,-1Z';
const stars = [0, 1, 2, 3, 4, 5, 6].map(() => sv('path', { d: STAR, fill: '#E9CC8C' }, front));
const logoRing = sv('circle', { fill: 'none', stroke: '#B8924A', 'stroke-width': 3 }, front);

// ---------- screen text ----------
const textsEl = $('#texts');
function headline(str, y, size, tIn, tOut, opts = {}) {
  const d = el('div', 'hl' + (opts.sub ? ' sub' : ''));
  d.style.top = y + 'px'; d.style.fontSize = size + 'px';
  const ws = str.split(' ');
  ws.forEach((w, i) => { const m = el('span', 'w'); m.appendChild(el('span', '', w)); d.appendChild(m); if (i < ws.length - 1) d.appendChild(document.createTextNode(' ')); });
  textsEl.appendChild(d);
  return { d, words: [...d.querySelectorAll('.w>span')], tIn, tOut };
}
const HL = [
  headline('BISNIS TERUS BERGERAK.', 262, 64, 0.4, 2.0),
  headline('TAPI SISTEMNYA TERPISAH?', 262, 64, 2.15, 3.9),
  headline('SATUKAN OPERASIONAL.', 262, 64, 4.45, 7.75),
  headline('BERSAMA BINTANG PITU GLOBAL.', 756, 22, 6.7, 7.75, { sub: 1 }),
  headline('SEKALI CATAT.', 160, 64, 8.7, 10.95),
  headline('SEMUA TERHUBUNG.', 160, 64, 11.2, 13.95),
  headline('SATU EKOSISTEM.', 108, 60, 14.4, 16.85),
  headline('BERBAGAI SOLUSI.', 108, 60, 17.0, 19.9),
  headline('DIBANGUN UNTUK BISNIS YANG TERUS BERKEMBANG.', 112, 46, 21.0, 24.95),
];
function renderHeadline(h, t) {
  const n = h.words.length;
  const vis = t > h.tIn - 0.05 && t < h.tOut + 0.1 + n * 0.03;
  h.d.style.visibility = vis ? 'visible' : 'hidden';
  if (!vis) return;
  h.words.forEach((w, i) => {
    const p = spring(t - h.tIn - i * 0.06, 13, 0.82);
    const q = ei(seg(t, h.tOut - 0.4 + i * 0.03, h.tOut + i * 0.03));
    w.style.transform = `translateY(${((1 - p) * 110 - q * 110).toFixed(2)}%)`;
  });
}
// workflow step indicator
const stepsEl = $('#steps');
const STEPS = ['POS', 'INVENTORI', 'KEUANGAN', 'DASHBOARD'];
STEPS.forEach((s, i) => { if (i) stepsEl.appendChild(el('div', 'ar', '<b></b>')); stepsEl.appendChild(el('div', 's', `<i></i>${s}`)); });
const stepS = [...stepsEl.querySelectorAll('.s')], stepA = [...stepsEl.querySelectorAll('.ar b')];
const note = $('#note');
// end card
const endEl = $('#end');
endEl.innerHTML = `
 <div class="hl" id="e1" style="top:618px;font-size:80px;letter-spacing:.02em;font-weight:600">${'BINTANG PITU GLOBAL'.split(' ').map((w) => `<span class="w"><span>${w}</span></span>`).join(' ')}</div>
 <div class="hl" id="e2" style="top:724px;font-size:30px;font-weight:400;letter-spacing:-.01em;color:rgba(245,247,243,.72)"><span class="w"><span>Teknologi yang menghubungkan bisnis Anda.</span></span></div>
 <div id="e3" style="position:absolute;left:0;width:1920px;top:812px;display:flex;justify-content:center;align-items:center;gap:28px">
   <div id="cta">Jelajahi Solusi Kami<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round">${IC.arrow}</svg></div>
   <div class="mono" style="font-size:20px;letter-spacing:.08em;color:#D9B877">bintangpituglobal.com</div>
 </div>`;
const E1 = [...endEl.querySelectorAll('#e1 .w>span')], E2 = endEl.querySelector('#e2 .w>span'), E3 = $('#e3');

// ---------- geometry ----------
const ROW = [-735, -245, 245, 735];
const BTN = { x: -735, y: 107 };
const TOPY = -H / 2;
function bez(p0, p1, p2, p3, u) {
  const a = (1 - u) ** 3, b = 3 * (1 - u) ** 2 * u, c = 3 * (1 - u) * u * u, d = u ** 3;
  return [a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]];
}
const legs = [0, 1, 2].map((i) => [[ROW[i], TOPY], [ROW[i] + 140, TOPY - 170], [ROW[i + 1] - 140, TOPY - 170], [ROW[i + 1], TOPY]]);
const legPath = (L, u = 1) => { let d = ''; const N = 40; for (let k = 0; k <= N; k++) { const p = bez(...L, (k / N) * u); d += (k ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); } return d; };
tracks.forEach((p, i) => p.setAttribute('d', legPath(legs[i])));
const LEGT = [[9.2, 10.0], [10.2, 11.0], [11.2, 12.0]];
const ARRIVE = [8.9, 10.0, 11.0, 12.0];
function tokenPos(t) {
  if (t < 8.9) return [BTN.x, BTN.y];
  if (t < 9.2) return [BTN.x, lerp(BTN.y, TOPY, eio(seg(t, 8.9, 9.2)))];
  for (let i = 0; i < 3; i++) {
    const [a, b] = LEGT[i];
    if (t < a) return [ROW[i], TOPY];
    if (t <= b) return bez(...legs[i], eio(seg(t, a, b)));
  }
  return [ROW[3], TOPY];
}
// line -> circle shape morph (sampled polyline)
function morphPath(m, x0, x1, ly, cx, cy, r, draw = 1) {
  const N = 180; let d = '';
  const n = Math.max(1, Math.round(N * draw));
  for (let i = 0; i <= n; i++) {
    const u = i / N;
    const a = Math.PI / 2 + u * Math.PI * 2;
    const x = lerp(lerp(x0, x1, u), cx + r * Math.cos(a), m), y = lerp(ly, cy + r * Math.sin(a), m);
    d += (i ? 'L' : 'M') + x.toFixed(1) + ',' + y.toFixed(1);
  }
  return d;
}

// ---------- virtual camera ----------
function camera(t) {
  let x;
  if (t < 7.9) x = kf(t, [[0, 0], [4.0, 0], [4.5, -220], [5.5, 220, (p) => p], [6.3, 0]]);
  else if (t < 8.9) x = lerp(0, ROW[0] * 0.85, eio(seg(t, 7.9, 8.9)));
  else if (t < 12.2) x = 0.85 * tokenPos(t)[0];
  else x = kf(t, [[12.2, ROW[3] * 0.85], [13.4, 0]]);
  const y = kf(t, [[0, -20], [4, -20], [6.3, -40], [7.8, -40], [8.9, -70], [12.2, -70], [13.4, -30], [15, 40], [19.8, 40], [20.8, 0]]);
  const z = kf(t, [[0, 1], [4, 1.08], [5.5, 1.0], [6.4, 1.06], [7.8, 1.06], [8.9, 1.15], [12.2, 1.15], [13.4, 0.95], [15, 0.84], [19.8, 0.79, (p) => p], [20.8, 1], [25.5, 1], [26.2, 1.06, eo], [30, 1.0]]);
  const rx = kf(t, [[0, 0], [13.4, 0], [15, 8], [19.8, 8], [20.6, 0]]);
  const ry = kf(t, [[0, 5], [4, 1], [6.3, 0], [14.5, 0], [17, -3], [19.8, 2.5], [20.6, 0]]);
  return { x, y, z, rx, ry };
}

// ---------- panel states ----------
function place(e, x, y, s, extra, w, h) {
  w = w || parseFloat(e.style.width); h = h || parseFloat(e.style.height);
  e.style.transform = `translate(${(x - w / 2).toFixed(2)}px,${(y - h / 2).toFixed(2)}px) ${extra || ''} scale(${s.toFixed(4)})`;
}
const S1 = { pos: [-560, 0], inv: [0, 0], fin: [560, 0] };
const S2 = { pos: [-470, 0], inv: [0, 0], fin: [470, 0] };
function panelState(id, t) {
  let x, y, s, o = 1, ry = 0, br = 1;
  const ent = { pos: [0.15, -680, 60, 0.82, 10], inv: [0.35, 0, -40, 1.18, 0], fin: [0.55, 680, 60, 0.86, -10], dash: [0, 0, 0, 1, 0] }[id];
  if (id === 'dash') {
    if (t < 7.9) return null;
    const p = spring(t - 8.0, 8, 0.85);
    x = lerp(1150, ROW[3], p); y = 0; s = lerp(0.7, 1, p); o = clamp(p * 1.6); ry = (1 - p) * -22;
  } else if (t < 4.0) {
    const p = spring(t - ent[0], 7, 0.86);
    x = lerp(ent[1], S1[id][0], p); y = lerp(ent[2], 0, p); s = lerp(ent[3], 1, p); o = clamp(p * 1.5); ry = ent[4] * (0.6 + 0.4 * (1 - p));
    br = 0.82;
  } else if (t < 7.8) {
    const p = eio(seg(t, 4.0, 4.9));
    x = lerp(S1[id][0], S2[id][0], p); y = 0; s = 1; ry = lerp(ent[4] * 0.6, 0, p);
    const passT = { pos: 4.75, inv: 5.05, fin: 5.35 }[id];
    br = lerp(0.82, 1, eo(seg(t, passT, passT + 0.3)));
    const r = eio(seg(t, 5.45, 6.3));
    y = lerp(0, 330, r); s = lerp(1, 0.6, r); x = lerp(x, x * 0.78, r); br = lerp(br, 0.55, r);
  } else {
    const i = { pos: 0, inv: 1, fin: 2 }[id];
    const p = spring(t - 7.8 - i * 0.06, 8, 0.85);
    x = lerp(S2[id][0] * 0.78, ROW[i], p); y = lerp(330, 0, p); s = lerp(0.6, 1, p); br = lerp(0.55, 1, p);
  }
  const ai = { pos: 0, inv: 1, fin: 2, dash: 3 }[id];
  const k = t > 8 && t < 14.2 ? bump(t - ARRIVE[ai]) : 0;
  s *= 1 + 0.045 * k;
  // S4: workflow folds back into the dashboard, which becomes the BPG Suite hub
  if (t >= 14.0) {
    const p = id === 'dash' ? eio(seg(t, 14.0, 14.9)) : ei(seg(t, 14.0, 14.8));
    if (id === 'dash') { x = lerp(x, 0, p); y = lerp(0, 40, p); s = lerp(s, 0.82, p); o = 1 - seg(t, 14.75, 14.95); }
    else { x = lerp(x, 0, p); y = lerp(y, 40, p); s = lerp(s, 0.45, p); o = 1 - p; }
  }
  return { x, y, s, o, ry, br, k };
}

// ---------- browser (screen space) ----------
const browser = $('#browser'), bin = $('#bin'), site = $('#site'), cursor = $('#cursor');
const SC = 1360 / 1440; // site screenshot scale inside browser
const LIFTS = [
  { x: 608, y: 2343, w: 243, h: 233, t: 23.05 }, // Omni-channel POS card
  { x: 94, y: 2343, w: 243, h: 233, t: 23.35 }, // BPG Enterprise ERP card
  { x: 94, y: 2096, w: 243, h: 233, t: 23.65 }, // Human Capital Module card
].map((L) => { const d = el('div', 'lift'); d.style.width = L.w * SC + 'px'; d.style.height = L.h * SC + 'px'; d.style.backgroundPosition = `${-L.x * SC}px ${-L.y * SC}px`; $('#lifts').appendChild(d); return { ...L, d }; });
const scrollAt = (t) => kf(t, [[22.05, 0], [22.85, 1830], [23.95, 1830], [24.6, 3040]]);
function cursorAt(t) {
  const pts = [[20.9, 1180, 700], [21.85, 995, 546], [22.9, 900, 2300], [23.05, 735, 2470], [23.35, 220, 2470], [23.65, 220, 2220], [24.0, 700, 2400], [24.6, 760, 3500]];
  return [kf(t, pts.map((p) => [p[0], p[1]])), kf(t, pts.map((p) => [p[0], p[2]]))];
}
function setChip(sel, on, a, b) {
  const c = $(sel);
  c.lastElementChild.textContent = on ? a : b;
  c.firstElementChild.style.background = on ? '#B8924A' : '#BDB3A1';
  c.style.background = on ? '#F6EEDC' : '#F4F0E8';
  c.style.color = on ? '#8E6A2D' : '#696D78';
}

// ---------- render ----------
const dark = $('#dark');
const world = $('#world'), grid = $('#grid'), glow = $('#glow'), logoG = $('#logoG'), logoImg = logoG.querySelector('img');
const token = $('#token'), tlabel = $('#tlabel');
function render(t) {
  t = clamp(t, 0, DUR);
  const C = camera(t);
  world.style.transform = `perspective(2400px) rotateX(${C.rx.toFixed(3)}deg) rotateY(${C.ry.toFixed(3)}deg) scale(${C.z.toFixed(4)}) translate(${(-C.x).toFixed(2)}px,${(-C.y).toFixed(2)}px)`;
  grid.style.transform = `translate(${((-C.x * 0.3) % 80).toFixed(2)}px,${((-C.y * 0.3) % 80).toFixed(2)}px) scale(${lerp(1, C.z, 0.4).toFixed(4)})`;
  world.style.display = t < 21.2 || t > 25.4 ? 'block' : 'none';

  // --- workflow panels
  for (const id of ['pos', 'inv', 'fin', 'dash']) {
    const e = P[id], st = panelState(id, t);
    if (!st || st.o <= 0.001) { e.style.visibility = 'hidden'; continue; }
    e.style.visibility = 'visible';
    place(e, st.x, st.y - 8 * clamp(st.k), st.s, `perspective(1400px) rotateY(${st.ry.toFixed(2)}deg)`);
    // disconnected = desaturated; receded = atmospheric fade (no grey dimming on the light canvas)
    const sat = clamp((st.br - 0.82) / 0.18);
    e.style.filter = sat < 0.999 ? `saturate(${(0.55 + 0.45 * sat).toFixed(3)})` : 'none';
    e.style.opacity = (st.o * lerp(0.55, 1, clamp((st.br - 0.55) / 0.27))).toFixed(3);
    const kq = clamp(st.k);
    e.style.boxShadow = kq > 0.005 ? `0 1px 2px rgba(32,35,49,.05),0 ${(8 + 10 * kq).toFixed(1)}px ${(20 + 16 * kq).toFixed(1)}px -8px rgba(184,146,74,${(0.08 + 0.14 * kq).toFixed(3)}),0 ${(24 + 18 * kq).toFixed(1)}px ${(48 + 24 * kq).toFixed(1)}px -24px rgba(32,35,49,.18)` : '';
    e.style.zIndex = id === 'dash' ? 5 : 2;
    const connected = (id === 'pos' && t > 4.75) || (id === 'inv' && t > 5.05) || (id === 'fin' && t > 5.35) || (id === 'dash' && t > 12.0);
    const passT = { pos: 4.75, inv: 5.05, fin: 5.35, dash: 99 }[id];
    const kk = clamp(Math.max(st.k, t < 6.2 ? 0.8 * bump(t - passT) : 0));
    const ring = e.querySelector('.ring');
    ring.style.opacity = (t < 13.9 ? Math.max(connected ? 1 : 0, kk) : 0).toFixed(3);
    ring.style.borderColor = kk > 0.02 ? `rgba(184,146,74,${(0.35 + 0.65 * kk).toFixed(3)})` : '#E2D3B3';
    ring.style.borderWidth = (1.5 + 0.6 * kk).toFixed(2) + 'px';
  }
  // POS state
  const btn = $('#pos-btn');
  const newOrder = t >= 7.8;
  $('#pos-trx').textContent = newOrder ? 'TRX-0219' : 'TRX-0218';
  const pressT = newOrder ? 8.85 : 1.35;
  const paid = t > pressT + 0.1;
  btn.innerHTML = paid ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8E6A2D" stroke-width="2.6" stroke-linecap="round">${IC.check}</svg>Lunas` : 'Bayar';
  btn.style.background = paid ? '#F6EEDC' : '#B8924A'; btn.style.color = paid ? '#8E6A2D' : '#fff';
  btn.style.transform = `scale(${(1 - 0.05 * Math.sin(Math.PI * seg(t, pressT, pressT + 0.16))).toFixed(4)})`;
  // inventory
  const iu = seg(t, 10.0, 10.35);
  $('#inv-0').textContent = String(48 - Math.round(2 * iu));
  $('#inv-1').textContent = String(24 - Math.round(iu));
  $('#inv-2').textContent = String(120 - Math.round(iu));
  const flash = bump(t - 10.0);
  for (let r = 0; r < 3; r++) $('#inv-r' + r).style.background = `rgba(217,184,119,${(0.16 * flash).toFixed(3)})`;
  setChip('#inv-chip', t > 10.0, 'Stok diperbarui', 'Belum diperbarui');
  // finance
  $('#fin-new').style.height = (34 * eo(seg(t, 11.0, 11.35))).toFixed(2) + 'px';
  setChip('#fin-chip', t > 11.0, 'Jurnal tercatat', 'Menunggu entri');
  // dashboard
  const du = eio(seg(t, 12.0, 12.6));
  $('#dash-v').textContent = rp(2340000 + 100000 * du);
  $('#dash-n').textContent = String(t > 12.0 ? 42 : 41);
  bars[6].style.height = (55 + 22 * du).toFixed(2) + '%';
  bars[6].style.background = mix('#EDE6D6', '#B8924A', du);

  // --- S1 broken connections + stalled transaction
  const lineIn = eo(seg(t, 0.8, 1.3)), brkP = eio(seg(t, 2.55, 3.2)), lineOut = 1 - seg(t, 4.0, 4.6);
  [[-370, -190], [190, 370]].forEach(([a, b], j) => {
    const m = (a + b) / 2, g = 34 * brkP, dy = 10 * brkP;
    const L = brk[j * 2], R = brk[j * 2 + 1];
    const op = t < 4.6 ? (0.9 * lineIn * (1 - 0.55 * brkP) * lineOut).toFixed(3) : 0;
    L.setAttribute('x1', a); L.setAttribute('y1', 0); L.setAttribute('x2', lerp(a, m - g, lineIn)); L.setAttribute('y2', -dy);
    R.setAttribute('x1', b); R.setAttribute('y1', 0); R.setAttribute('x2', lerp(b, m + g, lineIn)); R.setAttribute('y2', dy);
    L.setAttribute('opacity', op); R.setAttribute('opacity', op);
  });
  let tok = null, lab = null, tokS = 1;
  if (t > 1.5 && t < 3.6) {
    const p = eo(seg(t, 1.5, 1.85)), q = expo(seg(t, 1.85, 2.6));
    let x = lerp(-560, -370, p), y = lerp(107, 0, p);
    x = lerp(x, -282, q);
    y += 18 * eio(seg(t, 2.9, 3.6));
    tok = [x, y]; lab = 'TRX-0218';
    tokS = 1 - eio(seg(t, 3.1, 3.6));
  }
  if (t >= 8.45 && t < 14.2) {
    tok = tokenPos(t); lab = 'TRX-0219 · Rp 100.000';
    tokS = clamp(seg(t, 8.45, 8.7)) * (1 - eio(seg(t, 12.0, 12.4)));
  }
  if (tok && tokS > 0.01) {
    token.style.visibility = 'visible'; tlabel.style.visibility = 'visible'; tlabel.textContent = lab;
    token.style.transform = `translate(${(tok[0] - 12).toFixed(2)}px,${(tok[1] - 12).toFixed(2)}px) scale(${tokS.toFixed(3)})`;
    const lx = t < 4 ? tok[0] - 40 : tok[0] + 18;
    tlabel.style.transform = `translate(${lx.toFixed(2)}px,${(tok[1] - 46).toFixed(2)}px) scale(${tokS.toFixed(3)})`;
    const dimS1 = t < 4 ? 1 - 0.5 * seg(t, 2.6, 3.0) : 1;
    tlabel.style.opacity = (tokS * dimS1).toFixed(3); token.style.opacity = dimS1.toFixed(3);
  } else { token.style.visibility = 'hidden'; tlabel.style.visibility = 'hidden'; }

  // --- S2 gold line grows through the systems, then morphs into the logo ring
  const grow = eio(seg(t, 4.35, 5.4)), m2 = eio(seg(t, 5.45, 6.35));
  if (t > 4.3 && t < 6.5) {
    const d = morphPath(m2, -760, 760, 0, 0, -40, 170, m2 > 0 ? 1 : grow);
    (m2 > 0 ? goldLineF : goldLine).setAttribute('d', d);
    (m2 > 0 ? goldLine : goldLineF).setAttribute('d', '');
    goldLineF.setAttribute('opacity', (1 - seg(t, 6.3, 6.5)).toFixed(3));
    const lc = mix('#B8924A', '#B8924A', seg(t, 5.7, 6.3));
    goldLine.setAttribute('stroke', lc); goldLineF.setAttribute('stroke', lc);
    const tipO = (seg(t, 4.35, 4.5) * (1 - seg(t, 5.35, 5.55))).toFixed(3);
    for (const c of [tipDot, tipHalo]) { c.setAttribute('cx', lerp(-760, 760, grow)); c.setAttribute('cy', 0); c.setAttribute('opacity', tipO); }
  } else if (t >= 25.5 && t < 26.6) {
    // S6: collapsed browser line morphs into the ring of the final logo
    const m6 = eio(seg(t, 25.5, 26.3));
    goldLineF.setAttribute('d', morphPath(m6, -680, 680, 60, 0, -150, 168, 1));
    goldLineF.setAttribute('opacity', (1 - seg(t, 26.4, 26.6)).toFixed(3));
    goldLineF.setAttribute('stroke', mix('#D9B877', '#D9B877', seg(t, 25.6, 26.2)));
    goldLine.setAttribute('d', ''); tipDot.setAttribute('opacity', 0); tipHalo.setAttribute('opacity', 0);
  } else { goldLine.setAttribute('d', ''); goldLineF.setAttribute('d', ''); tipDot.setAttribute('opacity', 0); tipHalo.setAttribute('opacity', 0); }

  // --- logo group (S2 reveal -> shrinks into the S3 transaction token; S6 final)
  let lg = null;
  if (t >= 6.3 && t < 8.6) {
    const rev = eo(seg(t, 6.35, 7.0));
    const sp = lerp(0.92, 1, spring(t - 6.35, 10, 0.6));
    const sh = eio(seg(t, 7.75, 8.55));
    const ps = panelState('pos', t);
    lg = { x: lerp(0, ps.x, sh), y: lerp(-40, ps.y + 107 * ps.s, sh), s: lerp(sp, 0.07, sh), rev, ringO: 1 - sh, o: 1 - seg(t, 8.35, 8.6) };
  } else if (t >= 26.3) {
    lg = { x: 0, y: -150, s: lerp(0.94, 1, spring(t - 26.45, 9, 0.62)), rev: eo(seg(t, 26.45, 27.15)), ringO: 1, o: 1 };
  }
  if (lg) {
    logoG.style.visibility = 'visible';
    place(logoG, lg.x, lg.y, lg.s, '', 348, 348);
    logoG.style.opacity = lg.o.toFixed(3);
    logoImg.style.clipPath = `circle(${(lg.rev * 50).toFixed(2)}% at 50% 50%)`;
    logoRing.setAttribute('cx', lg.x); logoRing.setAttribute('cy', lg.y); logoRing.setAttribute('r', (170 * lg.s).toFixed(2));
    logoRing.setAttribute('stroke-width', (3 * Math.max(lg.s, 0.3)).toFixed(2));
    logoRing.setAttribute('opacity', (lg.ringO * lg.o * (1 - 0.55 * lg.rev)).toFixed(3));
  } else { logoG.style.visibility = 'hidden'; logoRing.setAttribute('opacity', 0); }

  // --- S3 data-flow tracks
  const tracksO = clamp(seg(t, 8.2, 8.8)) * (1 - seg(t, 13.9, 14.5));
  tracks.forEach((p) => p.setAttribute('opacity', tracksO.toFixed(3)));
  lit.forEach((p, i) => {
    const [a, b] = LEGT[i];
    const u = eio(seg(t, a, b));
    p.setAttribute('d', u > 0 ? legPath(legs[i], u) : '');
    const pulse = 0.65 + 0.35 * Math.cos((t - b) * 6) * Math.exp(-Math.max(0, t - b) * 1.2);
    p.setAttribute('opacity', (tracksO * (t > b ? pulse : 1)).toFixed(3));
    const u2 = seg(t, b, b + 0.7), end = legs[i][3];
    pulses[i].setAttribute('cx', end[0]); pulses[i].setAttribute('cy', end[1]);
    pulses[i].setAttribute('r', (8 + 46 * eo(u2)).toFixed(2));
    pulses[i].setAttribute('opacity', (t > b && u2 < 1 ? 0.7 * (1 - u2) : 0).toFixed(3));
  });
  const stIn = spring(t - 8.6, 10, 0.85) * (1 - ei(seg(t, 13.7, 14.1)));
  stepsEl.style.visibility = t > 8.55 && t < 14.2 ? 'visible' : 'hidden';
  stepsEl.style.transform = `translateY(${((1 - stIn) * 40).toFixed(2)}px)`; stepsEl.style.opacity = clamp(stIn).toFixed(3);
  stepS.forEach((s, i) => {
    const on = t > ARRIVE[i];
    s.style.color = on ? '#8E6A2D' : '#696D78';
    s.style.borderColor = on ? 'rgba(184,146,74,.45)' : '#E8E1D3';
    s.style.background = on ? '#F6EEDC' : '#FFFFFF';
    s.querySelector('i').style.background = on ? '#B8924A' : '#D8CDB6';
  });
  stepA.forEach((b, i) => { b.style.transform = `scaleX(${eio(seg(t, LEGT[i][0], LEGT[i][1])).toFixed(3)})`; });

  // --- S4 ecosystem
  const hubOn = t > 14.75 && t < 20.2;
  hub.style.visibility = hubOn ? 'visible' : 'hidden';
  if (hubOn) {
    place(hub, 0, 40, lerp(0.92, 1, spring(t - 14.75, 10, 0.8)));
    hub.style.opacity = (clamp(seg(t, 14.75, 14.95)) * (1 - seg(t, 20.0, 20.2))).toFixed(3);
    hub.style.zIndex = 50;
  }
  const exitP = ei(seg(t, 20.0, 20.8));
  spokeDot.setAttribute('opacity', 0);
  PC.forEach((c, i) => {
    const t0 = 15.0 + i * 0.14;
    if (t < t0 || t > 20.9) { c.style.visibility = 'hidden'; spokes[i].setAttribute('opacity', 0); return; }
    c.style.visibility = 'visible';
    const p = spring(t - t0, 8.5, 0.78);
    const a = -Math.PI / 2 + (i * Math.PI) / 3 + 0.06 * (t - 15);
    const R = 1 + 1.3 * exitP;
    const x = lerp(0, 620 * Math.cos(a) * R, p), y = lerp(40, 40 + 300 * Math.sin(a) * R, p);
    const d = Math.sin(a);
    const hT = 16.85 + i * 0.5;
    const h = eo(seg(t, hT, hT + 0.2)) * (1 - eio(seg(t, hT + 0.45, hT + 0.7)));
    const s = lerp(0.35, 0.93 + 0.09 * d, p) * (1 + 0.09 * h);
    const ry = -Math.cos(a) * 16 * (1 - h);
    place(c, x, y, s, `perspective(1200px) rotateY(${ry.toFixed(2)}deg)`, 300, 196);
    c.style.zIndex = String(20 + Math.round(d * 10) + Math.round(h * 40));
    c.style.opacity = (clamp(p * 2) * (1 - exitP)).toFixed(3);
    c.style.filter = 'none';
    const rg = c.querySelector('.ring'); rg.style.opacity = h.toFixed(3); rg.style.borderColor = '#B8924A'; rg.style.borderWidth = '2px';
    c.style.boxShadow = `0 1px 2px rgba(32,35,49,.05),0 ${(6 + 4 * (d + 1) + 12 * h).toFixed(1)}px ${(16 + 8 * (d + 1) + 16 * h).toFixed(1)}px -8px rgba(32,35,49,${(0.08 + 0.03 * (d + 1)).toFixed(3)}),0 ${(20 + 10 * (d + 1)).toFixed(1)}px 48px -24px rgba(32,35,49,.16)`;
    const sp = spokes[i];
    sp.setAttribute('x1', 0); sp.setAttribute('y1', 40); sp.setAttribute('x2', x.toFixed(1)); sp.setAttribute('y2', y.toFixed(1));
    sp.setAttribute('stroke', h > 0.02 ? mix('#E2D3B3', '#B8924A', h) : '#E2D3B3'); sp.setAttribute('stroke-width', (1.5 + h).toFixed(2));
    sp.setAttribute('opacity', (clamp(p) * (1 - exitP)).toFixed(3));
    if (t >= hT && t < hT + 0.55) {
      const u = eio(seg(t, hT, hT + 0.4));
      spokeDot.setAttribute('cx', lerp(0, x, u).toFixed(1)); spokeDot.setAttribute('cy', lerp(40, y, u).toFixed(1));
      spokeDot.setAttribute('opacity', (1 - seg(t, hT + 0.4, hT + 0.55)).toFixed(3));
    }
  });

  // --- S5 browser grows out of the hub (screen space)
  const bOn = t > 19.98 && t < 25.55;
  browser.style.display = bOn ? 'block' : 'none';
  if (bOn) {
    const g = eio(seg(t, 20.0, 20.95)), c6 = eio(seg(t, 25.0, 25.5));
    const w = lerp(256, 1360, g);
    const h = lerp(lerp(168, 820, g), 3, c6);
    const cy = lerp(545, 600, g);
    browser.style.width = w + 'px'; browser.style.height = h + 'px';
    browser.style.transform = `translate(${(960 - w / 2).toFixed(2)}px,${(cy - h / 2).toFixed(2)}px)`;
    browser.style.borderRadius = lerp(16, 2, c6).toFixed(2) + 'px';
    browser.style.background = mix('#F4F0E8', '#D9B877', c6);
    bin.style.transform = `scale(${(w / 1360).toFixed(4)})`;
    bin.style.opacity = (clamp(seg(t, 20.05, 20.45)) * (1 - seg(t, 24.95, 25.25))).toFixed(3);
    const sc = scrollAt(t);
    site.style.transform = `translateY(${(-sc * SC).toFixed(2)}px)`;
    LIFTS.forEach((L) => {
      const hh = eo(seg(t, L.t, L.t + 0.22)) * (1 - eio(seg(t, L.t + 0.5, L.t + 0.75)));
      L.d.style.visibility = hh > 0.001 ? 'visible' : 'hidden';
      L.d.style.left = (L.x * SC).toFixed(2) + 'px'; L.d.style.top = ((L.y - sc) * SC).toFixed(2) + 'px';
      L.d.style.transform = `translateY(${(-10 * hh).toFixed(2)}px) scale(${(1 + 0.035 * hh).toFixed(4)})`;
      L.d.style.boxShadow = `0 ${(24 * hh).toFixed(1)}px ${(50 * hh).toFixed(1)}px -18px rgba(32,35,49,${(0.4 * hh).toFixed(3)}),0 0 0 ${(2 * hh).toFixed(2)}px rgba(184,146,74,${hh.toFixed(3)})`;
    });
    const [cx, cyy] = cursorAt(t);
    const click = 1 - 0.18 * Math.sin(Math.PI * seg(t, 21.85, 22.0));
    cursor.style.transform = `translate(${(cx * SC).toFixed(2)}px,${((cyy - sc) * SC).toFixed(2)}px) scale(${click.toFixed(3)})`;
    cursor.style.opacity = (seg(t, 20.9, 21.2) * (1 - seg(t, 24.5, 24.8))).toFixed(3);
  }

  // --- S6 heptagram: seven stars ("Pitu") drawn by the gold line
  if (t > 25.95) {
    const hp = eio(seg(t, 26.0, 26.9));
    const Rr = 228, cx = 0, cy = -150;
    const V = [...Array(7)].map((_, k) => { const a = -Math.PI / 2 + (k * 2 * Math.PI) / 7; return [cx + Rr * Math.cos(a), cy + Rr * Math.sin(a)]; });
    let d = '', k = 0;
    for (let n = 0; n <= 7; n++) { d += (n ? 'L' : 'M') + V[k][0].toFixed(1) + ',' + V[k][1].toFixed(1); k = (k + 3) % 7; }
    hepta.setAttribute('d', d); hepta.setAttribute('pathLength', 1);
    hepta.setAttribute('stroke-dasharray', '1 1'); hepta.setAttribute('stroke-dashoffset', (1 - hp).toFixed(4));
    hepta.setAttribute('opacity', (0.9 - 0.72 * eio(seg(t, 26.9, 27.8))).toFixed(3));
    heptaRing.setAttribute('cx', cx); heptaRing.setAttribute('cy', cy); heptaRing.setAttribute('r', Rr);
    heptaRing.setAttribute('opacity', (0.5 * eo(seg(t, 26.5, 27.3))).toFixed(3));
    stars.forEach((s, i) => {
      const p = spring(t - 26.25 - i * 0.07, 14, 0.55);
      s.setAttribute('transform', `translate(${V[i][0].toFixed(1)},${V[i][1].toFixed(1)}) scale(${(11 * Math.max(0, p)).toFixed(2)})`);
      s.setAttribute('opacity', clamp(p).toFixed(3));
    });
  } else { hepta.setAttribute('opacity', 0); heptaRing.setAttribute('opacity', 0); stars.forEach((s) => s.setAttribute('opacity', 0)); }

  // --- lighting
  glow.style.opacity = eo(seg(t, 26.3, 28)).toFixed(3);
  // light -> deep forest: the dark canvas opens outward from the collapsed browser line
  const dk = eio(seg(t, 25.3, 26.15));
  dark.style.visibility = t > 25.28 ? 'visible' : 'hidden';
  dark.style.clipPath = `inset(${lerp(598, 0, dk).toFixed(2)}px 0 ${lerp(480, 0, dk).toFixed(2)}px 0)`;

  // --- typography
  HL.forEach((h) => renderHeadline(h, t));
  const endOn = t > 26.8;
  endEl.style.visibility = endOn ? 'visible' : 'hidden';
  if (endOn) {
    E1.forEach((w, i) => { const p = spring(t - 26.9 - i * 0.09, 11, 0.85); w.style.transform = `translateY(${((1 - p) * 110).toFixed(2)}%)`; });
    E2.style.transform = `translateY(${((1 - spring(t - 27.35, 11, 0.85)) * 110).toFixed(2)}%)`;
    const p3 = spring(t - 27.7, 10, 0.8); E3.style.transform = `translateY(${((1 - p3) * 24).toFixed(2)}px)`; E3.style.opacity = clamp(p3 * 1.4).toFixed(3);
  }
  note.textContent = t < 14.2 ? 'Data transaksi bersifat ilustrasi' : t > 20.5 && t < 25 ? 'Tampilan asli · bintangpituglobal.com' : '';
  note.style.opacity = (t < 14.2 ? seg(t, 0.6, 1.2) * (1 - seg(t, 13.8, 14.2)) : seg(t, 21, 21.4) * (1 - seg(t, 24.6, 25))).toFixed(3);
}

window.seek = (t) => render(t);
window.DURATION = DUR;
window.ready = Promise.all([document.fonts.ready, ...[...document.images].map((i) => i.decode().catch(() => 0))]);
const q = new URLSearchParams(location.search);
if (q.has('t')) render(parseFloat(q.get('t')));
else if (q.has('capture')) render(0);
else {
  // browser preview only: wall clock just picks t; frames are still produced by render(t)
  const t0 = performance.now();
  const loop = () => { render(((performance.now() - t0) / 1000) % DUR); requestAnimationFrame(loop); };
  window.ready.then(loop);
}
})();
