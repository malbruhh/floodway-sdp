// Shared style tokens for the whole app (cards, focus, buttons, type, numerals). Change the look here.
//
// Layout is driven by the width of the page's <main> (a named container, `main`), not the viewport, because the app
// sidebar changes how much room the page actually has. `@min-[760px]/main:` reads "when the content area is >= 760px".
//
// Spacing scale: 4 8 12 16 20 24 32. Cards: 16px padding on narrow layouts, 20px on wide ones; 16px between cards,
// 12px inside a card. Type: nothing below 12px. Status colours live in lib/vision/levels.ts.

// Brand: #1677FF for accents, focus rings and progress. Filled controls with white text use the next step, #0958D9,
// because white on #1677FF is only 4.1:1 (below WCAG AA 4.5:1 for normal text).

const motion = 'transition-[color,background-color,border-color,box-shadow,opacity] duration-150 ease-out motion-reduce:transition-none';

export const card = 'rounded-card border border-line bg-surface';
export const cardPad = 'p-4 @min-[760px]/main:p-5';
export const focusRing = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-link focus-visible:ring-offset-2 focus-visible:ring-offset-surface';
export const interactive = `${motion} ${focusRing}`;

export const btnPrimary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-btn bg-action px-4 text-sm font-medium text-white hover:bg-[#2b2b2b] disabled:cursor-not-allowed disabled:opacity-50 ${interactive}`;
export const btnSecondary = `inline-flex min-h-11 items-center justify-center gap-2 rounded-btn bg-raised px-4 text-sm font-medium text-ink hover:bg-control/60 disabled:cursor-not-allowed disabled:opacity-50 ${interactive}`;

// Type scale
export const heading = 'font-heading font-bold text-ink';
export const pageTitle = 'font-heading text-[32px]/10 font-bold tracking-tight text-ink @min-[640px]/main:text-2xl/8';
export const cardTitle = 'font-heading text-base/6 font-bold text-ink';
export const label = 'text-xs/4 font-medium text-muted';
export const muted = 'text-muted';
/** Numbers, timestamps, coordinates and JSON: monospace with fixed-width digits so values never jitter. */
export const num = "font-['JetBrains_Mono',ui-monospace,monospace] tabular-nums";
export const hero = 'font-heading text-[44px]/[48px] font-extrabold tracking-tight tabular-nums text-ink @min-[640px]/main:text-5xl/[52px]';

/** Small rounded pill used for counts and meta. */
export const pill = `inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-1 text-xs font-semibold text-muted`;
