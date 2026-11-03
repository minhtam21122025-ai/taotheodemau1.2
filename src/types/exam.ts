export type CognitiveLevel = 'Nhận biết' | 'Thông hiểu' | 'Vận dụng' | 'Vận dụng cao';

// 3 Dạng cấu trúc đề thi theo yêu cầu:
// Dạng 1: Chỉ bao gồm các câu tự luận (100% Tự luận)
// Dạng 2: Có 2 phần: Trắc nghiệm nhiều phương án và Tự luận
// Dạng 3: Đề chuẩn Bộ GD&ĐT gồm 4 dạng: Trắc nghiệm 4 lựa chọn, TN Đúng sai, TN trả lời ngắn, Tự luận
export type ExamStructureType =
  | 'dang_1_tu_luan'
  | 'dang_2_trac_nghiem_tu_luan'
  | 'dang_3_chuan_bo_4_dang';

export interface QuestionOption {
  key: string; // 'A' | 'B' | 'C' | 'D'
  content: string;
}

export interface TrueFalseSubQuestion {
  key: 'a' | 'b' | 'c' | 'd';
  content: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface ExamQuestion {
  questionNumber: number;
  content: string;
  cognitiveLevel: CognitiveLevel;
  topic?: string;
  hasVisual?: boolean;
  visualDescription?: string;
  svgCode?: string;
  imageUrl?: string;
  realWorldContext?: string;
  options?: QuestionOption[];
  subQuestions?: TrueFalseSubQuestion[];
  shortAnswer?: string;
  correctAnswer?: string;
  explanation?: string;
  deepExplanation?: string;
  points?: number; // Điểm số của câu tự luận nếu có
  isEssay?: boolean; // Đánh dấu câu tự luận
}

export interface ExamPart {
  partId: string;
  partTitle: string;
  instruction?: string;
  questions: ExamQuestion[];
}

export interface ExamMatrixSummary {
  topics: string[];
  cognitiveLevels?: {
    nhanBiet: number;
    thongHieu: number;
    vanDung: number;
    vanDungCao: number;
  };
  formats?: string[];
}

export interface ExamData {
  id?: string;
  title: string;
  examCode?: string;
  subject: string;
  grade: string;
  examType?: string; // 'Giữa kì' | 'Cuối kì' | 'Giữa học kì I' | 'Cuối học kì I' | 'Giữa học kì II' | 'Cuối học kì II' | string
  examStructureType?: ExamStructureType; // Dạng 1, Dạng 2 hoặc Dạng 3
  examStructureLabel?: string; // Tên hiển thị dạng đề
  timeAllowed?: string;
  totalScore?: number;
  matrixSummary?: ExamMatrixSummary;
  parts: ExamPart[];
  quickAnswerKey?: Array<{ question: number; answer: string }>;
  rawOcrNotes?: string;
  pedagogicalNotes?: string;
  createdAt?: string;
}

export interface ExamVariantConfig {
  variantIndex: number;
  difficulty: 'Chuẩn 100% tương đương' | 'Nâng cao nhẹ (+10% Vận dụng)' | 'Củng cố cơ bản (-10%)';
  contextStyle: 'Đời sống thực tế Việt Nam' | 'Khoa học công nghệ hiện đại' | 'Kinh tế & tài chính' | 'Ngữ cảnh chuẩn Bộ GD&ĐT';
  note?: string;
}
