import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const fonts = JSON.parse(fs.readFileSync(path.join(HERE, 'fonts.json'), 'utf8'));

const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; font-src data:; img-src data:">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FloodWay · 30-Second Motion Loop</title>
<link rel="icon" href="data:,">
<style>
  @font-face {
    font-family: 'Outfit';
    src: url('data:font/woff2;base64,${fonts.w400}') format('woff2');
    font-weight: 400;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: 'Outfit';
    src: url('data:font/woff2;base64,${fonts.w600}') format('woff2');
    font-weight: 600;
    font-style: normal;
    font-display: block;
  }
  @font-face {
    font-family: 'Outfit';
    src: url('data:font/woff2;base64,${fonts.w800}') format('woff2');
    font-weight: 800;
    font-style: normal;
    font-display: block;
  }

  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    background: #020713;
    overflow: hidden;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
  }
  body.nocursor, body.nocursor * {
    cursor: none !important;
  }
  #stage {
    display: block;
    overflow: hidden;
    background: #050E1D;
    width: min(100vw, calc(100vh * 16 / 9));
    height: min(100vh, calc(100vw * 9 / 16));
  }
  #stage text {
    font-family: 'Outfit', 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
    font-variant-numeric: tabular-nums;
    font-kerning: normal;
    text-rendering: geometricPrecision;
  }
  #debug {
    position: fixed;
    left: 14px;
    top: 14px;
    z-index: 99;
    display: none;
    padding: 10px 16px;
    background: rgba(3, 11, 23, 0.94);
    border: 1px solid #1E293B;
    border-radius: 8px;
    color: #38BDF8;
    pointer-events: none;
    white-space: pre;
    font: 600 16px/1.4 Consolas, 'Cascadia Mono', monospace;
  }
</style>
</head>
<body>
<svg id="stage" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid meet"
     role="img" aria-label="FloodWay 30-second consumer product motion loop"></svg>
<div id="debug" aria-hidden="true"></div>

<script>
/* =====================================================================
   CONFIG — Claims policy and booth parameters
   ===================================================================== */
const CONFIG = {
  SITE_URL: 'floodway.pages.dev',
  CHAIN: [
    'Rain and water data',
    'Forecast service',
    'Your route and alerts'
  ],
  CLAIMS: [
    { id: 'latency', text: '<20 ms inference', show: false, evidence: '' },
    { id: 'miou', text: '92.4% waterline mIoU', show: false, evidence: '' },
    { id: 'horizon', text: '60-minute forecast horizon', show: false, evidence: '' },
    { id: 'rf', text: '74.55% flood-risk accuracy (Random Forest, JPS rainfall data)', show: false, evidence: '' }
  ]
};

(() => {
'use strict';

const DUR = 30, W = 1920, H = 1080, CX = 960, CY = 540;
const NS = 'http://www.w3.org/2000/svg';
const Q = new URLSearchParams(location.search);
const RENDER_MODE = Q.has('render'), DEBUG = Q.has('debug');

/* ---------- Curated Harmonious Palette ---------- */
const C = {
  NAVY: '#050E1D',
  DEEP_NAVY: '#020713',
  MID_NAVY: '#091A33',
  CYAN: '#0284C7',
  CYAN_GLOW: '#38BDF8',
  WATER: '#38BDF8',
  AMBER: '#F59E0B',
  EMERALD: '#10B981',
  EMERALD_BG: '#064E3B',
  RED: '#DC2626',
  RED_BG: '#450A0A',
  WHITE: '#FFFFFF',
  SLATE_100: '#F1F5F9',
  SLATE_200: '#E2E8F0',
  SLATE_300: '#CBD5E1',
  SLATE_400: '#94A3B8',
  SLATE_700: '#334155',
  SLATE_800: '#1E293B',
  PHONE_BODY: '#0F172A',
  PHONE_EDGE: '#334155'
};

/* ---------- Easing & Pure Math Utilities ---------- */
const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
const lerp = (a, b, p) => a + (b - a) * p;
const prog = (t, s, d) => clamp01((t - s) / d);
const wrap = t => ((t % DUR) + DUR) % DUR;
const EK = 1 - Math.pow(2, -10);
const outExpo = x => (x <= 0 ? 0 : x >= 1 ? 1 : (1 - Math.pow(2, -10 * x)) / EK);
const inExpo = x => (x <= 0 ? 0 : x >= 1 ? 1 : (Math.pow(2, 10 * x - 10) - Math.pow(2, -10)) / EK);
const outCubic = x => { x = clamp01(x); return 1 - (1 - x) * (1 - x) * (1 - x); };
const inCubic = x => { x = clamp01(x); return x * x * x; };
const inOutCubic = x => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };

function spring(x, z = 0.72, w = 11) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const wd = w * Math.sqrt(1 - z * z);
  const f = u => 1 - Math.exp(-z * w * u) * (Math.cos(wd * u) + (z * w / wd) * Math.sin(wd * u));
  return f(x) + (1 - f(1)) * x * x * x;
}

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let r = Math.imul(a ^ (a >>> 15), 1 | a);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/* ---------- SVG DOM Helpers & Caching ---------- */
const svg = document.getElementById('stage');
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

const defs = el('defs', null, svg);
let uidN = 0;
const uid = p => p + (++uidN);
const r2 = v => Math.round(v * 100) / 100;
const pt = (x, y) => r2(x) + ' ' + r2(y);

function sa(e, k, v) {
  const c = e.__c || (e.__c = Object.create(null));
  if (c[k] !== v) { c[k] = v; e.setAttribute(k, v); }
}

function show(e, on) {
  sa(e, 'display', on ? 'inline' : 'none');
  return on;
}

function vis(e, o) {
  if (!(o > 0.002)) { sa(e, 'display', 'none'); return false; }
  sa(e, 'display', 'inline');
  sa(e, 'opacity', o >= 0.998 ? '1' : o.toFixed(3));
  return true;
}

function tr(e, x, y, s = 1, rot = 0) {
  let v = 'translate(' + r2(x) + ' ' + r2(y) + ')';
  if (rot) v += ' rotate(' + r2(rot) + ')';
  if (s !== 1) v += ' scale(' + (+s.toFixed(4)) + ')';
  sa(e, 'transform', v);
}

function trs(e, x, y, sx, sy) {
  sa(e, 'transform', 'translate(' + r2(x) + ' ' + r2(y) + ') scale(' + (+Math.max(sx, 1e-4).toFixed(4)) + ' ' + (+Math.max(sy, 1e-4).toFixed(4)) + ')');
}

function prepDraw(e) {
  const L = e.getTotalLength() + 2;
  e.__len = L;
  e.setAttribute('stroke-dasharray', r2(L) + ' ' + r2(L));
  e.setAttribute('stroke-dashoffset', r2(L));
  return e;
}

function drawOn(e, p) {
  p = clamp01(p);
  if (show(e, p > 0.001)) sa(e, 'stroke-dashoffset', String(r2(e.__len * (1 - p))));
}

function txt(parent, s, x, y, st = {}) {
  const e = el('text', {
    x: r2(x),
    y: r2(y),
    'font-size': r2(st.size || 24),
    'font-weight': st.weight || 600,
    fill: st.fill || C.WHITE
  }, parent);
  if (st.anchor) e.setAttribute('text-anchor', st.anchor);
  if (st.op != null && st.op < 1) e.setAttribute('fill-opacity', st.op);
  if (st.ls) e.setAttribute('letter-spacing', r2(st.ls * (st.size || 24)));
  e.textContent = s;
  return e;
}

/* Masked Line Reveal Component */
function createMaskedLine(parent, textStr, x, y, st = {}, opt = {}) {
  const g = el('g', null, parent);
  show(g, false);

  const tEl = txt(g, textStr, 0, 0, st);
  if (opt.anchor) tEl.setAttribute('text-anchor', opt.anchor);

  const fontSize = st.size || 40;
  const clipId = uid('cl');
  const clip = el('clipPath', { id: clipId }, defs);
  const clipW = opt.w || 1200;
  const clipH = fontSize * 1.6;
  const clipX = opt.anchor === 'middle' ? -clipW / 2 : (opt.anchor === 'end' ? -clipW : 0);
  el('rect', { x: clipX, y: -fontSize * 1.25, width: clipW, height: clipH }, clip);
  g.setAttribute('clip-path', 'url(#' + clipId + ')');

  tr(g, x, y);
  return {
    g, tEl, fontSize, x, y,
    render(t, tin, dur = 0.65, tout = null, toutDur = 0.4) {
      if (t < tin) {
        show(g, false);
        return;
      }
      if (tout != null && t >= tout + toutDur) {
        show(g, false);
        return;
      }
      show(g, true);
      const pin = outExpo(prog(t, tin, dur));
      const pout = (tout == null) ? 0 : inExpo(prog(t, tout, toutDur));
      const dy = (1 - pin) * (fontSize * 1.2) - pout * (fontSize * 1.2);
      tr(tEl, 0, dy);
      sa(g, 'opacity', ((1 - pout) * Math.min(1, pin * 1.5)).toFixed(3));
    }
  };
}

/* =====================================================================
   PREMIUM GRADIENTS & MATERIALS
   ===================================================================== */
const bgGrad = el('radialGradient', { id: 'bgGrad', cx: '50%', cy: '45%', r: '65%' }, defs);
el('stop', { offset: '0%', 'stop-color': '#0C203D' }, bgGrad);
el('stop', { offset: '60%', 'stop-color': '#061326' }, bgGrad);
el('stop', { offset: '100%', 'stop-color': '#020713' }, bgGrad);

const phoneGlass = el('linearGradient', { id: 'phoneGlass', x1: '0.1', y1: '0', x2: '0.9', y2: '1' }, defs);
el('stop', { offset: '0%', 'stop-color': '#FFFFFF', 'stop-opacity': '0.14' }, phoneGlass);
el('stop', { offset: '35%', 'stop-color': '#FFFFFF', 'stop-opacity': '0.04' }, phoneGlass);
el('stop', { offset: '70%', 'stop-color': '#38BDF8', 'stop-opacity': '0.02' }, phoneGlass);
el('stop', { offset: '100%', 'stop-color': '#000000', 'stop-opacity': '0.45' }, phoneGlass);

const cardGrad = el('linearGradient', { id: 'cardGrad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
el('stop', { offset: '0%', 'stop-color': '#112544' }, cardGrad);
el('stop', { offset: '40%', 'stop-color': '#0B1C33' }, cardGrad);
el('stop', { offset: '100%', 'stop-color': '#071324' }, cardGrad);

const cardRimGrad = el('linearGradient', { id: 'cardRimGrad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
el('stop', { offset: '0%', 'stop-color': 'rgba(255,255,255,0.22)' }, cardRimGrad);
el('stop', { offset: '40%', 'stop-color': 'rgba(56,189,248,0.18)' }, cardRimGrad);
el('stop', { offset: '100%', 'stop-color': 'rgba(255,255,255,0.04)' }, cardRimGrad);

const waterGrad = el('linearGradient', { id: 'waterGrad', x1: '0', y1: '0', x2: '0', y2: '1' }, defs);
el('stop', { offset: '0%', 'stop-color': '#38BDF8', 'stop-opacity': '0.85' }, waterGrad);
el('stop', { offset: '30%', 'stop-color': '#0284C7', 'stop-opacity': '0.90' }, waterGrad);
el('stop', { offset: '100%', 'stop-color': '#034575', 'stop-opacity': '0.96' }, waterGrad);

const btnGrad = el('linearGradient', { id: 'btnGrad', x1: '0', y1: '0', x2: '1', y2: '0' }, defs);
el('stop', { offset: '0%', 'stop-color': '#10B981' }, btnGrad);
el('stop', { offset: '100%', 'stop-color': '#059669' }, btnGrad);

const phoneRim = el('linearGradient', { id: 'phoneRim', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
el('stop', { offset: '0%', 'stop-color': '#64748B' }, phoneRim);
el('stop', { offset: '50%', 'stop-color': '#1E293B' }, phoneRim);
el('stop', { offset: '100%', 'stop-color': '#475569' }, phoneRim);

/* =====================================================================
   BACKGROUND CANVAS & PERIODIC RAIN
   ===================================================================== */
el('rect', { width: W, height: H, fill: 'url(#bgGrad)' }, svg);
const centerAura = el('circle', { cx: CX, cy: CY, r: 540, fill: '#0E284D', 'fill-opacity': '0.45' }, svg);

// 64 Periodic Rain Streaks (T = 3.0s, seamlessly divides 30.0s)
const rainG = el('g', { stroke: C.WATER, 'stroke-linecap': 'round' }, svg);
const RAIN_N = 64, RAIN_PERIOD = 3.0;
const rngRain = mulberry32(31415);
const rainDrops = [];
for (let i = 0; i < RAIN_N; i++) {
  const x0 = rngRain() * 2300 - 200;
  const y0 = rngRain() * 1300 - 150;
  const len = 35 + rngRain() * 65;
  const speed = 900 + rngRain() * 600;
  const width = 1.0 + rngRain() * 1.8;
  const opacity = 0.15 + rngRain() * 0.45;
  const line = el('line', {
    x1: 0, y1: 0,
    x2: -len * 0.36, y2: len,
    'stroke-width': r2(width)
  }, rainG);
  rainDrops.push({ line, x0, y0, len, speed, opacity });
}

// Circular Wipe transition overlay
const wipeCircle = el('circle', { cx: CX, cy: CY, r: 0, fill: C.DEEP_NAVY }, svg);
vis(wipeCircle, 0);

// Corner Legal Tags (S1-S5)
const tagsG = el('g', null, svg);
txt(tagsG, 'Illustrative dramatization', 60, 1040, { size: 22, weight: 400, fill: C.SLATE_400, op: 0.75 });
txt(tagsG, 'Always follow official warnings (MetMalaysia / JPS)', 1860, 1040, { size: 22, weight: 400, fill: C.SLATE_400, op: 0.75, anchor: 'end' });
const tagPersonas = txt(tagsG, 'Illustrative personas', 1860, 60, { size: 22, weight: 400, fill: C.SLATE_400, op: 0.75, anchor: 'end' });
vis(tagsG, 0);

/* =====================================================================
   PERSONA CARDS (S1: 0.0 - 3.6s & S7: 26.0 - 29.5s)
   Rich Editorial Vector Art with Malaysian Cultural Authenticity
   ===================================================================== */
const personasLayer = el('g', null, svg);
vis(personasLayer, 0);

const s1Title = createMaskedLine(personasLayer, 'Same rain. Different risks.', CX, 175, { size: 84, weight: 800, fill: C.WHITE }, { anchor: 'middle', w: 1400 });

const PERSONA_CONFIGS = [
  {
    role: 'COMMUTER',
    name: 'AISYAH',
    desc: 'Driving home.',
    loc: 'Subang underpass route',
    risk: '⚠️ Underpass water rise',
    safeMsg: 'Arrived home safely',
    s1Cx: 270,
    s7Cx: 230,
    drawIll: (g) => {
      // Vignette Frame: 324 x 190
      el('rect', { x: -162, y: -95, width: 324, height: 190, rx: 16, fill: '#08172C', stroke: '#152E50', 'stroke-width': 1.5 }, g);
      // Perspective Rainy Windshield
      el('path', { d: 'M -140 75 L 140 75 L 100 -70 L -100 -70 Z', fill: '#050E1B' }, g);
      // Wet asphalt road perspective
      el('path', { d: 'M -50 75 L 50 75 L 18 -65 L -18 -65 Z', fill: '#030812' }, g);
      el('line', { x1: 0, y1: -65, x2: 0, y2: 75, stroke: '#F59E0B', 'stroke-width': 2.5, 'stroke-dasharray': '12 8', 'stroke-opacity': 0.6 }, g);
      // Windshield Rain Streaks
      for (let rx = -90; rx <= 90; rx += 30) {
        el('line', { x1: rx, y1: -55, x2: rx - 18, y2: 25, stroke: '#38BDF8', 'stroke-width': 1.5, 'stroke-opacity': 0.4 }, g);
      }
      // Car Interior Dashboard & Digital Speedometer
      el('path', { d: 'M -162 45 Q 0 25 162 45 L 162 95 L -162 95 Z', fill: '#0E1F36', stroke: '#1E3A5F', 'stroke-width': 1.5 }, g);
      el('rect', { x: -35, y: 52, width: 70, height: 26, rx: 6, fill: '#071526', stroke: '#0284C7', 'stroke-width': 1 }, g);
      txt(g, '64 km/h', 0, 70, { size: 12, weight: 800, fill: '#38BDF8', anchor: 'middle' });
      // Steering Wheel
      el('circle', { cx: -45, cy: 50, r: 40, fill: 'none', stroke: '#1E293B', 'stroke-width': 8 }, g);
      el('line', { x1: -85, y1: 50, x2: -5, y2: 50, stroke: '#64748B', 'stroke-width': 5 }, g);
      el('circle', { cx: -45, cy: 50, r: 12, fill: '#0B1524', stroke: '#94A3B8', 'stroke-width': 2 }, g);
      // Aisyah Silhouette: Elegant modern commuter in teal hijab
      el('path', { d: 'M -75 25 C -75 -25 -15 -25 -15 25 C -15 65 -75 65 -75 25 Z', fill: '#0369A1' }, g); // Hijab base
      el('path', { d: 'M -65 20 C -65 -12 -25 -12 -25 20 C -25 45 -65 45 -65 20 Z', fill: '#0284C7' }, g);
      el('ellipse', { cx: -45, cy: 22, rx: 14, ry: 16, fill: '#FDE047' }, g); // Face
      el('path', { d: 'M -60 18 Q -45 8 -30 18 Q -45 32 -60 18 Z', fill: '#0369A1' }, g); // Hijab fold
      // Mounted Smartphone glowing with FloodWay alert
      el('rect', { x: 55, y: 15, width: 28, height: 48, rx: 6, fill: '#020617', stroke: '#38BDF8', 'stroke-width': 1.5 }, g);
      el('rect', { x: 57, y: 17, width: 24, height: 44, rx: 4, fill: '#0284C7' }, g);
      el('circle', { cx: 69, cy: 39, r: 45, fill: '#38BDF8', 'fill-opacity': 0.3 }, g); // glowing illumination
    }
  },
  {
    role: 'DELIVERY RIDER',
    name: 'KUMAR',
    desc: 'On the bike.',
    loc: 'Evening delivery shift',
    risk: '⚠️ Longkang overflow',
    safeMsg: 'Parked at depot shelter',
    s1Cx: 730,
    s7Cx: 550,
    drawIll: (g) => {
      // Vignette Frame: 324 x 190
      el('rect', { x: -162, y: -95, width: 324, height: 190, rx: 16, fill: '#08172C', stroke: '#152E50', 'stroke-width': 1.5 }, g);
      // City night street perspective with bokeh
      el('circle', { cx: -90, cy: -35, r: 24, fill: '#F59E0B', 'fill-opacity': 0.15 }, g);
      el('circle', { cx: 80, cy: -20, r: 32, fill: '#38BDF8', 'fill-opacity': 0.12 }, g);
      el('circle', { cx: -40, cy: -50, r: 18, fill: '#10B981', 'fill-opacity': 0.12 }, g);
      // Motorcycle Cockpit & Handlebars
      el('line', { x1: -95, y1: 45, x2: 95, y2: 45, stroke: '#334155', 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
      el('rect', { x: -105, y: 38, width: 20, height: 14, rx: 4, fill: '#0F172A' }, g);
      el('rect', { x: 85, y: 38, width: 20, height: 14, rx: 4, fill: '#0F172A' }, g);
      // Digital Instrument Cluster
      el('rect', { x: -35, y: 32, width: 70, height: 28, rx: 6, fill: '#071526', stroke: '#1E3A5F', 'stroke-width': 1.5 }, g);
      txt(g, '42 km/h', 0, 51, { size: 12, weight: 800, fill: '#38BDF8', anchor: 'middle' });
      // Aerodynamic Motorcycle Windscreen
      el('path', { d: 'M -45 40 L -25 -20 L 25 -20 L 45 40 Z', fill: '#0B1C33', 'fill-opacity': 0.7, stroke: '#38BDF8', 'stroke-width': 1.5 }, g);
      // Kumar Courier Helmet with dark reflective visor
      el('circle', { cx: 0, cy: -28, r: 34, fill: '#0F172A', stroke: '#F59E0B', 'stroke-width': 2.5 }, g);
      el('path', { d: 'M -25 -28 C -25 -42 25 -42 25 -28 C 18 -15 -18 -15 -25 -28 Z', fill: '#1E293B' }, g);
      el('line', { x1: -16, y1: -32, x2: 16, y2: -24, stroke: '#FDE68A', 'stroke-width': 2.5, 'stroke-linecap': 'round' }, g); // visor reflection
      // High-Visibility Neon Reflective Safety Harness
      el('path', { d: 'M -40 75 L -26 15 L 26 15 L 40 75 Z', fill: '#047857' }, g);
      el('line', { x1: -22, y1: 15, x2: -32, y2: 75, stroke: '#FDE047', 'stroke-width': 7 }, g);
      el('line', { x1: 22, y1: 15, x2: 32, y2: 75, stroke: '#FDE047', 'stroke-width': 7 }, g);
      // Waterproof Handlebar Mounted Smartphone
      el('rect', { x: 38, y: 20, width: 26, height: 46, rx: 5, fill: '#020617', stroke: '#38BDF8', 'stroke-width': 1.5 }, g);
      el('rect', { x: 40, y: 22, width: 22, height: 42, rx: 3, fill: '#0284C7' }, g);
      el('circle', { cx: 51, cy: 43, r: 38, fill: '#38BDF8', 'fill-opacity': 0.3 }, g);
    }
  },
  {
    role: 'PARENT',
    name: 'MEI LING',
    desc: 'Mall car park, 2 kids.',
    loc: 'Basement level -2',
    risk: '⚠️ Ramp water ingress',
    safeMsg: 'Car moved to upper deck',
    s1Cx: 1190,
    s7Cx: 1370,
    drawIll: (g) => {
      // Vignette Frame: 324 x 190
      el('rect', { x: -162, y: -95, width: 324, height: 190, rx: 16, fill: '#08172C', stroke: '#152E50', 'stroke-width': 1.5 }, g);
      // Covered parking garage architecture
      el('rect', { x: -145, y: -80, width: 50, height: 155, rx: 6, fill: '#112540', stroke: '#1E3A5F', 'stroke-width': 1.5 }, g);
      txt(g, 'P2', -120, -45, { size: 20, weight: 800, fill: '#38BDF8', anchor: 'middle' });
      txt(g, 'ZONE B', -120, -25, { size: 9, weight: 800, fill: '#94A3B8', anchor: 'middle' });
      el('line', { x1: -145, y1: 5, x2: -95, y2: 5, stroke: '#F59E0B', 'stroke-width': 4 }, g);
      // Illuminated Safe Elevator Lobby Entrance
      el('rect', { x: 95, y: -75, width: 50, height: 150, rx: 8, fill: '#064E3B', stroke: '#10B981', 'stroke-width': 2 }, g);
      txt(g, 'LIFT LOBBY', 120, -35, { size: 10, weight: 800, fill: '#6EE7B7', anchor: 'middle' });
      txt(g, 'ARAS G →', 120, -15, { size: 9, weight: 700, fill: '#A7F3D0', anchor: 'middle' });
      el('rect', { x: 105, y: 15, width: 30, height: 50, rx: 3, fill: '#10B981', 'fill-opacity': 0.35 }, g); // glass elevator doors
      // Mei Ling: Elegant mother in trench coat
      el('circle', { cx: -32, cy: -28, r: 20, fill: '#FBCFE8' }, g);
      el('path', { d: 'M -45 -38 C -45 -54 -19 -54 -19 -38 C -19 -20 -45 -20 -45 -38 Z', fill: '#0F172A' }, g); // hair
      el('path', { d: 'M -50 75 L -32 -6 L -14 75 Z', fill: '#9D174D' }, g);
      // Daughter in bright yellow raincoat with hood
      el('circle', { cx: 8, cy: 12, r: 15, fill: '#FDE047' }, g);
      el('path', { d: 'M -4 75 L 8 24 L 20 75 Z', fill: '#F59E0B' }, g);
      // Son in blue sporty jacket
      el('circle', { cx: 45, cy: 22, r: 13, fill: '#BAE6FD' }, g);
      el('path', { d: 'M 33 75 L 45 32 L 57 75 Z', fill: '#0284C7' }, g);
      // Mei Ling Holding Smartphone with Alert
      el('rect', { x: -62, y: 2, width: 20, height: 36, rx: 4, fill: '#020617', stroke: '#38BDF8', 'stroke-width': 1.5 }, g);
      el('circle', { cx: -52, cy: 20, r: 32, fill: '#38BDF8', 'fill-opacity': 0.3 }, g);
    }
  },
  {
    role: 'SENIOR',
    name: 'NENEK',
    desc: 'Ground floor, alone.',
    loc: 'Kampung house porch',
    risk: '⚠️ Porch curb overflow',
    safeMsg: 'Neighbours alerted early',
    s1Cx: 1650,
    s7Cx: 1690,
    drawIll: (g) => {
      // Vignette Frame: 324 x 190
      el('rect', { x: -162, y: -95, width: 324, height: 190, rx: 16, fill: '#08172C', stroke: '#152E50', 'stroke-width': 1.5 }, g);
      // Malaysian wooden verandah lattice wall
      for (let k = -145; k <= -75; k += 22) {
        el('line', { x1: k, y1: -75, x2: k, y2: 60, stroke: '#1E293B', 'stroke-width': 2.5 }, g);
      }
      // Decorative roof fascia trim
      el('path', { d: 'M -162 -75 L 162 -75 L 162 -65 L -162 -65 Z', fill: '#78350F' }, g);
      // Terracotta Flowerpot with Red Bougainvillea
      el('path', { d: 'M 95 75 L 135 75 L 128 42 L 102 42 Z', fill: '#9A3412' }, g);
      el('circle', { cx: 115, cy: 30, r: 22, fill: '#15803D' }, g);
      el('circle', { cx: 115, cy: 22, r: 12, fill: '#E11D48' }, g);
      el('circle', { cx: 105, cy: 34, r: 9, fill: '#F43F5E' }, g);
      // Rattan Armchair
      el('path', { d: 'M -55 75 L -55 20 C -55 -15 25 -15 25 20 L 25 75', fill: 'none', stroke: '#B45309', 'stroke-width': 6 }, g);
      // Nenek: Elderly grandmother with reading glasses & kebaya
      el('circle', { cx: -15, cy: -20, r: 21, fill: '#F1F5F9' }, g);
      el('circle', { cx: -15, cy: -34, r: 12, fill: '#94A3B8' }, g); // hair bun
      el('ellipse', { cx: -10, cy: -18, rx: 6, ry: 5, fill: 'none', stroke: '#475569', 'stroke-width': 2 }, g); // spectacles
      el('ellipse', { cx: -20, cy: -18, rx: 6, ry: 5, fill: 'none', stroke: '#475569', 'stroke-width': 2 }, g);
      el('line', { x1: -14, y1: -18, x2: -16, y2: -18, stroke: '#475569', 'stroke-width': 2 }, g);
      el('path', { d: 'M -38 75 C -38 10 8 10 8 75 Z', fill: '#047857' }, g); // floral kebaya
      el('path', { d: 'M -25 22 L -15 40 L -5 22', fill: 'none', stroke: '#FDE047', 'stroke-width': 2.5 }, g); // gold collar
      // Reassuring Smartphone held in both hands
      el('rect', { x: -25, cy: 25, width: 22, height: 38, rx: 4, fill: '#020617', stroke: '#38BDF8', 'stroke-width': 1.5 }, g);
      el('circle', { cx: -14, cy: 44, r: 35, fill: '#38BDF8', 'fill-opacity': 0.35 }, g);
    }
  }
];

const cardEls = PERSONA_CONFIGS.map((p) => {
  const cg = el('g', null, personasLayer);
  const cardW = 380, cardH = 560;

  // Frosted Glass Card Base with Specular Rim
  el('rect', {
    x: -cardW / 2, y: -cardH / 2, width: cardW, height: cardH, rx: 24,
    fill: 'url(#cardGrad)', stroke: 'url(#cardRimGrad)', 'stroke-width': 2
  }, cg);

  // Category Role Badge
  const pillG = el('g', null, cg);
  tr(pillG, -cardW / 2 + 28, -cardH / 2 + 28);
  el('rect', { width: 130, height: 28, rx: 8, fill: '#0F2747', stroke: '#1E3A5F', 'stroke-width': 1 }, pillG);
  txt(pillG, p.role, 65, 19, { size: 12, weight: 800, fill: C.CYAN_GLOW, anchor: 'middle', ls: 0.1 });

  // High-Fidelity Illustration Vignette
  const illG = el('g', null, cg);
  tr(illG, 0, -45);
  p.drawIll(illG);

  // Persona Names & Details
  txt(cg, p.name, -cardW / 2 + 30, 95, { size: 30, weight: 800, fill: C.WHITE });
  txt(cg, p.desc, -cardW / 2 + 30, 134, { size: 22, weight: 600, fill: C.SLATE_200 });
  txt(cg, p.loc, -cardW / 2 + 30, 166, { size: 16, weight: 400, fill: C.SLATE_400 });

  // S1 Warning Risk Chip
  const riskChip = el('g', null, cg);
  tr(riskChip, -cardW / 2 + 28, 202);
  el('rect', { width: cardW - 56, height: 42, rx: 12, fill: '#2A1111', stroke: '#DC2626', 'stroke-width': 1.2 }, riskChip);
  txt(riskChip, p.risk, (cardW - 56) / 2, 27, { size: 15, weight: 700, fill: '#FCA5A5', anchor: 'middle' });

  // S7 Emerald Safe Badge (Flipped on return)
  const safeBadge = el('g', null, cg);
  tr(safeBadge, -cardW / 2 + 28, 202);
  el('rect', { width: cardW - 56, height: 42, rx: 12, fill: C.EMERALD_BG, stroke: C.EMERALD, 'stroke-width': 1.8 }, safeBadge);
  txt(safeBadge, '✓ ' + p.safeMsg, (cardW - 56) / 2, 27, { size: 16, weight: 800, fill: '#6EE7B7', anchor: 'middle' });
  vis(safeBadge, 0);

  return { cg, p, riskChip, safeBadge };
});

/* =====================================================================
   HERO SMARTPHONE CONTAINER (S2 - S7)
   Flagship Device Aesthetics: Metallic Rim, Dynamic Island, Specular Glass
   ===================================================================== */
const phoneLayer = el('g', null, svg);
vis(phoneLayer, 0);

const screenClipId = uid('screenClip');
const sClip = el('clipPath', { id: screenClipId }, defs);
el('rect', { x: 0, y: 0, width: 390, height: 844, rx: 44 }, sClip);

const phoneRoot = el('g', null, phoneLayer);

// Floating soft ambient shadow
el('ellipse', { cx: 0, cy: 450, rx: 240, ry: 40, fill: '#000000', 'fill-opacity': '0.6' }, phoneRoot);

// Outer metallic bezel & chassis
el('rect', { x: -214, y: -448, width: 428, height: 896, rx: 56, fill: '#050B14' }, phoneRoot);
el('rect', { x: -208, y: -442, width: 416, height: 884, rx: 50, fill: 'url(#phoneRim)', stroke: '#1E293B', 'stroke-width': 2 }, phoneRoot);
el('rect', { x: -199, y: -426, width: 398, height: 852, rx: 46, fill: '#020617' }, phoneRoot);

// Screen Viewport (Clip Area)
const screenG = el('g', { 'clip-path': 'url(#' + screenClipId + ')' }, phoneRoot);
tr(screenG, -195, -422);

// Dynamic Island & Front Camera Lens
const dynamicIsland = el('g', null, phoneRoot);
tr(dynamicIsland, 0, -406);
el('rect', { x: -58, y: -14, width: 116, height: 28, rx: 14, fill: '#000000', stroke: '#1E293B', 'stroke-width': 1 }, dynamicIsland);
el('circle', { cx: 36, cy: 0, r: 5.5, fill: '#0F172A', stroke: '#1E293B', 'stroke-width': 1 }, dynamicIsland);
el('circle', { cx: 37, cy: -1, r: 1.8, fill: '#38BDF8', 'fill-opacity': 0.7 }, dynamicIsland);
el('line', { x1: -25, y1: 0, x2: 12, y2: 0, stroke: '#1E293B', 'stroke-width': 3, 'stroke-linecap': 'round' }, dynamicIsland);

// Screen Gloss Specular Sheen
el('rect', {
  x: -195, y: -422, width: 390, height: 844, rx: 44,
  fill: 'url(#phoneGlass)', 'pointer-events': 'none'
}, phoneRoot);

/* =====================================================================
   SCREEN 1: S2 Lock Screen & Critical Flood Alert
   ===================================================================== */
const s2Screen = el('g', null, screenG);
vis(s2Screen, 0);

el('rect', { width: 390, height: 844, fill: '#07162B' }, s2Screen);
el('circle', { cx: 195, cy: 380, r: 280, fill: '#0E2A52', 'fill-opacity': '0.7' }, s2Screen);

// Lock Screen Top Status Bar
txt(s2Screen, '09:41', 36, 36, { size: 16, weight: 600, fill: C.WHITE });
el('circle', { cx: 326, cy: 30, r: 3, fill: C.WHITE }, s2Screen);
el('circle', { cx: 336, cy: 30, r: 3, fill: C.WHITE }, s2Screen);
el('rect', { x: 346, y: 24, width: 22, height: 12, rx: 3, fill: 'none', stroke: C.WHITE, 'stroke-width': 1.5 }, s2Screen);
el('rect', { x: 348, y: 26, width: 15, height: 8, rx: 1.5, fill: C.WHITE }, s2Screen);

// Big Apple-style Lock Clock
txt(s2Screen, 'Monday, 28 September', 195, 145, { size: 17, weight: 600, fill: C.SLATE_300, anchor: 'middle' });
txt(s2Screen, '09:41', 195, 230, { size: 84, weight: 800, fill: C.WHITE, anchor: 'middle' });

// Push Notification Banner Card
const s2PushCard = el('g', null, s2Screen);
tr(s2PushCard, 18, 290);
el('rect', {
  width: 354, height: 172, rx: 24,
  fill: 'rgba(15, 31, 56, 0.94)', stroke: '#38BDF8', 'stroke-width': 1.5
}, s2PushCard);

// App Icon with Wave Emblem
el('rect', { x: 18, y: 18, width: 44, height: 44, rx: 12, fill: C.CYAN }, s2PushCard);
el('path', { d: 'M 26 42 Q 33 30 40 42 Q 47 54 54 42', fill: 'none', stroke: '#FFFFFF', 'stroke-width': 3, 'stroke-linecap': 'round' }, s2PushCard);

txt(s2PushCard, 'FLOODWAY · CRITICAL ALERT', 74, 37, { size: 13, weight: 800, fill: C.WATER, ls: 0.08 });
txt(s2PushCard, 'now', 315, 37, { size: 12, weight: 400, fill: C.SLATE_400 });

txt(s2PushCard, 'Flood risk rising near you', 18, 92, { size: 21, weight: 800, fill: C.WHITE });
txt(s2PushCard, 'Curbside overflow detected on commute route.', 18, 120, { size: 15, weight: 400, fill: C.SLATE_300 });

// Action prompt with pulsing indicator
const s2CtaG = el('g', null, s2PushCard);
tr(s2CtaG, 18, 148);
txt(s2CtaG, 'Tap for your safest route →', 0, 0, { size: 16, weight: 700, fill: C.CYAN_GLOW });

// Lock screen bottom buttons
el('circle', { cx: 48, cy: 780, r: 24, fill: 'rgba(255,255,255,0.12)' }, s2Screen);
txt(s2Screen, '🔦', 48, 786, { size: 18, weight: 600, anchor: 'middle' });
el('circle', { cx: 342, cy: 780, r: 24, fill: 'rgba(255,255,255,0.12)' }, s2Screen);
txt(s2Screen, '📷', 342, 786, { size: 18, weight: 600, anchor: 'middle' });

// S2 Right Kinetic Headline
const s2SideG = el('g', null, svg);
vis(s2SideG, 0);
const s2Wordmark = createMaskedLine(s2SideG, 'FloodWay', 1120, 500, { size: 108, weight: 800, fill: C.WHITE }, { w: 750 });
const s2Tagline = createMaskedLine(s2SideG, 'Know before you go.', 1120, 580, { size: 48, weight: 600, fill: C.CYAN_GLOW }, { w: 750 });

/* =====================================================================
   SCREEN 2: S3 Digital Twin (Architectural Malaysian Terrace House)
   Precision Architectural Cutaway with Roof, Living Room, Porch, Sedan & Drain
   ===================================================================== */
const s3Screen = el('g', null, screenG);
vis(s3Screen, 0);

el('rect', { width: 390, height: 844, fill: '#08172E' }, s3Screen);

txt(s3Screen, 'FloodWay Twin', 24, 76, { size: 22, weight: 800, fill: C.WHITE });
const s3SensorPill = el('g', null, s3Screen);
tr(s3SensorPill, 240, 58);
el('rect', { width: 126, height: 26, rx: 8, fill: '#064E3B', stroke: C.EMERALD, 'stroke-width': 1 }, s3SensorPill);
txt(s3SensorPill, '● LIVE SENSOR', 63, 18, { size: 12, weight: 800, fill: '#6EE7B7', anchor: 'middle' });

// Architectural Cross-Section Viewport (354 x 400)
const s3CrossSection = el('g', null, s3Screen);
tr(s3CrossSection, 18, 106);

// Blueprint Framed Container
el('rect', { width: 354, height: 400, rx: 20, fill: '#061426', stroke: '#1E3A5F', 'stroke-width': 1.5 }, s3CrossSection);

// Subterranean Ground & Foundation Strata
el('rect', { x: 0, y: 340, width: 354, height: 60, fill: '#040B14' }, s3CrossSection);

// 1. Pitched Terracotta Roof & Gutter (+3.3m Ceiling)
el('polygon', { points: '185,110 354,110 354,135 185,150', fill: '#B45309' }, s3CrossSection); // Clay Roof Tiles
el('line', { x1: 185, y1: 150, x2: 354, y2: 135, stroke: '#78350F', 'stroke-width': 3 }, s3CrossSection);
el('rect', { x: 180, y: 148, width: 10, height: 6, fill: '#334155' }, s3CrossSection); // Rainwater Gutter

// 2. Double-Storey Living Room Section (+0.35m Finished Floor)
el('rect', { x: 190, y: 150, width: 164, height: 190, fill: '#0C203B' }, s3CrossSection); // Room Interior
// Raised Concrete Slab (+0.35m)
el('rect', { x: 190, y: 260, width: 164, height: 80, fill: '#132845' }, s3CrossSection);
// Timber Parquet Flooring
el('rect', { x: 190, y: 256, width: 164, height: 5, fill: '#C29B68' }, s3CrossSection);

// Living Room Window with Warm Interior Glow
el('rect', { x: 235, y: 165, width: 90, height: 80, rx: 6, fill: '#1E3A5F', stroke: '#38BDF8', 'stroke-width': 1.5 }, s3CrossSection);
el('rect', { x: 240, y: 170, width: 80, height: 70, rx: 4, fill: '#FEF08A', 'fill-opacity': '0.22' }, s3CrossSection);

// Wall-Mounted Main Electrical DB Box (at safe 1.8m height)
el('rect', { x: 200, y: 175, width: 22, height: 35, rx: 3, fill: '#334155', stroke: '#F59E0B', 'stroke-width': 1.2 }, s3CrossSection);
el('circle', { cx: 211, cy: 186, r: 3, fill: '#10B981' }, s3CrossSection); // Safety LED
txt(s3CrossSection, 'DB', 211, 203, { size: 9, weight: 800, fill: '#FDE68A', anchor: 'middle' });

// Modern Sofa Silhouette
el('rect', { x: 250, y: 226, width: 72, height: 30, rx: 6, fill: '#1E3A5F' }, s3CrossSection);
el('rect', { x: 256, y: 215, width: 60, height: 18, rx: 4, fill: '#334155' }, s3CrossSection);

// 3. Carport / Porch Tiled Driveway (+0.20m) & Overhead Pergola
el('rect', { x: 70, y: 280, width: 120, height: 60, fill: '#0A1C30' }, s3CrossSection);
// Paved Porch Tiles
el('line', { x1: 70, y1: 280, x2: 190, y2: 280, stroke: '#64748B', 'stroke-width': 3 }, s3CrossSection);
// Carport Canopy / Pergola Roof
el('line', { x1: 70, y1: 175, x2: 190, y2: 190, stroke: '#334155', 'stroke-width': 4 }, s3CrossSection);
el('rect', { x: 186, y: 190, width: 6, height: 90, fill: '#475569' }, s3CrossSection); // Boundary Column

// 4. Detailed Malaysian Modern Sedan parked in Porch
const carG = el('g', null, s3CrossSection);
tr(carG, 78, 235);
// Aerodynamic body contour
el('path', { d: 'M 4 32 L 20 6 L 76 6 L 102 32 Z', fill: '#0284C7', stroke: '#38BDF8', 'stroke-width': 1.5 }, carG);
el('path', { d: 'M 24 8 L 50 8 L 50 30 L 10 30 Z', fill: '#061324', stroke: '#1E3A5F', 'stroke-width': 1 }, carG); // Windshield
el('path', { d: 'M 54 8 L 72 8 L 94 30 L 54 30 Z', fill: '#061324', stroke: '#1E3A5F', 'stroke-width': 1 }, carG); // Rear window
el('rect', { x: -6, y: 30, width: 122, height: 25, rx: 6, fill: '#0369A1' }, carG); // Chassis
el('line', { x1: 45, y1: 34, x2: 58, y2: 34, stroke: '#E2E8F0', 'stroke-width': 2, 'stroke-linecap': 'round' }, carG); // Door handle
// LED Lamps
el('polygon', { points: '-6,32 -1,32 -3,38 -6,38', fill: '#FEF08A' }, carG);
el('polygon', { points: '116,32 116,38 112,38 114,32', fill: '#EF4444' }, carG);
// Wheels & Rims
el('circle', { cx: 18, cy: 54, r: 13, fill: '#0F172A', stroke: '#64748B', 'stroke-width': 2.5 }, carG);
el('circle', { cx: 18, cy: 54, r: 6.5, fill: '#E2E8F0' }, carG);
el('circle', { cx: 90, cy: 54, r: 13, fill: '#0F172A', stroke: '#64748B', 'stroke-width': 2.5 }, carG);
el('circle', { cx: 90, cy: 54, r: 6.5, fill: '#E2E8F0' }, carG);

// 5. Street & Deep Monsoon Drain ("Longkang") (0.00m)
el('rect', { x: 0, y: 335, width: 70, height: 65, fill: '#071220' }, s3CrossSection);
// Concrete curb wall (+0.15m height)
el('rect', { x: 64, y: 280, width: 6, height: 60, fill: '#475569' }, s3CrossSection);
// Drain metal grating
for (let gx = 6; gx < 64; gx += 8) {
  el('line', { x1: gx, y1: 335, x2: gx, y2: 342, stroke: '#64748B', 'stroke-width': 2 }, s3CrossSection);
}

// Architectural Elevation Datum Lines
el('line', { x1: 190, y1: 256, x2: 354, y2: 256, stroke: '#38BDF8', 'stroke-width': 1, 'stroke-dasharray': '4 4', 'stroke-opacity': 0.5 }, s3CrossSection);
txt(s3CrossSection, '+0.35m Floor Threshold', 272, 250, { size: 10, weight: 700, fill: '#38BDF8', anchor: 'middle' });

el('line', { x1: 70, y1: 280, x2: 190, y2: 280, stroke: '#F59E0B', 'stroke-width': 1, 'stroke-dasharray': '4 4', 'stroke-opacity': 0.5 }, s3CrossSection);
txt(s3CrossSection, '+0.20m Porch', 130, 274, { size: 10, weight: 700, fill: '#F59E0B', anchor: 'middle' });

txt(s3CrossSection, 'Longkang (0.0m)', 35, 386, { size: 10, weight: 700, fill: C.SLATE_400, anchor: 'middle' });

// Surveyor's Graduated Rod Staff
const gaugeStaff = el('g', null, s3CrossSection);
tr(gaugeStaff, 14, 210);
el('rect', { width: 9, height: 180, fill: '#FEF08A', stroke: '#0F172A', 'stroke-width': 1 }, gaugeStaff);
for (let my = 0; my < 180; my += 20) {
  el('rect', { x: 0, y: my, width: 9, height: 10, fill: '#DC2626' }, gaugeStaff);
}

// 6. Dynamic Rising Water Plane
const s3WaterPlane = el('g', null, s3CrossSection);
const s3WaterRect = el('rect', {
  x: 0, y: 400, width: 354, height: 0,
  fill: 'url(#waterGrad)'
}, s3WaterPlane);
const s3WaterLine = el('line', {
  x1: 0, y1: 400, x2: 354, y2: 400,
  stroke: '#67E8F9', 'stroke-width': 2.5
}, s3WaterPlane);

// Water Gauge Readout Card
const s3GaugeCard = el('g', null, s3Screen);
tr(s3GaugeCard, 18, 524);
el('rect', { width: 354, height: 106, rx: 20, fill: '#0C203A', stroke: '#1E3A5F', 'stroke-width': 1.5 }, s3GaugeCard);
txt(s3GaugeCard, 'WATER LEVEL GAUGE', 24, 34, { size: 13, weight: 800, fill: C.SLATE_400, ls: 0.1 });
const s3GaugeVal = txt(s3GaugeCard, '0.00 m', 24, 80, { size: 44, weight: 800, fill: C.WATER });

const s3StatusChip = el('g', null, s3GaugeCard);
tr(s3StatusChip, 216, 46);
const s3ChipBg = el('rect', { width: 114, height: 36, rx: 10, fill: C.EMERALD_BG, stroke: C.EMERALD, 'stroke-width': 1.2 }, s3StatusChip);
const s3ChipTxt = txt(s3StatusChip, 'SAFE', 57, 24, { size: 14, weight: 800, fill: '#6EE7B7', anchor: 'middle' });

// Life-Safety Action Button: "Navigate to Safe Shelter (PPS)"
const s3NavBtn = el('g', null, s3Screen);
tr(s3NavBtn, 18, 650);

const s3PulseRing = el('rect', {
  x: -4, y: -4, width: 362, height: 96, rx: 26,
  fill: 'none', stroke: C.EMERALD, 'stroke-width': 3, 'stroke-opacity': 0
}, s3NavBtn);

el('rect', { width: 354, height: 88, rx: 22, fill: 'url(#btnGrad)', stroke: '#6EE7B7', 'stroke-width': 1.5 }, s3NavBtn);
txt(s3NavBtn, 'Navigate to Safe Shelter (PPS)', 177, 38, { size: 18, weight: 800, fill: '#022C22', anchor: 'middle' });
txt(s3NavBtn, 'SK Seksyen 24 · 7 min away (1.2 km) →', 177, 65, { size: 15, weight: 700, fill: '#064E3B', anchor: 'middle' });
vis(s3NavBtn, 0);

// S3 Right Kinetic Headlines
const s3SideG = el('g', null, svg);
vis(s3SideG, 0);
const s3Side1 = createMaskedLine(s3SideG, 'See the water level.', 1120, 490, { size: 64, weight: 800, fill: C.WHITE }, { w: 750 });
const s3Side2 = createMaskedLine(s3SideG, 'Then see where to go.', 1120, 565, { size: 64, weight: 800, fill: C.EMERALD }, { w: 750 });

/* =====================================================================
   SCREEN 3: S4 Shelter Navigation Map (Full-Fidelity Dark Mode GPS Map)
   Authentic Vector Cartography: Klang River, Highway Curves, Turn Banner & ETA Card
   ===================================================================== */
const s4Screen = el('g', null, screenG);
vis(s4Screen, 0);

el('rect', { width: 390, height: 844, fill: '#071529' }, s4Screen);

txt(s4Screen, 'Shelter Navigation', 24, 76, { size: 22, weight: 800, fill: C.WHITE });
const s4RoutePill = el('g', null, s4Screen);
tr(s4RoutePill, 240, 58);
el('rect', { width: 126, height: 26, rx: 8, fill: '#450A0A', stroke: C.RED, 'stroke-width': 1 }, s4RoutePill);
txt(s4RoutePill, 'ACTIVE ROUTE', 63, 18, { size: 12, weight: 800, fill: '#FCA5A5', anchor: 'middle' });

// Turn-by-Turn Navigation Map Card (354 x 508)
const s4MapCanvas = el('g', null, s4Screen);
tr(s4MapCanvas, 18, 106);
el('rect', { width: 354, height: 508, rx: 22, fill: '#081628', stroke: '#1E3A5F', 'stroke-width': 1.5 }, s4MapCanvas);

// Realistic Cartographic City Parcels & Districts
const mapDistricts = [
  [15, 60, 65, 55], [95, 60, 85, 55], [205, 60, 135, 55],
  [15, 130, 65, 75], [95, 130, 85, 75], [205, 130, 135, 75],
  [15, 220, 65, 80], [95, 220, 85, 80], [205, 220, 135, 80],
  [15, 315, 65, 95], [95, 315, 85, 95], [205, 315, 135, 95],
  [15, 425, 65, 70], [95, 425, 85, 70], [205, 425, 135, 70]
];
mapDistricts.forEach(([dx, dy, dw, dh]) => {
  el('rect', { x: dx, y: dy, width: dw, height: dh, rx: 6, fill: '#0C1E34' }, s4MapCanvas);
});

// Winding Klang River Corridor with Bridge Crossings
el('path', {
  d: 'M 175 0 C 220 120 145 280 185 508 L 225 508 C 185 280 260 120 215 0 Z',
  fill: '#08254A', stroke: '#0284C7', 'stroke-width': 1.5
}, s4MapCanvas);

// Realistic Road Network with Highway Overpasses & Avenues
const roadNetwork = [
  // Primary Arterials
  'M 10 120 L 344 120',
  'M 10 210 L 344 210',
  'M 10 310 L 344 310',
  'M 10 420 L 344 420',
  // Cross Streets
  'M 85 10 L 85 498',
  'M 195 10 L 195 498'
];
roadNetwork.forEach(d => {
  el('path', { d, stroke: '#152C48', 'stroke-width': 20, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s4MapCanvas);
  el('path', { d, stroke: '#1E3D64', 'stroke-width': 14, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s4MapCanvas);
});

// Road Names in Crisp Typographic Badges
txt(s4MapCanvas, 'Persiaran Jubli Perak', 95, 116, { size: 9, weight: 700, fill: C.SLATE_400 });
txt(s4MapCanvas, 'Lebuhraya KESAS', 95, 206, { size: 9, weight: 700, fill: C.SLATE_400 });
txt(s4MapCanvas, 'Jalan Subang', 95, 306, { size: 9, weight: 700, fill: C.SLATE_400 });

// Flooded Dangerous Road Hazard Zone (Persiaran Kewajipan Underpass)
el('path', {
  d: 'M 85 310 L 195 310 L 195 210',
  stroke: '#DC2626', 'stroke-width': 18, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}, s4MapCanvas);

// Red Warning Hazard Pill with Ripple
const floodBadge = el('g', null, s4MapCanvas);
tr(floodBadge, 140, 260);
el('rect', { x: -68, y: -15, width: 136, height: 30, rx: 10, fill: C.RED_BG, stroke: C.RED, 'stroke-width': 1.5 }, floodBadge);
txt(floodBadge, '⛔ ROAD FLOODED (0.45m)', 0, 5, { size: 10, weight: 800, fill: '#FCA5A5', anchor: 'middle' });

// Safe Navigation Route (Radiant Emerald Curve Bypassing Flood)
const safeRoutePath = el('path', {
  d: 'M 45 420 L 45 210 Q 45 120 120 120 L 290 120',
  fill: 'none', stroke: C.EMERALD, 'stroke-width': 10,
  'stroke-linecap': 'round', 'stroke-linejoin': 'round'
}, s4MapCanvas);
prepDraw(safeRoutePath);

// Top Turn-by-Turn Instruction Banner
const s4TurnBanner = el('g', null, s4MapCanvas);
tr(s4TurnBanner, 15, 12);
el('rect', { width: 324, height: 44, rx: 12, fill: 'rgba(6, 20, 38, 0.94)', stroke: '#1E3A5F', 'stroke-width': 1.2 }, s4TurnBanner);
txt(s4TurnBanner, '↰', 24, 28, { size: 20, weight: 800, fill: C.EMERALD });
txt(s4TurnBanner, 'In 300m, turn left onto Jubli Perak', 48, 27, { size: 13, weight: 700, fill: C.WHITE });

// Destination PPS Shelter Pin (SK Seksyen 24)
const ppsMarker = el('g', null, s4MapCanvas);
tr(ppsMarker, 290, 120);
el('circle', { cx: 0, cy: 0, r: 24, fill: 'rgba(16, 185, 129, 0.3)' }, ppsMarker);
el('circle', { cx: 0, cy: 0, r: 16, fill: C.EMERALD, stroke: '#FFFFFF', 'stroke-width': 2 }, ppsMarker);
txt(ppsMarker, 'PPS', 0, 5, { size: 10, weight: 800, fill: '#022C22', anchor: 'middle' });

// User Live Location Puck
const userMarker = el('g', null, s4MapCanvas);
tr(userMarker, 45, 420);
el('circle', { cx: 0, cy: 0, r: 22, fill: 'rgba(56, 189, 248, 0.35)' }, userMarker);
el('circle', { cx: 0, cy: 0, r: 13, fill: C.CYAN, stroke: '#FFFFFF', 'stroke-width': 2.5 }, userMarker);

// Floating Shelter ETA Card at Bottom
const s4EtaCard = el('g', null, s4Screen);
tr(s4EtaCard, 18, 626);
el('rect', { width: 354, height: 168, rx: 24, fill: '#0C203A', stroke: '#1E3A5F', 'stroke-width': 1.5 }, s4EtaCard);
txt(s4EtaCard, 'SK Seksyen 24 Shah Alam', 20, 38, { size: 20, weight: 800, fill: C.WHITE });
txt(s4EtaCard, '1.2 km · 7 min (Safe by car)', 20, 70, { size: 16, weight: 600, fill: C.SLATE_200 });

const s4SafeBadge = el('g', null, s4EtaCard);
tr(s4SafeBadge, 218, 52);
el('rect', { width: 116, height: 28, rx: 8, fill: C.EMERALD_BG, stroke: C.EMERALD, 'stroke-width': 1 }, s4SafeBadge);
txt(s4SafeBadge, '✓ Route Safe', 58, 19, { size: 13, weight: 700, fill: '#6EE7B7', anchor: 'middle' });

txt(s4EtaCard, 'Shelter Capacity: 146 / 200 (Open)', 20, 116, { size: 13, weight: 600, fill: C.SLATE_400 });
el('rect', { x: 20, y: 128, width: 314, height: 10, rx: 5, fill: '#1E293B' }, s4EtaCard);
el('rect', { x: 20, y: 128, width: 228, height: 10, rx: 5, fill: C.EMERALD }, s4EtaCard);

// S4 Right Kinetic Headlines
const s4SideG = el('g', null, svg);
vis(s4SideG, 0);
const s4Side1 = createMaskedLine(s4SideG, 'A route that avoids', 1120, 490, { size: 64, weight: 800, fill: C.WHITE }, { w: 750 });
const s4Side2 = createMaskedLine(s4SideG, 'flooded roads.', 1120, 565, { size: 64, weight: 800, fill: C.EMERALD }, { w: 750 });

/* =====================================================================
   SCREEN 4: S5 1-Tap Family SOS Broadcast
   ===================================================================== */
const s5Screen = el('g', null, screenG);
vis(s5Screen, 0);

el('rect', { width: 390, height: 844, fill: '#08172D' }, s5Screen);

txt(s5Screen, 'Family LifeLine', 195, 76, { size: 24, weight: 800, fill: C.WHITE, anchor: 'middle' });
txt(s5Screen, 'Instant Telegram Emergency Broadcast', 195, 106, { size: 14, weight: 600, fill: C.SLATE_300, anchor: 'middle' });

// Central Glowing SOS Action Hub
const s5BtnG = el('g', null, s5Screen);
tr(s5BtnG, 195, 230);
const s5Ripple1 = el('circle', { cx: 0, cy: 0, r: 0, fill: 'none', stroke: C.CYAN_GLOW, 'stroke-width': 3, 'stroke-opacity': 0 }, s5BtnG);
const s5Ripple2 = el('circle', { cx: 0, cy: 0, r: 0, fill: 'none', stroke: C.EMERALD, 'stroke-width': 2, 'stroke-opacity': 0 }, s5BtnG);
el('circle', { cx: 0, cy: 0, r: 76, fill: C.CYAN, stroke: '#60A5FA', 'stroke-width': 3 }, s5BtnG);
txt(s5BtnG, '1-TAP SOS', 0, -6, { size: 22, weight: 800, fill: '#FFFFFF', anchor: 'middle' });
txt(s5BtnG, 'BROADCAST', 0, 20, { size: 14, weight: 700, fill: '#E0F2FE', anchor: 'middle' });

// Family Members Delivery List
const FAMILY_MEMBERS = [
  { name: 'Papa', loc: 'Subang Jaya', phone: '+60 12-*** 8812', initial: 'P', rel: 'Father' },
  { name: 'Mama', loc: 'Shah Alam', phone: '+60 19-*** 3491', initial: 'M', rel: 'Mother' },
  { name: 'Adik', loc: 'USJ 4', phone: '+60 17-*** 9023', initial: 'A', rel: 'Brother' }
];

const s5ContactRows = FAMILY_MEMBERS.map((m, idx) => {
  const g = el('g', null, s5Screen);
  tr(g, 18, 355 + idx * 92);
  el('rect', { width: 354, height: 78, rx: 18, fill: '#0D213B', stroke: '#1E3A5F', 'stroke-width': 1.5 }, g);

  el('circle', { cx: 40, cy: 39, r: 24, fill: '#142E52' }, g);
  txt(g, m.initial, 40, 46, { size: 18, weight: 800, fill: C.WATER, anchor: 'middle' });

  txt(g, m.name + ' (' + m.rel + ')', 76, 35, { size: 17, weight: 800, fill: C.WHITE });
  txt(g, m.loc + ' · ' + m.phone, 76, 57, { size: 13, weight: 400, fill: C.SLATE_400 });

  const statusG = el('g', null, g);
  tr(statusG, 300, 39);
  const checkCircle = el('circle', { cx: 0, cy: 0, r: 18, fill: '#1E293B' }, statusG);
  const checkIcon = txt(statusG, '✓', 0, 6, { size: 16, weight: 800, fill: C.SLATE_400, anchor: 'middle' });

  return { g, checkCircle, checkIcon };
});

const s5Reassurance = el('g', null, s5Screen);
tr(s5Reassurance, 18, 650);
el('rect', { width: 354, height: 64, rx: 18, fill: C.EMERALD_BG, stroke: C.EMERALD, 'stroke-width': 1.2 }, s5Reassurance);
txt(s5Reassurance, '✓ Live GPS shared with family group', 177, 38, { size: 14, weight: 700, fill: '#6EE7B7', anchor: 'middle' });

// S5 Right Kinetic Headlines
const s5SideG = el('g', null, svg);
vis(s5SideG, 0);
const s5Side1 = createMaskedLine(s5SideG, 'One tap.', 1120, 490, { size: 64, weight: 800, fill: C.WHITE }, { w: 750 });
const s5Side2 = createMaskedLine(s5SideG, 'Let your family know.', 1120, 565, { size: 64, weight: 800, fill: C.CYAN_GLOW }, { w: 750 });

/* =====================================================================
   SCREEN 5: S6 Flood Intelligence Hub inside Phone
   ===================================================================== */
const s6Screen = el('g', null, screenG);
vis(s6Screen, 0);

el('rect', { width: 390, height: 844, fill: '#07162C' }, s6Screen);
txt(s6Screen, 'Flood Intelligence', 24, 76, { size: 22, weight: 800, fill: C.WHITE });
const s6LivePill = el('g', null, s6Screen);
tr(s6LivePill, 240, 58);
el('rect', { width: 126, height: 26, rx: 8, fill: '#064E3B', stroke: C.EMERALD, 'stroke-width': 1 }, s6LivePill);
txt(s6LivePill, '● ALL SYSTEMS OK', 63, 18, { size: 11, weight: 800, fill: '#6EE7B7', anchor: 'middle' });

const S6_PHONE_CARDS = [
  { title: 'Sungai Damansara Sensor', val: '4.82 m (Normal)', sub: 'Telemetry updated 1m ago', icon: '🌊', color: C.CYAN },
  { title: 'MetMalaysia Radar Feed', val: 'Precipitation 22 mm/h', sub: 'Easing within 25 min', icon: '🌧️', color: C.AMBER },
  { title: 'AI Inundation Model', val: 'Route Verified Dry', sub: '60-min forecast horizon', icon: '⚡', color: C.EMERALD }
];
S6_PHONE_CARDS.forEach((card, idx) => {
  const g = el('g', null, s6Screen);
  tr(g, 18, 120 + idx * 130);
  el('rect', { width: 354, height: 115, rx: 20, fill: '#0C203B', stroke: '#1E3A5F', 'stroke-width': 1.5 }, g);
  el('rect', { x: 20, y: 22, width: 44, height: 44, rx: 12, fill: '#142E54' }, g);
  txt(g, card.icon, 42, 50, { size: 20, weight: 600, anchor: 'middle' });
  txt(g, card.title, 76, 40, { size: 15, weight: 700, fill: C.SLATE_300 });
  txt(g, card.val, 76, 68, { size: 19, weight: 800, fill: card.color });
  txt(g, card.sub, 76, 92, { size: 13, weight: 400, fill: C.SLATE_400 });
});

/* =====================================================================
   S6: HOW IT WORKS (3-Node Technical Architecture Pipeline)
   ===================================================================== */
const s6Layer = el('g', null, svg);
vis(s6Layer, 0);

const s6Title = createMaskedLine(s6Layer, 'How FloodWay Works', 980, 240, { size: 54, weight: 800, fill: C.WHITE }, { w: 800 });

const s6NodesG = el('g', null, s6Layer);
tr(s6NodesG, 980, 320);

const PIPELINE_NODES = [
  { title: 'Rain and water data', sub: 'JPS telemetry & Doppler rainfall radar', icon: '📡' },
  { title: 'Forecast service', sub: 'Hydrological runoff & inundation AI', icon: '⚡' },
  { title: 'Your route and alerts', sub: 'Real-time shelter navigation & instant SOS', icon: '🛡️' }
];

const s6Cards = PIPELINE_NODES.map((node, idx) => {
  const g = el('g', null, s6NodesG);
  tr(g, 0, idx * 122);

  el('rect', { width: 480, height: 92, rx: 20, fill: '#0C203B', stroke: '#1E3A5F', 'stroke-width': 1.5 }, g);
  el('rect', { x: 20, y: 19, width: 54, height: 54, rx: 14, fill: '#142E54' }, g);
  txt(g, node.icon, 47, 53, { size: 24, weight: 600, fill: '#FFFFFF', anchor: 'middle' });

  txt(g, node.title, 92, 44, { size: 22, weight: 800, fill: C.WHITE });
  txt(g, node.sub, 92, 69, { size: 15, weight: 400, fill: C.SLATE_400 });

  let conn = null, dot = null;
  if (idx < 2) {
    conn = el('line', { x1: 47, y1: 92, x2: 47, y2: 122, stroke: C.CYAN, 'stroke-width': 3, 'stroke-dasharray': '4 4' }, g);
    dot = el('circle', { cx: 47, cy: 107, r: 5, fill: C.WATER }, g);
  }
  return { g, conn, dot };
});

const s6CommunityPill = el('g', null, s6Layer);
tr(s6CommunityPill, 980, 715);
el('rect', { width: 440, height: 48, rx: 24, fill: '#0C2B4E', stroke: C.CYAN_GLOW, 'stroke-width': 1.5 }, s6CommunityPill);
txt(s6CommunityPill, '✦ Community reports, AI-checked', 220, 31, { size: 18, weight: 800, fill: C.CYAN_GLOW, anchor: 'middle' });

/* =====================================================================
   S7: HOME SAFE (26.0 - 30.0s) & INVISIBLE LOOP POINT
   ===================================================================== */
const s7Layer = el('g', null, svg);
vis(s7Layer, 0);

const s7Line1 = createMaskedLine(s7Layer, "One glance to know if you're safe.", CX, 130, { size: 46, weight: 800, fill: C.WHITE }, { anchor: 'middle', w: 1400 });
const s7Line2 = createMaskedLine(s7Layer, "One tap to find shelter.", CX, 185, { size: 46, weight: 800, fill: C.EMERALD }, { anchor: 'middle', w: 1400 });

const s7BrandG = el('g', null, s7Layer);
tr(s7BrandG, CX, 960);
txt(s7BrandG, 'FloodWay', 0, 0, { size: 64, weight: 800, fill: C.WHITE, anchor: 'middle' });
txt(s7BrandG, CONFIG.SITE_URL, 0, 36, { size: 22, weight: 600, fill: C.WATER, anchor: 'middle' });

/* =====================================================================
   PURE TIME FUNCTION: window.renderFrame(t)
   ===================================================================== */
window.renderFrame = function(rawT) {
  const t = wrap(rawT);

  /* ---------- Debug Timecode Overlay ---------- */
  if (DEBUG) {
    const dbg = document.getElementById('debug');
    if (dbg) {
      dbg.style.display = 'block';
      let sceneName = 'S1 The People';
      if (t >= 26.0) sceneName = 'S7 Home Safe + Loop';
      else if (t >= 22.0) sceneName = 'S6 How It Works';
      else if (t >= 17.5) sceneName = 'S5 Tell Your People';
      else if (t >= 12.5) sceneName = 'S4 Smart Route';
      else if (t >= 7.5) sceneName = 'S3 Watch The Water';
      else if (t >= 3.6) sceneName = 'S2 The Hero Phone';
      dbg.textContent = 't = ' + t.toFixed(2) + 's | frame ' + Math.floor(t * 30) + ' / 900\\n' + sceneName;
    }
  }

  /* ---------- 1. Periodic Rain Streaks ---------- */
  let rainAlpha = 0.65;
  if (t >= 3.5 && t < 26.0) {
    rainAlpha = 0.22;
  } else if (t >= 26.0) {
    rainAlpha = lerp(0.22, 0.65, prog(t, 28.5, 1.4));
  }

  const phaseT = t % RAIN_PERIOD;
  for (let i = 0; i < RAIN_N; i++) {
    const d = rainDrops[i];
    const curY = (d.y0 + d.speed * phaseT) % 1300 - 80;
    const curX = d.x0 - curY * 0.36;
    tr(d.line, curX, curY);
    sa(d.line, 'stroke-opacity', (d.opacity * rainAlpha).toFixed(3));
  }

  /* ---------- 2. Legal Disclaimers (S1 - S5) ---------- */
  const tagsOp = (t >= 0.4 && t < 22.0) ? (outExpo(prog(t, 0.4, 0.6)) * (1 - inExpo(prog(t, 21.4, 0.6)))) : 0;
  vis(tagsG, tagsOp);

  const showPersonasTag = (t >= 0.4 && t < 3.6) || (t >= 26.2 && t < 29.0);
  vis(tagPersonas, showPersonasTag ? 0.8 : 0);

  /* ---------- 3. S1: THE PEOPLE (0.0 - 3.6s) & S7: HOME SAFE (26.0 - 29.5s) ---------- */
  const inS1 = (t >= 0.15 && t < 3.8);
  const inS7 = (t >= 25.8 && t < 29.6);

  if (inS1) {
    vis(personasLayer, 1);
    const s1CardOp = outExpo(prog(t, 0.15, 0.3)) * (1 - inExpo(prog(t, 3.3, 0.4)));
    sa(personasLayer, 'opacity', s1CardOp.toFixed(3));
    s1Title.render(t, 0.2, 0.65, 3.2, 0.35);

    cardEls.forEach((card, idx) => {
      const cardTin = 0.25 + idx * 0.3;
      const pIn = spring(prog(t, cardTin, 0.6));
      const pOut = inExpo(prog(t, 3.25 + idx * 0.04, 0.35));

      const cardY = 580 + (1 - pIn) * 140;
      const flipScaleX = pIn * (1 - pOut);
      trs(card.cg, card.p.s1Cx, cardY, flipScaleX, 1);
      vis(card.safeBadge, 0);
      vis(card.riskChip, 1);
    });
  } else if (inS7) {
    vis(personasLayer, 1);
    const s7In = outExpo(prog(t, 26.0, 0.7));
    const s7Out = inExpo(prog(t, 28.8, 0.7));
    const s7Op = s7In * (1 - s7Out);
    sa(personasLayer, 'opacity', s7Op.toFixed(3));
    show(s1Title.g, false);

    // Flank the hero phone in middle: scale 0.78 at Y=570
    cardEls.forEach((card, idx) => {
      const pIn = spring(prog(t, 26.1 + idx * 0.12, 0.6));
      const cardY = 570 + (1 - pIn) * 100;
      trs(card.cg, card.p.s7Cx, cardY, pIn * 0.78, 0.78);
      vis(card.safeBadge, 1);
      vis(card.riskChip, 0);
    });
  } else {
    vis(personasLayer, 0);
  }

  /* ---------- 4. Circular Wipe Transitions ---------- */
  if (t >= 3.4 && t < 4.2) {
    const pWipe = outExpo(prog(t, 3.4, 0.7));
    vis(wipeCircle, 1);
    sa(wipeCircle, 'r', String(r2(pWipe * 1400)));
  } else {
    vis(wipeCircle, 0);
  }

  /* ---------- 5. Hero Phone Choreography (S2 - S7) ---------- */
  const showPhone = (t >= 3.5 && t < 29.5);
  vis(phoneLayer, showPhone ? 1 : 0);

  if (showPhone) {
    let px = 680, py = CY, pScale = 1.12;

    if (t < 7.5) {
      // S2: Phone rises from below at X=680
      const pRise = spring(prog(t, 3.6, 1.1), 0.75, 10);
      py = lerp(1280, CY, pRise);
      px = 680;
      pScale = lerp(0.9, 1.12, pRise);

      vis(s2Screen, 1);
      vis(s3Screen, 0);
      vis(s4Screen, 0);
      vis(s5Screen, 0);
      vis(s6Screen, 0);

      const pPushIn = spring(prog(t, 4.4, 0.7));
      tr(s2PushCard, 18, lerp(340, 290, pPushIn));
      sa(s2PushCard, 'opacity', pPushIn.toFixed(3));

      vis(s2SideG, 1);
      vis(s3SideG, 0);
      vis(s4SideG, 0);
      vis(s5SideG, 0);
      s2Wordmark.render(t, 4.2, 0.7, 7.2, 0.4);
      s2Tagline.render(t, 4.8, 0.7, 7.2, 0.4);

    } else if (t < 12.5) {
      // S3: Pushes in / zooms slightly at X=660
      const pPush = inOutCubic(prog(t, 7.5, 0.8));
      px = lerp(680, 660, pPush);
      py = CY;
      pScale = lerp(1.12, 1.25, pPush);

      vis(s2Screen, 0);
      vis(s3Screen, 1);
      vis(s4Screen, 0);
      vis(s5Screen, 0);
      vis(s6Screen, 0);

      // Smooth realistic water rise
      const pWater = outCubic(prog(t, 7.8, 3.2));
      const depthM = pWater * 0.29;
      const depthPx = pWater * 120;

      sa(s3WaterRect, 'y', String(r2(400 - depthPx)));
      sa(s3WaterRect, 'height', String(r2(depthPx)));
      sa(s3WaterLine, 'y1', String(r2(400 - depthPx)));
      sa(s3WaterLine, 'y2', String(r2(400 - depthPx)));
      s3GaugeVal.textContent = depthM.toFixed(2) + ' m';

      if (depthM >= 0.26) {
        s3ChipTxt.textContent = 'WARNING';
        sa(s3ChipTxt, 'fill', '#FCA5A5');
        sa(s3ChipBg, 'fill', C.RED_BG);
        sa(s3ChipBg, 'stroke', C.RED);
      } else if (depthM >= 0.15) {
        s3ChipTxt.textContent = 'CAUTION';
        sa(s3ChipTxt, 'fill', '#FDE68A');
        sa(s3ChipBg, 'fill', '#451A03');
        sa(s3ChipBg, 'stroke', C.AMBER);
      } else {
        s3ChipTxt.textContent = 'SAFE';
        sa(s3ChipTxt, 'fill', '#6EE7B7');
        sa(s3ChipBg, 'fill', C.EMERALD_BG);
        sa(s3ChipBg, 'stroke', C.EMERALD);
      }

      // Slide in Safe Shelter PPS Button at 0.29m
      const pBtnIn = spring(prog(t, 10.2, 0.7));
      tr(s3NavBtn, 18, lerp(780, 650, pBtnIn));
      vis(s3NavBtn, pBtnIn);

      if (t >= 10.4 && t < 12.2) {
        const pPulse = (t - 10.4) % 1.0;
        const pulseR = 4 + pPulse * 16;
        sa(s3PulseRing, 'stroke-opacity', String((1 - pPulse).toFixed(2)));
        sa(s3PulseRing, 'stroke-width', String(r2(pulseR)));
      } else {
        sa(s3PulseRing, 'stroke-opacity', '0');
      }

      vis(s2SideG, 0);
      vis(s3SideG, 1);
      vis(s4SideG, 0);
      vis(s5SideG, 0);
      s3Side1.render(t, 7.8, 0.6, 10.2, 0.4);
      s3Side2.render(t, 10.2, 0.6, 12.2, 0.4);

    } else if (t < 17.5) {
      // S4: Eases back for shelter navigation map
      const pBack = inOutCubic(prog(t, 12.5, 0.8));
      px = lerp(660, 680, pBack);
      py = CY;
      pScale = lerp(1.25, 1.15, pBack);

      vis(s2Screen, 0);
      vis(s3Screen, 0);
      vis(s4Screen, 1);
      vis(s5Screen, 0);
      vis(s6Screen, 0);

      const pRoute = outCubic(prog(t, 12.8, 1.8));
      drawOn(safeRoutePath, pRoute);

      const pEta = spring(prog(t, 14.2, 0.8));
      tr(s4EtaCard, 18, lerp(820, 626, pEta));
      vis(s4EtaCard, pEta);

      vis(s2SideG, 0);
      vis(s3SideG, 0);
      vis(s4SideG, 1);
      vis(s5SideG, 0);
      s4Side1.render(t, 12.8, 0.7, 17.2, 0.4);
      s4Side2.render(t, 13.4, 0.7, 17.2, 0.4);

    } else if (t < 22.0) {
      // S5: Family Lifeline SOS
      px = 680;
      py = CY;
      pScale = 1.15;

      vis(s2Screen, 0);
      vis(s3Screen, 0);
      vis(s4Screen, 0);
      vis(s5Screen, 1);
      vis(s6Screen, 0);

      if (t >= 18.0 && t < 19.5) {
        const pRip = prog(t, 18.0, 1.2);
        sa(s5Ripple1, 'r', String(r2(pRip * 110)));
        sa(s5Ripple1, 'stroke-opacity', (1 - pRip).toFixed(2));
        sa(s5Ripple2, 'r', String(r2(pRip * 85)));
        sa(s5Ripple2, 'stroke-opacity', (1 - pRip * 0.8).toFixed(2));
      } else {
        sa(s5Ripple1, 'r', '0');
        sa(s5Ripple2, 'r', '0');
      }

      s5ContactRows.forEach((row, i) => {
        const rowTin = 18.4 + i * 0.55;
        const pTick = prog(t, rowTin, 0.4);
        if (pTick >= 1) {
          sa(row.checkCircle, 'fill', C.EMERALD);
          sa(row.checkIcon, 'fill', '#022C22');
        } else {
          sa(row.checkCircle, 'fill', '#1E293B');
          sa(row.checkIcon, 'fill', C.SLATE_400);
        }
      });

      vis(s2SideG, 0);
      vis(s3SideG, 0);
      vis(s4SideG, 0);
      vis(s5SideG, 1);
      s5Side1.render(t, 17.8, 0.7, 21.6, 0.4);
      s5Side2.render(t, 18.3, 0.7, 21.6, 0.4);

    } else if (t < 26.0) {
      // S6: Slides smoothly to left third at X=460
      const pLeft = inOutCubic(prog(t, 22.0, 0.9));
      px = lerp(680, 460, pLeft);
      py = CY;
      pScale = lerp(1.15, 0.94, pLeft);

      // S6 Shows Live Flood Intelligence Hub Dashboard inside Phone!
      vis(s2Screen, 0);
      vis(s3Screen, 0);
      vis(s4Screen, 0);
      vis(s5Screen, 0);
      vis(s6Screen, 1);

      vis(s2SideG, 0);
      vis(s3SideG, 0);
      vis(s4SideG, 0);
      vis(s5SideG, 0);

    } else {
      // S7: Re-centres large in middle at X=960, Y=570, flanked by the 4 cards!
      const pRecent = inOutCubic(prog(t, 26.0, 0.8));
      const pOut = inExpo(prog(t, 28.8, 0.7));
      px = lerp(460, CX, pRecent);
      py = CY + 30;
      pScale = lerp(0.94, 0.88, pRecent);
      vis(phoneRoot, 1 - pOut);

      vis(s2Screen, 0);
      vis(s3Screen, 0);
      vis(s4Screen, 1); // Shows Safe Route Complete
      vis(s5Screen, 0);
      vis(s6Screen, 0);

      vis(s2SideG, 0);
      vis(s3SideG, 0);
      vis(s4SideG, 0);
      vis(s5SideG, 0);
    }

    tr(phoneRoot, px, py, pScale);
  }

  /* ---------- 6. S6: How It Works Pipeline (22.0 - 26.0s) ---------- */
  const inS6 = (t >= 21.8 && t < 26.2);
  vis(s6Layer, inS6 ? 1 : 0);
  if (inS6) {
    const s6In = outExpo(prog(t, 22.0, 0.7));
    const s6Out = inExpo(prog(t, 25.5, 0.6));
    const op = s6In * (1 - s6Out);
    sa(s6NodesG, 'opacity', op.toFixed(3));
    vis(s6CommunityPill, op);
    s6Title.render(t, 22.2, 0.7, 25.6, 0.4);

    s6Cards.forEach((b, idx) => {
      const pNode = spring(prog(t, 22.2 + idx * 0.25, 0.65));
      tr(b.g, (1 - pNode) * 120, idx * 122);
      sa(b.g, 'opacity', pNode.toFixed(3));

      if (b.dot) {
        const pEnergy = ((t * 1.6 + idx * 0.4) % 1.0);
        sa(b.dot, 'cy', String(r2(92 + pEnergy * 30)));
      }
    });
  }

  /* ---------- 7. S7: HOME SAFE (26.0 - 29.5s) ---------- */
  vis(s7Layer, inS7 ? 1 : 0);
  if (inS7) {
    const s7In = outExpo(prog(t, 26.0, 0.7));
    const s7Out = inExpo(prog(t, 28.8, 0.7));
    const s7Op = s7In * (1 - s7Out);
    sa(s7Layer, 'opacity', s7Op.toFixed(3));

    s7Line1.render(t, 26.1, 0.55, 28.8, 0.5);
    s7Line2.render(t, 26.6, 0.55, 28.8, 0.5);
    vis(s7BrandG, s7Op);
  }
};

/* =====================================================================
   KEYBOARD & KIOSK INTERACTION
   ===================================================================== */
let isPaused = false;
let clockT = 0;
let lastRaf = null;

function stepLive(now) {
  if (!isPaused) {
    if (lastRaf != null) {
      const dt = (now - lastRaf) / 1000;
      clockT = (clockT + dt) % DUR;
    }
    lastRaf = now;
    window.renderFrame(clockT);
  }
  requestAnimationFrame(stepLive);
}

if (!RENDER_MODE) {
  if (Q.has('t')) {
    clockT = parseFloat(Q.get('t')) || 0;
    window.renderFrame(clockT);
  } else {
    requestAnimationFrame(stepLive);
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.code === 'Space') {
      ev.preventDefault();
      isPaused = !isPaused;
      lastRaf = null;
    } else if (ev.code === 'ArrowRight') {
      ev.preventDefault();
      clockT = (clockT + 1.0) % DUR;
      window.renderFrame(clockT);
    } else if (ev.code === 'ArrowLeft') {
      ev.preventDefault();
      clockT = ((clockT - 1.0) % DUR + DUR) % DUR;
      window.renderFrame(clockT);
    } else if (ev.code === 'KeyF') {
      ev.preventDefault();
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  });

  let cursorTimer = null;
  const hideCursor = () => document.body.classList.add('nocursor');
  window.addEventListener('mousemove', () => {
    document.body.classList.remove('nocursor');
    clearTimeout(cursorTimer);
    cursorTimer = setTimeout(hideCursor, 2000);
  });
  cursorTimer = setTimeout(hideCursor, 2000);
}

window.renderFrame(0);
window.FLOODWAY_READY = true;
})();
</script>
</body>
</html>
`;

fs.writeFileSync(path.join(HERE, 'index.html'), html, 'utf8');
console.log('Successfully generated upgraded booth/floodway-loop/index.html (' + html.length + ' bytes)');
