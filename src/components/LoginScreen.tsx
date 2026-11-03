import React, { useState } from 'react';
import {
  Cpu,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  FileText,
  Sparkles,
  Shapes,
  FileCheck2,
  Printer,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { UserAccount } from '../types/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: UserAccount, token: string) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ Tên đăng nhập và Mật khẩu.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    let lastErrorMsg = 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau giây lát.';
    const maxAttempts = 2;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: username.trim(),
            password: password.trim(),
          }),
        });

        let data: any = null;
        let rawText = '';
        try {
          rawText = await res.text();
          data = JSON.parse(rawText);
        } catch {
          // Phản hồi không phải JSON
        }

        if (!res.ok || !data || !data.success) {
          if (res.status === 404) {
            setErrorMessage('Không tìm thấy API máy chủ (/api/auth/login). Hãy đảm bảo bạn đã đẩy thư mục api/ và file vercel.json lên Vercel.');
          } else if (data?.error) {
            setErrorMessage(data.error);
          } else if (rawText && !rawText.includes('<!DOCTYPE') && !rawText.includes('<html')) {
            setErrorMessage(`Lỗi máy chủ (${res.status}): ${rawText.slice(0, 150)}`);
          } else {
            setErrorMessage(`Lỗi máy chủ Vercel (Mã HTTP ${res.status}). Vui lòng kiểm tra tab Logs của Deployment trên Vercel.`);
          }
          setIsLoading(false);
          return;
        }

        // Đăng nhập thành công
        onLoginSuccess(data.user, data.token);
        return;
      } catch (err: any) {
        lastErrorMsg =
          err?.message?.includes('Failed to fetch')
            ? 'Không thể kết nối đến máy chủ. Hãy kiểm tra kết nối mạng hoặc đảm bảo API backend trên Vercel đã được triển khai.'
            : (err?.message || 'Không thể kết nối đến máy chủ.');

        if (attempt < maxAttempts) {
          await new Promise((r) => setTimeout(r, 900));
        }
      }
    }

    setErrorMessage(lastErrorMsg);
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200 my-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
          {/* CỘT TRÁI: GIỚI THIỆU VỀ NỘI DUNG VÀ TÍNH NĂNG TRONG HỆ THỐNG */}
          <div className="lg:col-span-7 bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-950 p-6 sm:p-8 text-white flex flex-col justify-between relative overflow-hidden">
            {/* Họa tiết nền mờ */}
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-blue-500/15 blur-2xl pointer-events-none"></div>
            <div className="absolute -left-12 -bottom-12 h-44 w-44 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none"></div>

            <div className="relative z-10 space-y-6">
              {/* Brand Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
                  <Cpu className="h-6 w-6 text-blue-300" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                    Hệ thống tạo đề theo đề mẫu
                  </h1>
                  <p className="text-[11px] text-blue-200 font-medium">
                    Hệ thống Khảo Thí & Biên Soạn Đề Thi Chuẩn Sư Phạm
                  </p>
                </div>
              </div>

              {/* Lời giới thiệu tổng quan */}
              <div className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
                Nền tảng ứng dụng Trí tuệ Nhân tạo chuyên biệt phục vụ giáo viên trong công tác số hóa, phân tích ma trận khảo thí và biên soạn bộ đề thi phát triển theo đúng chuẩn quy định của Bộ Giáo dục & Đào tạo.
              </div>

              {/* Danh sách các tính năng cốt lõi của hệ thống */}
              <div className="space-y-3.5 pt-1">
                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20 text-blue-300 shrink-0 mt-0.5 border border-blue-400/20">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="text-xs leading-relaxed">
                    <strong className="text-white block font-bold">Quét OCR 100% Đề Thi Mẫu:</strong>
                    <span className="text-slate-300">
                      Tự động trích xuất toàn bộ câu hỏi từ ảnh chụp (dán ảnh nhanh Ctrl+V), file PDF hoặc file Word mà không rút gọn hay bỏ sót.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-300 shrink-0 mt-0.5 border border-indigo-400/20">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="text-xs leading-relaxed">
                    <strong className="text-white block font-bold">Biên Soạn Đề Tương Đương (Đề 101, 102...):</strong>
                    <span className="text-slate-300">
                      Tự động tạo các đề phát triển bám sát 100% cấu trúc, số lượng câu, định dạng trắc nghiệm (Phần I, II, III, IV) và độ khó của đề gốc.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 shrink-0 mt-0.5 border border-emerald-400/20">
                    <Shapes className="h-4 w-4" />
                  </div>
                  <div className="text-xs leading-relaxed">
                    <strong className="text-white block font-bold">Đổi Mới Yếu Tố Hình Học Đa Dạng:</strong>
                    <span className="text-slate-300">
                      Tự động hoán chuyển sang các hình khối, hình học phẳng, đồ thị khác nhau và kết xuất hình vẽ SVG vector chuẩn xác.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300 shrink-0 mt-0.5 border border-amber-400/20">
                    <Printer className="h-4 w-4" />
                  </div>
                  <div className="text-xs leading-relaxed">
                    <strong className="text-white block font-bold">Công Thức LaTeX & Xuất Word (.doc):</strong>
                    <span className="text-slate-300">
                      Trình bày công thức toán học chuẩn mực; xuất file Word định dạng in ấn sư phạm (căn lề 1.5; 1.5; 2.0; 2.5 cm, font Times New Roman).
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chân trang giới thiệu */}
            <div className="pt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200/80">
              <span className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4 text-blue-400" />
                Chuẩn khảo thí Bộ GD&ĐT
              </span>
              <span>Lớp 1 đến Lớp 12</span>
            </div>
          </div>

          {/* CỘT PHẢI: PHẦN NHẬP LIỆU ĐĂNG NHẬP */}
          <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between bg-white">
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mb-3 border border-blue-100">
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Xác Thực Tài Khoản</span>
                </div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Đăng nhập hệ thống</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Nhập thông tin tài khoản được cấp để bắt đầu sử dụng các tính năng biên soạn.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Form nhập liệu */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Tên đăng nhập */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Tên đăng nhập <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Nhập tên tài khoản..."
                      required
                      autoFocus
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-100 transition-all"
                    />
                  </div>
                </div>

                {/* Mật khẩu */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Nhập mật khẩu..."
                      required
                      className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-2.5 pl-10 pr-11 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:bg-white focus:outline-hidden focus:ring-3 focus:ring-blue-100 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 hover:text-slate-700 transition-colors"
                      tabIndex={-1}
                      title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Nút bấm đăng nhập */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 px-4 text-sm font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Đang xác thực...</span>
                    </>
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Ghi chú về quyền cấp phép tài khoản */}
            <div className="mt-6 pt-4 border-t border-slate-100 text-center">
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Tài khoản người dùng do Quản trị viên cấp phép và quản lý thời hạn truy cập (đến 24h00 ngày hết hạn).
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
