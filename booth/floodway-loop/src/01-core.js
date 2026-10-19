/* =====================================================================
   CONFIG + CORE: constants, easing, seeded PRNG, canvas + type helpers.
   Every frame is a pure function of t: all canvases are cleared and redrawn from t alone.
   ===================================================================== */
const TL = /*__TIMELINE__*/null;
const CONFIG = {
  SITE_URL: 'floodway.pages.dev',
  CHAIN: ['RAIN + WATER DATA', 'FORECAST SERVICE', 'YOUR ROUTE + ALERTS']
  // Claims policy (BRIEF.md): no performance metrics are shown. The only numbers on screen are the twin's
  // 0.00-0.30 m gauge and the app's shelter card "~7 min · 1.2 km". audit-claims.mjs enforces this.
};
const DUR = TL.duration, FPS = TL.fps, W = 1920, H = 1080, CX = 960, CY = 540;
const CU = TL.cues;
const Q = new URLSearchParams(location.search);
const RENDER_MODE = Q.has('render'), DEBUG = Q.has('debug'), QA = Q.has('qa');

const C = {
  NAVY: '#071426', DEEP: '#040B16', CYAN: '#1677FF', WATER: '#38BDF8', AMBER: '#F59E0B',
  EMERALD: '#10B981', RED: '#DC2626', PLAT: '#F8FAFC', SLATE: '#94A3B8', INK: '#0F172A',
  SLATE6: '#475569', LINE: '#E2E8F0'
};

/* ---------- math + easing (one family: expo / cubic, gentle springs) ---------- */
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, s, d) => clamp01((t - s) / d);
const EK = 1 - Math.pow(2, -10);
const outExpo = x => (x <= 0 ? 0 : x >= 1 ? 1 : (1 - Math.pow(2, -10 * x)) / EK);
const inExpo = x => (x <= 0 ? 0 : x >= 1 ? 1 : (Math.pow(2, 10 * x - 10) - Math.pow(2, -10)) / EK);
const outCubic = x => { x = clamp01(x); return 1 - (1 - x) * (1 - x) * (1 - x); };
const inCubic = x => { x = clamp01(x); return x * x * x; };
const inOutCubic = x => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
const outQuart = x => { x = clamp01(x); return 1 - Math.pow(1 - x, 4); };
const smooth = x => { x = clamp01(x); return x * x * (3 - 2 * x); };
function spring(x, z = 0.72, w = 11) {             // damped spring that lands exactly on 1 at x = 1
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const wd = w * Math.sqrt(1 - z * z);
  const f = u => 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + (z * w / wd) * Math.sin(wd * u));
  return f(x) + (1 - f(1)) * x * x * x;
}
// in/out envelope: rises over [a, a+da] (outCubic), falls over [b, b+db] (inCubic)
const env = (t, a, da, b, db) => outCubic(prog(t, a, da)) * (b == null ? 1 : 1 - inCubic(prog(t, b, db)));
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const waterLevel = t => CU.waterMax * inOutCubic(prog(t, CU.waterStart, CU.waterEnd - CU.waterStart));

/* ---------- canvases ---------- */
const stageEl = document.getElementById('stage');
const worldCv = document.getElementById('world'), overCv = document.getElementById('over'), phoneCv = document.getElementById('phone');
const WX = worldCv.getContext('2d'), OX = overCv.getContext('2d'), PX = phoneCv.getContext('2d');
const PHONE_RES = 2.5;                               // phone canvas backing scale (460x940 CSS px)

// Alpha is always relative to a per-context base, so whole shots can be dissolved with one number.
function ga(c, a) { c.globalAlpha = clamp01((c.__b == null ? 1 : c.__b) * a); }
function base(c, b) { c.__b = clamp01(b); c.globalAlpha = c.__b; }
function rr(c, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}
function fillRR(c, x, y, w, h, r, fill, a = 1) { rr(c, x, y, w, h, r); c.fillStyle = fill; ga(c, a); c.fill(); }
function strokeRR(c, x, y, w, h, r, st, lw, a = 1) { rr(c, x, y, w, h, r); c.strokeStyle = st; c.lineWidth = lw; ga(c, a); c.stroke(); }
function circle(c, x, y, r, fill, a = 1) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.fillStyle = fill; ga(c, a); c.fill(); }
function ring(c, x, y, r, st, lw, a = 1) { c.beginPath(); c.arc(x, y, Math.max(0, r), 0, Math.PI * 2); c.strokeStyle = st; c.lineWidth = lw; ga(c, a); c.stroke(); }
function lin(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
function rad(c, x, y, r0, r1, stops) {
  const g = c.createRadialGradient(x, y, r0, x, y, r1);
  for (const [o, col] of stops) g.addColorStop(o, col);
  return g;
}
function poly(c, pts) { c.beginPath(); pts.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]))); c.closePath(); }
function check(c, x, y, s, col, lw, a = 1) {       // drawn check mark (no font glyph dependency)
  c.beginPath(); c.moveTo(x - s * 0.5, y); c.lineTo(x - s * 0.12, y + s * 0.38); c.lineTo(x + s * 0.55, y - s * 0.42);
  c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; ga(c, a); c.stroke();
}

/* ---------- type ---------- */
const FONT = "Outfit, 'Segoe UI', system-ui, sans-serif";
function setFont(c, size, weight, ls) { c.font = weight + ' ' + size + 'px ' + FONT; c.letterSpacing = (ls || 0) + 'px'; }
const WCACHE = new Map();
function tw(c, s, size, weight = 600, ls = 0) {
  const k = s + '|' + size + '|' + weight + '|' + ls;
  let w = WCACHE.get(k);
  if (w == null) { setFont(c, size, weight, ls); w = c.measureText(s).width; WCACHE.set(k, w); }
  return w;
}
// text(c, s, x, y, {size, weight, color, align, alpha, ls, maxW})
function text(c, s, x, y, o) {
  let size = o.size;
  if (o.maxW) { const w = tw(c, s, size, o.weight || 600, o.ls); if (w > o.maxW) size = size * o.maxW / w; }
  setFont(c, size, o.weight || 600, o.ls);
  c.textAlign = o.align || 'left';
  c.textBaseline = 'alphabetic';
  c.fillStyle = o.color || C.PLAT;
  ga(c, o.alpha == null ? 1 : o.alpha);
  c.fillText(s, x, y);
}
/* kinetic line: words rise through a masked band with a stagger, and leave upward.
   o: style; k: {tin, tout, dur, stag, odur, ostag, alpha} */
function kline(c, s, x, y, o, t, k) {
  const tin = k.tin, dur = k.dur || 0.8, stag = k.stag == null ? 0.06 : k.stag;
  const odur = k.odur || 0.42, ostag = k.ostag == null ? 0.03 : k.ostag;
  if (t < tin || (k.tout != null && t > k.tout + odur + ostag * 12)) return;
  const wt = o.weight || 800, ls = o.ls || 0;
  let size = o.size;
  if (o.maxW) { const w0 = tw(c, s, size, wt, ls); if (w0 > o.maxW) size = Math.floor(size * o.maxW / w0); }
  const words = o.chars ? s.split('') : s.split(' ');
  const sp = o.chars ? 0 : tw(c, ' ', size, wt, ls);
  const ws = words.map(w => tw(c, w, size, wt, ls));
  const total = ws.reduce((a, b) => a + b, 0) + sp * (words.length - 1);
  const x0 = o.align === 'center' ? x - total / 2 : o.align === 'right' ? x - total : x;
  c.save();
  c.beginPath(); c.rect(x0 - size * 0.4, y - size * 1.02, total + size * 0.8, size * 1.36); c.clip();
  setFont(c, size, wt, ls);
  c.textAlign = 'left'; c.textBaseline = 'alphabetic'; c.fillStyle = o.color || C.PLAT;
  let cx = x0;
  for (let i = 0; i < words.length; i++) {
    const pin = outExpo(prog(t, tin + i * stag, dur));
    const pout = k.tout == null ? 0 : inExpo(prog(t, k.tout + i * ostag, odur));
    if (pin > 0 && pout < 1) {
      ga(c, (k.alpha == null ? 1 : k.alpha) * Math.min(1, pin * 1.6));
      c.fillText(words[i], cx, y + (1 - pin) * size * 1.2 - pout * size * 1.2);
    }
    cx += ws[i] + sp;
  }
  c.restore();
}

/* ---------- soft sprites (pre-rendered once; drawImage per frame is cheap) ---------- */
function sprite(hex, r, hard = 0.0) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = r * 2;
  const c = cv.getContext('2d');
  // fade to the same colour at alpha 0 (not transparent black) so edges never darken
  c.fillStyle = rad(c, r, r, 0, r, [[0, hexA(hex, 1)], [hard, hexA(hex, 1)], [0.55 + hard * 0.45, hexA(hex, 0.35)], [1, hexA(hex, 0)]]);
  c.fillRect(0, 0, r * 2, r * 2);
  return cv;
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
}
const SPR = {};
function spr(hex, hard) {                            // cached 128 px radial sprite per colour
  const k = hex + '|' + (hard || 0);
  return SPR[k] || (SPR[k] = sprite(hex, 64, hard || 0));
}
function glow(c, hex, x, y, rx, ry, a, hard) {
  if (a <= 0.002) return;
  ga(c, a);
  c.drawImage(spr(hex, hard), x - rx, y - ry, rx * 2, ry * 2);
}
