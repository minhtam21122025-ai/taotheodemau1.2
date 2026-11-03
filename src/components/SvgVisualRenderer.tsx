import React, { useState } from 'react';
import { Maximize2, Minimize2, Image as ImageIcon, Globe, Compass } from 'lucide-react';

interface SvgVisualRendererProps {
  svgCode?: string;
  imageUrl?: string;
  visualDescription?: string;
  realWorldContext?: string;
  title?: string;
}

export const SvgVisualRenderer: React.FC<SvgVisualRendererProps> = ({
  svgCode,
  imageUrl,
  visualDescription,
  realWorldContext,
  title = 'Hình ảnh minh họa thực tế',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);

  if (!svgCode && !visualDescription && !imageUrl) {
    return null;
  }

  // Clean and prepare SVG code
  let sanitizedSvg = svgCode?.trim();
  if (sanitizedSvg) {
    sanitizedSvg = sanitizedSvg.replace(/```(?:xml|svg|html)?\n?|```/g, '').trim();
    if (!sanitizedSvg.includes('viewBox') && sanitizedSvg.includes('width=') && sanitizedSvg.includes('height=')) {
      sanitizedSvg = sanitizedSvg.replace(
        /<svg([^>]*)(width="(\d+)")([^>]*)(height="(\d+)")([^>]*)>/i,
        '<svg$1$4$7 viewBox="0 0 $3 $6" style="width:100%;height:auto;max-height:300px">'
      );
    }
  }

  return (
    <div className="my-3 rounded-2xl border border-blue-200/80 bg-gradient-to-b from-blue-50/30 to-white p-3.5 shadow-xs transition-all hover:border-blue-300">
      <div className="flex items-center justify-between pb-2 text-xs font-bold text-slate-700">
        <div className="flex items-center gap-1.5 text-blue-700">
          <ImageIcon className="h-4 w-4 text-blue-600" />
          <span>{title}</span>
          {realWorldContext && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
              <Globe className="h-3 w-3 text-emerald-600" />
              {realWorldContext}
            </span>
          )}
        </div>
        {(sanitizedSvg || imageUrl) && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title={isExpanded ? 'Thu nhỏ' : 'Phóng to'}
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
            <span>{isExpanded ? 'Thu nhỏ' : 'Phóng to'}</span>
          </button>
        )}
      </div>

      <div className={`space-y-3 ${isExpanded ? 'max-h-none' : 'max-h-[380px]'}`}>
        {/* Real World Photo if available and not errored */}
        {imageUrl && !imgError && (
          <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex justify-center">
            <img
              src={imageUrl}
              alt={visualDescription || 'Hình ảnh thực tế'}
              onError={() => setImgError(true)}
              className={`w-full object-contain transition-all ${isExpanded ? 'max-h-[500px]' : 'max-h-[240px]'}`}
            />
            <div className="absolute bottom-1 right-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
              Nguồn ảnh thực tế
            </div>
          </div>
        )}

        {/* Technical / Geometry SVG Diagram */}
        {sanitizedSvg && (
          <div
            className={`flex justify-center items-center overflow-hidden rounded-xl bg-white p-2 border border-slate-100 transition-all ${
              isExpanded ? 'max-h-[600px]' : 'max-h-[260px]'
            }`}
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
        )}

        {/* Fallback description if no SVG and no photo */}
        {!sanitizedSvg && (!imageUrl || imgError) && visualDescription && (
          <div className="flex items-center gap-3 rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-3 text-xs text-blue-900">
            <Compass className="h-5 w-5 text-blue-500 shrink-0" />
            <div>
              <div className="font-bold text-blue-950">Mô tả hình ảnh / sơ đồ thực tế:</div>
              <div className="text-slate-700 mt-0.5">{visualDescription}</div>
            </div>
          </div>
        )}
      </div>

      {visualDescription && (sanitizedSvg || imageUrl) && (
        <p className="mt-2 text-center text-[11px] text-slate-500 italic">
          [HÌNH ẢNH THỰC TẾ & HỌA TIẾT]: {visualDescription}
        </p>
      )}
    </div>
  );
};
