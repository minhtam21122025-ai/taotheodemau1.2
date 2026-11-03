import React, { useState, useEffect, useRef } from 'react';
import { ExamData } from './types/exam';
import { authFetch, safeResponseJson } from './utils/apiClient';
import { Header } from './components/Header';
import { ExamViewer } from './components/ExamViewer';
import { MatrixViewer } from './components/MatrixViewer';
import { SideBySideComparison } from './components/SideBySideComparison';
import { ExamInputModal } from './components/ExamInputModal';
import { VariantGeneratorModal } from './components/VariantGeneratorModal';
import { exportExamToWord } from './utils/docxExport';
import {
  Sparkles,
  Upload,
  Image as ImageIcon,
  FileType,
  BookOpen,
  CheckCircle2,
  Trash2,
  ClipboardPaste,
  ShieldCheck,
  Loader2,
  Copy,
  Cpu,
  Download,
  Layers,
  XCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

export default function App() {
  // Trạng thái thông báo kết nối hệ thống
  const [systemBanner, setSystemBanner] = useState<{
    type: 'error' | 'warning';
    title: string;
    message: string;
  } | null>(null);
  const [isRetryingConnection, setIsRetryingConnection] = useState<boolean>(false);

  // Trạng thái đề thi
  const [originalExam, setOriginalExam] = useState<ExamData | null>(null);
  const [equivalentExams, setEquivalentExams] = useState<ExamData[]>([]);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<'original' | 'equivalent' | 'matrix' | 'compare'>('original');

  const [isInputModalOpen, setIsInputModalOpen] = useState<boolean>(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState<boolean>(false);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<string>('');

  // Điều khiển hủy tạo đề tức thì
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  const currentEquivalent = equivalentExams[selectedVariantIndex] || null;

  // Kiểm tra kết nối dịch vụ ngầm khi khởi động ứng dụng
  const checkServiceHealth = async (showNoticeOnFailure = false) => {
    try {
      setIsRetryingConnection(true);
      const res = await fetch('/api/health');
      if (res.ok) {
        setSystemBanner(null);
      } else if (showNoticeOnFailure) {
        if (res.status === 404) {
          setSystemBanner({
            type: 'error',
            title: 'Thông báo trạng thái hệ thống',
            message:
              'Đường dẫn dịch vụ không tìm thấy hoặc đã thay đổi (Mã lỗi 404). Hệ thống đang kiểm tra lại kết nối.',
          });
        } else if (res.status === 503) {
          setSystemBanner({
            type: 'warning',
            title: 'Thông báo trạng thái hệ thống',
            message:
              'Máy chủ dịch vụ tạm thời đang khởi động hoặc quá tải (Mã lỗi 503). Đang kết nối lại...',
          });
        } else {
          setSystemBanner({
            type: 'warning',
            title: 'Thông báo trạng thái hệ thống',
            message: `Máy chủ phản hồi mã ${res.status}. Hệ thống đang kiểm tra lại kết nối.`,
          });
        }
      }
    } catch {
      // Mạng tạm thời chưa sẵn sàng
    } finally {
      setIsRetryingConnection(false);
    }
  };

  useEffect(() => {
    checkServiceHealth(false);
  }, []);

  // Lắng nghe phím tắt Ctrl + V toàn cục khi chưa có đề để tự mở modal và dán ảnh
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (isInputModalOpen) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          setIsInputModalOpen(true);
          break;
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isInputModalOpen]);

  // Đăng xuất (Reset ứng dụng)
  const handleLogout = () => {
    if (window.confirm('Bạn có muốn làm mới lại toàn bộ dữ liệu đề thi không?')) {
      setOriginalExam(null);
      setEquivalentExams([]);
      setActiveTab('original');
    }
  };

  // Hàm dừng / hủy tạo đề ngay lập tức
  const handleCancelGeneration = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsBatchGenerating(false);
    setBatchProgress('');
  };

  // Xử lý sau khi OCR đề gốc thành công và tự động sinh số lượng đề phát triển yêu cầu
  const handleAnalyzeSuccess = async (newExam: ExamData, requestedCount: number = 1) => {
    setOriginalExam(newExam);
    setEquivalentExams([]);
    setActiveTab('original');

    // Nếu người dùng yêu cầu tạo số lượng đề (ví dụ 1, 2, 3...)
    if (requestedCount > 0) {
      isCancelledRef.current = false;
      setIsBatchGenerating(true);
      const generatedList: ExamData[] = [];
      const failedIndices: number[] = [];

      for (let i = 1; i <= requestedCount; i++) {
        if (isCancelledRef.current) break;

        const codeNum = 100 + i;
        setBatchProgress(`Đang biên soạn Đề ${codeNum} (Mã đề: ${codeNum}) bám sát cấu trúc đề mẫu & biến đổi sang các hình học khác nhau... (${i}/${requestedCount})`);

        let success = false;
        let attempt = 0;
        const maxVariantAttempts = 2;

        while (!success && attempt < maxVariantAttempts && !isCancelledRef.current) {
          attempt++;
          try {
            const controller = new AbortController();
            abortControllerRef.current = controller;

            const res = await authFetch(
              '/api/exam/generate-equivalent',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  originalExam: newExam,
                  variantIndex: i,
                  customization: {
                    difficulty: 'Chuẩn 100% tương đương',
                    contextStyle: 'Đời sống thực tế Việt Nam',
                  },
                }),
                signal: controller.signal,
              },
              0
            );

            const parsedRes = await safeResponseJson(res);
            if (isCancelledRef.current) break;

            if (parsedRes.ok && parsedRes.data) {
              parsedRes.data.examCode = `MÃ ĐỀ: ${codeNum}`;
              parsedRes.data.title = `Đề thi môn ${newExam.subject || 'Toán'} - ${newExam.grade || 'Lớp 12'}`;
              generatedList.push(parsedRes.data);
              setEquivalentExams([...generatedList]);
              success = true;
            } else {
              console.warn(`Lỗi khi tạo đề số ${i} (lần thử ${attempt}):`, parsedRes.error);
              if (attempt < maxVariantAttempts && !isCancelledRef.current) {
                setBatchProgress(`Đang thử lại Đề ${codeNum}...`);
                await new Promise((r) => setTimeout(r, 400));
              }
            }
          } catch (e: any) {
            if (isCancelledRef.current || e?.name === 'AbortError') {
              break;
            }
            console.error(`Lỗi mạng khi tạo đề số ${i} (lần thử ${attempt}):`, e);
            if (attempt < maxVariantAttempts && !isCancelledRef.current) {
              setBatchProgress(`Đang kết nối lại để tạo Đề ${codeNum}...`);
              await new Promise((r) => setTimeout(r, 400));
            }
          }
        }

        if (isCancelledRef.current) break;

        if (!success) {
          failedIndices.push(codeNum);
        }

        // Tạm nghỉ 200ms giữa các lần sinh để tăng tốc độ tối đa
        if (i < requestedCount && !isCancelledRef.current) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      abortControllerRef.current = null;
      setIsBatchGenerating(false);
      setBatchProgress('');

      if (generatedList.length > 0) {
        setSelectedVariantIndex(0);
        setActiveTab('equivalent');
      }

      if (failedIndices.length > 0 && !isCancelledRef.current) {
        alert(
          `Đã hoàn thành ${generatedList.length}/${requestedCount} đề thi. ` +
          `Các đề chưa tạo được (Mã: ${failedIndices.join(', ')}). Bạn có thể bấm nút "Sinh thêm Đề" để tạo bổ sung nhé!`
        );
      }
    }
  };

  // Thêm một đề tương đương từ modal
  const handleGenerateSuccess = (newEquivalent: ExamData) => {
    const nextCode = 100 + (equivalentExams.length + 1);
    if (!newEquivalent.examCode || !newEquivalent.examCode.includes('10')) {
      newEquivalent.examCode = `MÃ ĐỀ: ${nextCode}`;
    }
    setEquivalentExams((prev) => [...prev, newEquivalent]);
    setSelectedVariantIndex(equivalentExams.length);
    setActiveTab('equivalent');
  };

  // Nút sinh nhanh 1 đề nữa
  const handleGenerateOneMore = async () => {
    if (!originalExam) return;
    const nextIdx = equivalentExams.length + 1;
    const nextCode = 100 + nextIdx;
    isCancelledRef.current = false;
    setIsBatchGenerating(true);
    setBatchProgress(`Đang biên soạn Đề ${nextCode} (Mã đề: ${nextCode})...`);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await authFetch(
        '/api/exam/generate-equivalent',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalExam,
            variantIndex: nextIdx,
            customization: {
              difficulty: 'Chuẩn 100% tương đương',
              contextStyle: 'Đời sống thực tế Việt Nam',
            },
          }),
          signal: controller.signal,
        },
        1
      );

      const parsedRes = await safeResponseJson(res);
      if (isCancelledRef.current) return;

      if (parsedRes.ok && parsedRes.data) {
        parsedRes.data.examCode = `MÃ ĐỀ: ${nextCode}`;
        parsedRes.data.title = `Đề thi môn ${originalExam.subject || 'Toán'} - ${originalExam.grade || 'Lớp 12'}`;
        handleGenerateSuccess(parsedRes.data);
      } else {
        setSystemBanner({
          type: 'error',
          title: `Lỗi tạo Đề ${nextCode}`,
          message: parsedRes.error || 'Quá trình sinh đề thi gặp sự cố. Vui lòng thử lại.',
        });
      }
    } catch (e: any) {
      if (!isCancelledRef.current && e?.name !== 'AbortError') {
        setSystemBanner({
          type: 'error',
          title: `Lỗi kết nối khi tạo Đề ${nextCode}`,
          message: e?.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại.',
        });
      }
    } finally {
      abortControllerRef.current = null;
      setIsBatchGenerating(false);
      setBatchProgress('');
    }
  };

  // Xuất file Word (.doc)
  const handleExportWord = async () => {
    if (!originalExam) return;
    const examToExport = activeTab === 'equivalent' && currentEquivalent ? currentEquivalent : originalExam;
    await exportExamToWord(examToExport, true);
  };

  // In / Lưu PDF
  const handlePrint = () => {
    window.print();
  };

  // Xóa đề hiện tại để tải đề mới
  const handleClearCurrentExam = () => {
    if (window.confirm('Bạn có chắc muốn xóa đề hiện tại để đưa đề khác lên?')) {
      handleCancelGeneration();
      setOriginalExam(null);
      setEquivalentExams([]);
      setActiveTab('original');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-['Be_Vietnam_Pro',sans-serif]">
      {/* Header điều hướng và tác vụ chính */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasOriginal={!!originalExam}
        hasEquivalent={!!currentEquivalent}
        onOpenUpload={() => setIsInputModalOpen(true)}
        onOpenGenerate={() => setIsGenerateModalOpen(true)}
        onExportWord={handleExportWord}
        onPrint={handlePrint}
        isGenerating={isBatchGenerating}
        examTitle={originalExam?.title}
        onResetExam={handleClearCurrentExam}
        onCancelGenerate={handleCancelGeneration}
      />

      {/* Thông báo trạng thái hệ thống (tự động khôi phục hoặc cho phép đóng/thử lại) */}
      {systemBanner && (
        <div className="bg-rose-50 border-b border-rose-200 text-rose-900 px-4 py-3 shadow-2xs no-print transition-all">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <h4 className="text-xs font-bold text-rose-900">{systemBanner.title}</h4>
                <p className="text-xs text-rose-700 mt-0.5">{systemBanner.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => checkServiceHealth(true)}
                disabled={isRetryingConnection}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-white px-2.5 py-1 text-xs font-medium text-rose-800 hover:bg-rose-100 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRetryingConnection ? 'animate-spin' : ''}`} />
                <span>Thử lại</span>
              </button>
              <button
                type="button"
                onClick={() => setSystemBanner(null)}
                className="rounded-lg bg-rose-200/70 hover:bg-rose-200 px-3 py-1 text-xs font-semibold text-rose-900 transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Thông báo tiến trình sinh hàng loạt kèm NÚT HỦY TẠO ĐỀ NỔI BẬT */}
      {isBatchGenerating && (
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs font-bold py-3 px-4 shadow-md no-print sticky top-16 z-20 animate-fadeIn">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-200 shrink-0" />
              <span className="leading-tight text-white">{batchProgress}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleCancelGeneration}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 px-4 py-2 text-xs font-black text-white shadow-md shadow-rose-900/30 transition-all border border-rose-400 cursor-pointer animate-pulse"
                title="Dừng ngay lập tức việc tạo đề để làm lại đề mới hoặc tạo đề khác"
              >
                <XCircle className="h-4 w-4" />
                <span>HỦY TẠO ĐỀ (DỪNG LẠI)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {!originalExam ? (
          /* ================= GIAO DIỆN ĐƠN GIẢN KHI CHƯA CÓ ĐỀ ================= */
          <div className="max-w-3xl mx-auto space-y-6 py-4">
            {/* Tiêu đề ngắn gọn */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Biên Soạn Đề Thi Tương Đương Chuẩn Khảo Thí
              </h1>
              <p className="text-xs sm:text-sm text-slate-600">
                Đưa đề thi mẫu lên bằng <strong className="text-blue-600">Ảnh (Dán Ctrl+V)</strong> hoặc{' '}
                <strong className="text-blue-600">File PDF / Word</strong>. Hệ thống bám chắc 100% cấu trúc và sinh số lượng đề bạn chọn.
              </p>
            </div>

            {/* Khung bấm chọn tải ảnh hoặc file */}
            <div
              onClick={() => setIsInputModalOpen(true)}
              className="group relative cursor-pointer overflow-hidden rounded-3xl border-2 border-dashed border-blue-300 bg-white p-8 text-center shadow-md transition-all hover:border-blue-500 hover:bg-blue-50/40 hover:shadow-lg"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
                <Upload className="h-8 w-8" />
              </div>

              <div className="mt-4 space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Bấm vào đây để tải đề thi mẫu lên
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hỗ trợ ảnh chụp điện thoại (nhiều trang), dán trực tiếp từ Clipboard, file tài liệu PDF hoặc file Word (.docx)
                </p>
              </div>

              {/* Phím tắt Ctrl + V nổi bật */}
              <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-4 py-1.5 text-xs font-semibold text-blue-700 shadow-2xs">
                <ClipboardPaste className="h-4 w-4 text-blue-600" />
                <span>Hoặc nhấn trực tiếp phím tắt <strong>Ctrl + V</strong> trên bàn phím để dán ảnh chụp màn hình</span>
              </div>
            </div>

            {/* 3 cam kết chuẩn sư phạm */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <CheckCircle2 className="h-4 w-4 text-blue-600" />
                  <span>Giữ nguyên 100% Mục I, II, III, IV</span>
                </div>
                <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">
                  Bảo toàn tuyệt đối cấu trúc từng phần và thứ tự câu hỏi như đề mẫu của giáo viên.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <ShieldCheck className="h-4 w-4 text-blue-600" />
                  <span>Hình vẽ SVG & Công thức LaTeX</span>
                </div>
                <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">
                  Tự động nhận diện câu có hình vẽ để tạo câu hỏi tương tự và sinh đồ thị, hình không gian tương ứng.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span>Sinh hàng loạt 1, 2, 3... đề</span>
                </div>
                <p className="text-slate-500 mt-1 text-[11px] leading-relaxed">
                  Chọn số lượng đề phát triển mong muốn, AI sẽ tự động biên soạn kèm ma trận và lời giải chi tiết.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ================= GIAO DIỆN XEM VÀ LÀM VIỆC VỚI ĐỀ ================= */
          <div className="space-y-6">
            {/* Thanh công cụ thông tin đề & Đổi đề mới */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs no-print">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 shrink-0">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Đề thi môn {originalExam.subject || 'Toán'} - {originalExam.grade || 'Lớp 12'}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>{originalExam.parts?.flatMap((p) => p.questions).length || 40} câu hỏi</span>
                    <span>•</span>
                    <span className="font-semibold text-emerald-600">Đã quét 100% nội dung</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearCurrentExam}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Xóa / Đưa đề khác lên</span>
                </button>
              </div>
            </div>

            {/* Tab Contents */}
            {activeTab === 'original' && (
              <ExamViewer
                exam={originalExam}
                isEquivalent={false}
                onGenerateAnother={() => setIsGenerateModalOpen(true)}
                onUpdateExam={(updated) => setOriginalExam(updated)}
              />
            )}

            {activeTab === 'matrix' && (
              <MatrixViewer
                exam={currentEquivalent || originalExam}
                isEquivalent={!!currentEquivalent}
              />
            )}

            {activeTab === 'equivalent' && (
              <div className="space-y-6">
                {/* Variant Selector Tabs if multiple variants exist */}
                {equivalentExams.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs no-print">
                      {/* Danh sách các đề phát triển theo mã 101, 102, 103... */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
                        <span className="text-xs font-bold text-slate-700 whitespace-nowrap mr-1 flex items-center gap-1.5">
                          <Layers className="h-4 w-4 text-blue-600" />
                          <span>Các đề phát triển:</span>
                        </span>
                        {equivalentExams.map((ex, idx) => {
                          const code = ex.examCode ? ex.examCode.replace(/[^0-9]/g, '') : `${101 + idx}`;
                          const isSelected = selectedVariantIndex === idx;
                          return (
                            <div key={`variant_tab_${idx}`} className={`inline-flex items-center rounded-xl p-0.5 transition-all ${
                              isSelected ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              <button
                                type="button"
                                onClick={() => setSelectedVariantIndex(idx)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                                  isSelected ? 'text-white' : 'text-slate-700 hover:text-slate-900'
                                }`}
                              >
                                Đề {code}
                              </button>
                              <button
                                type="button"
                                onClick={() => exportExamToWord(ex, true)}
                                title={`Tải ngay file Word của Đề ${code}`}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isSelected
                                    ? 'text-white/80 hover:text-white hover:bg-white/20'
                                    : 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100'
                                }`}
                              >
                                <Download className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>

                      {/* Các nút tải đề & hành động */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {currentEquivalent && (
                          <button
                            type="button"
                            onClick={() => exportExamToWord(currentEquivalent, true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-all shadow-xs shadow-emerald-200"
                            title={`Tải file Word (.doc) của Đề ${currentEquivalent.examCode?.replace(/[^0-9]/g, '') || selectedVariantIndex + 101}`}
                          >
                            <Download className="h-4 w-4" />
                            <span>Tải Đề {currentEquivalent.examCode?.replace(/[^0-9]/g, '') || selectedVariantIndex + 101} (.doc)</span>
                          </button>
                        )}

                        {equivalentExams.length > 1 && (
                          <button
                            type="button"
                            onClick={async () => {
                              for (let i = 0; i < equivalentExams.length; i++) {
                                await exportExamToWord(equivalentExams[i], true);
                                await new Promise((r) => setTimeout(r, 600));
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors"
                            title="Tải lần lượt toàn bộ các đề phát triển về máy"
                          >
                            <Download className="h-4 w-4 text-emerald-600" />
                            <span>Tải tất cả {equivalentExams.length} đề</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={handleGenerateOneMore}
                          disabled={isBatchGenerating}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-100 transition-colors shrink-0"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Sinh thêm Đề {101 + equivalentExams.length}</span>
                        </button>
                      </div>
                    </div>

                    <ExamViewer
                      exam={currentEquivalent}
                      isEquivalent={true}
                      onGenerateAnother={() => setIsGenerateModalOpen(true)}
                      onUpdateExam={(updated) => {
                        const updatedList = [...equivalentExams];
                        updatedList[selectedVariantIndex] = updated;
                        setEquivalentExams(updatedList);
                      }}
                    />
                  </div>
                ) : (
                  <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 space-y-4">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Sparkles className="h-7 w-7" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-slate-900">Chưa có đề phát triển nào</h3>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto">
                        Bấm nút bên dưới để AI tự động biên soạn đề tương đương 100% bám sát ma trận và độ khó của đề gốc.
                      </p>
                    </div>
                    <div>
                      <button
                        onClick={() => setIsGenerateModalOpen(true)}
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-200 hover:bg-blue-700 transition-all"
                      >
                        <Sparkles className="h-4 w-4" />
                        <span>Sinh Đề Tương Đương Ngay</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'compare' && currentEquivalent && (
              <div className="space-y-4">
                <SideBySideComparison originalExam={originalExam} equivalentExam={currentEquivalent} />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 no-print">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-medium">
            <span>Hệ thống tạo đề theo đề mẫu • Đánh giá Khảo thí & Biên soạn Đề thi Chuẩn Sư phạm</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Mục I, II, III, IV & Câu 1, Câu 2 (màu xanh dương) • LaTeX $...$ • Xuất Word (.doc)
          </div>
        </div>
      </footer>

      {/* Modal Upload (Dán ảnh Ctrl+V hoặc Tải ảnh / File PDF/Word) */}
      <ExamInputModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        onAnalyzeSuccess={handleAnalyzeSuccess}
      />

      {/* Modal Tùy biến sinh đề */}
      {originalExam && (
        <VariantGeneratorModal
          isOpen={isGenerateModalOpen}
          onClose={() => setIsGenerateModalOpen(false)}
          originalExam={originalExam}
          onGenerateSuccess={handleGenerateSuccess}
          variantCount={equivalentExams.length}
        />
      )}
    </div>
  );
}
