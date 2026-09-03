import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@agent-kernel': path.resolve(__dirname, 'agent-kernel/ts-client/src'),
    },
  },
  test: {
    include: ['test/**/*.test.ts'],
  },
});
