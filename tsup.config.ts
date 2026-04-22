import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: ['!mcp/**'],
    sourcemap: true,
    splitting: false,
  },
  {
    entry: { 'mcp/index': 'src/mcp/index.ts' },
    format: ['esm'],
    dts: false,
    clean: false,
    sourcemap: true,
    splitting: false,
    banner: { js: '#!/usr/bin/env node' },
  },
]);
