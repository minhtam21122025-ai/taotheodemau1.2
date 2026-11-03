import React, { useState, useRef } from 'react';
import { ExamData, ExamVariantConfig } from '../types/exam';
import { Sparkles, Sliders, X, Check, Loader2, AlertCircle, Award, XCircle } from 'lucide-react';
import { authFetch, safeResponseJson } from '../utils/apiClient';

interface VariantGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalExam: ExamData;
  onGenerateSuccess: (equivalentExam: ExamData) => void;
  variantCount: number;
}

export const VariantGeneratorModal: React.FC<VariantGeneratorModalProps> = ({
  isOpen,
  onClose,
  originalExam,
  onGenerateSuccess,
  variantCount,
}) => {
  const [variantIndex, setVariantIndex] = useState<number>(variantCount + 1);
  const [difficulty, setDifficulty] = useState<
    'Chuẩn 100% tương đương' | 'Nâng cao nhẹ (+10% Vận dụng)' | 'Củng cố cơ bản (-10%)'
  >('Chuẩn 100% tương đương');
  const [contextStyle, setContextStyle] = useState<
    'Đời sống thực tế Việt Nam' | 'Khoa học công nghệ hiện đại' | 'Kinh tế & tài chính' | 'Ngữ cảnh chuẩn Bộ GD&ĐT'
  >('Đời sống thực tế Việt Nam');
  const [note, setNote] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  if (!isOpen) return null;

  // Hủy tiến trình sinh đề tương đương
  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setLoadingStep('');
    setError('Đã hủy quá trình tạo đề theo yêu cầu của bạn.');
  };

  const handleGenerate = async () => {
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    setLoadingStep('Đang khởi tạo thuật toán sinh đề phát triển số ' + variantIndex + '...');

    const timer1 = setTimeout(() => {
      setLoadingStep('Đang biến đổi tham số, kiểm tra nghiệm đẹp và tính toán logic...');
    }, 2500);

    const timer2 = setTimeout(() => {
      setLoadingStep('Đang chuyển đổi sang các dạng hình học mới, vẽ hình SVG và viết công thức LaTeX...');
    }, 6000);

    const timer3 = setTimeout(() => {
      setLoadingStep('Đang lập bảng đáp án nhanh và soạn hướng dẫn chấm chi tiết từng bước...');
    }, 9500);

    try {
      const customization: ExamVariantConfig = {
        variantIndex,
        difficulty,
        contextStyle,
        note,
      };

      const res = await authFetch(
        '/api/exam/generate-equivalent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalExam,
            variantIndex,
            customization,
          }),
          signal: controller.signal,
        },
        1
      );

      const parsedRes = await safeResponseJson(res);
      if (parsedRes.ok && parsedRes.data) {
        parsedRes.data.examCode = `MÃ ĐỀ: ${100 + variantIndex}`;
        parsedRes.data.title = `Đề thi môn ${originalExam.subject || 'Toán'} - ${originalExam.grade || 'Lớp 12'}`;
        onGenerateSuccess(parsedRes.data);
        onClose();
      } else {
        setError(parsedRes.error || 'Lỗi khi sinh đề thi tương đương.');
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        setError('Đã hủy tạo đề theo yêu cầu.');
      } else {
        setError(err.message || 'Lỗi kết nối máy chủ khảo thí.');
      }
    } finally {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      abortControllerRef.current = null;
      setLoading(false);
      setLoadingStep('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20 text-white backdrop-blur-xs">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Biên Soạn Đề Thi Tương Đương (Đề Phát Triển)
              </h3>
              <p className="text-xs text-indigo-200">
                Bảo toàn 100% ma trận • Thay số chuẩn sư phạm • SVG & Lời giải chi tiết
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Base Info */}
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs text-indigo-950">
            <div className="font-bold text-indigo-950">Đề thi căn cứ:</div>
            <div className="text-slate-900 font-bold mt-0.5">
              Đề thi môn {originalExam.subject || 'Toán'} - {originalExam.grade || 'Lớp 12'}
            </div>
            <div className="text-slate-500 mt-1 text-xs">
              Tổng số câu hỏi: <strong>{originalExam.parts.reduce((a, b) => a + b.questions.length, 0)} câu</strong>
            </div>
          </div>

          {/* Form Options */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Số thứ tự đề phát triển / Mã đề mong muốn:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={variantIndex}
                  onChange={(e) => setVariantIndex(parseInt(e.target.value, 10) || 1)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold w-24 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <span className="text-xs text-slate-500">
                  (Mã đề tự động tương ứng: <strong>MÃ ĐỀ {100 + variantIndex}</strong>)
                </span>
              </div>
            </div>

            {/* Difficulty alignment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Định hướng độ khó:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    val: 'Chuẩn 100% tương đương',
                    label: 'Chuẩn 100% Tương Đương',
                    sub: 'Độ khó song sinh tuyệt đối',
                  },
                  {
                    val: 'Nâng cao nhẹ (+10% Vận dụng)',
                    label: 'Nâng Cao (+10%)',
                    sub: 'Tăng tư duy phân hóa điểm 8-10',
                  },
                  {
                    val: 'Củng cố cơ bản (-10%)',
                    label: 'Củng Cố (-10%)',
                    sub: 'Phù hợp ôn tập đại trà chống liệt',
                  },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setDifficulty(item.val as any)}
                    className={`rounded-xl border p-2.5 text-left transition-all ${
                      difficulty === item.val
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-semibold ring-1 ring-indigo-600'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Context Style */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phong cách ngữ cảnh thực tế:
              </label>
              <select
                value={contextStyle}
                onChange={(e) => setContextStyle(e.target.value as any)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white"
              >
                <option value="Đời sống thực tế Việt Nam">
                  Đời sống thực tế Việt Nam (giao thông, sản xuất, nông nghiệp, môi trường)
                </option>
                <option value="Khoa học công nghệ hiện đại">
                  Khoa học công nghệ, trí tuệ nhân tạo, hàng không vũ trụ
                </option>
                <option value="Kinh tế & tài chính">
                  Kinh tế, tài chính, lãi suất ngân hàng, tối ưu hóa lợi nhuận
                </option>
                <option value="Ngữ cảnh chuẩn Bộ GD&ĐT">Ngữ cảnh chuẩn mực đề thi Bộ GD&ĐT</option>
              </select>
            </div>

            {/* Note */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Yêu cầu bổ sung của giáo viên (tùy chọn):
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Đổi dạng đồ thị hàm bậc ba sang bậc bốn, số liệu tối giản..."
                className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading status */}
          {loading && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 p-4 text-center space-y-3">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-600 mx-auto" />
              <div className="text-xs font-bold text-indigo-900">{loadingStep}</div>
              <p className="text-[11px] text-indigo-700/80">
                Đang biên soạn đề tương đương chuẩn mực, chuyển đổi các dạng hình học và sinh mã SVG...
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleCancelGenerate}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white px-4 py-1.5 text-xs font-bold shadow-md shadow-rose-200 transition-all cursor-pointer"
                  title="Dừng việc tạo đề này ngay lập tức"
                >
                  <XCircle className="h-4 w-4" />
                  <span>HỦY TẠO ĐỀ (DỪNG LẠI)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={loading ? handleCancelGenerate : onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {loading ? 'Đóng / Hủy' : 'Đóng'}
          </button>
          {loading ? (
            <button
              type="button"
              onClick={handleCancelGenerate}
              className="flex items-center gap-2 rounded-lg bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 active:bg-rose-800 transition-all shadow-md shadow-rose-200 cursor-pointer animate-pulse"
            >
              <XCircle className="h-4 w-4" />
              <span>HỦY TẠO ĐỀ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGenerate}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700 transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="h-4 w-4" />
              <span>Tiến Hành Sinh Đề Tương Đương</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
