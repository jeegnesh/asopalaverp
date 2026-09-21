import React, { useRef, useState, useEffect, useCallback } from 'react';
import { RotateCcw, PenTool, CheckCircle2, Sparkles } from 'lucide-react';
import { useUIStore } from '@/store/uiStore';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface TouchSignatureCanvasProps {
  onSave: (dataUrl: string) => void;
  staffName?: string;
  initialSignature?: string;
}

export const TouchSignatureCanvas: React.FC<TouchSignatureCanvasProps> = ({
  onSave,
  staffName,
  initialSignature,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokeRef = useRef<Stroke | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const { theme } = useUIStore();

  const isDarkMode = theme === 'dark' || theme === 'soft-dark';
  const strokeColor = isDarkMode ? '#3ecf8e' : '#059669';

  // Redraw all strokes from memory vector buffer
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(dpr, dpr);

    // Draw baseline guideline
    ctx.strokeStyle = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(20, height - 26);
    ctx.lineTo(width - 20, height - 26);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw all recorded strokes
    for (const stroke of strokesRef.current) {
      if (stroke.points.length === 0) continue;
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      if (stroke.points.length === 1) {
        ctx.arc(stroke.points[0].x, stroke.points[0].y, stroke.width / 2, 0, Math.PI * 2);
        ctx.fillStyle = stroke.color;
        ctx.fill();
      } else {
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        for (let i = 1; i < stroke.points.length; i++) {
          const prev = stroke.points[i - 1];
          const curr = stroke.points[i];
          const midX = (prev.x + curr.x) / 2;
          const midY = (prev.y + curr.y) / 2;
          ctx.quadraticCurveTo(prev.x, prev.y, midX, midY);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }, [isDarkMode]);

  // Handle Resize and Dimensions cleanly
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const displayWidth = Math.max(280, Math.floor(rect.width));
    const displayHeight = 130;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    canvas.style.width = `${displayWidth}px`;
    canvas.style.height = `${displayHeight}px`;

    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    resizeCanvas();
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      resizeCanvas();
    });
    observer.observe(container);

    return () => observer.disconnect();
  }, [resizeCanvas]);

  // Load initial signature if provided
  useEffect(() => {
    if (initialSignature && !hasDrawn) {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;
        ctx.drawImage(img, 0, 0, canvas.width / dpr, canvas.height / dpr);
        setHasDrawn(true);
      };
      img.src = initialSignature;
    }
  }, [initialSignature, hasDrawn]);

  // Coordinate normalizer
  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Pointer event handlers (Works for Touch, Stylus, Mouse)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);

    const pt = getCanvasCoordinates(e);
    const newStroke: Stroke = {
      points: [pt],
      color: strokeColor,
      width: 2.5,
    };

    currentStrokeRef.current = newStroke;
    strokesRef.current.push(newStroke);
    setHasDrawn(true);
    redrawCanvas();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStrokeRef.current) return;
    e.preventDefault();

    const pt = getCanvasCoordinates(e);
    currentStrokeRef.current.points.push(pt);
    redrawCanvas();
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!currentStrokeRef.current) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture already released
    }

    currentStrokeRef.current = null;
    redrawCanvas();

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleClear = () => {
    strokesRef.current = [];
    currentStrokeRef.current = null;
    setHasDrawn(false);
    redrawCanvas();
    onSave('');
  };

  // 1-Click Adopt Signature for Counter Convenience
  const handleAutoAdoptSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    strokesRef.current = [];
    setHasDrawn(true);
    redrawCanvas();

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.font = 'italic 26px "Brush Script MT", "Caveat", "Segoe Script", cursive, sans-serif';
    ctx.fillStyle = strokeColor;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    const displayName = staffName || 'Staff Sign-off';
    ctx.fillText(displayName, width / 2, height / 2 - 5);

    // Add tiny timestamp & badge underneath
    ctx.font = '9px monospace';
    ctx.fillStyle = isDarkMode ? '#94a3b8' : '#64748b';
    ctx.fillText(`Digital Verification • ${new Date().toLocaleDateString('en-IN')}`, width / 2, height / 2 + 22);

    ctx.restore();

    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="space-y-1.5 font-sans select-none" ref={containerRef}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-slate-900 dark:text-white font-medium">
          <PenTool className="w-3.5 h-3.5 text-emerald-600 dark:text-[#3ecf8e]" />
          <span>Digital Staff Sign-off {staffName ? `(${staffName})` : ''}</span>
          {hasDrawn && (
            <span className="inline-flex items-center gap-1 text-[10px] font-mono font-medium text-emerald-600 dark:text-[#3ecf8e] bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.5 rounded-[4px] border border-emerald-500/30 animate-in fade-in">
              <CheckCircle2 className="w-3 h-3" /> Signed
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hasDrawn && (
            <button
              type="button"
              onClick={handleAutoAdoptSignature}
              className="flex items-center gap-1 text-[11px] font-sans text-emerald-700 dark:text-[#3ecf8e] hover:underline cursor-pointer transition-colors"
              title="Click to generate an authentic electronic signature using staff name"
            >
              <Sparkles className="w-3 h-3" />
              <span>Adopt Signature</span>
            </button>
          )}

          {hasDrawn && (
            <button
              type="button"
              onClick={handleClear}
              className="flex items-center gap-1 text-xs font-mono text-slate-400 hover:text-rose-500 dark:hover:text-rose-400 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      <div className="relative border border-slate-200 dark:border-[#2e2e2e] rounded-[12px] overflow-hidden bg-slate-50/70 dark:bg-[#141414] shadow-xs">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="w-full h-[130px] touch-none cursor-crosshair relative z-10 block"
        />

        {!hasDrawn && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 dark:text-zinc-500 text-xs font-mono gap-1">
            <span>Sign above the line</span>
            <span className="text-[10px] text-slate-400/80 dark:text-zinc-600">(Touchscreen, Stylus, or Mouse)</span>
          </div>
        )}
      </div>
    </div>
  );
};
