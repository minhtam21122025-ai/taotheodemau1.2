import React, { useState, useEffect } from 'react';
import { ExamData, ExamQuestion, CognitiveLevel } from '../types/exam';
import { MathRenderer } from './MathRenderer';
import { SvgVisualRenderer } from './SvgVisualRenderer';
import { DeepExplanationModal } from './DeepExplanationModal';
import {
  HelpCircle,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle,
  XCircle,
  Award,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Bookmark,
  Share2,
  Edit3,
  Check,
  Settings2,
  PenLine,
} from 'lucide-react';

interface ExamViewerProps {
  exam: ExamData;
  isEquivalent?: boolean;
  onGenerateAnother?: () => void;
  onUpdateExam?: (updated: ExamData) => void;
}

export const ExamViewer: React.FC<ExamViewerProps> = ({
  exam,
  isEquivalent = false,
  onGenerateAnother,
  onUpdateExam,
}) => {
  // Mode: 'teacher' (shows answers & explanations) or 'student' (interactive test)
  const [viewMode, setViewMode] = useState<'teacher' | 'student'>('teacher');
  const [showAllExplanations, setShowAllExplanations] = useState<boolean>(true);
  const [expandedExplanations, setExpandedExplanations] = useState<Record<number, boolean>>({});
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [trueFalseSelections, setTrueFalseSelections] = useState<Record<string, boolean>>({});
  const [shortAnswers, setShortAnswers] = useState<Record<number, string>>({});
  const [deepQuestion, setDeepQuestion] = useState<ExamQuestion | null>(null);
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Chỉnh sửa Môn, Khối lớp (1-12), Hình thức thi, Thời gian làm bài
  const [isEditingMeta, setIsEditingMeta] = useState<boolean>(false);
  const [editSubject, setEditSubject] = useState<string>(exam.subject || 'Toán học');
  const [editGrade, setEditGrade] = useState<string>(exam.grade || 'Lớp 12');
  const [editExamType, setEditExamType] = useState<string>(exam.examType || 'Giữa kì');
  const [editTimeAllowed, setEditTimeAllowed] = useState<string>(exam.timeAllowed || '90 phút');

  useEffect(() => {
    setEditSubject(exam.subject || 'Toán học');
    setEditGrade(exam.grade || 'Lớp 12');
    setEditExamType(exam.examType || 'Giữa kì');
    setEditTimeAllowed(exam.timeAllowed || '90 phút');
  }, [exam]);

  const handleSaveMeta = () => {
    const updated: ExamData = {
      ...exam,
      title: `Đề thi môn ${editSubject} - ${editGrade}`,
      subject: editSubject,
      grade: editGrade,
    };
    if (onUpdateExam) {
      onUpdateExam(updated);
    }
    setIsEditingMeta(false);
  };

  const toggleExplanation = (qNum: number) => {
    setExpandedExplanations((prev) => ({
      ...prev,
      [qNum]: !prev[qNum],
    }));
  };

  const handleSelectOption = (qNum: number, key: string) => {
    if (submitted && viewMode === 'student') return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [qNum]: key,
    }));
  };

  const handleSelectTrueFalse = (qNum: number, subKey: string, value: boolean) => {
    if (submitted && viewMode === 'student') return;
    setTrueFalseSelections((prev) => ({
      ...prev,
      [`${qNum}_${subKey}`]: value,
    }));
  };

  const handleShortAnswerChange = (qNum: number, val: string) => {
    if (submitted && viewMode === 'student') return;
    setShortAnswers((prev) => ({
      ...prev,
      [qNum]: val,
    }));
  };

  // Calculate score in student mode
  const calculateScore = () => {
    let score = 0;
    let totalPossible = 0;

    exam.parts.forEach((part) => {
      part.questions.forEach((q) => {
        if (q.options && q.options.length > 0) {
          totalPossible += 1;
          if (selectedAnswers[q.questionNumber] === q.correctAnswer) {
            score += 1;
          }
        } else if (q.subQuestions && q.subQuestions.length > 0) {
          // Standard MOET rule: 1 correct sub-item = 0.1, 2 = 0.25, 3 = 0.5, 4 = 1.0 point
          totalPossible += 1;
          let correctCount = 0;
          q.subQuestions.forEach((sq) => {
            if (trueFalseSelections[`${q.questionNumber}_${sq.key}`] === sq.isCorrect) {
              correctCount++;
            }
          });
          if (correctCount === 1) score += 0.1;
          else if (correctCount === 2) score += 0.25;
          else if (correctCount === 3) score += 0.5;
          else if (correctCount === 4) score += 1.0;
        } else if (q.shortAnswer !== undefined) {
          totalPossible += 0.5;
          const userAns = (shortAnswers[q.questionNumber] || '').trim().replace(',', '.');
          const correctAns = (q.correctAnswer || q.shortAnswer || '').trim().replace(',', '.');
          if (userAns && Math.abs(parseFloat(userAns) - parseFloat(correctAns)) < 0.05) {
            score += 0.5;
          }
        }
      });
    });

    const scaledScore = totalPossible > 0 ? (score / totalPossible) * 10 : 0;
    return { raw: score, scaled: Math.round(scaledScore * 10) / 10, totalPossible };
  };

  const scoreResult = submitted ? calculateScore() : null;

  const getCognitiveBadgeColor = (level: CognitiveLevel) => {
    switch (level) {
      case 'Nhận biết':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Thông hiểu':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Vận dụng':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Vận dụng cao':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs no-print">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                  isEquivalent
                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                    : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                }`}
              >
                {isEquivalent ? 'ĐỀ THI TƯƠNG ĐƯƠNG (ĐỀ PHÁT TRIỂN)' : 'ĐỀ THI GỐC ĐÃ CHUẨN HÓA'}
              </span>
              {exam.examStructureLabel && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800 shadow-2xs">
                  {exam.examStructureLabel}
                </span>
              )}
              {exam.examCode && (
                <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                  {exam.examCode}
                </span>
              )}
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 mt-1.5">
              Đề thi môn {exam.subject || 'Toán'} - {exam.grade || 'Lớp 12'}
            </h2>
            <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
              <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 border border-blue-200 px-3 py-1 font-bold text-blue-700 text-xs">
                Đề thi môn {exam.subject || 'Toán'} - {exam.grade || 'Lớp 12'}
              </span>
              {onUpdateExam && (
                <button
                  type="button"
                  onClick={() => setIsEditingMeta(!isEditingMeta)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white border border-slate-300 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors shadow-2xs"
                  title="Chỉnh sửa Khối lớp (1-12) và Môn học"
                >
                  <Edit3 className="h-3.5 w-3.5 text-blue-600" />
                  <span>{isEditingMeta ? 'Đóng chỉnh sửa' : 'Đổi môn & lớp'}</span>
                </button>
              )}
            </div>

            {/* Khung Chỉnh sửa thông tin đề thi: Chỉ để Khối lớp và Môn học */}
            {isEditingMeta && (
              <div className="mt-3.5 rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-blue-900 border-b border-blue-100 pb-2">
                  <span className="flex items-center gap-1.5">
                    <Settings2 className="h-4 w-4 text-blue-600" />
                    <span>Cấu hình đề thi: Khối lớp và Môn học</span>
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {/* Khối lớp: Chỉ để các lớp 1 đến 12 không ghi bất kì thông tin khác */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Khối Lớp:</label>
                    <select
                      value={editGrade}
                      onChange={(e) => setEditGrade(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-blue-500"
                    >
                      <option value="Lớp 1">Lớp 1</option>
                      <option value="Lớp 2">Lớp 2</option>
                      <option value="Lớp 3">Lớp 3</option>
                      <option value="Lớp 4">Lớp 4</option>
                      <option value="Lớp 5">Lớp 5</option>
                      <option value="Lớp 6">Lớp 6</option>
                      <option value="Lớp 7">Lớp 7</option>
                      <option value="Lớp 8">Lớp 8</option>
                      <option value="Lớp 9">Lớp 9</option>
                      <option value="Lớp 10">Lớp 10</option>
                      <option value="Lớp 11">Lớp 11</option>
                      <option value="Lớp 12">Lớp 12</option>
                    </select>
                  </div>

                  {/* Môn học */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Môn Học:</label>
                    <input
                      type="text"
                      value={editSubject}
                      onChange={(e) => setEditSubject(e.target.value)}
                      placeholder="VD: Toán, Ngữ văn, Tiếng Anh, Vật lí..."
                      className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsEditingMeta(false)}
                    className="px-3 py-1 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-slate-600 hover:bg-slate-50"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-blue-600 text-xs font-bold text-white hover:bg-blue-700 shadow-2xs"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>Lưu & Cập Nhật Vào File Word</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50 text-xs font-medium">
              <button
                onClick={() => setViewMode('teacher')}
                className={`rounded-md px-3 py-1.5 transition-all ${
                  viewMode === 'teacher'
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Chế độ Giáo Viên
              </button>
              <button
                onClick={() => {
                  setViewMode('student');
                  setShowAllExplanations(false);
                }}
                className={`rounded-md px-3 py-1.5 transition-all ${
                  viewMode === 'student'
                    ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Làm Bài Thi Thử
              </button>
            </div>

            {viewMode === 'teacher' && (
              <button
                onClick={() => setShowAllExplanations(!showAllExplanations)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                {showAllExplanations ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-slate-500" />
                    <span>Ẩn Lời Giải</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-indigo-600" />
                    <span>Hiện Toàn Bộ Lời Giải</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Student score banner if submitted */}
        {viewMode === 'student' && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-600">
              Hãy chọn đáp án cho từng câu hỏi phía dưới rồi nhấn <strong>"Nộp bài & Chấm điểm"</strong>.
            </div>
            {!submitted ? (
              <button
                onClick={() => setSubmitted(true)}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors shadow-sm"
              >
                Nộp Bài & Chấm Điểm
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-1.5 text-emerald-900">
                  <Award className="h-5 w-5 text-emerald-600" />
                  <div>
                    <span className="text-xs font-medium">Điểm số đạt được:</span>{' '}
                    <span className="text-lg font-black text-emerald-700">
                      {scoreResult?.scaled} / 10.0
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setSelectedAnswers({});
                    setTrueFalseSelections({});
                    setShortAnswers({});
                  }}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Làm Lại
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Official Exam Document Layout (Printable) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs exam-page">
        {/* Tiêu đề ngắn gọn theo yêu cầu: Đề kiểm tra Môn Toán - Lớp ( Đề bài gồm ... phần) */}
        <div className="text-center pb-5 border-b border-slate-200">
          <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 font-serif">
            Đề kiểm tra Môn {exam.subject?.replace(/^môn\s+/i, '') || 'Toán'} - {exam.grade?.toLowerCase().startsWith('lớp') ? exam.grade : `Lớp ${exam.grade || '12'}`}
          </h1>
          <p className="mt-1 text-sm text-slate-700 font-serif italic">
            (Đề bài gồm {exam.parts?.length || 1} phần)
          </p>
          {exam.examCode && (
            <div className="mt-1 text-xs font-mono font-bold text-blue-700">
              {exam.examCode}
            </div>
          )}
          <div className="mx-auto mt-2.5 w-28 border-b-2 border-slate-900"></div>
        </div>

        {/* Exam Parts & Questions */}
        <div className="space-y-8">
          {exam.parts.map((part, pIdx) => (
            <div key={part.partId || pIdx} className="space-y-4">
              {/* Part Header */}
              <div className="border-b-2 border-blue-100 pb-2.5 pt-2">
                <h3 className="text-base sm:text-lg font-black uppercase text-blue-600 font-serif tracking-wide">
                  {part.partTitle}
                </h3>
                {part.instruction && (
                  <p className="mt-1 text-xs text-slate-600 italic font-medium">{part.instruction}</p>
                )}
              </div>

              {/* Questions List */}
              <div className="space-y-6">
                {part.questions.map((q, qIdx) => {
                  const isExpVisible =
                    viewMode === 'teacher'
                      ? showAllExplanations || expandedExplanations[q.questionNumber]
                      : submitted;

                  const isEssay = Boolean(
                    q.isEssay ||
                    ((!q.options || q.options.length === 0) &&
                     (!q.subQuestions || q.subQuestions.length === 0) &&
                     q.shortAnswer === undefined)
                  );

                  return (
                    <div
                      key={`p_${part.partId || pIdx}_q_${q.questionNumber}_${qIdx}`}
                      className="group rounded-xl border border-slate-100 bg-slate-50/30 p-4 transition-all hover:border-blue-100 hover:bg-slate-50/70"
                    >
                      {/* Question Head */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 text-sm sm:text-[15px] leading-relaxed text-slate-900">
                          <span className="font-bold text-blue-600 mr-2 font-serif text-base inline-block">
                            Câu {q.questionNumber}:
                          </span>
                          {q.points && (
                            <span className="inline-block text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded mr-2">
                              ({q.points} điểm)
                            </span>
                          )}
                          <MathRenderer content={q.content} />
                        </div>

                        {/* Badges & Actions */}
                        <div className="flex items-center gap-1.5 shrink-0 no-print">
                          {isEssay && (
                            <span className="rounded-full border border-purple-200 bg-purple-50 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                              Tự luận
                            </span>
                          )}
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${getCognitiveBadgeColor(
                              q.cognitiveLevel
                            )}`}
                          >
                            {q.cognitiveLevel}
                          </span>

                          <button
                            onClick={() => setDeepQuestion(q)}
                            title="Phân tích chuyên sâu: Bấm Casio, Bẫy đề thi & Bài tập tương tự"
                            className="flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors"
                          >
                            <Sparkles className="h-3 w-3 text-indigo-600" />
                            <span className="hidden sm:inline">Hỏi AI Chuyên Sâu</span>
                          </button>
                        </div>
                      </div>

                      {/* SVG or Visual Graphic if present */}
                      {(q.svgCode || q.visualDescription || q.imageUrl) && (
                        <div className="my-2">
                          <SvgVisualRenderer
                            svgCode={q.svgCode}
                            imageUrl={q.imageUrl}
                            visualDescription={q.visualDescription}
                            realWorldContext={q.realWorldContext}
                            title={`Sơ đồ / Hình ảnh thực tế câu ${q.questionNumber}`}
                          />
                        </div>
                      )}

                      {/* Multiple Choice Options (Phần I) */}
                      {q.options && q.options.length > 0 && (
                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedAnswers[q.questionNumber] === opt.key;
                            const isCorrect = q.correctAnswer === opt.key;
                            const showResult = viewMode === 'teacher' || submitted;

                            let optionStyles = 'border-slate-200 bg-white hover:border-indigo-300';
                            if (showResult && isCorrect) {
                              optionStyles =
                                'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-medium ring-1 ring-emerald-500';
                            } else if (showResult && isSelected && !isCorrect) {
                              optionStyles = 'border-red-400 bg-red-50 text-red-950';
                            } else if (isSelected) {
                              optionStyles = 'border-indigo-600 bg-indigo-50/80 text-indigo-950 ring-1 ring-indigo-600';
                            }

                            return (
                              <button
                                key={`q_${pIdx}_${q.questionNumber}_opt_${opt.key}_${optIdx}`}
                                type="button"
                                onClick={() => handleSelectOption(q.questionNumber, opt.key)}
                                className={`flex items-start gap-2.5 rounded-lg border p-2.5 text-left text-xs sm:text-sm transition-all ${optionStyles}`}
                              >
                                <span
                                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                    showResult && isCorrect
                                      ? 'bg-emerald-600 text-white'
                                      : isSelected
                                      ? 'bg-indigo-600 text-white'
                                      : 'bg-slate-100 text-slate-700'
                                  }`}
                                >
                                  {opt.key}
                                </span>
                                <div className="flex-1 pt-0.5">
                                  <MathRenderer content={opt.content} />
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* True/False Sub-items (Phần II) */}
                      {q.subQuestions && q.subQuestions.length > 0 && (
                        <div className="mt-3 space-y-2 rounded-xl border border-slate-200 bg-white p-3">
                          <div className="text-xs font-semibold text-slate-500 mb-1">
                            Chọn Đúng hoặc Sai cho mỗi mệnh đề:
                          </div>
                          {q.subQuestions.map((sq, sqIdx) => {
                            const userChoice = trueFalseSelections[`${q.questionNumber}_${sq.key}`];
                            const showResult = viewMode === 'teacher' || submitted;

                            return (
                              <div
                                key={`q_${pIdx}_${q.questionNumber}_sq_${sq.key}_${sqIdx}`}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2 last:border-0 last:pb-0"
                              >
                                <div className="text-xs sm:text-sm text-slate-800 flex-1">
                                  <strong className="mr-1 text-indigo-800">{sq.key})</strong>
                                  <MathRenderer content={sq.content} />
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                  <button
                                    type="button"
                                    onClick={() => handleSelectTrueFalse(q.questionNumber, sq.key, true)}
                                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                                      userChoice === true
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    } ${
                                      showResult && sq.isCorrect
                                        ? 'ring-2 ring-emerald-500 bg-emerald-50 text-emerald-800'
                                        : ''
                                    }`}
                                  >
                                    Đúng {showResult && sq.isCorrect && '✓'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectTrueFalse(q.questionNumber, sq.key, false)}
                                    className={`rounded-md px-2.5 py-1 text-xs font-bold transition-all ${
                                      userChoice === false
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                    } ${
                                      showResult && !sq.isCorrect
                                        ? 'ring-2 ring-emerald-500 bg-emerald-50 text-emerald-800'
                                        : ''
                                    }`}
                                  >
                                    Sai {showResult && !sq.isCorrect && '✓'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Short Answer Input (Phần III) */}
                      {q.shortAnswer !== undefined && (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="text-xs font-semibold text-slate-700">Điền đáp số:</span>
                          <input
                            type="text"
                            value={shortAnswers[q.questionNumber] || ''}
                            onChange={(e) => handleShortAnswerChange(q.questionNumber, e.target.value)}
                            placeholder="Ví dụ: -2.5 hoặc 42"
                            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs sm:text-sm font-mono w-48 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                          {(viewMode === 'teacher' || submitted) && (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                              Đáp án chuẩn: {q.correctAnswer || q.shortAnswer}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Essay Question Container (Tự luận) */}
                      {isEssay && (
                        <div className="mt-3 rounded-xl border border-purple-200 bg-purple-50/40 p-3.5">
                          <div className="flex items-center justify-between text-xs font-bold text-purple-900 mb-1.5">
                            <span className="flex items-center gap-1.5">
                              <PenLine className="h-4 w-4 text-purple-600" />
                              <span>Bài Tự Luận {q.points ? `(${q.points} điểm)` : ''}</span>
                            </span>
                            <span className="text-[11px] font-normal text-purple-700 italic hidden sm:inline">
                              Yêu cầu: Trình bày chi tiết các bước giải toán, lập luận và kết luận
                            </span>
                          </div>
                          {viewMode === 'student' && !submitted && (
                            <div className="mt-2 text-xs text-slate-600 italic bg-white/80 border border-purple-100 rounded-lg p-2.5">
                              ✍️ Học sinh làm bài giải tự luận vào giấy thi hoặc vở. Sau đó nhấn <strong>"Nộp bài & Chấm điểm"</strong> hoặc chuyển sang <strong>"Chế độ Giáo Viên"</strong> để đối chiếu các bước giải chi tiết và đáp số.
                            </div>
                          )}
                        </div>
                      )}

                      {/* Step-by-Step Explanation Accordion */}
                      {isExpVisible && q.explanation && (
                        <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-3.5 text-xs sm:text-sm text-slate-800">
                          <div className="flex items-center gap-2 font-bold text-indigo-950 mb-1">
                            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Hướng dẫn giải chi tiết & Đáp án:</span>
                            {q.correctAnswer && (
                              <span className="rounded-md bg-emerald-600 px-2 py-0.5 text-[11px] font-extrabold text-white">
                                {q.correctAnswer}
                              </span>
                            )}
                          </div>
                          <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed mt-2">
                            <MathRenderer content={q.explanation} />
                          </div>
                        </div>
                      )}

                      {/* Toggle button if hidden */}
                      {viewMode === 'teacher' && !showAllExplanations && (
                        <button
                          onClick={() => toggleExplanation(q.questionNumber)}
                          className="mt-2 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 no-print"
                        >
                          {expandedExplanations[q.questionNumber] ? (
                            <>
                              <ChevronUp className="h-3 w-3" /> Thu gọn lời giải
                            </>
                          ) : (
                            <>
                              <ChevronDown className="h-3 w-3" /> Xem lời giải chi tiết
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Exam Footer */}
        <div className="my-8 text-center text-xs font-bold text-slate-600 font-serif">
          ---------- HẾT ----------
        </div>

        {/* Quick Answer Key Matrix Table */}
        <div className="mt-10 pt-6 border-t border-slate-200">
          <div className="flex items-center gap-2 text-sm font-bold text-blue-600 mb-3">
            <FileCheck className="h-4 w-4 text-blue-600" />
            <span className="uppercase tracking-wide">BẢNG ĐÁP ÁN NHANH TOÀN ĐỀ THI</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2 border-r border-slate-200">Câu</th>
                  {exam.parts.flatMap((p, pIdx) =>
                    p.questions.map((q, qIdx) => (
                      <th
                        key={`ans_th_${p.partId || pIdx}_${q.questionNumber}_${qIdx}`}
                        className="p-2 border-r border-slate-200 last:border-0 min-w-[36px] text-blue-600 font-bold"
                      >
                        {q.questionNumber}
                      </th>
                    ))
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white font-bold text-blue-600">
                <tr>
                  <td className="p-2 border-r border-slate-200 text-slate-700">Đ/A</td>
                  {exam.parts.flatMap((p, pIdx) =>
                    p.questions.map((q, qIdx) => {
                      const isEssayQ = Boolean(
                        q.isEssay ||
                        ((!q.options || q.options.length === 0) &&
                         (!q.subQuestions || q.subQuestions.length === 0) &&
                         q.shortAnswer === undefined)
                      );

                      let ans = q.correctAnswer || '-';
                      if (q.subQuestions && q.subQuestions.length > 0) {
                        ans = q.subQuestions.map((sq) => (sq.isCorrect ? 'Đ' : 'S')).join('');
                      } else if (isEssayQ) {
                        ans = 'T.Luận';
                      }
                      return (
                        <td
                          key={`ans_td_${p.partId || pIdx}_${q.questionNumber}_${qIdx}`}
                          className="p-2 border-r border-slate-200 last:border-0 text-blue-600 font-black"
                        >
                          {ans}
                        </td>
                      );
                    })
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Pedagogical Quality Notes */}
        {exam.pedagogicalNotes && (
          <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-950">
            <div className="font-bold text-emerald-900 mb-1 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-emerald-600" />
              <span>Thẩm Định Chuẩn Khảo Thí & Độ Phân Hóa Đề Phát Triển:</span>
            </div>
            <p className="leading-relaxed">{exam.pedagogicalNotes}</p>
          </div>
        )}
      </div>

      {/* Deep Explanation Modal */}
      {deepQuestion && (
        <DeepExplanationModal
          question={deepQuestion}
          subject={exam.subject}
          onClose={() => setDeepQuestion(null)}
        />
      )}
    </div>
  );
};
