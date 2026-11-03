/**
 * Tiện ích tối ưu hóa kích thước ảnh đề thi trước khi gửi lên máy chủ
 * Giúp tải lên siêu tốc và tránh vượt quá giới hạn 4.5MB của Vercel Serverless Function (Lỗi 413 / 503)
 */
export async function optimizeImageBase64(
  fileOrDataUrl: File | Blob | string,
  maxWidth = 1800,
  maxHeight = 2400,
  quality = 0.85
): Promise<{ mimeType: string; data: string }> {
  return new Promise((resolve, reject) => {
    let src = '';
    let isRevokeNeeded = false;

    if (typeof fileOrDataUrl === 'string') {
      src = fileOrDataUrl;
    } else {
      src = URL.createObjectURL(fileOrDataUrl);
      isRevokeNeeded = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width;
        let height = img.height;

        // Giữ tỉ lệ và giới hạn kích thước tối đa để OCR rõ nét nhất
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Canvas context not available');
        }

        // Đổ nền trắng để ảnh chụp rõ nét và tránh lỗi màu khi nén JPEG
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);

        if (isRevokeNeeded) {
          URL.revokeObjectURL(src);
        }

        if (matches) {
          resolve({
            mimeType: matches[1],
            data: matches[2],
          });
        } else {
          reject(new Error('Failed to encode image to base64'));
        }
      } catch (err) {
        if (isRevokeNeeded) URL.revokeObjectURL(src);
        reject(err);
      }
    };

    img.onerror = (e) => {
      if (isRevokeNeeded) URL.revokeObjectURL(src);
      reject(e);
    };

    img.src = src;
  });
}
