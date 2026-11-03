export type UserRole = 'admin' | 'user';

export interface UserAccount {
  id: string;
  username: string;
  role: UserRole;
  createdAt: string;
  expiryDate: string | null; // Định dạng YYYY-MM-DD (cho phép sử dụng đến 24h00 ngày kết thúc)
  isActive: boolean;
  displayName?: string;
  note?: string;
}

export interface AuthSession {
  token: string;
  user: UserAccount;
}

/**
 * Kiểm tra xem tài khoản đã hết hạn sử dụng chưa
 * Quy tắc: Các tài khoản người dùng được phép sử dụng đến 24h ngày kết thúc (23:59:59.999)
 */
export function isAccountExpired(user: UserAccount): boolean {
  if (user.role === 'admin') return false;
  if (!user.expiryDate) return false;

  const now = new Date();

  // Tách ngày YYYY-MM-DD
  const parts = user.expiryDate.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    // 24h ngày kết thúc = 23h59m59s999ms của ngày đó
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
    return now.getTime() > endOfDay.getTime();
  }

  // Fallback nếu chuỗi ngày ở định dạng khác
  const exp = new Date(user.expiryDate);
  exp.setHours(23, 59, 59, 999);
  return now.getTime() > exp.getTime();
}

/**
 * Lấy số ngày còn lại của tài khoản
 */
export function getRemainingDays(user: UserAccount): number | null {
  if (user.role === 'admin' || !user.expiryDate) return null;

  const parts = user.expiryDate.split('-');
  if (parts.length !== 3) return null;

  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const endOfDay = new Date(year, month, day, 23, 59, 59, 999);
  const now = new Date();

  const diffMs = endOfDay.getTime() - now.getTime();
  if (diffMs < 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Định dạng hiển thị hạn sử dụng chuẩn tiếng Việt
 */
export function formatExpiryDisplay(expiryDate: string | null): string {
  if (!expiryDate) return 'Vĩnh viễn (Không giới hạn)';
  const parts = expiryDate.split('-');
  if (parts.length === 3) {
    return `Đến 24h00 ngày ${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return `Đến 24h00 ngày ${expiryDate}`;
}
