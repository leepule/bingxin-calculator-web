import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const fastJsonParsePlugin = () => ({
  name: 'fast-json-parse',
  transform(code, id) {
    if (id.includes('src/generated/formula-model.js') || id.includes('src/generated/data.js')) {
      if (code.startsWith('window.')) {
        const eqIndex = code.indexOf('=');
        const semIndex = code.lastIndexOf(';');
        if (eqIndex !== -1 && semIndex !== -1) {
          const varDecl = code.slice(0, eqIndex + 1);
          const rawJson = code.slice(eqIndex + 1, semIndex).trim();
          return {
            code: `${varDecl} JSON.parse(${JSON.stringify(rawJson)});`,
            map: null,
          };
        }
      }
    }
  },
});

export default defineConfig({
  base: '/bingxin-calculator-web/',
  plugins: [
    fastJsonParsePlugin(),
    react({
      include: '**/*.{jsx,tsx}',
      exclude: 'src/generated/**',
    }),
  ],
  worker: {
    format: 'es',
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          'formula-model': ['./src/generated/formula-model.js'],
          'generated-data': ['./src/generated/data.js'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});
