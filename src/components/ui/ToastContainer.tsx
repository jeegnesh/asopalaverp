import React from 'react';
import { Toaster as SonnerToaster, toast as sonnerToast } from 'sonner';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  AlertTriangle,
  Loader2,
  Activity,
} from 'lucide-react';
import { triggerHaptic } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading' | 'activity';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastItem {
  id?: string;
  type: ToastType;
  title?: string;
  message: string;
  durationMs?: number;
  action?: ToastAction;
}

export type ToastOptions = ToastItem;

/**
 * Global toast dispatcher using Sonner with backward-compatible API
 */
export const showToast = (options: ToastOptions): string | number => {
  if (typeof window === 'undefined') return '';

  const { type, title, message, durationMs, action, id } = options;

  try {
    if (type === 'error') {
      triggerHaptic('error');
    } else if (type === 'success') {
      triggerHaptic('success');
    } else {
      triggerHaptic('light');
    }
  } catch {}

  const duration = durationMs ?? (type === 'error' ? 5000 : type === 'loading' ? 6000 : 4000);

  const sonnerAction = action
    ? {
        label: action.label,
        onClick: action.onClick,
      }
    : undefined;

  const toastOptions = {
    id,
    duration,
    description: title ? message : undefined,
    action: sonnerAction,
  };

  const displayText = title || message;

  switch (type) {
    case 'success':
      return sonnerToast.success(displayText, {
        ...toastOptions,
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-[#3ecf8e]" />,
      });
    case 'error':
      return sonnerToast.error(displayText, {
        ...toastOptions,
        icon: <AlertCircle className="w-4 h-4 text-rose-500 dark:text-rose-400" />,
      });
    case 'warning':
      return sonnerToast.warning(displayText, {
        ...toastOptions,
        icon: <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />,
      });
    case 'info':
      return sonnerToast.info(displayText, {
        ...toastOptions,
        icon: <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />,
      });
    case 'activity':
      return sonnerToast(displayText, {
        ...toastOptions,
        icon: <Activity className="w-4 h-4 text-teal-500 dark:text-teal-400 animate-pulse" />,
      });
    case 'loading':
      return sonnerToast.loading(displayText, {
        ...toastOptions,
        icon: <Loader2 className="w-4 h-4 text-[#3ecf8e] animate-spin" />,
      });
    default:
      return sonnerToast(displayText, toastOptions);
  }
};

export const dismissToast = (id?: string | number) => {
  if (typeof window === 'undefined') return;
  if (id) {
    sonnerToast.dismiss(id);
  } else {
    sonnerToast.dismiss();
  }
};

/**
 * Direct typed helpers matching Sonner API
 */
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
  dismiss: dismissToast,
  raw: sonnerToast,
};

/**
 * Sonner Global Toaster Component styled with Supabase Studio design tokens
 */
export const ToastContainer: React.FC = () => {
  return (
    <SonnerToaster
      position="bottom-right"
      expand={true}
      richColors={false}
      closeButton={true}
      gap={8}
      toastOptions={{
        className:
          'font-sans text-xs rounded-[8px] border shadow-xl bg-white dark:bg-[#141414] text-slate-900 dark:text-white border-slate-200 dark:border-[#262626] p-3.5',
        style: {
          fontFamily: 'inherit',
        },
        classNames: {
          toast:
            'bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] text-slate-900 dark:text-white shadow-lg',
          title: 'font-semibold text-xs text-slate-900 dark:text-white',
          description: 'text-xs text-slate-600 dark:text-[#A1A1A1] font-sans mt-0.5',
          actionButton:
            'bg-[#3ecf8e] text-[#171717] hover:bg-[#34b27b] text-[11px] font-semibold font-sans px-2.5 py-1 rounded-[4px]',
          cancelButton:
            'bg-slate-100 dark:bg-[#222] text-slate-700 dark:text-zinc-300 text-[11px] font-medium font-sans px-2.5 py-1 rounded-[4px]',
          closeButton:
            'bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] text-slate-400 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white',
        },
      }}
    />
  );
};
