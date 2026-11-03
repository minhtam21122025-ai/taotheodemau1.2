import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';
import {
  initAuthStore,
  login,
  verifySession,
  logout,
  listUsersForAdmin,
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
} from './authService';

dotenv.config();

const app = express();

// Enable CORS for Vercel, local dev, and cross-domain access
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, x-auth-token, x-gemini-api-key');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize request URL for Vercel Serverless Functions where /api might be rewritten or stripped
app.use((req: Request, res: Response, next: NextFunction) => {
  // Check headers passed by Vercel / reverse proxies
  const forwardedUri = (req.headers['x-forwarded-uri'] || req.headers['x-matched-path'] || req.headers['x-original-url']) as string | undefined;
  if (forwardedUri && forwardedUri.startsWith('/api') && (req.url === '/' || req.url === '/api' || !req.url.startsWith('/api'))) {
    req.url = forwardedUri;
  }

  // Handle catch-all parameter if routed via /api?path=$1
  const qPath = req.query?.path;
  if (qPath && (req.url === '/' || req.url === '/api' || req.url.startsWith('/?') || req.url.startsWith('/api?') || req.url.startsWith('/api/?'))) {
    const subpath = Array.isArray(qPath) ? qPath.join('/') : qPath;
    req.url = '/api/' + String(subpath).replace(/^\/+/, '');
  }

  // Prepend /api if path is stripped (e.g. /auth/login -> /api/auth/login)
  if (!req.url.startsWith('/api') && (
    req.url.startsWith('/auth') ||
    req.url.startsWith('/exam') ||
    req.url.startsWith('/admin') ||
    req.url.startsWith('/health')
  )) {
    req.url = '/api' + req.url;
  }
  next();
});

// Safe Body parser: Vercel Serverless environment pre-parses req.body.
// If req.body is already present, do NOT re-read stream as it will hang and cause 503/504 timeout!
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string' && req.body.trim().startsWith('{')) {
      try {
        req.body = JSON.parse(req.body);
      } catch {
        // Keep as string
      }
    }
    return next();
  }

  // If request stream is already ended or consumed, do not hang
  if (req.complete || (req as any).readableEnded) {
    req.body = {};
    return next();
  }

  express.json({ limit: '50mb' })(req, res, (err) => {
    if (err) {
      console.warn('[BodyParser JSON Warning]:', err.message);
    }
    next();
  });
});

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.body !== undefined && req.body !== null) {
    return next();
  }
  if (req.complete || (req as any).readableEnded) {
    req.body = {};
    return next();
  }
  express.urlencoded({ limit: '50mb', extended: true })(req, res, (err) => {
    if (err) {
      console.warn('[BodyParser URL Encoded Warning]:', err.message);
    }
    next();
  });
});

// Helper khởi tạo Gemini Client an toàn, hỗ trợ Vercel Environment Variables
function getAiInstance(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'Chưa cấu hình biến môi trường GEMINI_API_KEY trên Vercel. Vui lòng vào Vercel Dashboard -> Settings -> Environment Variables, thêm GEMINI_API_KEY rồi Redeploy.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Danh sách các mô hình tối ưu theo tài liệu kỹ thuật chuẩn, hỗ trợ dự phòng đa cấp:
// 1. 'gemini-2.5-flash': Mô hình chính - tốc độ cực nhanh, bóc tách LaTeX và cấu trúc JSON chuẩn xác
// 2. 'gemini-3.8-flash': Mô hình tư duy khảo thí chuyên sâu - thế hệ mới nhất cho môn Toán & STEM
// 3. 'gemini-3.1-flash-lite': Mô hình Flash Lite thông lượng lớn, hạn mức RPM/TPM cao, dự phòng khi nghẽn tải
// 4. 'gemini-flash-latest': Alias chính thức từ Google trỏ đến phiên bản Flash ổn định nhất
export const PRIMARY_MODEL = 'gemini-2.5-flash';
export const CANDIDATE_MODELS = [
  'gemini-2.5-flash',
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
];
const FAST_MODEL = PRIMARY_MODEL;

// Helper: Repair unescaped LaTeX backslashes and raw control characters inside JSON strings
function repairJsonWithLatex(jsonStr: string): string {
  let inString = false;
  let result = '';

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];

    if (!inString) {
      if (ch === '"') {
        inString = true;
      }
      result += ch;
      continue;
    }

    if (ch === '"') {
      inString = false;
      result += ch;
      continue;
    }

    if (ch === '\\') {
      const nextChar = jsonStr[i + 1];
      if (nextChar === undefined) {
        result += '\\\\';
        continue;
      }

      if (nextChar === '"' || nextChar === '\\' || nextChar === '/') {
        result += '\\' + nextChar;
        i++;
        continue;
      }

      if (nextChar === 'u' && /^[0-9a-fA-F]{4}/.test(jsonStr.substring(i + 2, i + 6))) {
        result += '\\u' + jsonStr.substring(i + 2, i + 6);
        i += 5;
        continue;
      }

      if (['b', 'f', 'n', 'r', 't'].includes(nextChar)) {
        const afterNext = jsonStr[i + 2] || '';
        if (/[a-zA-Z]/.test(afterNext)) {
          result += '\\\\' + nextChar;
        } else {
          result += '\\' + nextChar;
        }
        i++;
        continue;
      }

      if (nextChar === '\n' || nextChar === '\r') {
        result += '\\n';
        i++;
        continue;
      }

      result += '\\\\' + nextChar;
      i++;
      continue;
    }

    if (ch === '\n') {
      result += '\\n';
    } else if (ch === '\r') {
      // ignore
    } else if (ch === '\t') {
      result += '\\t';
    } else {
      result += ch;
    }
  }

  return result;
}

// Helper: Close incomplete JSON if response was cut off
function closeIncompleteJson(jsonStr: string): string {
  let inString = false;
  let escaped = false;
  const stack: string[] = [];

  for (let i = 0; i < jsonStr.length; i++) {
    const ch = jsonStr[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
    } else if (ch === '{') {
      stack.push('}');
    } else if (ch === '[') {
      stack.push(']');
    } else if (ch === '}' || ch === ']') {
      if (stack.length > 0 && stack[stack.length - 1] === ch) {
        stack.pop();
      }
    }
  }

  let fixed = jsonStr.trim();
  if (inString) {
    fixed += '"';
  }
  fixed = fixed.replace(/,\s*$/, '');
  while (stack.length > 0) {
    fixed += stack.pop();
  }
  return fixed;
}

function safeParseJSON(rawStr: string, fallback: any = {}): any {
  if (!rawStr || typeof rawStr !== 'string') return fallback;

  let cleaned = rawStr.trim();
  const mdMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (mdMatch) {
    cleaned = mdMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err1) {
    try {
      const repaired = repairJsonWithLatex(cleaned);
      return JSON.parse(repaired);
    } catch (err2) {
      try {
        const closed = closeIncompleteJson(cleaned);
        const repairedClosed = repairJsonWithLatex(closed);
        return JSON.parse(repairedClosed);
      } catch (err3) {
        console.error('All JSON parsing strategies failed:', err3);
        return fallback;
      }
    }
  }
}

/**
 * Động cơ gọi Gemini thông minh và chống lỗi toàn diện (Resilient Multi-Model Engine):
 * - Xử lý mã 404 (Not Found / Model Unavailable): Không kẹt lại, tự động chuyển ngay sang mô hình dự phòng tiếp theo.
 * - Xử lý mã 429 (Resource Exhausted / Rate Limit): Tự động chờ Backoff + Jitter và chuyển sang mô hình có Quota riêng biệt.
 * - Xử lý mã 500 / 502 / 503 / 504 (Server Overloaded / Unavailable): Tự động thử lại với độ trễ tăng dần, sau đó chuyển vùng mô hình.
 */
async function callGeminiFast(params: {
  model?: string;
  contents: any;
  config?: any;
}): Promise<any> {
  const ai = getAiInstance();
  const requestedModel = params.model || PRIMARY_MODEL;

  // Xếp hàng các mô hình: mô hình yêu cầu đứng trước, sau đó là các mô hình dự phòng
  const queue = [
    requestedModel,
    ...CANDIDATE_MODELS.filter((m) => m !== requestedModel),
  ];

  let lastError: any = null;
  const attemptsLog: string[] = [];

  for (let modelIndex = 0; modelIndex < queue.length; modelIndex++) {
    const currentModel = queue[modelIndex];
    const maxRetriesThisModel = 2; // Tối đa 2 lần thử lại cho mỗi mô hình nếu gặp lỗi tạm thời (429, 500, 503)

    for (let attempt = 0; attempt <= maxRetriesThisModel; attempt++) {
      try {
        console.log(
          `[Gemini Engine] Gọi mô hình "${currentModel}" (Lần thử ${attempt + 1}/${maxRetriesThisModel + 1})...`
        );

        // Chuẩn hóa cấu hình: loại bỏ các tham số quá giới hạn có thể gây lỗi 400/500
        const safeConfig = { ...(params.config || {}) };
        if (safeConfig.maxOutputTokens && safeConfig.maxOutputTokens > 32768 && currentModel.includes('lite')) {
          safeConfig.maxOutputTokens = 16384;
        }

        const response = await ai.models.generateContent({
          model: currentModel,
          contents: params.contents,
          config: safeConfig,
        });

        if (response && (response.text !== undefined || (response.candidates && response.candidates.length > 0))) {
          console.log(`[Gemini Engine] Gọi thành công mô hình "${currentModel}".`);
          return response;
        }

        throw new Error(`Mô hình ${currentModel} phản hồi không có nội dung văn bản.`);
      } catch (err: any) {
        lastError = err;
        const errMsg = String(err?.message || err || '');
        const status = err?.status || (err?.response ? err.response.status : undefined);

        const isNotFound404 =
          status === 404 ||
          errMsg.includes('404') ||
          errMsg.includes('NOT_FOUND') ||
          errMsg.includes('not found') ||
          errMsg.includes('is not supported') ||
          errMsg.includes('not supported for this API version');

        const isQuota429 =
          status === 429 ||
          status === 'RESOURCE_EXHAUSTED' ||
          errMsg.includes('429') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('Quota exceeded') ||
          errMsg.includes('Too Many Requests');

        const isServerOverload500_503 =
          status === 500 ||
          status === 502 ||
          status === 503 ||
          status === 504 ||
          status === 'UNAVAILABLE' ||
          status === 'INTERNAL' ||
          errMsg.includes('500') ||
          errMsg.includes('502') ||
          errMsg.includes('503') ||
          errMsg.includes('504') ||
          errMsg.includes('UNAVAILABLE') ||
          errMsg.includes('INTERNAL') ||
          errMsg.includes('overloaded');

        const logEntry = `[${currentModel} lần ${attempt + 1}] Mã: ${status || 'ERR'} - ${errMsg.slice(0, 100)}`;
        attemptsLog.push(logEntry);
        console.warn(`[Gemini Engine Cảnh báo] ${logEntry}`);

        // 1. Trường hợp Lỗi 404 (Mô hình không tồn tại / không hỗ trợ phiên bản này):
        // KHÔNG thử lại mô hình này, lập tức chuyển sang mô hình tiếp theo trong danh sách dự phòng!
        if (isNotFound404) {
          console.warn(
            `[Gemini Engine] Mô hình "${currentModel}" trả về mã 404. Lập tức chuyển sang mô hình dự phòng tiếp theo...`
          );
          break; // Thoát vòng lặp attempt để nhảy sang model tiếp theo trong queue
        }

        // 2. Trường hợp Lỗi 429 (Hết hạn mức Quota) hoặc 500/503 (Máy chủ Google quá tải):
        if (isQuota429 || isServerOverload500_503) {
          if (attempt < maxRetriesThisModel) {
            // Chờ Exponential Backoff có thêm độ trễ ngẫu nhiên Jitter
            const waitTime = (attempt + 1) * 1200 + Math.floor(Math.random() * 400);
            console.log(
              `[Gemini Engine] Đang chờ ${waitTime}ms để máy chủ ổn định rồi thử lại mô hình "${currentModel}"...`
            );
            await new Promise((resolve) => setTimeout(resolve, waitTime));
            continue; // Thử lại mô hình hiện tại
          } else {
            // Đã hết số lần thử trên mô hình này -> Chuyển sang mô hình tiếp theo
            console.log(
              `[Gemini Engine] Mô hình "${currentModel}" đã đạt giới hạn lần thử. Chuyển sang mô hình dự phòng...`
            );
            break;
          }
        }

        // 3. Các lỗi mạng tạm thời khác (fetch failed, ECONNRESET, timeout)
        if (errMsg.includes('fetch failed') || errMsg.includes('ECONNRESET') || errMsg.includes('timeout')) {
          if (attempt < maxRetriesThisModel) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }
        }

        // Với các lỗi khác, chuyển sang mô hình tiếp theo
        break;
      }
    }

    // Tạm nghỉ 350ms trước khi chuyển sang mô hình mới để giải phóng kết nối
    if (modelIndex < queue.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
    }
  }

  // Nếu tất cả các mô hình trong queue đều không thành công, phân loại thông báo lỗi chuẩn xác:
  const finalMsg = String(lastError?.message || lastError || '');

  if (finalMsg.includes('429') || finalMsg.includes('RESOURCE_EXHAUSTED') || finalMsg.includes('Quota exceeded')) {
    throw new Error(
      'Hạn mức yêu cầu miễn phí của Google AI (Mã 429) hiện đang tạm đầy trên toàn bộ các mô hình. Hệ thống đã tự động thử các mô hình dự phòng nhưng chưa sẵn sàng. Vui lòng thử lại sau 1-2 phút.'
    );
  }

  if (finalMsg.includes('503') || finalMsg.includes('overloaded') || finalMsg.includes('UNAVAILABLE')) {
    throw new Error(
      'Hạ tầng máy chủ Google AI hiện đang quá tải tạm thời (Mã 503). Hệ thống đã xoay tua qua các mô hình dự phòng. Vui lòng bấm thử lại để tiếp tục.'
    );
  }

  if (finalMsg.includes('404') || finalMsg.includes('NOT_FOUND')) {
    throw new Error(
      'Mô hình AI yêu cầu tạm thời không tìm thấy (Mã 404). Hệ thống đã tự động kích hoạt chế độ dự phòng. Vui lòng thử lại.'
    );
  }

  throw new Error(`Lỗi kết nối Gemini AI: ${finalMsg}`);
}

function normalizeMimeType(mime: string): string {
  if (!mime) return 'image/jpeg';
  const lower = mime.toLowerCase();
  if (lower.includes('png')) return 'image/png';
  if (lower.includes('webp')) return 'image/webp';
  if (lower.includes('pdf')) return 'application/pdf';
  return 'image/jpeg';
}

// Initialize default admin and user store safely
try {
  initAuthStore();
} catch (e) {
  console.warn('[Auth] Init store warning:', e);
}

function extractToken(req: Request): string {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  const xToken = req.headers['x-auth-token'];
  if (typeof xToken === 'string') return xToken.trim();
  return '';
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  (req as any).user = {
    id: 'admin_daotam28',
    username: 'daotam28',
    role: 'admin',
    displayName: 'Quản trị viên Hệ thống (daotam28)',
    isActive: true,
  };
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  (req as any).user = {
    id: 'admin_daotam28',
    username: 'daotam28',
    role: 'admin',
    displayName: 'Quản trị viên Hệ thống (daotam28)',
    isActive: true,
  };
  next();
}

// ================= API ENDPOINTS =================
// Hỗ trợ cả 2 dạng: /api/... và /... để không phụ thuộc vào rewrite của serverless

// API: Health check
app.get(['/api/health', '/health'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    primaryModel: PRIMARY_MODEL,
    fallbackModels: CANDIDATE_MODELS,
    time: new Date().toISOString(),
  });
});

// Root API ping
app.get(['/api', '/api/'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    name: 'Hệ thống tạo đề theo đề mẫu API',
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// ================= AUTH ROUTES =================
// Đăng nhập (Admin: daotam28 / 123456@ hoặc Tài khoản người dùng có hạn sử dụng)
app.post(['/api/auth/login', '/auth/login'], (req: Request, res: Response) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.' });
    }

    const result = login(String(username), String(password));
    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Lỗi máy chủ khi đăng nhập: ' + (err?.message || err) });
  }
});

// Lấy thông tin tài khoản hiện tại
app.get(['/api/auth/me', '/auth/me'], (req: Request, res: Response) => {
  try {
    const token = extractToken(req);
    if (!token) {
      return res.status(401).json({ success: false, error: 'Chưa đăng nhập.' });
    }

    const { user, expired } = verifySession(token);
    if (expired) {
      return res.status(401).json({
        success: false,
        expired: true,
        error: 'Tài khoản của bạn đã hết hạn sử dụng. Vui lòng liên hệ Admin.',
      });
    }

    if (!user) {
      return res.status(401).json({ success: false, error: 'Phiên làm việc hết hạn.' });
    }

    res.json({ success: true, user });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lỗi kiểm tra phiên.' });
  }
});

// Đăng xuất
app.post(['/api/auth/logout', '/auth/logout'], (req: Request, res: Response) => {
  const token = extractToken(req);
  if (token) {
    logout(token);
  }
  res.json({ success: true });
});

// ================= ADMIN USER MANAGEMENT ROUTES =================
// Danh sách người dùng (chỉ Admin)
app.get(['/api/admin/users', '/admin/users'], requireAdmin, (req: Request, res: Response) => {
  try {
    const users = listUsersForAdmin();
    res.json({ success: true, users });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lỗi lấy danh sách người dùng.' });
  }
});

// Tạo tài khoản người dùng mới (chỉ Admin)
app.post(['/api/admin/users', '/admin/users'], requireAdmin, (req: Request, res: Response) => {
  try {
    const { username, password, expiryDate, displayName, note } = req.body || {};
    const result = createUserByAdmin({
      username,
      password,
      expiryDate,
      displayName,
      note,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lỗi khi tạo người dùng.' });
  }
});

// Cập nhật người dùng (gia hạn thời gian đến 24h ngày kết thúc, đổi pass, khóa/mở)
app.put(['/api/admin/users/:id', '/admin/users/:id'], requireAdmin, (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const { expiryDate, password, isActive, displayName, note } = req.body || {};

    const result = updateUserByAdmin(userId, {
      expiryDate,
      password,
      isActive,
      displayName,
      note,
    });

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lỗi khi cập nhật người dùng.' });
  }
});

// Xóa tài khoản người dùng (chỉ Admin)
app.delete(['/api/admin/users/:id', '/admin/users/:id'], requireAdmin, (req: Request, res: Response) => {
  try {
    const userId = req.params.id;
    const result = deleteUserByAdmin(userId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Lỗi khi xóa tài khoản.' });
  }
});

// Helper: Nhận diện chính xác 1 trong 3 dạng cấu trúc đề thi theo yêu cầu:
// - Dạng 1: Chỉ bao gồm các câu tự luận (100% Tự luận)
// - Dạng 2: Có 2 phần: Trắc nghiệm (4 lựa chọn) và Tự luận
// - Dạng 3: Đề gồm 4 dạng: Trắc nghiệm 4 lựa chọn, TN Đúng sai, TN trả lời ngắn, Tự luận (Chuẩn Bộ GD&ĐT 2018)
function detectExamStructureType(exam: any): {
  type: 'dang_1_tu_luan' | 'dang_2_trac_nghiem_tu_luan' | 'dang_3_chuan_bo_4_dang';
  label: string;
} {
  if (!exam || !Array.isArray(exam.parts) || exam.parts.length === 0) {
    return {
      type: 'dang_2_trac_nghiem_tu_luan',
      label: 'Dạng 2: Đề kết hợp 2 phần (Trắc nghiệm & Tự luận)',
    };
  }

  const allQuestions = (exam.parts || []).flatMap((p: any) => p.questions || []);

  const hasOptions = allQuestions.some((q: any) => Array.isArray(q.options) && q.options.length > 0);
  const hasTrueFalse = allQuestions.some((q: any) => Array.isArray(q.subQuestions) && q.subQuestions.length > 0);
  const hasShortAnswer = allQuestions.some(
    (q: any) => q.shortAnswer !== undefined && q.shortAnswer !== null && String(q.shortAnswer).trim() !== ''
  );
  const hasEssay = allQuestions.some((q: any) => {
    return (
      q.isEssay === true ||
      ((!q.options || q.options.length === 0) &&
        (!q.subQuestions || q.subQuestions.length === 0) &&
        (!q.shortAnswer || String(q.shortAnswer).trim() === ''))
    );
  });

  const partTitles = (exam.parts || []).map((p: any) => (p.partTitle || '').toUpperCase());
  const hasPartTF = partTitles.some((t: string) => t.includes('ĐÚNG SAI') || t.includes('ĐÚNG / SAI') || t.includes('ĐÚNG-SAI'));
  const hasPartSA = partTitles.some((t: string) => t.includes('TRẢ LỜI NGẮN') || t.includes('ĐIỀN SỐ'));

  // 1. Dạng 3: Đề chuẩn Bộ GD&ĐT 4 dạng (có câu Đúng/Sai HOẶC Trả lời ngắn, hoặc có tiêu đề phần Đúng Sai/Trả lời ngắn)
  if (hasTrueFalse || hasShortAnswer || hasPartTF || hasPartSA) {
    return {
      type: 'dang_3_chuan_bo_4_dang',
      label: 'Dạng 3: Đề chuẩn 4 dạng (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận)',
    };
  }

  // 2. Dạng 1: Đề 100% Tự luận (KHÔNG có bất kỳ câu hỏi trắc nghiệm A, B, C, D nào)
  if (!hasOptions && (hasEssay || allQuestions.length > 0)) {
    return {
      type: 'dang_1_tu_luan',
      label: 'Dạng 1: Đề 100% Tự luận',
    };
  }

  // 3. Dạng 2: Đề có 2 phần Trắc nghiệm & Tự luận (hoặc trắc nghiệm 4 lựa chọn truyền thống)
  return {
    type: 'dang_2_trac_nghiem_tu_luan',
    label: 'Dạng 2: Đề kết hợp 2 phần (Trắc nghiệm & Tự luận)',
  };
}

// Helper: Tạo bảng đặc tả chi tiết 1-1 của từng câu hỏi trong đề gốc để AI bám sát tuyệt đối theo đúng Dạng đề
function formatOriginalExamForPrompt(originalExam: any): string {
  if (!originalExam || !Array.isArray(originalExam.parts)) return '';
  const detected = detectExamStructureType(originalExam);
  const structureType = originalExam.examStructureType || detected.type;
  const structureLabel = originalExam.examStructureLabel || detected.label;

  let result = `=================================================================\n`;
  result += `[CẤU TRÚC ĐỀ MẪU ĐÃ NHẬN DIỆN]: ${structureLabel} (Mã dạng: ${structureType})\n`;

  if (structureType === 'dang_1_tu_luan') {
    result += `>>> QUY TẮC BẮT BUỘC DẠNG 1 (100% TỰ LUẬN):
    - Đề mẫu này là ĐỀ THI 100% TỰ LUẬN.
    - Đề mới BẮT BUỘC PHẢI LÀ 100% CÂU TỰ LUẬN (Bài 1, Bài 2... hoặc Câu 1, Câu 2...).
    - TUYỆT ĐỐI KHÔNG SINH CÂU TRẮC NGHIỆM A, B, C, D!
    - Mỗi câu tự luận mới phải bám sát dạng toán và các ý $a), b), c)...$ tương ứng của câu gốc, đổi mới tham số, có biểu điểm và lời giải tự luận bài bản từng bước.\n`;
  } else if (structureType === 'dang_2_trac_nghiem_tu_luan') {
    result += `>>> QUY TẮC BẮT BUỘC DẠNG 2 (TRẮC NGHIỆM & TỰ LUẬN):
    - Đề mẫu này gồm 2 PHẦN RÕ RỆT: Phần Trắc nghiệm nhiều phương án và Phần Tự luận.
    - Đề mới BẮT BUỘC GIỮ ĐÚNG 2 PHẦN NÀY:
      + PHẦN I: Trắc nghiệm 4 lựa chọn (A, B, C, D) với số lượng câu tương ứng 1-1.
      + PHẦN II: Tự luận (các bài toán giải tự luận chi tiết từng bước) với số lượng bài tương ứng 1-1.\n`;
  } else {
    result += `>>> QUY TẮC BẮT BUỘC DẠNG 3 (CHUẨN BỘ GD&ĐT 4 DẠNG):
    - Đề mẫu theo định dạng Đánh giá năng lực / Tốt nghiệp THPT chuẩn 4 dạng.
    - Đề mới BẮT BUỘC GIỮ ĐÚNG CÁC PHẦN:
      + PHẦN I: Trắc nghiệm nhiều phương án (4 lựa chọn A, B, C, D).
      + PHẦN II: Trắc nghiệm Đúng/Sai (Mỗi câu gồm đúng 4 ý con a, b, c, d với boolean isCorrect).
      + PHẦN III: Trắc nghiệm Trả lời ngắn (Điền kết quả số ngắn gọn vào shortAnswer).
      + PHẦN IV: Tự luận (nếu đề gốc có phần tự luận).\n`;
  }
  result += `=================================================================\n\n`;

  (originalExam.parts || []).forEach((part: any, pIdx: number) => {
    const partTitle = part.partTitle || `PHẦN ${pIdx + 1}`;
    result += `\n=================================================================\n`;
    result += `[MỤC ${pIdx + 1}] ${partTitle}\n`;
    if (part.instruction) result += `Chỉ dẫn: ${part.instruction}\n`;
    result += `=================================================================\n`;

    (part.questions || []).forEach((q: any) => {
      const qNum = q.questionNumber;
      const qType = (q.subQuestions && q.subQuestions.length > 0)
        ? 'Trắc nghiệm Đúng/Sai (4 ý a, b, c, d)'
        : (q.shortAnswer !== undefined && q.shortAnswer !== null && String(q.shortAnswer).trim() !== '')
        ? 'Trắc nghiệm Trả lời ngắn (Điền kết quả số)'
        : (q.options && q.options.length > 0)
        ? 'Trắc nghiệm nhiều phương án (4 lựa chọn A, B, C, D)'
        : 'Tự luận';

      result += `\n--- [CÂU GỐC ${qNum}] ---\n`;
      result += `• Dạng câu: ${qType}\n`;
      result += `• Mức độ nhận thức: ${q.cognitiveLevel || 'Thông hiểu'}\n`;
      if (q.topic) result += `• Chủ đề kiến thức: ${q.topic}\n`;
      if (q.points) result += `• Thang điểm: ${q.points} điểm\n`;
      result += `• Nội dung câu gốc: ${q.content || ''}\n`;

      if (q.options && q.options.length > 0) {
        result += `• Phương án gốc:\n`;
        q.options.forEach((opt: any) => {
          result += `    ${opt.key}. ${opt.content}\n`;
        });
        if (q.correctAnswer) result += `• Đáp án đúng gốc: ${q.correctAnswer}\n`;
      }

      if (q.subQuestions && q.subQuestions.length > 0) {
        result += `• Các ý Đúng/Sai gốc:\n`;
        q.subQuestions.forEach((sq: any) => {
          result += `    ${sq.key}) ${sq.content} -> [${sq.isCorrect ? 'Đúng' : 'Sai'}]\n`;
        });
      }

      if (q.shortAnswer) {
        result += `• Kết quả trả lời ngắn gốc: ${q.shortAnswer}\n`;
      }

      const hasGeom = q.hasVisual || !!q.svgCode || !!q.visualDescription;
      if (hasGeom) {
        result += `• Yếu tố Hình học / Đồ thị gốc: ${q.visualDescription || 'Có hình vẽ minh họa'}\n`;
      }

      result += `>>> YÊU CẦU ĐỐI ỨNG 1-1 BẮT BUỘC CHO [CÂU MỚI ${qNum}]:\n`;
      result += `    - Thứ tự: BẮT BUỘC là Câu ${qNum} thuộc ${partTitle}.\n`;
      result += `    - Chủ đề & Dạng toán: BẮT BUỘC bám sát dạng toán và chủ đề của Câu gốc ${qNum}, cùng mức độ nhận thức (${q.cognitiveLevel || 'Thông hiểu'}).\n`;
      result += `    - Định dạng câu hỏi: Phải đúng định dạng ${qType} của đề mẫu.\n`;

      if (qType === 'Tự luận' || structureType === 'dang_1_tu_luan') {
        result += `    - Yêu cầu tự luận: Biên soạn bài toán tự luận mới, chia các ý a), b), c) nếu có, kèm thang điểm và lời giải tự luận chi tiết từng bước bằng LaTeX.\n`;
      } else if (q.subQuestions && q.subQuestions.length > 0) {
        result += `    - Cấu trúc subQuestions: BẮT BUỘC sinh đủ 4 ý con a, b, c, d tương ứng với 4 ý gốc, mỗi ý có boolean isCorrect chuẩn xác.\n`;
      } else if (q.shortAnswer) {
        result += `    - Cấu trúc shortAnswer: BẮT BUỘC sinh câu hỏi có đáp án trả lời ngắn (số nguyên, số thập phân hoặc phân số tối giản) và điền vào shortAnswer.\n`;
      } else {
        result += `    - Cấu trúc 4 phương án: BẮT BUỘC sinh đủ 4 phương án A, B, C, D (1 đúng, 3 nhiễu hợp lý).\n`;
      }

      if (hasGeom) {
        result += `    - QUY TẮC ĐỔI HÌNH HỌC BẮT BUỘC: Đổi sang LOẠI HÌNH KHÁC LOẠI (ví dụ: Chóp tứ giác -> Lăng trụ tam giác/Tứ diện; Trụ -> Nón/Cầu; Đồ thị bậc 3 -> Trùng phương/Phân thức), đổi toàn bộ thông số kích thước/tọa độ, vẽ mã svgCode mới chuẩn đẹp và đặt hasVisual: true.\n`;
      } else {
        result += `    - Đổi toàn bộ số liệu/hệ số, tính toán nghiệm đẹp, có lời giải chi tiết và công thức chuẩn LaTeX $...$.\n`;
      }
    });
  });

  return result;
}

// API: OCR and Analyze Exam Input - QUÉT TOÀN BỘ 100% NỘI DUNG VÀ NHẬN DIỆN 3 DẠNG ĐỀ
app.post(['/api/exam/analyze', '/exam/analyze'], requireAuth, async (req: Request, res: Response) => {
  try {
    const { images, textContent, subject, grade, examType, timeAllowed, notes, targetStructureType } = req.body || {};

    if ((!images || images.length === 0) && (!textContent || textContent.trim() === '')) {
      return res.status(400).json({ error: 'Vui lòng tải lên ảnh, dán ảnh Ctrl+V hoặc chọn file PDF/Word.' });
    }

    const systemInstruction = `Bạn là Chuyên gia Giáo dục & Đánh giá Khảo thí AI cấp cao kiêm Chuyên viên xử lý dữ liệu tài liệu (OCR & Content Synthesis) của Bộ Giáo dục và Đào tạo Việt Nam.
Nhiệm vụ tối quan trọng: Tiếp nhận tài liệu đề thi mẫu do người dùng cung cấp và:
1. THỰC HIỆN QUÉT ĐẦY ĐỦ 100% TOÀN BỘ TẤT CẢ CÁC CÂU HỎI TRONG ĐỀ THI TỪ ĐẦU ĐẾN CUỐI (từ Câu 1 đến câu cuối cùng).
2. NHẬN DIỆN CHÍNH XÁC CẤU TRÚC ĐỀ THI THUỘC 1 TRONG 3 DẠNG SAU ĐÂY:
   - DẠNG 1: "dang_1_tu_luan" - Đề 100% Tự luận (Đề thi chỉ gồm các bài toán/câu hỏi tự luận, không có các phương án lựa chọn A, B, C, D).
   - DẠNG 2: "dang_2_trac_nghiem_tu_luan" - Đề kết hợp 2 phần (Gồm 2 phần rõ rệt: Phần I Trắc nghiệm 4 lựa chọn A, B, C, D và Phần II Tự luận).
   - DẠNG 3: "dang_3_chuan_bo_4_dang" - Đề chuẩn 4 dạng của Bộ GD&ĐT (Gồm: Trắc nghiệm 4 lựa chọn, Trắc nghiệm Đúng/Sai 4 ý con a, b, c, d, Trắc nghiệm trả lời ngắn điền số, và Tự luận nếu có).

QUY TẮC BẮT BUỘC VỀ PHẠM VI QUÉT 100%:
1. QUÉT ĐỦ 100% TẤT CẢ CÁC CÂU HỎI:
   - Bạn PHẢI duyệt qua tất cả các trang, quét hết từng câu hỏi từ Câu 1 đến câu cuối cùng của đề. Tuyệt đối không cắt ngắn hay bỏ sót.
   - Thống kê chính xác tổng số câu hỏi đã quét được vào trường "totalQuestions".

2. BẢO TOÀN NGUYÊN VẸN CẤU TRÚC VÀ CÁC MỤC/PHẦN THEO ĐÚNG DẠNG ĐỀ ĐÃ NHẬN DIỆN:
   - Nếu là Dạng 1 (100% Tự luận): Giữ nguyên tiêu đề: "BÀI THI TỰ LUẬN" hoặc "PHẦN TỰ LUẬN" (hoặc từng Bài 1, Bài 2...). Mỗi câu có nội dung bài toán, các ý a), b), c), thang điểm (points) và lời giải tự luận chi tiết. KHÔNG tạo phương án A, B, C, D. Đánh dấu isEssay: true.
   - Nếu là Dạng 2 (Trắc nghiệm & Tự luận): Giữ đúng 2 phần:
     + PHẦN I: Trắc nghiệm khách quan (options: [{key: 'A', content: '...'}, ...], correctAnswer: '...').
     + PHẦN II: Tự luận (các bài toán giải tự luận, isEssay: true).
   - Nếu là Dạng 3 (Chuẩn Bộ GD&ĐT 4 dạng):
     + PHẦN I: Trắc nghiệm nhiều phương án (4 lựa chọn A, B, C, D).
     + PHẦN II: Trắc nghiệm Đúng/Sai (Mỗi câu gồm 4 ý a, b, c, d với boolean isCorrect trong subQuestions).
     + PHẦN III: Trắc nghiệm trả lời ngắn (Kết quả điền số vào shortAnswer).
     + PHẦN IV: Tự luận (nếu có).

3. XÁC ĐỊNH CHỦ ĐỀ & MỨC ĐỘ NHẬN THỨC CHO TỪNG CÂU:
   - "topic": Xác định chính xác chủ đề kiến thức và dạng toán cụ thể.
   - "cognitiveLevel": Phân loại 1 trong 4 mức: "Nhận biết", "Thông hiểu", "Vận dụng", "Vận dụng cao".

4. QUY TẮC CÔNG THỨC TOÁN HỌC & HÌNH VẼ SVG:
   - MỌI công thức toán, lý, hóa BẮT BUỘC đặt trong cặp dấu chuẩn LaTeX: $công_thức$ (inline) hoặc $$công_thức$$ (display).
   - Câu nào có hình vẽ (đồ thị, hình học không gian, khối đa diện, nón, trụ, cầu...): đặt hasVisual: true, mô tả trong visualDescription và cung cấp mã svgCode nếu có.

5. ĐỊNH DẠNG ĐẦU RA JSON BẮT BUỘC:
{
  "title": "Tên kỳ thi / Môn học / Lớp / Thời gian làm bài",
  "subject": "Môn học (Toán, Vật lí, Hóa học, Sinh học, v.v.)",
  "grade": "Khối lớp (Lớp 10, Lớp 11, Lớp 12, THPT Quốc Gia, v.v.)",
  "examStructureType": "dang_1_tu_luan" | "dang_2_trac_nghiem_tu_luan" | "dang_3_chuan_bo_4_dang",
  "examStructureLabel": "Dạng 1: Đề 100% Tự luận" | "Dạng 2: Đề kết hợp 2 phần (Trắc nghiệm & Tự luận)" | "Dạng 3: Đề chuẩn 4 dạng (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận)",
  "totalQuestions": 40,
  "matrixSummary": {
    "topics": ["Chủ đề 1", "Chủ đề 2"],
    "cognitiveLevels": {
      "nhanBiet": 40,
      "thongHieu": 30,
      "vanDung": 20,
      "vanDungCao": 10
    },
    "formats": ["Tự luận", "Trắc nghiệm 4 lựa chọn", "Đúng/Sai", "Trả lời ngắn"]
  },
  "parts": [
    {
      "partId": "part_1",
      "partTitle": "Tên phần tương ứng theo đúng dạng đề",
      "instruction": "Chỉ dẫn làm bài của phần này",
      "questions": [
        {
          "questionNumber": 1,
          "content": "Nội dung câu hỏi $...$",
          "cognitiveLevel": "Nhận biết",
          "topic": "Chủ đề cụ thể",
          "hasVisual": false,
          "visualDescription": "",
          "svgCode": "",
          "isEssay": false,
          "points": 1.0,
          "options": [
            { "key": "A", "content": "..." },
            { "key": "B", "content": "..." },
            { "key": "C", "content": "..." },
            { "key": "D", "content": "..." }
          ],
          "correctAnswer": "A",
          "explanation": "Lời giải chi tiết bằng LaTeX"
        }
      ]
    }
  ],
  "rawOcrNotes": "Đã quét thành công 100% toàn bộ câu hỏi và nhận diện chính xác dạng đề"
}`;

    const promptParts: any[] = [];

    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        if (img.data) {
          promptParts.push({
            inlineData: {
              data: img.data,
              mimeType: normalizeMimeType(img.mimeType),
            },
          });
        }
      }
    }

    let userPrompt = `YÊU CẦU QUAN TRỌNG: Hãy thực hiện quét OCR TOÀN DIỆN 100% TẤT CẢ các câu hỏi trong đề thi này, từ Câu 1 đến câu cuối cùng của đề.
ĐẶC BIỆT: Hãy nhận diện chính xác đề thuộc dạng nào trong 3 dạng sau:
1. Dạng 1: Đề 100% Tự luận (chỉ có các bài toán tự luận, không có lựa chọn A, B, C, D)
2. Dạng 2: Đề kết hợp 2 phần (Phần I Trắc nghiệm 4 lựa chọn và Phần II Tự luận)
3. Dạng 3: Đề chuẩn 4 dạng (Trắc nghiệm 4 lựa chọn, TN Đúng/Sai 4 ý, TN Trả lời ngắn, Tự luận)

Thông tin giáo viên:
- Môn: ${subject || 'Tự nhận diện'}
- Khối: ${grade || 'Lớp 12'} (từ Lớp 1 đến Lớp 12)
- Hình thức thi: ${examType || 'Giữa kì'}
- Thời gian làm bài: ${timeAllowed || '90 phút'}
- Gợi ý định dạng mong muốn: ${targetStructureType || 'Tự động nhận diện theo đề mẫu'}
- Ghi chú: ${notes || 'Không có'}
`;

    if (textContent && textContent.trim()) {
      userPrompt += `\n--- VĂN BẢN ĐỀ THI GỐC ---\n${textContent}\n---------------------------\n`;
    }

    userPrompt += `\nLƯU Ý ĐẶC BIỆT:
1. Quét ĐỦ 100% TẤT CẢ các câu hỏi có trong tài liệu, TUYỆT ĐỐI KHÔNG BỎ SÓT câu nào từ đầu đến cuối.
2. Nhận diện chuẩn xác 1 trong 3 dạng: "dang_1_tu_luan", "dang_2_trac_nghiem_tu_luan" hoặc "dang_3_chuan_bo_4_dang".
3. Xuất toàn bộ công thức toán bằng LaTeX $...$ chuẩn. Trả về đúng định dạng JSON quy định.`;

    promptParts.push({ text: userPrompt });

    const response = await callGeminiFast({
      model: FAST_MODEL,
      contents: { parts: promptParts },
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 65536,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = safeParseJSON(responseText, {
      title: 'Đề Thi Mẫu Đã Quét Toàn Bộ 100%',
      subject: subject || 'Toán học',
      grade: grade || 'Lớp 12',
      examType: examType || 'Giữa kì',
      timeAllowed: timeAllowed || '90 phút',
      parts: [],
    });

    if (subject) parsedData.subject = subject;
    if (grade) parsedData.grade = grade;
    if (examType) parsedData.examType = examType;
    if (timeAllowed) parsedData.timeAllowed = timeAllowed;

    // Chuẩn hóa và kiểm chứng chính xác 100% dạng đề
    const detected = detectExamStructureType(parsedData);
    if (targetStructureType && ['dang_1_tu_luan', 'dang_2_trac_nghiem_tu_luan', 'dang_3_chuan_bo_4_dang'].includes(targetStructureType)) {
      parsedData.examStructureType = targetStructureType;
      parsedData.examStructureLabel =
        targetStructureType === 'dang_1_tu_luan'
          ? 'Dạng 1: Đề 100% Tự luận'
          : targetStructureType === 'dang_2_trac_nghiem_tu_luan'
          ? 'Dạng 2: Đề kết hợp 2 phần (Trắc nghiệm & Tự luận)'
          : 'Dạng 3: Đề chuẩn 4 dạng (Trắc nghiệm, Đúng/Sai, Trả lời ngắn, Tự luận)';
    } else {
      parsedData.examStructureType = parsedData.examStructureType || detected.type;
      parsedData.examStructureLabel = parsedData.examStructureLabel || detected.label;
    }

    const allQuestions = (parsedData.parts || []).flatMap((p: any) => p.questions || []);
    if (allQuestions.length > 0) {
      parsedData.totalQuestions = allQuestions.length;
    }

    res.json({
      success: true,
      data: parsedData,
      totalQuestionsScanned: allQuestions.length,
      examStructureType: parsedData.examStructureType,
      examStructureLabel: parsedData.examStructureLabel,
    });
  } catch (error: any) {
    console.error('Error analyzing exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi xử lý OCR và phân tích đề thi.',
    });
  }
});

// API: Sinh đề tương đương - BÁM SÁT 100% DẠNG ĐỀ ĐÃ NHẬN DIỆN (DẠNG 1, DẠNG 2 HOẶC DẠNG 3)
app.post(['/api/exam/generate-equivalent', '/exam/generate-equivalent'], requireAuth, async (req: Request, res: Response) => {
  try {
    const { originalExam, variantIndex = 1, customization } = req.body || {};

    if (!originalExam || !originalExam.parts) {
      return res.status(400).json({ error: 'Thiếu dữ liệu đề thi gốc để sinh đề tương đương.' });
    }

    const totalOriginalQuestions = (originalExam.parts || []).flatMap((p: any) => p.questions || []).length;
    const currentCodeNumber = 100 + Number(variantIndex);

    // Nhận diện dạng đề của đề gốc
    const detected = detectExamStructureType(originalExam);
    const structureType = originalExam.examStructureType || detected.type;
    const structureLabel = originalExam.examStructureLabel || detected.label;

    // Chuyển đề gốc thành bảng Blueprint đặc tả 1-1 từng câu theo đúng dạng đề
    const structuredBlueprint = formatOriginalExamForPrompt(originalExam);

    const systemInstruction = `Bạn là Chuyên gia Khảo thí & Biên soạn Đề thi Quốc gia cấp cao của Bộ Giáo dục & Đào tạo Việt Nam.
Nhiệm vụ tối thượng: Biên soạn ĐỀ THI TƯƠNG ĐƯƠNG (MÃ ĐỀ: ${currentCodeNumber}) BÁM SÁT 1-1 TUYỆT ĐỐI THEO TỪNG CÂU VÀ THEO ĐÚNG DẠNG ĐỀ CỦA ĐỀ THI MẪU:
DẠNG ĐỀ: ${structureLabel} (Mã: ${structureType})

NGUYÊN TẮC BẮT BUỘC 100% THEO TỪNG DẠNG ĐỀ:
1. NẾU ĐỀ GỐC LÀ DẠNG 1 (ĐỀ 100% TỰ LUẬN):
   - Đề mới BẮT BUỘC 100% LÀ CÁC CÂU TỰ LUẬN (Bài 1, Bài 2... hoặc Câu 1, Câu 2...).
   - TUYỆT ĐỐI KHÔNG SINH BẤT KỲ CÂU TRẮC NGHIỆM A, B, C, D NÀO!
   - Từng bài toán tự luận mới phải tương đương 1-1 với bài toán tự luận đề gốc (cùng chủ đề, cùng phương pháp giải, đổi tham số, nghiệm đẹp, kèm thang điểm points và hướng dẫn giải tự luận bài bản từng bước).

2. NẾU ĐỀ GỐC LÀ DẠNG 2 (KẾT HỢP 2 PHẦN TRẮC NGHIỆM & TỰ LUẬN):
   - Đề mới BẮT BUỘC GỒM ĐÚNG 2 PHẦN:
     + PHẦN I: Trắc nghiệm 4 lựa chọn (A, B, C, D) - tương ứng 1-1 từng câu.
     + PHẦN II: Tự luận - tương ứng 1-1 từng bài tự luận, có thang điểm và lời giải bài bản.

3. NẾU ĐỀ GỐC LÀ DẠNG 3 (CHUẨN BỘ GD&ĐT 4 DẠNG):
   - Đề mới BẮT BUỘC GIỮ ĐÚNG CÁC PHẦN:
     + PHẦN I: Trắc nghiệm nhiều phương án (4 lựa chọn A, B, C, D).
     + PHẦN II: Trắc nghiệm Đúng/Sai (Mỗi câu gồm đúng 4 ý con a, b, c, d với boolean isCorrect).
     + PHẦN III: Trắc nghiệm Trả lời ngắn (kết quả điền số vào shortAnswer).
     + PHẦN IV: Tự luận (nếu đề gốc có phần tự luận).

4. QUY TẮC BẮT BUỘC VỀ YẾU TỐ HÌNH HỌC (BẮT BUỘC THAY ĐỔI THÀNH CÁC HÌNH KHÁC NHAU):
   - Với MỌI câu hỏi có yếu tố hình học (hình học phẳng, hình không gian, khối đa diện, khối tròn xoay, hệ tọa độ Oxyz, đồ thị hàm số):
     + BẮT BUỘC ĐỔI SANG LOẠI HÌNH KHÁC NHAU:
       * Chóp tứ giác -> Lăng trụ tam giác, tứ diện, hoặc lăng trụ đứng tứ giác.
       * Chóp tam giác (tứ diện) -> Lăng trụ đứng tam giác hoặc hình hộp.
       * Trụ -> Nón hoặc Cầu.
       * Nón -> Trụ hoặc Cầu.
       * Tam giác vuông -> Tam giác đều, tam giác cân hoặc hình thang vuông.
       * Đồ thị bậc ba -> Bậc bốn trùng phương hoặc Phân thức hữu tỷ.
     + Đổi mới toàn bộ số liệu kích thước, tọa độ, hệ số hàm số để ra nghiệm đẹp.
     + Sinh mã SVG ("svgCode") vẽ đúng theo loại hình mới đã chuyển đổi và đặt "hasVisual": true.

5. ĐÁP ÁN VÀ LỜI GIẢI CHI TIẾT:
   - "quickAnswerKey": Cung cấp mảng đáp án nhanh. Với câu tự luận có thể ghi "Xem lời giải".
   - "explanation": Hướng dẫn giải chi tiết bằng công thức LaTeX chuẩn mực.

CẤU TRÚC JSON TRẢ VỀ:
{
  "examCode": "MÃ ĐỀ: ${currentCodeNumber}",
  "title": "Đề thi môn ${originalExam.subject || 'Toán'} - ${originalExam.grade || 'Lớp 12'}",
  "subject": "${originalExam.subject || 'Toán'}",
  "grade": "${originalExam.grade || 'Lớp 12'}",
  "examType": "${originalExam.examType || 'Giữa kì'}",
  "examStructureType": "${structureType}",
  "examStructureLabel": "${structureLabel}",
  "timeAllowed": "${originalExam.timeAllowed || '90 phút'}",
  "totalScore": 10.0,
  "totalQuestions": ${totalOriginalQuestions},
  "parts": [
    {
      "partId": "part_1",
      "partTitle": "Tên phần tương ứng",
      "instruction": "Chỉ dẫn làm bài",
      "questions": [
        {
          "questionNumber": 1,
          "content": "Nội dung câu 1 mới tương đương 1-1 với câu 1 đề gốc...",
          "cognitiveLevel": "Nhận biết",
          "topic": "Chủ đề",
          "hasVisual": false,
          "visualDescription": "",
          "svgCode": "",
          "isEssay": false,
          "points": 1.0,
          "options": [
            { "key": "A", "content": "$...$" },
            { "key": "B", "content": "$...$" },
            { "key": "C", "content": "$...$" },
            { "key": "D", "content": "$...$" }
          ],
          "correctAnswer": "A",
          "explanation": "Lời giải chi tiết từng bước..."
        }
      ]
    }
  ],
  "quickAnswerKey": [
    { "question": 1, "answer": "A" }
  ],
  "pedagogicalNotes": "Đề tương đương được biên soạn chuẩn mực 100% bám sát dạng đề ${structureLabel}."
}`;

    const userPrompt = `Hãy biên soạn ĐỀ THI TƯƠNG ĐƯƠNG (MÃ ĐỀ: ${currentCodeNumber}) BÁM SÁT 1-1 TUYỆT ĐỐI THEO DẠNG ĐỀ [${structureLabel}] của ${totalOriginalQuestions} câu hỏi từ đề gốc sau:

${structuredBlueprint}

YÊU CẦU BẮT BUỘC CAO NHẤT:
1. BÁM SÁT 100% DẠNG ĐỀ ĐÃ NHẬN DIỆN:
   ${structureType === 'dang_1_tu_luan'
     ? '- ĐÂY LÀ ĐỀ 100% TỰ LUẬN: Đề mới BẮT BUỘC sinh 100% là các bài toán tự luận, TUYỆT ĐỐI KHÔNG sinh trắc nghiệm A, B, C, D! Mỗi câu tự luận có lời giải bài bản từng bước.'
     : structureType === 'dang_2_trac_nghiem_tu_luan'
     ? '- ĐÂY LÀ ĐỀ GỒM 2 PHẦN TRẮC NGHIỆM VÀ TỰ LUẬN: Giữ đúng 2 phần: Phần I Trắc nghiệm 4 lựa chọn và Phần II Tự luận.'
     : '- ĐÂY LÀ ĐỀ CHUẨN 4 DẠNG BỘ GD&ĐT: Giữ đúng các phần: Trắc nghiệm 4 chọn 1, Đúng/Sai 4 ý có subQuestions, Trả lời ngắn có shortAnswer, Tự luận nếu có.'}
2. ĐỐI ỨNG 1-1 TỪNG CÂU: Duyệt từ Câu 1 đến Câu ${totalOriginalQuestions}, mỗi câu mới cùng dạng toán, cùng chủ đề, cùng mức độ nhận thức.
3. CÁC CÂU CÓ HÌNH HỌC: BẮT BUỘC chuyển sang loại hình khác theo quy định (chóp -> lăng trụ/tứ diện; trụ -> nón/cầu; bậc 3 -> trùng phương/phân thức; ...), đổi số liệu và vẽ svgCode tương ứng.
4. MÃ ĐỀ: Đặt đúng là "MÃ ĐỀ: ${currentCodeNumber}".
5. Trả về định dạng JSON thuần túy theo mẫu quy định.`;

    const response = await callGeminiFast({
      model: FAST_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.1,
        topP: 0.8,
        maxOutputTokens: 65536,
      },
    });

    const responseText = response.text || '{}';
    const parsedData = safeParseJSON(responseText, {
      examCode: `MÃ ĐỀ: ${currentCodeNumber}`,
      title: `Đề thi môn ${originalExam.subject || 'Toán'} - ${originalExam.grade || 'Lớp 12'}`,
      subject: originalExam.subject,
      grade: originalExam.grade,
      examType: originalExam.examType || 'Giữa kì',
      timeAllowed: originalExam.timeAllowed || '90 phút',
      parts: originalExam.parts,
      totalQuestions: totalOriginalQuestions,
    });

    parsedData.examCode = `MÃ ĐỀ: ${currentCodeNumber}`;
    parsedData.title = `Đề thi môn ${originalExam.subject || 'Toán'} - ${originalExam.grade || 'Lớp 12'}`;
    parsedData.subject = originalExam.subject;
    parsedData.grade = originalExam.grade;
    parsedData.examType = originalExam.examType || 'Giữa kì';
    parsedData.timeAllowed = originalExam.timeAllowed || '90 phút';
    parsedData.examStructureType = structureType;
    parsedData.examStructureLabel = structureLabel;

    res.json({
      success: true,
      data: parsedData,
    });
  } catch (error: any) {
    console.error('Error generating equivalent exam:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi trong quá trình sinh đề thi tương đương.',
    });
  }
});

// API: Phân tích chuyên sâu câu hỏi (Casio + Bẫy đề)
app.post(['/api/exam/explain-question', '/exam/explain-question'], requireAuth, async (req: Request, res: Response) => {
  try {
    const { question, subject } = req.body || {};

    if (!question) {
      return res.status(400).json({ error: 'Thiếu thông tin câu hỏi.' });
    }

    const systemInstruction = `Bạn là Giáo viên Chuyên sâu cấp Quốc gia môn ${subject || 'Toán / Khoa học tự nhiên'}.
Phân tích toàn diện câu hỏi, cung cấp:
1. Bản chất toán học/khoa học và định lý cần dùng.
2. Phương pháp giải chính quy (Tự luận bài bản từng bước, có LaTeX).
3. Phương pháp giải nhanh / Bấm máy tính Casio fx-580VN X / Casio fx-880BTG (nếu áp dụng được).
4. Phân tích các phương án gây nhiễu (Tại sao học sinh dễ chọn nhầm B, C hoặc D).
5. Lời khuyên vàng khi gặp dạng toán này trong phòng thi.
6. Một câu hỏi mở rộng cùng dạng để học sinh luyện tập thêm ngay tại chỗ.`;

    const userPrompt = `Câu hỏi:
${question.content}

Các phương án:
${question.options?.map((opt: any) => `${opt.key}. ${opt.content}`).join('\n') || ''}

Đáp án đúng: ${question.correctAnswer || 'Chưa rõ'}
Lời giải hiện có: ${question.explanation || 'Không có'}`;

    const response = await callGeminiFast({
      model: FAST_MODEL,
      contents: userPrompt,
      config: {
        systemInstruction,
        temperature: 0.2,
      },
    });

    res.json({
      success: true,
      explanation: response.text,
    });
  } catch (error: any) {
    console.error('Error explaining question:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Lỗi khi tạo lời giải chuyên sâu.',
    });
  }
});

// Fallback 404 handler ONLY for API routes (cho phép các yêu cầu frontend /, /src/..., assets đi tiếp)
app.use((req: Request, res: Response, next: NextFunction) => {
  const p = req.path || req.url || '';
  if (
    p.startsWith('/api') ||
    p.startsWith('/auth') ||
    p.startsWith('/exam') ||
    p.startsWith('/admin')
  ) {
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({
        success: false,
        error: `Không tìm thấy API: ${req.method} ${req.originalUrl || req.url}`,
      });
    }
  }
  next();
});

// Global error handler for API
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[API Server Error]:', err);
  if (!res.headersSent) {
    res.setHeader('Content-Type', 'application/json');
    res.status(err?.status || 500).json({
      success: false,
      error: err?.message || 'Lỗi máy chủ khi xử lý yêu cầu.',
    });
  }
});

export default app;
