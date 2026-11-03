import { ExamData, ExamQuestion } from '../types/exam';

/**
 * Chuyển đổi mã SVG thành Data URL PNG với độ phân giải cao (2x)
 * Nền trắng tinh khiết, tương thích 100% với Microsoft Word
 */
async function convertSvgToPngDataUrl(
  svgStr: string,
  defaultWidth = 450,
  defaultHeight = 300
): Promise<{ base64Data: string; mimeType: string; width: number; height: number } | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;

  return new Promise((resolve) => {
    try {
      let cleaned = svgStr.replace(/```(?:xml|svg|html)?\n?|```/g, '').trim();
      const svgMatch = cleaned.match(/<svg[\s\S]*?<\/svg>/i);
      if (!svgMatch) {
        return resolve(null);
      }
      cleaned = svgMatch[0];

      // Đọc kích thước viewBox để tính tỉ lệ chuẩn xác
      let vbW = defaultWidth;
      let vbH = defaultHeight;
      const vbMatch = cleaned.match(/viewBox=["']\s*(-?[0-9.]+)\s+(-?[0-9.]+)\s+([0-9.]+)\s+([0-9.]+)\s*["']/i);
      if (vbMatch) {
        vbW = Math.max(120, Math.round(parseFloat(vbMatch[3]))) || defaultWidth;
        vbH = Math.max(90, Math.round(parseFloat(vbMatch[4]))) || defaultHeight;
      }

      // Đảm bảo có namespace xmlns chuẩn
      if (!cleaned.includes('xmlns=')) {
        cleaned = cleaned.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
      }

      // Xóa bỏ width/height phần trăm nếu có và gán kích thước pixel cố định
      cleaned = cleaned.replace(/<svg\b([^>]*)/i, (match, attrs) => {
        const strippedAttrs = attrs
          .replace(/\s+(?:width|height)=["'][^"']*["']/gi, '')
          .trim();
        return `<svg width="${vbW}" height="${vbH}" ${strippedAttrs}`;
      });

      // Tạo Data URI cho ảnh SVG
      const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cleaned);

      const img = new Image();
      img.crossOrigin = 'anonymous';

      const timer = setTimeout(() => {
        // Fallback sau 2 giây nếu vẽ canvas không kịp
        const rawBase64 = btoa(unescape(encodeURIComponent(cleaned)));
        resolve({
          base64Data: rawBase64,
          mimeType: 'image/svg+xml',
          width: vbW,
          height: vbH,
        });
      }, 2000);

      img.onload = () => {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          // Scale 2x để in ấn tài liệu Word sắc nét, không bị vỡ hạt đồ thị
          const scale = 2;
          canvas.width = vbW * scale;
          canvas.height = vbH * scale;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Nền trắng tinh khiết chống lỗi viền đen trong Word
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

            const pngDataUrl = canvas.toDataURL('image/png');
            const cleanBase64 = pngDataUrl.replace(/^data:image\/png;base64,/, '');

            resolve({
              base64Data: cleanBase64,
              mimeType: 'image/png',
              width: vbW,
              height: vbH,
            });
          } else {
            const rawBase64 = btoa(unescape(encodeURIComponent(cleaned)));
            resolve({
              base64Data: rawBase64,
              mimeType: 'image/svg+xml',
              width: vbW,
              height: vbH,
            });
          }
        } catch {
          const rawBase64 = btoa(unescape(encodeURIComponent(cleaned)));
          resolve({
            base64Data: rawBase64,
            mimeType: 'image/svg+xml',
            width: vbW,
            height: vbH,
          });
        }
      };

      img.onerror = () => {
        clearTimeout(timer);
        const rawBase64 = btoa(unescape(encodeURIComponent(cleaned)));
        resolve({
          base64Data: rawBase64,
          mimeType: 'image/svg+xml',
          width: vbW,
          height: vbH,
        });
      };

      img.src = svgDataUri;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Tải ảnh từ URL ngoài và chuyển sang Base64 để nhúng thẳng vào file Word
 */
async function fetchRemoteImageAsBase64(
  url: string
): Promise<{ base64Data: string; mimeType: string } | null> {
  try {
    if (url.startsWith('data:')) {
      const match = url.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        return {
          mimeType: match[1],
          base64Data: match[2],
        };
      }
    }
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const match = result.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          resolve({
            mimeType: match[1],
            base64Data: match[2],
          });
        } else {
          resolve(null);
        }
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Đóng gói tài liệu MHTML (MIME HTML) chuẩn của Microsoft Word
 * Đảm bảo 100% hình ảnh hiển thị trọn vẹn, không bị mất ảnh khi mở trên Word
 */
function buildWordMhtmlDocument({
  htmlContent,
  images,
}: {
  htmlContent: string;
  images: Array<{ location: string; base64Data: string; mimeType: string }>;
}): string {
  const boundary = '----=_NextPart_ExamWordDoc_' + Date.now().toString(16) + Math.random().toString(16).substring(2);

  let mhtml = `MIME-Version: 1.0\r\n`;
  mhtml += `Content-Type: multipart/related; type="text/html"; boundary="${boundary}"\r\n\r\n`;

  // Phần nội dung HTML chính
  mhtml += `--${boundary}\r\n`;
  mhtml += `Content-Type: text/html; charset="utf-8"\r\n`;
  mhtml += `Content-Transfer-Encoding: 8bit\r\n\r\n`;
  mhtml += htmlContent + `\r\n\r\n`;

  // Các phần đính kèm hình ảnh (MIME Image Parts)
  for (const img of images) {
    mhtml += `--${boundary}\r\n`;
    mhtml += `Content-Type: ${img.mimeType}\r\n`;
    mhtml += `Content-Transfer-Encoding: base64\r\n`;
    mhtml += `Content-Location: ${img.location}\r\n\r\n`;

    // Ngắt dòng 76 ký tự theo chuẩn MIME RFC 2045
    const cleanData = img.base64Data.replace(/\s+/g, '');
    const chunked = cleanData.match(/.{1,76}/g)?.join('\r\n') || cleanData;
    mhtml += chunked + `\r\n\r\n`;
  }

  mhtml += `--${boundary}--\r\n`;
  return mhtml;
}

/**
 * Xuất đề thi ra file Microsoft Word (.doc) với:
 * 1. Tiêu đề ngắn gọn: Đề kiểm tra Môn Toán - Lớp ( Đề bài gồm ... phần)
 * 2. Căn lề chuẩn: 1.5cm (Trên) - 1.5cm (Dưới) - 2.0cm (Phải) - 2.5cm (Trái)
 * 3. Phông chữ chuẩn Times New Roman và cỡ chữ 13pt toàn văn bản
 * 4. Hình vẽ/đồ thị được căn giữa đẹp mắt, nhúng trực tiếp trong file Word không bị mất ảnh
 */
export async function exportExamToWord(exam: ExamData, isAnswerKeyIncluded: boolean = true) {
  const sanitize = (text: string = '') => {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Chuẩn hóa Môn, Lớp, Hình thức thi và Thời gian làm bài theo đúng yêu cầu:
  // Tiêu đề ngắn gọn: Đề kiểm tra [Giữa kì / Cuối kì] Môn Toán - Lớp ( Đề bài gồm ... phần)
  const rawGrade = (exam.grade || '').trim();
  let gradeStr = 'Lớp 12';
  if (rawGrade) {
    gradeStr = rawGrade.toLowerCase().startsWith('lớp') ? rawGrade : `Lớp ${rawGrade}`;
  }

  const rawSubject = (exam.subject || '').trim();
  let subjectStr = 'Toán';
  if (rawSubject) {
    subjectStr = rawSubject.replace(/^môn\s+/i, '');
  }

  const rawExamType = (exam.examType || '').trim();
  const timeAllowedStr = (exam.timeAllowed || '90 phút').trim();
  const numParts = exam.parts && exam.parts.length > 0 ? exam.parts.length : 3;

  // Tiêu đề chuẩn theo yêu cầu: Đề thi môn ... - Lớp ... (Đề bài gồm ... phần)
  const conciseHeaderTitle = `ĐỀ THI MÔN ${subjectStr.toUpperCase()} - ${gradeStr.toUpperCase()}`;
  const conciseSubtitle = `(Đề bài gồm ${numParts} phần)`;

  // Danh sách hình ảnh nhúng vào MHTML
  const embeddedImages: Array<{ location: string; base64Data: string; mimeType: string }> = [];
  const questionImageInfoMap = new Map<number, { location: string; width: number; height: number }>();

  // Thu thập và chuyển đổi tất cả hình vẽ SVG hoặc ảnh câu hỏi
  for (const part of exam.parts) {
    for (const q of part.questions) {
      if (q.svgCode) {
        try {
          const res = await convertSvgToPngDataUrl(q.svgCode);
          if (res && res.base64Data) {
            const fileName = `img_cau_${q.questionNumber}.png`;
            embeddedImages.push({
              location: fileName,
              base64Data: res.base64Data,
              mimeType: res.mimeType,
            });
            // Tính toán kích thước hiển thị trên giấy A4 trong Word
            const displayWidth = Math.min(340, Math.max(200, Math.round(res.width * 0.72)));
            const displayHeight = Math.round(displayWidth * (res.height / res.width));
            questionImageInfoMap.set(q.questionNumber, {
              location: fileName,
              width: displayWidth,
              height: displayHeight,
            });
          }
        } catch {
          // Bỏ qua lỗi chuyển đổi hình ảnh cá nhân
        }
      } else if (q.imageUrl) {
        try {
          const remoteRes = await fetchRemoteImageAsBase64(q.imageUrl);
          if (remoteRes && remoteRes.base64Data) {
            const ext = remoteRes.mimeType.includes('jpeg') ? 'jpg' : 'png';
            const fileName = `img_cau_${q.questionNumber}.${ext}`;
            embeddedImages.push({
              location: fileName,
              base64Data: remoteRes.base64Data,
              mimeType: remoteRes.mimeType,
            });
            questionImageInfoMap.set(q.questionNumber, {
              location: fileName,
              width: 320,
              height: 220,
            });
          }
        } catch {
          // Bỏ qua lỗi ảnh ngoài
        }
      }
    }
  }

  // Khởi tạo HTML xuất khẩu dạng tài liệu Microsoft Word
  // Căn lề: 1.5; 1.5; 2.0; 2.5 (Trên: 1.5cm, Dưới: 1.5cm, Phải: 2.0cm, Trái: 2.5cm)
  // Cỡ chữ 13 và phông chữ Times New Roman
  let html = `<!DOCTYPE html>
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>${sanitize(conciseHeaderTitle)}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    /* Thiết lập trang A4 chuẩn và căn lề: Trên 1.5cm, Dưới 1.5cm, Phải 2.0cm, Trái 2.5cm */
    @page {
      size: 21.0cm 29.7cm;
      margin-top: 1.5cm;
      margin-bottom: 1.5cm;
      margin-right: 2.0cm;
      margin-left: 2.5cm;
      mso-page-orientation: portrait;
    }
    @page Section1 {
      size: 21.0cm 29.7cm;
      margin: 1.5cm 2.0cm 1.5cm 2.5cm; /* Top: 1.5cm, Right: 2.0cm, Bottom: 1.5cm, Left: 2.5cm */
      mso-header-margin: 36.0pt;
      mso-footer-margin: 36.0pt;
      mso-paper-source: 0;
    }
    div.Section1 {
      page: Section1;
    }

    /* Quy chuẩn toàn bộ phông chữ Times New Roman và cỡ chữ 13pt */
    body, p, div, span, table, td, th, li {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13pt;
      line-height: 1.35;
      color: #000000;
    }

    body {
      margin: 0;
      padding: 0;
    }

    .text-center { text-align: center; }
    .text-bold { font-weight: bold; }
    
    /* Khối tiêu đề ngắn gọn theo yêu cầu: Đề kiểm tra Môn Toán - Lớp ( Đề bài gồm ... phần) */
    .header-compact-box {
      text-align: center;
      margin-top: 5pt;
      margin-bottom: 18pt;
    }
    .exam-title-compact {
      font-size: 15pt;
      font-weight: bold;
      text-transform: uppercase;
      text-align: center;
      margin-bottom: 3pt;
      font-family: 'Times New Roman', Times, serif;
    }
    .exam-subtitle-compact {
      font-size: 13pt;
      font-style: italic;
      text-align: center;
      margin-bottom: 4pt;
      font-family: 'Times New Roman', Times, serif;
    }
    .exam-code-tag {
      font-size: 12pt;
      font-weight: bold;
      margin-bottom: 6pt;
      font-family: 'Times New Roman', Times, serif;
    }
    .exam-meta-compact {
      font-size: 12pt;
      text-align: center;
      margin-top: 4pt;
      margin-bottom: 6pt;
      font-family: 'Times New Roman', Times, serif;
    }
    .divider-line {
      width: 150pt;
      margin: 5pt auto 15pt auto;
      border-bottom: 1.5pt solid #000000;
    }
    
    /* Tiêu đề các phần */
    .part-title {
      font-size: 13.5pt;
      font-weight: bold;
      margin-top: 16pt;
      margin-bottom: 6pt;
      color: #0056b3; /* Xanh dương đậm chuẩn khảo thí */
      text-transform: uppercase;
      font-family: 'Times New Roman', Times, serif;
    }
    .part-instruction {
      font-size: 12pt;
      font-style: italic;
      margin-bottom: 10pt;
      font-family: 'Times New Roman', Times, serif;
    }

    /* Khối câu hỏi */
    .question-block {
      margin-bottom: 12pt;
      page-break-inside: avoid;
      font-size: 13pt;
    }
    .question-head {
      font-weight: bold;
      color: #0056b3; /* Câu 1, Câu 2... màu xanh dương chuẩn khảo thí */
      font-size: 13pt;
      display: inline;
    }
    .badge-level {
      font-size: 11pt;
      color: #475569;
      font-style: italic;
      margin-left: 4pt;
    }

    /* Căn chỉnh hình vẽ / đồ thị câu hỏi */
    .visual-container {
      text-align: center;
      margin: 8pt auto 10pt auto;
      page-break-inside: avoid;
    }
    .visual-frame {
      display: inline-block;
      text-align: center;
      background-color: #ffffff;
      padding: 4pt;
      border: 0.5pt solid #cbd5e1;
    }
    .visual-img {
      display: block;
      margin: 0 auto;
      max-width: 100%;
      height: auto;
    }
    .visual-caption {
      font-style: italic;
      font-size: 11.5pt;
      color: #334155;
      margin-top: 4pt;
      text-align: center;
      font-family: 'Times New Roman', Times, serif;
    }

    /* Bảng phương án A, B, C, D */
    .options-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5pt;
      margin-bottom: 6pt;
    }
    .options-table td {
      width: 25%;
      padding: 3pt 5pt;
      vertical-align: top;
      font-size: 13pt;
      font-family: 'Times New Roman', Times, serif;
    }

    /* Bảng đáp án nhanh */
    .answer-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12pt;
      margin-bottom: 20pt;
    }
    .answer-table th, .answer-table td {
      border: 1pt solid #000000;
      padding: 5pt 6pt;
      text-align: center;
      font-size: 12pt;
      font-family: 'Times New Roman', Times, serif;
    }
    .answer-table th {
      background-color: #f1f5f9;
      font-weight: bold;
    }

    /* Khung lời giải chi tiết */
    .explanation-box {
      background-color: #f8fafc;
      border-left: 3pt solid #0056b3;
      padding: 6pt 10pt;
      margin-top: 5pt;
      font-size: 13pt;
      font-family: 'Times New Roman', Times, serif;
    }
  </style>
</head>
<body>
<div class="Section1">

  <!-- PHẦN TIÊU ĐỀ NGẮN GỌN THEO ĐÚNG YÊU CẦU: Đề kiểm tra [Giữa kì/Cuối kì] Môn Toán - Lớp ( Đề bài gồm ... phần) -->
  <div class="header-compact-box">
    <div class="exam-title-compact">${sanitize(conciseHeaderTitle)}</div>
    <div class="exam-subtitle-compact">${sanitize(conciseSubtitle)}</div>
    <div class="exam-meta-compact">
      <span>Thời gian làm bài: <strong>${sanitize(timeAllowedStr)}</strong> <em>(không kể thời gian phát đề)</em></span>
      ${exam.examCode ? `<span style="margin-left: 18pt;">MÃ ĐỀ THI: <strong>${sanitize(exam.examCode.replace(/^mã đề\s*:?\s*/i, ''))}</strong></span>` : ''}
    </div>
    <div class="divider-line"></div>
  </div>
`;

  // Render các phần và câu hỏi
  exam.parts.forEach((part) => {
    html += `
    <div class="part-title">${sanitize(part.partTitle)}</div>
    ${part.instruction ? `<div class="part-instruction">${sanitize(part.instruction)}</div>` : ''}
    `;

    part.questions.forEach((q) => {
      const isEssayQ = Boolean(
        q.isEssay ||
        ((!q.options || q.options.length === 0) &&
         (!q.subQuestions || q.subQuestions.length === 0) &&
         q.shortAnswer === undefined)
      );

      html += `
      <div class="question-block">
        <div>
          <span class="question-head">Câu ${q.questionNumber}${q.points !== undefined ? ` (${q.points} điểm)` : ''}:</span> 
          <span>${sanitize(q.content)}</span>
        </div>
      `;

      // Căn chỉnh hình vẽ / đồ thị câu hỏi chuẩn xác trong Word
      const imgInfo = questionImageInfoMap.get(q.questionNumber);
      if (imgInfo) {
        html += `
        <div class="visual-container">
          <div class="visual-frame">
            <img src="${imgInfo.location}" width="${imgInfo.width}" height="${imgInfo.height}" alt="Hình vẽ câu ${q.questionNumber}" class="visual-img" />
          </div>
          ${q.visualDescription ? `<div class="visual-caption">[Hình vẽ câu ${q.questionNumber}]: ${sanitize(q.visualDescription)}</div>` : `<div class="visual-caption">[Hình vẽ câu ${q.questionNumber}]</div>`}
        </div>`;
      } else if (q.visualDescription) {
        html += `<div class="visual-caption" style="text-align: left; margin: 5pt 0; background-color: #f8fafc; padding: 4pt 8pt; border-left: 2pt solid #94a3b8;">[Hình vẽ minh họa]: ${sanitize(q.visualDescription)}</div>`;
      }

      // Phương án A, B, C, D (Phần I)
      if (q.options && q.options.length > 0) {
        html += `<table class="options-table"><tr>`;
        q.options.forEach((opt, oIdx) => {
          html += `<td><strong>${opt.key}.</strong> ${sanitize(opt.content)}</td>`;
          if ((oIdx + 1) % 4 === 0 && oIdx + 1 < q.options!.length) {
            html += `</tr><tr>`;
          }
        });
        html += `</tr></table>`;
      }

      // Các ý Đúng/Sai (Phần II)
      if (q.subQuestions && q.subQuestions.length > 0) {
        html += `<div style="margin-left: 15pt; margin-top: 5pt;">`;
        q.subQuestions.forEach((sq) => {
          html += `<div><strong>${sq.key})</strong> ${sanitize(sq.content)}</div>`;
        });
        html += `</div>`;
      }

      // Trả lời ngắn (Phần III)
      if (q.shortAnswer !== undefined && q.shortAnswer !== '') {
        html += `<div style="margin-top: 5pt; font-style: italic;">Đáp số: ....................................................</div>`;
      }

      // Tự luận (Dạng 1 hoặc Phần Tự luận Dạng 2/Dạng 3)
      if (isEssayQ) {
        html += `<div style="margin-top: 5pt; font-style: italic; color: #475569;">[Học sinh trình bày bài làm và lập luận chi tiết các bước]</div>`;
      }

      html += `</div>`;
    });
  });

  html += `<div class="text-center text-bold" style="margin: 25pt 0; font-family: 'Times New Roman', serif; font-size: 13pt;">---------- HẾT ----------</div>`;

  // Bảng Đáp án & Lời giải chi tiết
  if (isAnswerKeyIncluded) {
    html += `
    <div style="page-break-before: always;"></div>
    <div class="header-compact-box">
      <div class="exam-title-compact">ĐÁP ÁN & LỜI GIẢI CHI TIẾT: ${sanitize(conciseHeaderTitle)}</div>
      <div class="exam-subtitle-compact">${sanitize(conciseSubtitle)}</div>
      <div class="exam-meta-compact">
        <span>Thời gian làm bài: <strong>${sanitize(timeAllowedStr)}</strong></span>
        ${exam.examCode ? `<span style="margin-left: 18pt;">MÃ ĐỀ THI: <strong>${sanitize(exam.examCode.replace(/^mã đề\s*:?\s*/i, ''))}</strong></span>` : ''}
      </div>
      <div class="divider-line"></div>
    </div>

    <div class="part-title">I. BẢNG ĐÁP ÁN NHANH</div>
    <table class="answer-table">
      <tr>
        <th>Câu</th>
    `;

    const allQuestions: ExamQuestion[] = [];
    exam.parts.forEach((p) => p.questions.forEach((q) => allQuestions.push(q)));

    allQuestions.forEach((q) => {
      html += `<th>${q.questionNumber}</th>`;
    });
    html += `</tr><tr><td><strong>Đ/A</strong></td>`;

    allQuestions.forEach((q) => {
      const isEssayItem = Boolean(
        q.isEssay ||
        ((!q.options || q.options.length === 0) &&
         (!q.subQuestions || q.subQuestions.length === 0) &&
         q.shortAnswer === undefined)
      );

      let ans = q.correctAnswer || '-';
      if (q.subQuestions && q.subQuestions.length > 0) {
        ans = q.subQuestions.map((sq) => `${sq.key}:${sq.isCorrect ? 'Đ' : 'S'}`).join(' ');
      } else if (isEssayItem) {
        ans = 'T.Luận';
      }
      html += `<td><strong>${sanitize(ans)}</strong></td>`;
    });

    html += `</tr></table>`;

    // Lời giải chi tiết
    html += `<div class="part-title">II. HƯỚNG DẪN GIẢI CHI TIẾT TỪNG CÂU</div>`;

    allQuestions.forEach((q) => {
      let ansLabel = q.correctAnswer ? `Chọn ${sanitize(q.correctAnswer)}.` : '';
      if (q.subQuestions && q.subQuestions.length > 0) {
        ansLabel = q.subQuestions.map((sq) => `${sq.key}) ${sq.isCorrect ? 'ĐÚNG' : 'SAI'}`).join(', ');
      }

      html += `
      <div class="question-block">
        <div><strong>Câu ${q.questionNumber}:</strong> <strong>${ansLabel}</strong></div>
      `;

      // Kèm hình vẽ trong lời giải nếu có
      const qImgInfo = questionImageInfoMap.get(q.questionNumber);
      if (qImgInfo) {
        html += `
        <div class="visual-container">
          <div class="visual-frame">
            <img src="${qImgInfo.location}" width="${qImgInfo.width}" height="${qImgInfo.height}" alt="Hình vẽ câu ${q.questionNumber}" class="visual-img" />
          </div>
        </div>`;
      }

      html += `
        <div class="explanation-box">
          <strong>Lời giải:</strong><br>
          ${sanitize(q.explanation || 'Xem hướng dẫn giải chuẩn...')}<br>
        </div>
      </div>
      `;
    });
  }

  html += `
</div>
</body>
</html>`;

  // Đóng gói tài liệu MHTML để nhúng hình ảnh hoàn chỉnh
  let fileContent: string;
  let mimeType = 'application/msword;charset=utf-8';

  if (embeddedImages.length > 0) {
    fileContent = buildWordMhtmlDocument({
      htmlContent: html,
      images: embeddedImages,
    });
    mimeType = 'multipart/related;charset=utf-8';
  } else {
    fileContent = html;
  }

  // Tải file Word .doc
  const blob = new Blob([fileContent], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const cleanCode = exam.examCode ? exam.examCode.replace(/[^0-9]/g, '') : '101';
  const fileName = `De_thi_Mon_${subjectStr.replace(/\s+/g, '_')}_${gradeStr.replace(/\s+/g, '_')}_Ma_${cleanCode || '101'}.doc`;
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
