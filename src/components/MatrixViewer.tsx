import React from 'react';
import { ExamData, CognitiveLevel } from '../types/exam';
import { Layers, CheckCircle2, Award, PieChart, BarChart3, HelpCircle } from 'lucide-react';

interface MatrixViewerProps {
  exam: ExamData;
  isEquivalent?: boolean;
}

export const MatrixViewer: React.FC<MatrixViewerProps> = ({ exam, isEquivalent = false }) => {
  const allQuestions = exam.parts.flatMap((p) => p.questions);
  const totalQuestions = allQuestions.length || 1;

  // Calculate actual distribution from questions
  const counts: Record<CognitiveLevel, number> = {
    'Nhận biết': 0,
    'Thông hiểu': 0,
    'Vận dụng': 0,
    'Vận dụng cao': 0,
  };

  const topicCounts: Record<string, number> = {};

  allQuestions.forEach((q) => {
    const level = q.cognitiveLevel || 'Nhận biết';
    if (counts[level] !== undefined) {
      counts[level]++;
    } else {
      counts['Nhận biết']++;
    }

    if (q.topic) {
      topicCounts[q.topic] = (topicCounts[q.topic] || 0) + 1;
    }
  });

  const getPercentage = (count: number) => Math.round((count / totalQuestions) * 100);

  const levelConfigs: Array<{
    level: CognitiveLevel;
    label: string;
    sub: string;
    color: string;
    bg: string;
    text: string;
    border: string;
  }> = [
    {
      level: 'Nhận biết',
      label: 'Nhận Biết (Recognition)',
      sub: 'Định nghĩa, công thức cơ bản, nhận diện đồ thị',
      color: 'bg-blue-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
    },
    {
      level: 'Thông hiểu',
      label: 'Thông Hiểu (Comprehension)',
      sub: 'Giải thích hiện tượng, biến đổi công thức, suy luận 1-2 bước',
      color: 'bg-emerald-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
    },
    {
      level: 'Vận dụng',
      label: 'Vận Dụng (Application)',
      sub: 'Áp dụng kiến thức giải quyết bài toán phức hợp, tính toán thực tế',
      color: 'bg-amber-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
    },
    {
      level: 'Vận dụng cao',
      label: 'Vận Dụng Cao (High-Level)',
      sub: 'Bài toán cực trị, tham số $m$, tổng hợp liên chuyên đề, bài toán mở',
      color: 'bg-rose-500',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/40 to-slate-50 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-700 text-xs font-semibold uppercase tracking-wider">
              <Layers className="h-4 w-4" />
              <span>Ma Trận Đánh Giá Khảo Thí Chuẩn Sư Phạm</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900 mt-1">{exam.title}</h3>
            <p className="text-xs text-slate-600 mt-1">
              Môn: <span className="font-semibold text-slate-800">{exam.subject}</span> • Khối:{' '}
              <span className="font-semibold text-slate-800">{exam.grade}</span> • Tổng số:{' '}
              <span className="font-semibold text-indigo-600">{allQuestions.length} câu</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-indigo-200/80 bg-white px-4 py-2.5 text-center shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase">Thang Điểm</div>
              <div className="text-xl font-extrabold text-indigo-700">
                {exam.totalScore ? `${exam.totalScore.toFixed(1)}đ` : '10.0đ'}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200/80 bg-white px-4 py-2.5 text-center shadow-2xs">
              <div className="text-[11px] font-medium text-slate-500 uppercase">Thời Lượng</div>
              <div className="text-xl font-extrabold text-emerald-700">
                {exam.timeAllowed || '90 phút'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4 Cognitive Levels Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {levelConfigs.map((cfg) => {
          const count = counts[cfg.level];
          const pct = getPercentage(count);
          return (
            <div
              key={cfg.level}
              className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 transition-all hover:shadow-xs`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>
                  {cfg.level}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-extrabold ${cfg.text} bg-white border ${cfg.border}`}>
                  {pct}%
                </span>
              </div>

              <div className="mt-3 flex items-baseline gap-1.5">
                <span className="text-3xl font-extrabold text-slate-900">{count}</span>
                <span className="text-xs text-slate-500">/ {totalQuestions} câu</span>
              </div>

              <p className="mt-1 text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                {cfg.sub}
              </p>

              {/* Progress bar */}
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full ${cfg.color} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Formats and Parts breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Parts breakdown */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-sm font-bold text-slate-800">
            <BarChart3 className="h-4 w-4 text-indigo-600" />
            <span>Phân Bố Cấu Trúc Các Phần Thi</span>
          </div>

          <div className="mt-4 space-y-3">
            {exam.parts.map((part, idx) => (
              <div key={part.partId || idx} className="rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800">{part.partTitle}</h4>
                  <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                    {part.questions.length} câu
                  </span>
                </div>
                {part.instruction && (
                  <p className="mt-1 text-[11px] text-slate-500 italic">{part.instruction}</p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Topics List */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-sm font-bold text-slate-800">
            <PieChart className="h-4 w-4 text-emerald-600" />
            <span>Chuyên Đề & Đơn Vị Kiến Thức Xuất Hiện</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(exam.matrixSummary?.topics || Object.keys(topicCounts)).map((topic, idx) => {
              const count = topicCounts[topic] || 1;
              return (
                <div
                  key={idx}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/90 px-3 py-1.5 text-xs text-slate-700 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span className="font-medium">{topic}</span>
                  <span className="ml-1 rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
                    {count}
                  </span>
                </div>
              );
            })}
          </div>

          {exam.rawOcrNotes && (
            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/50 p-3 text-xs text-blue-900">
              <span className="font-semibold">Nhận xét khảo thí:</span> {exam.rawOcrNotes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
