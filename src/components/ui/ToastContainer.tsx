import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
  Activity,
  X,
} from 'lucide-react';
import gsap from 'gsap';
import { cn, triggerHaptic } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'activity';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
  action?: ToastAction;
}

export type ToastOptions = Omit<ToastItem, 'id'> & { id?: string };

/**
 * Global toast dispatcher supporting both object syntax and typed helper methods
 */
export const showToast = (toast: ToastOptions) => {
  if (typeof window === 'undefined') return '';
  try {
    if (toast.type === 'error') {
      triggerHaptic('error');
    } else if (toast.type === 'success') {
      triggerHaptic('success');
    } else {
      triggerHaptic('light');
    }
  } catch {}

  const id = toast.id || `TOAST-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  window.dispatchEvent(
    new CustomEvent('asopalav:toast', {
      detail: {
        ...toast,
        id,
      },
    })
  );
  return id;
};

export const dismissToast = (id: string) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('asopalav:dismiss-toast', { detail: { id } }));
};

export const toast = {
  success: (message: string, title?: string, durationMs = 4000) =>
    showToast({ type: 'success', message, title, durationMs }),
  error: (message: string, title?: string, durationMs = 5000) =>
    showToast({ type: 'error', message, title, durationMs }),
  warning: (message: string, title?: string, durationMs = 4500) =>
    showToast({ type: 'warning', message, title, durationMs }),
  info: (message: string, title?: string, durationMs = 4000) =>
    showToast({ type: 'info', message, title, durationMs }),
  activity: (message: string, title?: string, durationMs = 4000) =>
    showToast({ type: 'activity', message, title: title || 'Activity', durationMs }),
  loading: (message: string, title?: string, durationMs = 6000) =>
    showToast({ type: 'loading', message, title, durationMs }),
};

// ============================================================================
// INDIVIDUAL GSAP ANIMATED TOAST CARD
// ============================================================================
interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

const ToastCard: React.FC<ToastCardProps> = ({ toast: item, onDismiss }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const timerTimelineRef = useRef<gsap.core.Tween | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const isDismissing = useRef(false);

  const duration = item.durationMs ?? (item.type === 'error' ? 5000 : item.type === 'loading' ? 6000 : 4000);

  // GSAP Entrance & Layout Animation
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;

    gsap.fromTo(
      el,
      { opacity: 0, y: 24, x: 20, scale: 0.92, rotate: 0.5 },
      {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        rotate: 0,
        duration: 0.32,
        ease: 'back.out(1.6)',
      }
    );

    // GSAP Progress Bar Countdown
    if (progressBarRef.current && item.type !== 'loading') {
      timerTimelineRef.current = gsap.to(progressBarRef.current, {
        width: '0%',
        duration: duration / 1000,
        ease: 'none',
        onComplete: () => {
          dismissWithAnimation();
        },
      });
    } else if (item.type === 'loading') {
      // Safety auto-dismiss for loading states
      fallbackTimerRef.current = window.setTimeout(() => {
        dismissWithAnimation();
      }, duration);
    }

    return () => {
      timerTimelineRef.current?.kill();
      if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    };
  }, [duration, item.type]);

  const dismissWithAnimation = useCallback(() => {
    if (isDismissing.current) return;
    isDismissing.current = true;

    const el = cardRef.current;
    if (!el) {
      onDismiss(item.id);
      return;
    }

    gsap.to(el, {
      opacity: 0,
      x: 50,
      scale: 0.88,
      duration: 0.22,
      ease: 'power3.in',
      onComplete: () => {
        onDismiss(item.id);
      },
    });
  }, [item.id, onDismiss]);

  const handleMouseEnter = () => {
    timerTimelineRef.current?.pause();
  };

  const handleMouseLeave = () => {
    timerTimelineRef.current?.resume();
  };

  // Status Styling Configuration (Supabase Studio aesthetic)
  const config = {
    success: {
      border: 'border-emerald-500/40 dark:border-[#3ecf8e]/40',
      badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-[#3ecf8e]',
      progressBg: 'bg-[#3ecf8e]',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-[#3ecf8e] shrink-0" />,
    },
    error: {
      border: 'border-rose-500/40 dark:border-rose-500/50',
      badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
      progressBg: 'bg-rose-500',
      icon: <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />,
    },
    warning: {
      border: 'border-amber-500/40 dark:border-amber-500/50',
      badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      progressBg: 'bg-amber-500',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
    },
    info: {
      border: 'border-blue-500/40 dark:border-blue-500/50',
      badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      progressBg: 'bg-blue-500',
      icon: <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />,
    },
    activity: {
      border: 'border-teal-500/40 dark:border-teal-400/40',
      badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
      progressBg: 'bg-teal-400',
      icon: <Activity className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 animate-pulse" />,
    },
    loading: {
      border: 'border-[#3ecf8e]/40',
      badgeBg: 'bg-[#3ecf8e]/10 text-[#3ecf8e]',
      progressBg: 'bg-[#3ecf8e]',
      icon: <Loader2 className="w-4 h-4 text-[#3ecf8e] animate-spin shrink-0" />,
    },
  }[item.type];

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        'pointer-events-auto relative overflow-hidden rounded-[8px] border shadow-level-3 p-3.5 select-none font-sans transition-shadow',
        'bg-white dark:bg-[#181818] text-slate-900 dark:text-white',
        config.border
      )}
      style={{ willChange: 'transform, opacity' }}
      role="alert"
    >
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5">{config.icon}</div>

        <div className="flex-1 min-w-0 pr-1">
          {item.title && (
            <h4 className="text-xs font-semibold text-slate-900 dark:text-white tracking-tight">
              {item.title}
            </h4>
          )}
          <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed break-words font-sans mt-0.5">
            {item.message}
          </p>

          {item.action && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => {
                  item.action?.onClick();
                  dismissWithAnimation();
                }}
                className="text-[11px] font-mono px-2 py-0.5 rounded-[4px] bg-[#3ecf8e] text-[#171717] font-semibold hover:bg-[#3ecf8e]/90 transition-colors cursor-pointer"
              >
                {item.action.label}
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={dismissWithAnimation}
          className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-0.5 rounded-[4px] hover:bg-slate-100 dark:hover:bg-[#282828] transition-colors shrink-0 cursor-pointer"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* GSAP Linear Countdown Progress Bar */}
      {item.type !== 'loading' && (
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100 dark:bg-[#242424] overflow-hidden">
          <div
            ref={progressBarRef}
            className={cn('h-full w-full', config.progressBg)}
          />
        </div>
      )}
    </div>
  );
};

// ============================================================================
// GLOBAL TOAST CONTAINER
// ============================================================================
export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    function handleToast(e: Event) {
      const customEvent = e as CustomEvent<ToastItem>;
      if (customEvent.detail) {
        const newToast = customEvent.detail;
        setToasts((prev) => {
          const filtered = newToast.id ? prev.filter((t) => t.id !== newToast.id) : prev;
          return [...filtered.slice(-4), newToast];
        });
      }
    }

    function handleDismissEvent(e: Event) {
      const customEvent = e as CustomEvent<{ id: string }>;
      if (customEvent.detail?.id) {
        setToasts((prev) => prev.filter((t) => t.id !== customEvent.detail.id));
      }
    }

    window.addEventListener('asopalav:toast', handleToast);
    window.addEventListener('asopalav:dismiss-toast', handleDismissEvent);
    return () => {
      window.removeEventListener('asopalav:toast', handleToast);
      window.removeEventListener('asopalav:dismiss-toast', handleDismissEvent);
    };
  }, []);

  const handleDismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none font-sans"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} toast={t} onDismiss={handleDismiss} />
      ))}
    </div>
  );
};
