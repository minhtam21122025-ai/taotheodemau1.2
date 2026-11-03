import { UserAccount, AuthSession } from '../types/auth';

const TOKEN_KEY = 'eduexam_auth_token';
const USER_KEY = 'eduexam_auth_user';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthSession(session: AuthSession): void {
  try {
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  } catch (e) {
    console.error('Failed to save auth session:', e);
  }
}

export function getStoredUser(): UserAccount | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as UserAccount;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch (e) {
    console.error('Failed to clear auth session:', e);
  }
}

/**
 * Interface chuẩn hóa kết quả phản hồi an toàn từ API
 */
export interface SafeApiResponse<T = any> {
  ok: boolean;
  status: number;
  data: T | null;
  error?: string;
  isVercelError?: boolean;
}

/**
 * Trích xuất an toàn JSON từ Response, chống lỗi Unexpected token 'A' "A server e"... khi Vercel trả về lỗi HTML/Text
 */
export async function safeResponseJson<T = any>(res: Response): Promise<SafeApiResponse<T>> {
  const status = res.status;
  const ok = res.ok;
  let text = '';

  try {
    text = await res.text();
  } catch (readErr: any) {
    return {
      ok: false,
      status,
      data: null,
      error: `Không thể đọc dữ liệu phản hồi từ máy chủ (${readErr?.message || 'Lỗi mạng'}).`,
    };
  }

  // 1. Cố gắng parse JSON nếu có nội dung
  if (text && text.trim()) {
    try {
      const parsed = JSON.parse(text);
      if (typeof parsed === 'object' && parsed !== null) {
        const isSuccess = ok && parsed.success !== false;
        return {
          ok: isSuccess,
          status,
          data: parsed.data !== undefined ? parsed.data : parsed,
          error: parsed.error || (!isSuccess ? `Máy chủ phản hồi mã lỗi ${status}.` : undefined),
        };
      }
    } catch {
      // Phản hồi không phải định dạng JSON (Vercel gateway error, 500/503/504 plain text/HTML)
    }
  }

  // 2. Nhận diện các lỗi thường gặp từ Vercel Serverless Function hoặc Gateway
  const textSample = text.slice(0, 300);
  const isVercelError =
    textSample.includes('A server error occurred') ||
    textSample.includes('FUNCTION_INVOCATION_FAILED') ||
    textSample.includes('FUNCTION_INVOCATION_TIMEOUT') ||
    textSample.includes('504 Gateway') ||
    textSample.includes('503 Service') ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504;

  let friendlyMessage = '';
  if (textSample.includes('FUNCTION_INVOCATION_TIMEOUT') || status === 504) {
    friendlyMessage =
      'Quá thời gian xử lý của máy chủ Vercel (Timeout). Hãy thử chụp lại ảnh dung lượng nhẹ hơn hoặc chia nhỏ tài liệu để máy chủ xử lý nhanh hơn.';
  } else if (textSample.includes('FUNCTION_INVOCATION_FAILED') || textSample.includes('A server error occurred')) {
    friendlyMessage =
      'Máy chủ Vercel gặp sự cố khi xử lý đề thi. Hãy kiểm tra biến môi trường GEMINI_API_KEY trên Vercel Dashboard (Settings -> Environment Variables) hoặc thử tải ảnh nhẹ hơn.';
  } else if (status === 404) {
    friendlyMessage = 'Không tìm thấy API dịch vụ (Mã 404). Đường dẫn trên Vercel chưa được cấu hình đúng.';
  } else if (status === 429) {
    friendlyMessage = 'Hệ thống AI đang quá tải lượt yêu cầu (Mã 429). Vui lòng đợi vài giây và bấm thử lại.';
  } else if (!ok) {
    const cleanText = text.replace(/<[^>]*>/g, '').trim().slice(0, 150);
    friendlyMessage = `Máy chủ phản hồi mã ${status}: ${cleanText || 'Lỗi dịch vụ không xác định.'}`;
  } else {
    friendlyMessage = 'Dữ liệu phản hồi từ máy chủ không đúng định dạng JSON.';
  }

  return {
    ok: false,
    status,
    data: null,
    isVercelError,
    error: friendlyMessage,
  };
}

/**
 * Custom fetch tự động gắn Bearer Token và hỗ trợ tự động thử lại khi gặp lỗi mạng tạm thời
 */
export async function authFetch(
  url: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<Response> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const token = getAuthToken();
      const headers = new Headers(options.headers || {});

      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Nếu gặp mã lỗi quá tải, hết hạn mức tạm thời hoặc lỗi máy chủ (429, 500, 502, 503, 504), tự động thử lại
      if (
        (response.status === 429 ||
          response.status === 500 ||
          response.status === 502 ||
          response.status === 503 ||
          response.status === 504) &&
        attempt < maxRetries
      ) {
        console.warn(
          `[authFetch] Máy chủ phản hồi mã ${response.status}. Đang thử lại (lần ${attempt + 1}/${maxRetries})...`
        );
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }

      return response;
    } catch (err: any) {
      if (err?.name === 'AbortError' || options.signal?.aborted) {
        throw err;
      }
      lastError = err;
      console.warn(`[authFetch] Lỗi mạng khi gọi ${url} (lần ${attempt + 1}/${maxRetries + 1}):`, err?.message || err);
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
      }
    }
  }

  throw lastError;
}

/**
 * Gọi API và phân tích JSON an toàn tuyệt đối trong một hàm duy nhất
 */
export async function safeAuthFetchJson<T = any>(
  url: string,
  options: RequestInit = {},
  maxRetries = 2
): Promise<SafeApiResponse<T>> {
  try {
    const res = await authFetch(url, options, maxRetries);
    return await safeResponseJson<T>(res);
  } catch (err: any) {
    if (err?.name === 'AbortError' || options.signal?.aborted) {
      return {
        ok: false,
        status: 0,
        data: null,
        error: 'Đã hủy thao tác theo yêu cầu.',
      };
    }
    return {
      ok: false,
      status: 0,
      data: null,
      error: `Không thể kết nối đến máy chủ: ${err?.message || 'Lỗi mạng hoặc máy chủ không phản hồi'}.`,
    };
  }
}

