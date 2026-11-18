import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Hash routing + a single inlined index.html means `dist/index.html` works
// from any static host, a sub-path, or straight off the disk.
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  server: { host: true, port: 5180 },
  preview: { port: 5181 },
});
