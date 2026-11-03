import { ExamData } from '../types/exam';

export const SAMPLE_EXAMS: ExamData[] = [
  {
    id: 'sample-math-12-thpt-2025',
    title: 'ĐỀ KHẢO SÁT CHẤT LƯỢNG ÔN THI TỐT NGHIỆP THPT NĂM 2025',
    examCode: 'MÃ ĐỀ 101',
    subject: 'Toán học',
    grade: 'Lớp 12 - THPT Quốc Gia',
    timeAllowed: '90 phút (không kể thời gian phát đề)',
    totalScore: 10.0,
    matrixSummary: {
      topics: [
        'Ứng dụng đạo hàm để khảo sát và vẽ đồ thị hàm số',
        'Hàm số lũy thừa, hàm số mũ và hàm số lôgarit',
        'Nguyên hàm, tích phân và ứng dụng',
        'Phương pháp tọa độ trong không gian $Oxyz$',
        'Thống kê và xác suất có điều kiện'
      ],
      cognitiveLevels: {
        nhanBiet: 30,
        thongHieu: 35,
        vanDung: 25,
        vanDungCao: 10
      },
      formats: [
        'Phần I: 12 câu trắc nghiệm 4 lựa chọn (3.0 điểm)',
        'Phần II: 4 câu trắc nghiệm Đúng/Sai (4.0 điểm)',
        'Phần III: 6 câu trắc nghiệm trả lời ngắn (3.0 điểm)'
      ]
    },
    parts: [
      {
        partId: 'part_1',
        partTitle: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn',
        instruction: 'Thí sinh trả lời từ câu 1 đến câu 4. Mỗi câu hỏi thí sinh chỉ chọn một phương án đúng duy nhất.',
        questions: [
          {
            questionNumber: 1,
            content: 'Cho hàm số $y = f(x)$ có bảng biến thiên như sau. Mệnh đề nào dưới đây là đúng?',
            cognitiveLevel: 'Nhận biết',
            topic: 'Khảo sát hàm số',
            hasVisual: true,
            visualDescription: 'Bảng biến thiên hàm bậc ba có hai điểm cực trị tại $x = -1$ và $x = 2$',
            svgCode: `<svg viewBox="0 0 420 160" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <rect width="420" height="160" fill="#f8fafc" rx="8" stroke="#cbd5e1" strokeWidth="1.5"/>
              <line x1="80" y1="10" x2="80" y2="150" stroke="#94a3b8" strokeWidth="1.5"/>
              <line x1="10" y1="45" x2="410" y2="45" stroke="#94a3b8" strokeWidth="1.5"/>
              <line x1="10" y1="80" x2="410" y2="80" stroke="#94a3b8" strokeWidth="1.5"/>
              <text x="45" y="32" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155" text-anchor="middle">x</text>
              <text x="110" y="32" font-family="sans-serif" font-size="13" fill="#475569">-∞</text>
              <text x="180" y="32" font-family="sans-serif" font-size="13" fill="#1e293b" font-weight="bold">-1</text>
              <text x="280" y="32" font-family="sans-serif" font-size="13" fill="#1e293b" font-weight="bold">2</text>
              <text x="360" y="32" font-family="sans-serif" font-size="13" fill="#475569">+∞</text>
              <text x="45" y="67" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155" text-anchor="middle">y'</text>
              <text x="145" y="67" font-family="sans-serif" font-size="15" fill="#2563eb" font-weight="bold">+</text>
              <text x="180" y="67" font-family="sans-serif" font-size="14" fill="#475569">0</text>
              <text x="230" y="67" font-family="sans-serif" font-size="15" fill="#dc2626" font-weight="bold">-</text>
              <text x="280" y="67" font-family="sans-serif" font-size="14" fill="#475569">0</text>
              <text x="330" y="67" font-family="sans-serif" font-size="15" fill="#2563eb" font-weight="bold">+</text>
              <text x="45" y="125" font-family="sans-serif" font-size="14" font-weight="bold" fill="#334155" text-anchor="middle">y</text>
              <text x="110" y="140" font-family="sans-serif" font-size="12" fill="#64748b">-∞</text>
              <text x="180" y="100" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">4</text>
              <text x="280" y="142" font-family="sans-serif" font-size="13" font-weight="bold" fill="#047857">-3</text>
              <text x="370" y="98" font-family="sans-serif" font-size="12" fill="#64748b">+∞</text>
              <path d="M 125 135 L 175 105" stroke="#2563eb" strokeWidth="2" marker-end="url(#arrow)" fill="none"/>
              <path d="M 195 105 L 265 138" stroke="#dc2626" strokeWidth="2" fill="none"/>
              <path d="M 295 138 L 355 102" stroke="#2563eb" strokeWidth="2" fill="none"/>
            </svg>`,
            options: [
              { key: 'A', content: 'Hàm số đồng biến trên khoảng $(-1; 2)$.' },
              { key: 'B', content: 'Hàm số nghịch biến trên khoảng $(-1; 2)$.' },
              { key: 'C', content: 'Hàm số đạt cực đại tại $x = 4$.' },
              { key: 'D', content: 'Hàm số có giá trị cực tiểu bằng $2$.' }
            ],
            correctAnswer: 'B',
            explanation: 'Dựa vào bảng biến thiên, trên khoảng $(-1; 2)$ ta có $y\' < 0$ nên hàm số nghịch biến trên khoảng $(-1; 2)$. Phương án B đúng.'
          },
          {
            questionNumber: 2,
            content: 'Trong không gian $Oxyz$, cho mặt phẳng $(P): 2x - 3y + z - 5 = 0$. Một vectơ pháp tuyến của mặt phẳng $(P)$ là:',
            cognitiveLevel: 'Nhận biết',
            topic: 'Hình học Oxyz',
            options: [
              { key: 'A', content: '$\\vec{n_1} = (2; -3; 1)$' },
              { key: 'B', content: '$\\vec{n_2} = (2; 3; 1)$' },
              { key: 'C', content: '$\\vec{n_3} = (2; -3; -5)$' },
              { key: 'D', content: '$\\vec{n_4} = (-2; 3; 1)$' }
            ],
            correctAnswer: 'A',
            explanation: 'Mặt phẳng $(P): Ax + By + Cz + D = 0$ có một vectơ pháp tuyến là $\\vec{n} = (A; B; C)$. Do đó với $(P): 2x - 3y + z - 5 = 0$, ta có $\\vec{n_1} = (2; -3; 1)$.'
          },
          {
            questionNumber: 3,
            content: 'Tập nghiệm của bất phương trình $\\log_2 (x - 3) \\le 3$ là:',
            cognitiveLevel: 'Thông hiểu',
            topic: 'Hàm số mũ và Lôgarit',
            options: [
              { key: 'A', content: '$(3; 11]$' },
              { key: 'B', content: '$(-\\infty; 11]$' },
              { key: 'C', content: '$[3; 11]$' },
              { key: 'D', content: '$(3; 9]$' }
            ],
            correctAnswer: 'A',
            explanation: 'Điều kiện xác định: $x - 3 > 0 \\iff x > 3$.\nBất phương trình $\\log_2(x - 3) \\le 3 \\iff x - 3 \\le 2^3 = 8 \\iff x \\le 11$.\nKết hợp điều kiện, tập nghiệm là $S = (3; 11]$.'
          },
          {
            questionNumber: 4,
            content: 'Một doanh nghiệp sản xuất một loại sản phẩm với hàm chi phí $C(x) = 2x^2 + 10x + 500$ (triệu đồng) và hàm doanh thu $R(x) = 150x - x^2$ (triệu đồng), trong đó $x$ là số lượng sản phẩm sản xuất và bán ra ($x > 0$). Lợi nhuận cực đại của doanh nghiệp đạt được khi sản xuất bao nhiêu sản phẩm?',
            cognitiveLevel: 'Vận dụng',
            topic: 'Ứng dụng thực tế của đạo hàm',
            options: [
              { key: 'A', content: '$x = 23$' },
              { key: 'B', content: '$x = 25$' },
              { key: 'C', content: '$x = 30$' },
              { key: 'D', content: '$x = 35$' }
            ],
            correctAnswer: 'A',
            explanation: 'Hàm lợi nhuận: $P(x) = R(x) - C(x) = (150x - x^2) - (2x^2 + 10x + 500) = -3x^2 + 140x - 500$.\nĐạo hàm: $P\'(x) = -6x + 140$.\nCho $P\'(x) = 0 \\iff -6x + 140 = 0 \\iff x = \\frac{140}{6} = \\frac{70}{3} \\approx 23{,}33$.\nVì $x$ là số nguyên sản phẩm nên thử $P(23) = 1133$ và $P(24) = 1132$, do đó lợi nhuận lớn nhất khi sản xuất $23$ sản phẩm.'
          }
        ]
      },
      {
        partId: 'part_2',
        partTitle: 'PHẦN II. Câu trắc nghiệm Đúng/Sai',
        instruction: 'Thí sinh trả lời câu hỏi sau. Trong mỗi ý a), b), c), d) ở mỗi câu, thí sinh chọn đúng hoặc sai.',
        questions: [
          {
            questionNumber: 5,
            content: 'Cho hàm số $f(x) = x^3 - 3x^2 + 2$ có đồ thị là $(C)$.',
            cognitiveLevel: 'Thông hiểu',
            topic: 'Khảo sát và vẽ đồ thị hàm số',
            hasVisual: true,
            visualDescription: 'Đồ thị hàm bậc ba đi qua cực đại $(0, 2)$ và cực tiểu $(2, -2)$',
            svgCode: `<svg viewBox="0 0 320 220" xmlns="http://www.w3.org/2000/svg" className="w-full">
              <rect width="320" height="220" fill="#f8fafc" rx="8" stroke="#e2e8f0"/>
              <line x1="20" y1="120" x2="300" y2="120" stroke="#64748b" strokeWidth="1.5"/>
              <polygon points="300,117 308,120 300,123" fill="#64748b"/>
              <text x="305" y="135" font-family="sans-serif" font-size="12" fill="#475569">x</text>
              <line x1="120" y1="200" x2="120" y2="15" stroke="#64748b" strokeWidth="1.5"/>
              <polygon points="117,15 120,7 123,15" fill="#64748b"/>
              <text x="130" y="16" font-family="sans-serif" font-size="12" fill="#475569">y</text>
              <text x="110" y="135" font-family="sans-serif" font-size="11" fill="#64748b">O</text>
              <path d="M 60 210 C 95 160, 110 50, 120 60 C 130 70, 150 170, 180 180 C 200 185, 220 80, 250 20" fill="none" stroke="#4f46e5" strokeWidth="2.5"/>
              <circle cx="120" cy="60" r="3.5" fill="#dc2626"/>
              <text x="100" y="58" font-family="sans-serif" font-size="11" font-weight="bold" fill="#dc2626">(0; 2)</text>
              <circle cx="180" cy="180" r="3.5" fill="#059669"/>
              <text x="185" y="195" font-family="sans-serif" font-size="11" font-weight="bold" fill="#059669">(2; -2)</text>
            </svg>`,
            subQuestions: [
              { key: 'a', content: 'Đạo hàm của hàm số là $f\'(x) = 3x^2 - 6x$.', isCorrect: true, explanation: 'Đúng vì $(x^3 - 3x^2 + 2)\' = 3x^2 - 6x$.' },
              { key: 'b', content: 'Hàm số đồng biến trên khoảng $(0; 2)$.', isCorrect: false, explanation: 'Sai vì với $x \\in (0; 2)$ thì $f\'(x) = 3x(x - 2) < 0$, nên hàm số nghịch biến.' },
              { key: 'c', content: 'Điểm cực đại của đồ thị hàm số là $M(0; 2)$.', isCorrect: true, explanation: 'Đúng, tại $x = 0$ ta có $f\'(0) = 0$, đạo hàm đổi dấu từ dương sang âm và $f(0) = 2$.' },
              { key: 'd', content: 'Phương trình tiếp tuyến của $(C)$ tại điểm có hoành độ $x = 1$ có hệ số góc bằng $3$.', isCorrect: false, explanation: 'Sai vì hệ số góc tiếp tuyến là $k = f\'(1) = 3(1)^2 - 6(1) = -3 \\ne 3$.' }
            ]
          }
        ]
      },
      {
        partId: 'part_3',
        partTitle: 'PHẦN III. Câu trắc nghiệm trả lời ngắn',
        instruction: 'Thí sinh trả lời câu hỏi dưới đây và điền đáp số vào ô trống.',
        questions: [
          {
            questionNumber: 6,
            content: 'Một bình chứa nước hình nón có chiều cao $h = 12\\text{ cm}$ và bán kính đáy $R = 6\\text{ cm}$. Người ta đổ nước vào bình sao cho chiều cao cột nước đạt $8\\text{ cm}$. Tính thể tích nước có trong bình theo đơn vị $\\pi\\text{ cm}^3$ (chỉ ghi kết quả là một số nguyên hoặc thập phân).',
            cognitiveLevel: 'Vận dụng cao',
            topic: 'Hình nón và Thể tích khối tròn xoay',
            shortAnswer: '23.7',
            correctAnswer: '23.7',
            explanation: 'Bán kính mặt nước tại chiều cao $h\' = 8\\text{ cm}$ tỉ lệ thuận: $r = R \\cdot \\frac{h\'}{h} = 6 \\cdot \\frac{8}{12} = 4\\text{ cm}$. Thể tích khối nước là $V = \\frac{1}{3} \\pi r^2 h\' = \\frac{1}{3} \\pi \\cdot 4^2 \\cdot 8 = \\frac{128}{3} \\pi \\approx 42{,}67\\pi$. (Nếu nón đặt ngược xuôi tương ứng, kết quả tính theo định hướng đề bài).'
          }
        ]
      }
    ],
    quickAnswerKey: [
      { question: 1, answer: 'B' },
      { question: 2, answer: 'A' },
      { question: 3, answer: 'A' },
      { question: 4, answer: 'A' },
      { question: 5, answer: 'a) Đ | b) S | c) Đ | d) S' },
      { question: 6, answer: '42.67' }
    ],
    rawOcrNotes: 'Đề thi chuẩn cấu trúc 2025 của Bộ Giáo dục và Đào tạo, tích hợp đầy đủ 3 phần: Trắc nghiệm 4 lựa chọn, Đúng/Sai đa ý và Trả lời ngắn số học.'
  },
  {
    id: 'sample-physics-12-waves',
    title: 'ĐỀ KIỂM TRA ĐỊNH KỲ VẬT LÍ 12 - CHUYÊN ĐỀ DAO ĐỘNG & SÓNG CƠ',
    examCode: 'MÃ ĐỀ 204',
    subject: 'Vật lí',
    grade: 'Lớp 12',
    timeAllowed: '50 phút',
    totalScore: 10.0,
    matrixSummary: {
      topics: ['Dao động điều hòa', 'Con lắc lò xo & con lắc đơn', 'Sóng cơ truyền trong môi trường', 'Giao thoa sóng nước'],
      cognitiveLevels: { nhanBiet: 40, thongHieu: 30, vanDung: 20, vanDungCao: 10 }
    },
    parts: [
      {
        partId: 'part_1',
        partTitle: 'PHẦN I. Câu trắc nghiệm nhiều phương án lựa chọn',
        instruction: 'Mỗi câu hỏi chọn 1 phương án duy nhất.',
        questions: [
          {
            questionNumber: 1,
            content: 'Một chất điểm dao động điều hòa theo phương trình $x = 6\\cos(4\\pi t + \\frac{\\pi}{3})\\text{ (cm)}$. Pha ban đầu của dao động là:',
            cognitiveLevel: 'Nhận biết',
            topic: 'Dao động điều hòa',
            options: [
              { key: 'A', content: '$\\frac{\\pi}{3}\\text{ rad}$' },
              { key: 'B', content: '$4\\pi\\text{ rad/s}$' },
              { key: 'C', content: '$6\\text{ cm}$' },
              { key: 'D', content: '$\\pi\\text{ rad}$' }
            ],
            correctAnswer: 'A',
            explanation: 'Phương trình dao động tổng quát có dạng $x = A\\cos(\\omega t + \\varphi_0)$. Ở đây pha ban đầu là $\\varphi_0 = \\frac{\\pi}{3}\\text{ rad}$.'
          },
          {
            questionNumber: 2,
            content: 'Trên một sợi dây đàn hồi dài $1{,}2\\text{ m}$ hai đầu cố định đang có sóng dừng với 3 bụng sóng. Biết tốc độ truyền sóng trên dây là $v = 16\\text{ m/s}$. Tần số dao động của sóng là:',
            cognitiveLevel: 'Thông hiểu',
            topic: 'Sóng dừng',
            options: [
              { key: 'A', content: '$20\\text{ Hz}$' },
              { key: 'B', content: '$10\\text{ Hz}$' },
              { key: 'C', content: '$40\\text{ Hz}$' },
              { key: 'D', content: '$15\\text{ Hz}$' }
            ],
            correctAnswer: 'A',
            explanation: 'Điều kiện sóng dừng hai đầu cố định: $l = k \\frac{\\lambda}{2} = k \\frac{v}{2f}$. Với 3 bụng sóng nên $k = 3$. Thay số: $1{,}2 = 3 \\cdot \\frac{16}{2f} \\implies f = \\frac{3 \\cdot 16}{2{,}4} = 20\\text{ Hz}$.'
          }
        ]
      }
    ],
    quickAnswerKey: [
      { question: 1, answer: 'A' },
      { question: 2, answer: 'A' }
    ]
  }
];
