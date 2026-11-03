import React, { useState, useEffect } from 'react';
import { ExamQuestion } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { X, Sparkles, Lightbulb, Calculator, AlertTriangle, BookCheck, Loader2 } from 'lucide-react';
import { authFetch, safeResponseJson } from '../utils/apiClient';

interface DeepExplanationModalProps {
  question: ExamQuestion | null;
  subject: string;
  onClose: () => void;
}

export const DeepExplanationModal: React.FC<DeepExplanationModalProps> = ({
  question,
  subject,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [explanationText, setExplanationText] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!question) return;

    if (question.deepExplanation) {
      setExplanationText(question.deepExplanation);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    authFetch('/api/exam/explain-question', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, subject }),
    })
      .then((res) => safeResponseJson(res))
      .then((parsedRes) => {
        if (!isMounted) return;
        const resData = parsedRes.data;
        if (parsedRes.ok && resData && (resData.explanation || resData.success)) {
          const exp = resData.explanation || resData.data;
          setExplanationText(exp);
          question.deepExplanation = exp;
        } else {
          setError(parsedRes.error || 'Không thể tạo phân tích chuyên sâu.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'Lỗi kết nối máy chủ phân tích.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [question, subject]);

  if (!question) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 px-6 py-4 text-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Phân Tích Chuyên Sâu Câu {question.questionNumber}</span>
                <span className="text-xs font-normal text-indigo-200 bg-indigo-700/50 px-2 py-0.5 rounded-full border border-indigo-500/40">
                  {question.cognitiveLevel}
                </span>
              </h3>
              <p className="text-xs text-indigo-200/80">
                Bản chất toán học • Bấm máy tính Casio • Bẫy đề thi & Bài tập mở rộng
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

        {/* Question Prompt Preview */}
        <div className="bg-slate-50/80 px-6 py-3 border-b border-slate-200/70 text-xs text-slate-800 shrink-0">
          <div className="font-semibold text-slate-600 mb-1">Nội dung câu hỏi:</div>
          <div className="text-slate-900 line-clamp-3">
            <MathRenderer content={question.content} />
          </div>
          {question.correctAnswer && (
            <div className="mt-1 font-bold text-emerald-600">
              Đáp án chuẩn: {question.correctAnswer}
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <div className="text-sm font-semibold text-slate-800">
                Chuyên gia AI đang phân tích toàn diện câu hỏi...
              </div>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                Đang tổng hợp phương pháp tự luận, mẹo bấm máy tính Casio fx-580VN X và phát hiện bẫy trắc nghiệm...
              </p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
              {error}
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-slate-800 text-xs sm:text-sm leading-relaxed space-y-3">
              <MathRenderer content={explanationText} />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 italic">
            Phương pháp giải chuẩn sư phạm Bộ GD&ĐT Việt Nam
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
