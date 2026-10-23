import { expect, type Page } from '@playwright/test';

export const WIDTHS = [320, 375, 414, 768, 1024, 1440] as const;
export const heightFor = (w: number) => (w < 500 ? 812 : w < 1000 ? 1024 : 900);
export const ROUTES = ['/', '/home', '/map', '/reports', '/live', '/live?source=jps', '/estate', '/profile', '/navigation/shelter-01'];
export const USER = { id: 'usr-01', name: 'Demo User', email: 'demo@floodway.my', phone: '', isDemo: true };

/** Collects console errors, uncaught exceptions and failed same-origin / API requests (map tiles and fonts are third-party and ignored). */
export function watchErrors(page: Page) {
  const errors: string[] = [];
  const ours = (u: string) => /localhost:(5173|8080)/.test(u);
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // "Failed to load resource" lines are covered by the response listener below, which can tell ours from third-party.
    if (/Failed to load resource/.test(m.text())) return;
    errors.push(`console: ${m.text().slice(0, 200)}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('requestfailed', (r) => {
    if (ours(r.url()) && !/ABORTED/i.test(r.failure()?.errorText ?? '')) errors.push(`requestfailed: ${r.url()}`);
  });
  page.on('response', (r) => { if (ours(r.url()) && r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`); });
  return errors;
}

export async function signIn(page: Page) {
  await page.addInitScript((u) => { if (!localStorage.getItem('floodway_signed_out')) localStorage.setItem('floodway_user', JSON.stringify(u)); }, USER);
}

export async function settle(page: Page, ms = 1800) {
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(ms);
}

/** Layout facts at the current viewport. Inputs under 16px zoom on iOS; tap targets under 44px are hard to hit. */
export async function layoutFacts(page: Page) {
  return page.evaluate(() => {
    const vis = (el: Element) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'; };
    const label = (el: Element) => `${el.tagName.toLowerCase()}"${(el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 30)}"`;
    const inter = [...document.querySelectorAll('a[href], button, input, select, textarea, [role=button], [role=tab]')].filter((e) => vis(e) && !e.closest('.leaflet-container') && !e.closest('[aria-hidden=true]'));
    // A checkbox or radio is tapped through its label, so the label's size is what counts.
    const smallTargets = inter.filter((e) => { const box = (e as HTMLInputElement).type === 'checkbox' || (e as HTMLInputElement).type === 'radio' ? (e.closest('label') ?? e) : e; const r = box.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).map(label);
    const smallInputs = [...document.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]), select, textarea')].filter(vis).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map(label);
    const smallText = [...document.querySelectorAll('body *')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && (n.textContent ?? '').trim()) && vis(e) && !e.closest('svg') && !e.closest('.leaflet-container') && parseFloat(getComputedStyle(e).fontSize) < 12).map(label);
    return { overflow: document.documentElement.scrollWidth - window.innerWidth, smallTargets, smallInputs, smallText };
  });
}

export const noErrors = (errors: string[]) => expect(errors, errors.join('\n')).toEqual([]);
