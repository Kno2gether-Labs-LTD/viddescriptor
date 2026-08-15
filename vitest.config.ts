import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Never let a developer's local .env (deploy-only overrides, e.g. the
  // gitignored VITE_UPSELL_CREDITS=0 used for OUR deployment) leak into
  // `siteConfig` during tests — the suite must always exercise the shipped
  // src/config.ts defaults (see test/unit/config.test.ts and README's
  // "Keep config.ts defaults at 500 for cloners").
  envDir: false,
  test: {
    // Node stays the default environment for the worker/unit suites. Component
    // tests opt into jsdom per-file via a `// @vitest-environment jsdom`
    // pragma at the top of the file (Vitest 4 dropped `environmentMatchGlobs`).
    environment: 'node',
    include: ['test/worker/**/*.test.ts', 'test/unit/**/*.test.ts', 'test/component/**/*.test.tsx'],
  },
});
