import React, { useState } from 'react';
import { ExamData } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { SvgVisualRenderer } from './SvgVisualRenderer';
import { ArrowRight, CheckCircle2, RefreshCw, Sparkles, Scale } from 'lucide-react';

interface SideBySideComparisonProps {
  originalExam: ExamData;
  equivalentExam: ExamData;
}

export const SideBySideComparison: React.FC<SideBySideComparisonProps> = ({
  originalExam,
  equivalentExam,
}) => {
  const originalQuestions = originalExam.parts.flatMap((p) => p.questions);
  const equivalentQuestions = equivalentExam.parts.flatMap((p) => p.questions);

  const [selectedIdx, setSelectedIdx] = useState<number>(0);

  const maxLen = Math.max(originalQuestions.length, equivalentQuestions.length);
  const qIndices = Array.from({ length: maxLen }, (_, i) => i);

  const currentOrig = originalQuestions[selectedIdx];
  const currentEquiv = equivalentQuestions[selectedIdx];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
              <Scale className="h-4 w-4" />
              <span>Đối Soát Sư Phạm & Tính Tương Đương Tuyệt Đối</span>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mt-1">
              Thẩm Định Độ Khó & Biến Đổi Tham Số (Đề Gốc vs Đề Phát Triển)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Đảm bảo giữ vững ma trận kiến thức, mức độ nhận thức, đổi tham số logic, nghiệm đẹp và không mâu thuẫn dữ kiện.
            </p>
          </div>

          {/* Quick Question Selector Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 max-w-full sm:max-w-md">
            {qIndices.map((idx) => (
              <button
                key={`side_pill_q_${idx + 1}`}
                onClick={() => setSelectedIdx(idx)}
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all ${
                  selectedIdx === idx
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Side-by-side comparison view */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Question Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                ĐỀ GỐC
              </span>
              <span className="text-xs text-slate-500 font-medium">{originalExam.examCode || '101'}</span>
            </div>
            {currentOrig && (
              <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                {currentOrig.cognitiveLevel}
              </span>
            )}
          </div>

          {currentOrig ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                Câu {currentOrig.questionNumber}: <span className="text-slate-600 font-medium normal-case">{currentOrig.topic}</span>
              </div>
              <div className="text-sm leading-relaxed text-slate-900">
                <MathRenderer content={currentOrig.content} />
              </div>

              {(currentOrig.svgCode || currentOrig.visualDescription) && (
                <SvgVisualRenderer
                  svgCode={currentOrig.svgCode}
                  visualDescription={currentOrig.visualDescription}
                  title="Hình học / Đồ thị đề gốc"
                />
              )}

              {/* Options */}
              {currentOrig.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {currentOrig.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={`rounded-lg border p-2 text-xs ${
                        opt.key === currentOrig.correctAnswer
                          ? 'border-emerald-500 bg-emerald-50/70 font-semibold text-emerald-950'
                          : 'border-slate-200 bg-slate-50/50 text-slate-700'
                      }`}
                    >
                      <strong className="mr-1">{opt.key}.</strong>
                      <MathRenderer content={opt.content} />
                    </div>
                  ))}
                </div>
              )}

              {/* True/False */}
              {currentOrig.subQuestions && (
                <div className="space-y-1.5 mt-2">
                  {currentOrig.subQuestions.map((sq) => (
                    <div
                      key={sq.key}
                      className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 p-2 text-xs"
                    >
                      <span>
                        <strong>{sq.key})</strong> <MathRenderer content={sq.content} />
                      </span>
                      <span className="font-bold text-indigo-700">{sq.isCorrect ? 'Đúng' : 'Sai'}</span>
                    </div>
                  ))}
                </div>
              )}

              {currentOrig.explanation && (
                <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-700 border border-slate-100">
                  <div className="font-bold text-slate-900 mb-1">Lời giải đề gốc:</div>
                  <MathRenderer content={currentOrig.explanation} />
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">Không có dữ liệu câu hỏi này</div>
          )}
        </div>

        {/* Equivalent Generated Question Card */}
        <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50/20 to-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="rounded-lg bg-indigo-600 px-2.5 py-1 text-xs font-bold text-white shadow-2xs flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                ĐỀ PHÁT TRIỂN TƯƠNG ĐƯƠNG
              </span>
              <span className="text-xs text-indigo-700 font-bold">{equivalentExam.examCode || '102'}</span>
            </div>
            {currentEquiv && (
              <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                Chuẩn: {currentEquiv.cognitiveLevel}
              </span>
            )}
          </div>

          {currentEquiv ? (
            <div className="mt-4 space-y-3">
              <div className="text-sm font-bold text-blue-600 uppercase tracking-wide">
                Câu {currentEquiv.questionNumber}: <span className="text-slate-600 font-medium normal-case">{currentEquiv.topic}</span>
              </div>
              <div className="text-sm leading-relaxed text-slate-900">
                <MathRenderer content={currentEquiv.content} />
              </div>

              {(currentEquiv.svgCode || currentEquiv.visualDescription) && (
                <SvgVisualRenderer
                  svgCode={currentEquiv.svgCode}
                  visualDescription={currentEquiv.visualDescription}
                  title="Hình học / Đồ thị mới (tham số tương đương)"
                />
              )}

              {/* Options */}
              {currentEquiv.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                  {currentEquiv.options.map((opt) => (
                    <div
                      key={opt.key}
                      className={`rounded-lg border p-2 text-xs ${
                        opt.key === currentEquiv.correctAnswer
                          ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-950 ring-1 ring-emerald-500'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <strong className="mr-1">{opt.key}.</strong>
                      <MathRenderer content={opt.content} />
                    </div>
                  ))}
                </div>
              )}

              {/* True/False */}
              {currentEquiv.subQuestions && (
                <div className="space-y-1.5 mt-2">
                  {currentEquiv.subQuestions.map((sq) => (
                    <div
                      key={sq.key}
                      className="flex items-center justify-between rounded-lg border border-indigo-100 bg-white p-2 text-xs"
                    >
                      <span>
                        <strong>{sq.key})</strong> <MathRenderer content={sq.content} />
                      </span>
                      <span className="font-bold text-emerald-700">{sq.isCorrect ? 'Đúng' : 'Sai'}</span>
                    </div>
                  ))}
                </div>
              )}

              {currentEquiv.explanation && (
                <div className="mt-3 rounded-lg bg-indigo-50/60 p-3 text-xs text-indigo-950 border border-indigo-100">
                  <div className="font-bold text-indigo-900 mb-1">Lời giải chi tiết đề phát triển:</div>
                  <MathRenderer content={currentEquiv.explanation} />
                </div>
              )}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-slate-400">
              Đang biên soạn câu hỏi tương đương...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
