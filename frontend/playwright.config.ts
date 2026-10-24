import { defineConfig } from '@playwright/test';

// Needs the dev servers running: frontend on 5173, backend on 8080 (see .claude/launch.json). `npm run e2e`.
export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  retries: 0,
  workers: 2,
  reporter: [['list'], ['json', { outputFile: 'e2e-results.json' }]],
  use: { baseURL: process.env.BASE ?? 'http://localhost:5173', channel: process.env.CHROME_CHANNEL ?? 'chrome', headless: true },
});
