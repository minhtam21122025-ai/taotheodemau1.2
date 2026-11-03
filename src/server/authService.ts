import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

// An toàn trên mọi môi trường (Vercel Serverless, Node CJS, Node ESM, Docker, Dev)
const isVercel = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME || !!process.env.VERCEL_ENV;
let DATA_DIR = path.join('/tmp', 'eduexam_data');

if (!isVercel) {
  try {
    const metaUrl = typeof import.meta !== 'undefined' && import.meta?.url ? import.meta.url : null;
    const baseDir = metaUrl ? path.dirname(fileURLToPath(metaUrl)) : (typeof __dirname !== 'undefined' ? __dirname : process.cwd());
    DATA_DIR = path.resolve(baseDir, '../../data');
  } catch {
    DATA_DIR = path.join(process.cwd(), 'data');
  }
}
const USERS_FILE = path.join(DATA_DIR, 'users.json');

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'user';
  createdAt: string;
  expiryDate: string | null; // YYYY-MM-DD
  isActive: boolean;
  displayName?: string;
  note?: string;
}

export interface SessionInfo {
  token: string;
  userId: string;
  createdAt: number;
}

// In-memory active sessions
const activeSessions = new Map<string, SessionInfo>();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password.trim()).digest('hex');
}

// Tài khoản Admin mặc định: daotam28 / 123456@
const defaultAdminUser: StoredUser = {
  id: 'admin_daotam28',
  username: 'daotam28',
  passwordHash: hashPassword('123456@'),
  role: 'admin',
  createdAt: new Date().toISOString(),
  expiryDate: null, // Admin không giới hạn thời gian
  isActive: true,
  displayName: 'Quản trị viên Hệ thống (daotam28)',
  note: 'Tài khoản Quản trị viên mặc định',
};

// In-memory users cache: Đảm bảo tài khoản luôn hoạt động ngay cả khi filesystem bị read-only trên Vercel
let inMemoryUsers: StoredUser[] = [defaultAdminUser];

/**
 * Đảm bảo thư mục lưu trữ và tài khoản Admin mặc định:
 * Username: daotam28
 * Mật khẩu: 123456@
 */
export function initAuthStore(): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      } catch (e) {
        console.warn('[Auth] Không thể tạo thư mục lưu trữ disk (chế độ serverless):', e);
      }
    }

    if (fs.existsSync(USERS_FILE)) {
      const users = getAllStoredUsers();
      const adminExists = users.some((u) => u.username.toLowerCase() === 'daotam28');
      if (!adminExists) {
        users.unshift(defaultAdminUser);
        saveAllUsers(users);
      }
    } else {
      saveAllUsers([defaultAdminUser]);
    }
  } catch (err) {
    console.warn('[Auth] Khởi tạo auth store sử dụng bộ nhớ in-memory:', err);
  }
}

function getAllStoredUsers(): StoredUser[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const content = fs.readFileSync(USERS_FILE, 'utf-8');
      const parsed = JSON.parse(content) as StoredUser[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryUsers = parsed;
        return parsed;
      }
    }
  } catch (err) {
    // Bỏ qua lỗi đọc disk trên môi trường serverless, dùng cache in-memory
  }
  return inMemoryUsers;
}

function saveAllUsers(users: StoredUser[]): void {
  inMemoryUsers = [...users];
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    // Không ném lỗi nếu môi trường read-only, dữ liệu vẫn được bảo toàn trong inMemoryUsers
    console.warn('[Auth] Không thể lưu file disk (môi trường Serverless/Vercel), dữ liệu đã được lưu an toàn trong in-memory cache.');
  }
}

/**
 * Kiểm tra xem tài khoản người dùng có hết hạn chưa
 * Quy định: Được phép sử dụng đến 24h ngày kết thúc (23:59:59.999 của ngày expiryDate)
 */
export function isUserExpired(user: StoredUser): boolean {
  if (user.role === 'admin') return false;
  if (!user.expiryDate) return false;

  const parts = user.expiryDate.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    // Hết 24h của ngày kết thúc
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
    return Date.now() > endOfDay.getTime();
  }

  const exp = new Date(user.expiryDate);
  exp.setHours(23, 59, 59, 999);
  return Date.now() > exp.getTime();
}

/**
 * Xác thực đăng nhập
 */
export function login(
  usernameInput: string,
  passwordInput: string
): { success: boolean; token?: string; user?: any; error?: string } {
  const username = usernameInput.trim();
  const password = passwordInput.trim();

  const users = getAllStoredUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
  }

  if (!user.isActive) {
    return { success: false, error: 'Tài khoản này hiện đang bị khóa. Vui lòng liên hệ Admin.' };
  }

  const hash = hashPassword(password);
  // Hỗ trợ kiểm tra cả hash SHA-256 lẫn fallback mật khẩu raw nếu chưa hash
  const isValid = user.passwordHash === hash || user.passwordHash === password;

  if (!isValid) {
    return { success: false, error: 'Tên đăng nhập hoặc mật khẩu không chính xác.' };
  }

  // Kiểm tra hạn sử dụng (đến 24h ngày kết thúc)
  if (isUserExpired(user)) {
    const parts = user.expiryDate?.split('-') || [];
    const dateFormatted = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : user.expiryDate;
    return {
      success: false,
      error: `Tài khoản đã hết hạn sử dụng (Thời hạn: đến 24h00 ngày ${dateFormatted}). Vui lòng liên hệ Quản trị viên (Admin) để gia hạn.`,
    };
  }

  // Tạo session token
  const token = 'token_' + crypto.randomBytes(24).toString('hex');
  activeSessions.set(token, {
    token,
    userId: user.id,
    createdAt: Date.now(),
  });

  const safeUser = getSafeUser(user);
  return {
    success: true,
    token,
    user: safeUser,
  };
}

/**
 * Lấy thông tin người dùng từ token
 */
export function verifySession(token: string): { user: any | null; expired: boolean } {
  if (!token) return { user: null, expired: false };

  const session = activeSessions.get(token);
  if (!session) return { user: null, expired: false };

  const users = getAllStoredUsers();
  const user = users.find((u) => u.id === session.userId);
  if (!user || !user.isActive) {
    activeSessions.delete(token);
    return { user: null, expired: false };
  }

  if (isUserExpired(user)) {
    activeSessions.delete(token);
    return { user: null, expired: true };
  }

  return { user: getSafeUser(user), expired: false };
}

export function logout(token: string): void {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Admin: Lấy danh sách tất cả tài khoản
 */
export function listUsersForAdmin(): any[] {
  const users = getAllStoredUsers();
  return users.map((u) => ({
    ...getSafeUser(u),
    isExpired: isUserExpired(u),
  }));
}

/**
 * Admin: Tạo tài khoản người dùng mới
 */
export function createUserByAdmin({
  username,
  password,
  expiryDate,
  displayName,
  note,
}: {
  username: string;
  password: string;
  expiryDate: string; // YYYY-MM-DD
  displayName?: string;
  note?: string;
}): { success: boolean; user?: any; error?: string } {
  const cleanUsername = username.trim();
  const cleanPassword = password.trim();

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Tên đăng nhập phải có ít nhất 3 ký tự.' };
  }

  if (!cleanPassword || cleanPassword.length < 6) {
    return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' };
  }

  if (!expiryDate || !/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) {
    return { success: false, error: 'Thời gian sử dụng không hợp lệ (Định dạng YYYY-MM-DD).' };
  }

  const users = getAllStoredUsers();
  if (users.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
    return { success: false, error: `Tên đăng nhập "${cleanUsername}" đã tồn tại trên hệ thống.` };
  }

  const newUser: StoredUser = {
    id: 'user_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    username: cleanUsername,
    passwordHash: hashPassword(cleanPassword),
    role: 'user',
    createdAt: new Date().toISOString(),
    expiryDate: expiryDate.trim(),
    isActive: true,
    displayName: displayName?.trim() || cleanUsername,
    note: note?.trim() || '',
  };

  users.push(newUser);
  saveAllUsers(users);

  return {
    success: true,
    user: {
      ...getSafeUser(newUser),
      isExpired: isUserExpired(newUser),
    },
  };
}

/**
 * Admin: Cập nhật tài khoản người dùng (gia hạn thời gian, đổi mật khẩu, khóa/mở khóa)
 */
export function updateUserByAdmin(
  userId: string,
  updates: {
    expiryDate?: string;
    password?: string;
    isActive?: boolean;
    displayName?: string;
    note?: string;
  }
): { success: boolean; user?: any; error?: string } {
  const users = getAllStoredUsers();
  const index = users.findIndex((u) => u.id === userId);

  if (index === -1) {
    return { success: false, error: 'Không tìm thấy tài khoản người dùng.' };
  }

  const user = users[index];

  // Không cho phép chỉnh sửa hạn dùng của admin mặc định
  if (user.role === 'admin' && updates.expiryDate !== undefined) {
    updates.expiryDate = null as any;
  }

  if (updates.expiryDate !== undefined) {
    if (updates.expiryDate && !/^\d{4}-\d{2}-\d{2}$/.test(updates.expiryDate)) {
      return { success: false, error: 'Định dạng ngày kết thúc không hợp lệ (YYYY-MM-DD).' };
    }
    user.expiryDate = updates.expiryDate || null;
  }

  if (updates.password && updates.password.trim()) {
    if (updates.password.trim().length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' };
    }
    user.passwordHash = hashPassword(updates.password.trim());
  }

  if (updates.isActive !== undefined) {
    if (user.username.toLowerCase() === 'daotam28' && !updates.isActive) {
      return { success: false, error: 'Không thể khóa tài khoản Quản trị viên tối cao daotam28.' };
    }
    user.isActive = updates.isActive;
  }

  if (updates.displayName !== undefined) {
    user.displayName = updates.displayName.trim();
  }

  if (updates.note !== undefined) {
    user.note = updates.note.trim();
  }

  users[index] = user;
  saveAllUsers(users);

  return {
    success: true,
    user: {
      ...getSafeUser(user),
      isExpired: isUserExpired(user),
    },
  };
}

/**
 * Admin: Xóa tài khoản
 */
export function deleteUserByAdmin(userId: string): { success: boolean; error?: string } {
  if (!userId) {
    return { success: false, error: 'Thiếu mã định danh tài khoản cần xóa.' };
  }

  const users = getAllStoredUsers();
  const target = users.find(
    (u) => u.id === userId || u.username.toLowerCase() === userId.toLowerCase()
  );

  if (!target) {
    return { success: false, error: 'Không tìm thấy tài khoản người dùng để xóa.' };
  }

  if (target.username.toLowerCase() === 'daotam28') {
    return { success: false, error: 'Tuyệt đối không thể xóa tài khoản Quản trị viên mặc định daotam28.' };
  }

  const remaining = users.filter((u) => u.id !== target.id);
  saveAllUsers(remaining);

  // Invalidate any active session for this user
  for (const [token, sess] of activeSessions.entries()) {
    if (sess.userId === target.id) {
      activeSessions.delete(token);
    }
  }

  console.log(`[Admin] Đã xóa thành công tài khoản: ${target.username} (ID: ${target.id})`);
  return { success: true };
}

function getSafeUser(user: StoredUser) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt,
    expiryDate: user.expiryDate,
    isActive: user.isActive,
    displayName: user.displayName || user.username,
    note: user.note || '',
  };
}
