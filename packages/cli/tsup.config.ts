import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/main.ts'],
  format: ['cjs'],
  outDir: 'dist',
  clean: true,
  minify: false,
  sourcemap: false,
  dts: false,
  shims: false,
});
