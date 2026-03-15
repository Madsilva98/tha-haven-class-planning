import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      async configureServer(viteServer) {
        const express = (await import('express')).default;
        const app = express();
        const { default: apiRouter } = await import('./server/index.js');
        app.use('/api', apiRouter);
        viteServer.middlewares.use(app);
      },
    },
  ],
});
