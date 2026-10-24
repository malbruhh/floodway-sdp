// Every route at every width: renders, no console/network errors, no sideways scroll, mobile touch and type rules.
// Screenshots go to D:/FloodWay/docs/design/mobile-test/ (two levels above the frontend folder).
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { WIDTHS, ROUTES, heightFor, layoutFacts, noErrors, settle, signIn, watchErrors } from './helpers';

const SHOTS = path.resolve(process.cwd(), '../../docs/design/mobile-test');
const slug = (r: string) => (r === '/' ? 'welcome' : r.replace(/^\//, '').replace(/[/?=]/g, '-'));

for (const route of ROUTES) {
  for (const w of WIDTHS) {
    test(`${route} @${w}`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: { width: w, height: heightFor(w) }, isMobile: w < 760, hasTouch: w < 760, reducedMotion: 'reduce' });
      const page = await ctx.newPage();
      if (route !== '/') await signIn(page);
      const errors = watchErrors(page);
      await page.goto(route);
      await settle(page);
      await page.screenshot({ path: path.join(SHOTS, `${slug(route)}-${w}.png`) });
      const f = await layoutFacts(page);
      noErrors(errors);
      expect(f.overflow, 'horizontal overflow px').toBeLessThanOrEqual(0);
      expect(f.smallText, 'text under 12px').toEqual([]);
      if (w < 760) {
        expect(f.smallInputs, 'inputs under 16px').toEqual([]);
        expect(f.smallTargets, 'tap targets under 44px').toEqual([]);
      }
      await ctx.close();
    });
  }
}
