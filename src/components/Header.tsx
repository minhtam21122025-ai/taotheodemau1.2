import React from 'react';
import {
  BookOpen,
  Sparkles,
  Upload,
  Layers,
  Cpu,
  Printer,
  Download,
  RotateCcw,
  XCircle,
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'original' | 'equivalent' | 'matrix' | 'compare';
  setActiveTab: (tab: 'original' | 'equivalent' | 'matrix' | 'compare') => void;
  hasOriginal: boolean;
  hasEquivalent: boolean;
  onOpenUpload: () => void;
  onOpenGenerate: () => void;
  onExportWord: () => void;
  onPrint: () => void;
  isGenerating: boolean;
  examTitle?: string;
  onResetExam?: () => void;
  onCancelGenerate?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasOriginal,
  hasEquivalent,
  onOpenUpload,
  onOpenGenerate,
  onExportWord,
  onPrint,
  isGenerating,
  examTitle,
  onResetExam,
  onCancelGenerate,
}) => {

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs no-print">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo & Identity */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-200">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-slate-900 text-lg">
                  Hệ thống tạo đề theo đề mẫu
                </span>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 tracking-wide">
                  CHUẨN KHẢO THÍ BỘ GD&ĐT
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium truncate max-w-xs sm:max-w-md hidden sm:block">
                OCR Đề Mẫu (Ảnh / PDF / Word) • Giữ nguyên Mục I, II, III, IV & Câu 1, 2 (Màu xanh dương)
              </p>
            </div>
          </div>

          {/* Action Buttons & Auth Profile */}
          <div className="flex items-center gap-2">
            <button
              onClick={onOpenUpload}
              className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all shadow-xs ${
                hasOriginal
                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-blue-600 text-white hover:bg-blue-700 ring-2 ring-blue-300 animate-pulse'
              }`}
            >
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Đưa Đề Lên (Ảnh / PDF / Word)</span>
              <span className="sm:hidden">Đưa Đề</span>
            </button>

            {hasOriginal && (
              <>
                {isGenerating && onCancelGenerate ? (
                  <button
                    type="button"
                    onClick={onCancelGenerate}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-rose-700 active:bg-rose-800 transition-all shadow-md shadow-rose-200 border border-rose-500 animate-pulse cursor-pointer"
                    title="Dừng việc tạo đề ngay lập tức để làm lại đề mới hoặc tạo đề khác"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Hủy Tạo Đề</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenGenerate}
                    disabled={isGenerating}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 transition-all shadow-xs shadow-blue-200"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Sinh Đề Tương Đương</span>
                  </button>
                )}

                <div className="h-5 w-px bg-slate-200 mx-1 hidden md:block" />

                <button
                  onClick={onExportWord}
                  title="Xuất file Microsoft Word (.doc) căn lề 1.5; 1.5; 2.0; 2.5, phông Times New Roman 13pt"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Download className="h-4 w-4 text-emerald-600" />
                  <span className="hidden md:inline">Xuất Word (.doc)</span>
                </button>

                <button
                  onClick={onPrint}
                  title="In đề thi hoặc Lưu PDF"
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                >
                  <Printer className="h-4 w-4 text-slate-600" />
                </button>
              </>
            )}

            {hasOriginal && onResetExam && (
              <button
                type="button"
                onClick={onResetExam}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 sm:px-3 py-2 text-xs font-semibold text-slate-600 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition-colors shadow-2xs ml-1"
                title="Làm mới lại dữ liệu để tải đề thi mới"
              >
                <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                <span className="hidden sm:inline">Làm mới đề</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation (Visible if an exam is loaded) */}
        {hasOriginal && (
          <div className="flex items-center space-x-1 border-t border-slate-100 py-1.5 text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('original')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'original'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600" />
              <span>Đề Gốc Chuẩn Hóa</span>
            </button>

            <button
              onClick={() => setActiveTab('matrix')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'matrix'
                  ? 'bg-blue-50 text-blue-700 font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
              }`}
            >
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span>Ma Trận & Thống Kê Điểm</span>
            </button>

            <button
              onClick={() => setActiveTab('equivalent')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                activeTab === 'equivalent'
                  ? 'bg-blue-600 text-white font-bold shadow-2xs'
                  : hasEquivalent
                  ? 'text-blue-700 hover:bg-blue-50 font-bold'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Đề Phát Triển (Tương Đương)</span>
              {hasEquivalent && (
                <span className="ml-1 rounded-full bg-white/20 px-1.5 py-0.2 text-[10px]">
                  ✓
                </span>
              )}
            </button>

            {hasEquivalent && (
              <button
                onClick={() => setActiveTab('compare')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  activeTab === 'compare'
                    ? 'bg-blue-50 text-blue-700 font-bold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <div className="flex -space-x-1">
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600"></span>
                  <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </div>
                <span>So Sánh Song Song 1-1</span>
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
