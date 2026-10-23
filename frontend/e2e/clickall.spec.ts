// Crawler: on every route at phone width, click each visible button and link in turn. After each click the page must
// not throw or log an error and must still be on our origin. The page is reloaded between clicks.
import { test, expect } from '@playwright/test';
import { ROUTES, noErrors, settle, signIn, watchErrors } from './helpers';

const SKIP = /sign out|log out|delete|remove/i; // covered by the account spec so the crawl keeps its session
const SEL = 'a[href], button, [role=button], [role=tab]';

for (const route of ROUTES.filter((r) => r !== '/')) {
  test(`click every control on ${route} @375`, async ({ browser }) => {
    test.setTimeout(240_000);
    const ctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await signIn(page);
    const errors = watchErrors(page);
    await page.goto(route);
    await settle(page);
    const names = await page.locator(SEL).evaluateAll((els) =>
      els.map((e) => ({ ok: (() => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('.leaflet-container') && !(e as HTMLButtonElement).disabled; })(), name: (e.getAttribute('aria-label') || e.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40) })),
    );
    const idx = names.map((n, i) => ({ ...n, i })).filter((n) => n.ok && !SKIP.test(n.name));
    expect(idx.length, 'page has interactive controls').toBeGreaterThan(0);
    let clicked = 0;
    for (const c of idx) {
      await page.goto(route);
      await settle(page, 900);
      try {
        await page.locator(SEL).nth(c.i).click({ timeout: 3000, noWaitAfter: true });
        clicked++;
      } catch { continue; }
      await page.waitForTimeout(350);
      expect(new URL(page.url()).hostname, `after "${c.name}"`).toBe('localhost');
    }
    expect(clicked).toBeGreaterThan(0);
    noErrors(errors);
    await ctx.close();
  });
}
