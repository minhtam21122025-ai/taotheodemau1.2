import app from '../src/server/app';

export default function handler(req: any, res: any) {
  try {
    // 1. Kiểm tra header đường dẫn gốc do Vercel cung cấp
    const original =
      req.headers['x-matched-path'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-original-url'] ||
      req.originalUrl;

    if (original && typeof original === 'string' && original.startsWith('/api')) {
      req.url = original;
    } else if (req.query && req.query.path) {
      const subpath = Array.isArray(req.query.path) ? req.query.path.join('/') : req.query.path;
      req.url = '/api/' + String(subpath).replace(/^\/+/, '');
    }

    // 2. Đảm bảo req.url luôn có prefix /api nếu bị rút ngắn
    if (req.url && !req.url.startsWith('/api') && (
      req.url.startsWith('/auth') ||
      req.url.startsWith('/exam') ||
      req.url.startsWith('/admin') ||
      req.url.startsWith('/health')
    )) {
      req.url = '/api' + req.url;
    }

    // Đồng bộ originalUrl để Express Router so khớp chính xác
    req.originalUrl = req.url;

    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Handler Crash in api/[...path].ts]:', err);
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        success: false,
        error: 'Lỗi khởi chạy Function Vercel: ' + (err?.message || String(err)),
      });
    }
  }
}

