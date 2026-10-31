import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// React is loaded from cdnjs (see index.html) so the build stays small and
// everything else is inlined into one portable index.html.
export default defineConfig({
  plugins: [react({ jsxRuntime: 'classic' }), viteSingleFile()],
  build: {
    target: 'es2019',
    rollupOptions: {
      external: ['react', 'react-dom', 'react-dom/client'],
      output: {
        format: 'iife',
        globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM' },
      },
    },
  },
});
