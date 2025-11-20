import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  outDir: 'dist',
  clean: true,
  minify: false,
  sourcemap: false,
  dts: false,
  shims: true,
});
