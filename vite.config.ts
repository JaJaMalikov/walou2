import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: env.VITE_BASE || '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
            ignored: ['**/src-tauri/**'],
        },
      },
      publicDir: "assets",
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
