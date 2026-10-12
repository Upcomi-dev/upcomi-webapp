import { defineConfig, devices } from "@playwright/test";

// Dedicated mock API: these tests never create accounts or stories in Supabase.
export default defineConfig({
  testDir: "./tests/onboarding",
  fullyParallel: false,
  workers: 1,
  timeout: 45_000,
  use: {
    actionTimeout: 10_000,
    baseURL: "http://127.0.0.1:3107",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", testMatch: "**/story-flow.spec.ts", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: [
    { command: "node tests/support/supabase-server.mjs", url: "http://127.0.0.1:4318/health" },
    {
      command: "npm run dev -- --hostname 127.0.0.1 --port 3107",
      url: "http://127.0.0.1:3107/signup",
      timeout: 120_000,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:4318",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-key",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-publishable-key",
        SUPABASE_SECRET_KEY: "test-server-key",
        NEXT_PUBLIC_PLAUSIBLE_DOMAIN: "",
      },
    },
  ],
});
