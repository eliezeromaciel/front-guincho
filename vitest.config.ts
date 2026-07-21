import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    server: {
      deps: {
        inline: [
          '@opentelemetry/api',
          '@google-cloud/firestore',
          'firebase-admin'
        ]
      }
    }
  }
});
