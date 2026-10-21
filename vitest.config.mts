import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

// Testy jednostkowe czystych funkcji (bez przeglądarki); alias „@” jak w tsconfig.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
  test: { include: ['tests/unit/**/*.test.ts'], environment: 'node' },
});