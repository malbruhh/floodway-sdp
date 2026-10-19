#!/usr/bin/env node
/**
 * Claims audit for the FloodWay film.
 *  1. Forbidden terms (claims policy + real places that must never appear next to illustrative flooding).
 *  2. On-screen numbers: every string literal handed to text()/kline()/chip() that contains a digit must be on the allow-list.
 *   node audit-claims.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, 'src');
const files = ['index.html', 'README.md', 'BRIEF.md', 'render.mjs', 'build.mjs', 'make_audio.py',
  ...fs.readdirSync(SRC).map(f => path.join('src', f))].filter(f => fs.existsSync(path.join(HERE, f)));

const FORBIDDEN = [
  'Zero-IoT', '$0', 'zero hardware', '99.4', 'deepfake', '110 cm', 'trapped', 'guaranteed', 'guarantee', 'saves lives', 'save lives',
  'endorsed', 'certified', 'official partner', 'NADMA', 'Jalan Tun Razak', 'Mid Valley', 'Suria KLCC', 'Jubli Perak', 'KESAS',
  'Jalan Subang', 'Jalan Raja Muda', 'Seksyen 24', 'Klang River', 'Telegram', 'iPhone', 'Samsung', 'Apple',
  '87%', '74.55', '92.4', 'mIoU', '95.34', '1.65 m', '62 min'
];
// Brief/README explain the policy and legitimately quote the banned list; the audit only checks what ships on screen.
const POLICY_DOCS = new Set(['BRIEF.md', 'README.md', 'audit-claims.mjs']);
const ALLOWED_NUMBERS = [/^0\.30 m$/, /^0\.3 m/, /^At 0\.3 m/, /^Porch step 0\.30 m$/, /^~7 min · 1\.2 km$/, /^3D Twin$/, /^3D TWIN$/];

let bad = 0;
for (const f of files) {
  if (POLICY_DOCS.has(path.basename(f))) continue;
  let s = fs.readFileSync(path.join(HERE, f), 'utf8');
  if (f === 'index.html') s = s.replace(/base64,[A-Za-z0-9+/=]+/g, 'base64,…');
  s = s.split('floodway.pages.dev').join('SITE_URL');   // the team's own project URL (end card) is allowed
  const lower = s.toLowerCase();
  for (const term of FORBIDDEN) {
    // "MetMalaysia / JPS" is the required warning tag; it is the only agency mention allowed.
    if (lower.includes(term.toLowerCase())) { console.log('VIOLATION ' + f + ': "' + term + '"'); bad++; }
  }
}
// on-screen strings with digits
for (const f of fs.readdirSync(SRC).filter(x => x.endsWith('.js'))) {
  const s = fs.readFileSync(path.join(SRC, f), 'utf8');
  const re = /\b(?:text|kline|chip)\(\s*c\s*,\s*'([^']*\d[^']*)'/g;
  let m;
  while ((m = re.exec(s))) {
    if (!ALLOWED_NUMBERS.some(r => r.test(m[1]))) { console.log('NUMBER NOT ALLOWED ' + f + ': "' + m[1] + '"'); bad++; }
  }
}
const agencies = (fs.readFileSync(path.join(HERE, 'index.html'), 'utf8').match(/MetMalaysia|JPS/g) || []).length;
console.log('checked ' + files.length + ' files · agency mentions (warning tag only): ' + agencies);
if (bad) { console.log(bad + ' problem(s).'); process.exit(1); }
console.log('CLAIMS AUDIT CLEAN');
