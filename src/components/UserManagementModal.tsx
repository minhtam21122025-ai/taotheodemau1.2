import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Users,
  ShieldAlert,
  Clock,
  Calendar,
  Lock,
  UserCheck,
  UserX,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  Shield,
  CalendarPlus,
} from 'lucide-react';
import { UserAccount, formatExpiryDisplay, getRemainingDays, isAccountExpired } from '../types/auth';
import { authFetch, safeResponseJson } from '../utils/apiClient';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
}) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form tạo tài khoản mới
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState(() => {
    // Mặc định hạn dùng 1 tháng kể từ hôm nay
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [isCreating, setIsCreating] = useState(false);

  // Modal gia hạn / chỉnh sửa nhanh
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Modal xác nhận xóa tài khoản (Tránh window.confirm bị chặn trong iframe)
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<UserAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/admin/users');
      const parsedRes = await safeResponseJson(res);
      const data = parsedRes.data;
      if (parsedRes.ok && data && Array.isArray(data.users)) {
        setUsers(data.users);
      } else {
        setNotice({ type: 'error', message: parsedRes.error || data?.error || 'Không thể tải danh sách tài khoản.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Lỗi kết nối khi tải danh sách người dùng.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
      setNotice(null);
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword.trim() || !newExpiryDate.trim()) {
      setNotice({ type: 'error', message: 'Vui lòng điền đủ Tên đăng nhập, Mật khẩu và Thời gian sử dụng.' });
      return;
    }

    setIsCreating(true);
    setNotice(null);

    try {
      const res = await authFetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword.trim(),
          expiryDate: newExpiryDate.trim(),
          displayName: newDisplayName.trim(),
          note: newNote.trim(),
        }),
      });

      const parsedRes = await safeResponseJson(res);
      const data = parsedRes.data;
      if (parsedRes.ok && data?.success) {
        setNotice({
          type: 'success',
          message: `Tạo tài khoản "${data.user.username}" thành công! Hạn dùng đến 24h00 ngày ${newExpiryDate.split('-').reverse().join('/')}.`,
        });
        setNewUsername('');
        setNewPassword('');
        setNewDisplayName('');
        setNewNote('');
        fetchUsers();
      } else {
        setNotice({ type: 'error', message: parsedRes.error || data?.error || 'Tạo tài khoản thất bại.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Lỗi kết nối máy chủ.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (user: UserAccount) => {
    if (user.username.toLowerCase() === 'daotam28') {
      setNotice({ type: 'error', message: 'Không thể khóa tài khoản Quản trị viên tối cao daotam28.' });
      return;
    }

    try {
      const res = await authFetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isActive: !user.isActive,
        }),
      });

      const parsedRes = await safeResponseJson(res);
      const data = parsedRes.data;
      if (parsedRes.ok && data?.success) {
        setNotice({
          type: 'success',
          message: `Đã ${!user.isActive ? 'mở khóa' : 'tạm khóa'} tài khoản "${user.username}".`,
        });
        fetchUsers();
      } else {
        setNotice({ type: 'error', message: parsedRes.error || data?.error || 'Cập nhật trạng thái thất bại.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Lỗi kết nối khi cập nhật trạng thái.' });
    }
  };

  // Thực thi xóa tài khoản người dùng ngay trên hệ thống
  const executeDeleteUser = async () => {
    if (!confirmDeleteUser) return;

    if (confirmDeleteUser.username.toLowerCase() === 'daotam28') {
      setNotice({ type: 'error', message: 'Tuyệt đối không thể xóa tài khoản Quản trị viên mặc định daotam28.' });
      setConfirmDeleteUser(null);
      return;
    }

    setIsDeleting(true);
    try {
      const res = await authFetch(`/api/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
      });
      const parsedRes = await safeResponseJson(res);
      const data = parsedRes.data;
      if (parsedRes.ok && data?.success) {
        setNotice({
          type: 'success',
          message: `Đã xóa vĩnh viễn tài khoản "${confirmDeleteUser.username}" khỏi hệ thống thành công.`,
        });
        setConfirmDeleteUser(null);
        fetchUsers();
      } else {
        setNotice({ type: 'error', message: parsedRes.error || data?.error || 'Xóa tài khoản thất bại.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Lỗi kết nối khi xóa tài khoản.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = (user: UserAccount) => {
    setEditingUser(user);
    setEditExpiryDate(user.expiryDate || '');
    setEditPassword('');
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setIsUpdating(true);

    try {
      const payload: any = {
        expiryDate: editExpiryDate.trim(),
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await authFetch(`/api/admin/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const parsedRes = await safeResponseJson(res);
      const data = parsedRes.data;
      if (parsedRes.ok && data?.success) {
        setNotice({
          type: 'success',
          message: `Đã cập nhật tài khoản "${editingUser.username}" thành công.`,
        });
        setEditingUser(null);
        fetchUsers();
      } else {
        setNotice({ type: 'error', message: parsedRes.error || data?.error || 'Lỗi cập nhật tài khoản.' });
      }
    } catch {
      setNotice({ type: 'error', message: 'Lỗi kết nối máy chủ.' });
    } finally {
      setIsUpdating(false);
    }
  };

  // Nhanh chóng chọn thời hạn (hôm nay + X ngày/tháng)
  const setQuickExpiry = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setNewExpiryDate(d.toISOString().split('T')[0]);
  };

  const setEditQuickExpiry = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setEditExpiryDate(d.toISOString().split('T')[0]);
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.displayName && u.displayName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.note && u.note.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-200">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Quản lý Tài khoản & Phân quyền</h2>
                <span className="rounded-full bg-purple-100 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  DÀNH CHO ADMIN
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Tạo tài khoản người dùng, cấp thời gian sử dụng đến 24h ngày kết thúc và quản lý quyền truy cập
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Content Scrollable */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {notice && (
            <div
              className={`flex items-start gap-3 rounded-2xl border p-4 text-xs font-medium leading-relaxed ${
                notice.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
            >
              {notice.type === 'success' ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">{notice.message}</div>
            </div>
          )}

          {/* Form: Tạo tài khoản người dùng mới */}
          <div className="rounded-2xl border border-blue-200 bg-gradient-to-b from-blue-50/40 to-white p-5 shadow-xs">
            <div className="flex items-center gap-2 text-sm font-bold text-blue-900 mb-3.5">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span>Tạo tài khoản người dùng mới (User)</span>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Username */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="ví dụ: gv_toan12, thay_nam..."
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự..."
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100 font-mono"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Thời gian sử dụng (Hạn cuối) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={newExpiryDate}
                    onChange={(e) => setNewExpiryDate(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Quick Preset Buttons for Expiry Date */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 pt-0.5">
                <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
                  <Clock className="h-3.5 w-3.5 text-blue-500" /> Chọn nhanh hạn dùng:
                </span>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(7)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-slate-100"
                >
                  +7 ngày
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(30)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-slate-100"
                >
                  +1 tháng (30 ngày)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(90)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-slate-100"
                >
                  +3 tháng (90 ngày)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(180)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-slate-100"
                >
                  +6 tháng (1 học kỳ)
                </button>
                <button
                  type="button"
                  onClick={() => setQuickExpiry(365)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium hover:bg-slate-100"
                >
                  +1 năm (365 ngày)
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tên hiển thị / Họ tên (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="ví dụ: Thầy Nam - GV Toán THPT Chuyên"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú nội bộ (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="ví dụ: Khách hàng gói ôn thi tốt nghiệp..."
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Policy Reminder */}
              <div className="flex items-center justify-between pt-2">
                <div className="text-[11px] text-slate-500 italic">
                  * Quy định: Tài khoản người dùng được phép sử dụng đến{' '}
                  <strong className="text-blue-700">24h00 ngày kết thúc</strong>. Sau 24h00, hệ thống sẽ tự động khóa truy cập.
                </div>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60 transition-all shrink-0"
                >
                  {isCreating ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang tạo...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Tạo tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* User List Table */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-700" />
                <h3 className="text-sm font-bold text-slate-900">Danh sách tài khoản ({users.length})</h3>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tìm tài khoản..."
                    className="rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-800 focus:border-blue-600 focus:outline-hidden"
                  />
                </div>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={loading}
                  className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  title="Làm mới danh sách"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                  <span>Tải lại</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3">Tài khoản / Tên</th>
                    <th className="px-4 py-3">Phân loại</th>
                    <th className="px-4 py-3">Thời gian sử dụng</th>
                    <th className="px-4 py-3">Trạng thái</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        {loading ? 'Đang tải danh sách...' : 'Không tìm thấy tài khoản nào.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isExpired = isAccountExpired(user);
                      const remainingDays = getRemainingDays(user);
                      const isDefaultAdmin = user.username.toLowerCase() === 'daotam28';

                      return (
                        <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900 font-mono text-xs">{user.username}</div>
                            {user.displayName && user.displayName !== user.username && (
                              <div className="text-[11px] text-slate-500">{user.displayName}</div>
                            )}
                            {user.note && (
                              <div className="text-[10px] text-slate-400 italic">Ghi chú: {user.note}</div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {user.role === 'admin' ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                                <Shield className="h-3 w-3" />
                                Quản trị (Admin)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                                Người dùng (User)
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {user.role === 'admin' ? (
                              <span className="text-emerald-700 font-medium">Vĩnh viễn (Không giới hạn)</span>
                            ) : (
                              <div>
                                <div className="font-semibold text-slate-800">
                                  {formatExpiryDisplay(user.expiryDate)}
                                </div>
                                <div className="text-[11px]">
                                  {isExpired ? (
                                    <span className="font-bold text-rose-600">Đã hết hạn sử dụng</span>
                                  ) : remainingDays !== null ? (
                                    <span className="text-blue-700 font-medium">
                                      (Còn {remainingDays} ngày)
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3">
                            {!user.isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                                Bị khóa
                              </span>
                            ) : isExpired ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                Hết hạn
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                Đang hoạt động
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Edit / Renew button */}
                              {user.role !== 'admin' && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(user)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                                  title="Gia hạn thời gian hoặc đổi mật khẩu"
                                >
                                  <CalendarPlus className="h-3 w-3" />
                                  <span>Gia hạn / Đổi pass</span>
                                </button>
                              )}

                              {/* Toggle active / lock */}
                              {!isDefaultAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(user)}
                                  className={`rounded-lg p-1.5 text-xs transition-colors ${
                                    user.isActive
                                      ? 'text-amber-600 hover:bg-amber-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  title={user.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                >
                                  {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </button>
                              )}

                              {/* Nút Xóa tài khoản trực tiếp ngay trên hệ thống */}
                              {!isDefaultAdmin && (
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteUser(user)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-2xs"
                                  title={`Xóa vĩnh viễn tài khoản "${user.username}"`}
                                >
                                  <Trash2 className="h-3 w-3 text-rose-600" />
                                  <span>Xóa</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Modal Gia hạn / Đổi pass con */}
        {editingUser && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <CalendarPlus className="h-4 w-4 text-blue-600" />
                  <span>Gia hạn & Đổi mật khẩu: {editingUser.username}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Ngày kết thúc mới (Sử dụng đến 24h00)
                </label>
                <input
                  type="date"
                  value={editExpiryDate}
                  onChange={(e) => setEditExpiryDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden"
                />
                <div className="flex flex-wrap gap-1 mt-2">
                  <button
                    type="button"
                    onClick={() => setEditQuickExpiry(30)}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] hover:bg-slate-100"
                  >
                    +30 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditQuickExpiry(90)}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] hover:bg-slate-100"
                  >
                    +90 ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditQuickExpiry(365)}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] hover:bg-slate-100"
                  >
                    +1 năm
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Đổi mật khẩu mới (Bỏ trống nếu giữ nguyên)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới nếu muốn đổi..."
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-hidden font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={handleSaveEdit}
                  className="rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 disabled:opacity-60"
                >
                  {isUpdating ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Xác nhận Xóa Tài Khoản Trực Tiếp Trên Hệ Thống (Không dùng browser alert/confirm) */}
        {confirmDeleteUser && (
          <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 backdrop-blur-2xs p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-start gap-3.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 shrink-0">
                  <Trash2 className="h-6 w-6 text-rose-600" />
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-bold text-slate-900">
                    Xác nhận xóa tài khoản?
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Bạn sắp xóa vĩnh viễn tài khoản người dùng sau khỏi hệ thống:
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Tên đăng nhập:</span>
                  <span className="font-mono font-bold text-slate-900">{confirmDeleteUser.username}</span>
                </div>
                {confirmDeleteUser.displayName && confirmDeleteUser.displayName !== confirmDeleteUser.username && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Họ tên / Tên hiển thị:</span>
                    <span className="font-semibold text-slate-800">{confirmDeleteUser.displayName}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Thời hạn sử dụng:</span>
                  <span className="text-slate-700 font-medium">{formatExpiryDisplay(confirmDeleteUser.expiryDate)}</span>
                </div>
              </div>

              <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 text-[11px] text-rose-800 leading-relaxed">
                Lưu ý: Thao tác này sẽ xóa toàn bộ thông tin tài khoản và lập tức hủy bỏ mọi phiên làm việc của người dùng. Hành động này không thể hoàn tác!
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setConfirmDeleteUser(null)}
                  className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={executeDeleteUser}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-rose-700 active:bg-rose-800 disabled:opacity-60 transition-colors"
                >
                  {isDeleting ? (
                    <>
                      <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xóa...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Xác nhận xóa tài khoản</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
