import app from './src/server/app';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hệ thống tạo đề theo đề mẫu server is listening on port ${PORT} [Mode: ${isProd ? 'production' : 'development'}]`);
  });
}

// Khởi chạy server khi chạy trực tiếp qua `tsx server.ts` hoặc node
startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
