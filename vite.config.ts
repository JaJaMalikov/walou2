import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    base: process.env.REPO_NAME ? `/${process.env.REPO_NAME}/` : '/',

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
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
