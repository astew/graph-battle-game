import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverMode = process.env.PLAYWRIGHT_SERVER_MODE === 'dev' ? 'dev' : 'preview';
const serverCommand =
  serverMode === 'dev'
    ? 'npm run dev -- --host 127.0.0.1 --port 4173'
    : 'npm run preview -- --host 127.0.0.1 --port 4173';
const reuseExistingServer = serverMode === 'dev' ? false : !process.env.CI;

export default defineConfig({
  testDir: path.join(__dirname, 'test', 'e2e'),
  timeout: 90_000,
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    headless: true,
    trace: 'on-first-retry',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: serverCommand,
    cwd: __dirname,
    port: 4173,
    reuseExistingServer,
    timeout: 120_000,
  },
});
