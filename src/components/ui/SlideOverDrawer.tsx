import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Maximize2, Minimize2, Copy, Check } from 'lucide-react';
import { animateDrawerOpen, animateDrawerClose } from '@/lib/animations';
import { useScrollLock } from '@/hooks/useScrollLock';
import { cn } from '@/lib/utils';

export type DrawerSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';

export interface SlideOverDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  copyId?: string;
  size?: DrawerSize;
  allowExpand?: boolean;
  contentClassName?: string;
  headerExtra?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const sizeClasses: Record<DrawerSize, string> = {
  sm: 'max-w-md',        // 448px
  md: 'max-w-xl',        // 576px
  lg: 'max-w-3xl',       // 768px
  xl: 'max-w-5xl',       // 1024px
  '2xl': 'max-w-7xl',     // 1280px
  full: 'w-full max-w-full', // Full Screen 100vw x 100vh
};

export const SlideOverDrawer: React.FC<SlideOverDrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  badge,
  copyId,
  size = 'full',
  allowExpand = true,
  contentClassName,
  headerExtra,
  footer,
  children,
}) => {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const [isCompact, setIsCompact] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleClose = () => {
    animateDrawerClose(panelRef.current, backdropRef.current, onClose);
  };

  useScrollLock(isOpen);

  // Keyboard ergonomics: ESC to close
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setIsCompact(false);
      animateDrawerOpen(panelRef.current, backdropRef.current);
    }
  }, [isOpen]);

  const handleCopyId = () => {
    if (!copyId) return;
    navigator.clipboard.writeText(copyId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen || !mounted) return null;

  // Determine current width class: default full screen unless user toggled compact
  const currentSizeClass = isCompact ? 'max-w-4xl border-l' : (sizeClasses[size] || sizeClasses.full);

  const drawerContent = (
    <div className="fixed inset-0 z-[99999] w-screen h-screen overflow-hidden select-none font-sans flex justify-end">
      {/* Backdrop */}
      <div
        ref={backdropRef}
        className="fixed inset-0 w-screen h-screen bg-black/60 dark:bg-black/75 transition-opacity backdrop-blur-[2px] z-0"
        onClick={handleClose}
      />

      {/* Slide-over Panel Container */}
      <div className="fixed inset-0 w-screen h-screen flex justify-end pointer-events-none z-10">
        <div
          ref={panelRef}
          className={cn(
            'w-full h-full pointer-events-auto bg-white dark:bg-[#141414] border-l border-slate-200 dark:border-[#222222] shadow-2xl flex flex-col overflow-hidden text-slate-900 dark:text-zinc-100 transition-[max-width] duration-200 ease-out',
            currentSizeClass
          )}
        >
          {/* Mobile Android M3 Drag Handle */}
          <div className="sm:hidden w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto mt-2 -mb-1 shrink-0" />

          {/* 1. Supabase Studio Header */}
          <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#1f1f1f] flex items-center justify-between bg-white dark:bg-[#141414] shrink-0 z-10">
            <div className="flex items-center gap-2.5 min-w-0 pr-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-medium text-slate-900 dark:text-white tracking-tight font-sans truncate">
                    {title}
                  </h2>

                  {copyId && (
                    <button
                      type="button"
                      onClick={handleCopyId}
                      title="Copy ID to clipboard"
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-slate-100 dark:bg-[#222222] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-[#2e2e2e] text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600 dark:text-[#3ecf8e] stroke-[2.5]" />
                          <span className="text-emerald-600 dark:text-[#3ecf8e] font-medium font-sans">COPIED</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-2.5 h-2.5" />
                          <span className="font-sans font-medium">COPY</span>
                        </>
                      )}
                    </button>
                  )}

                  {badge}
                </div>

                {subtitle && (
                  <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 font-sans truncate">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Window Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {headerExtra}

              {allowExpand && (
                <button
                  type="button"
                  onClick={() => setIsCompact(!isCompact)}
                  aria-label={isCompact ? 'Expand to full screen' : 'Collapse to side drawer'}
                  title={isCompact ? 'Expand to full screen' : 'Collapse to side drawer'}
                  className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#242424] transition-colors cursor-pointer hidden sm:inline-flex"
                >
                  {isCompact ? (
                    <Maximize2 className="w-3.5 h-3.5" />
                  ) : (
                    <Minimize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close drawer"
                title="Close drawer (ESC)"
                className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#242424] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 2. Scrollable Body */}
          <div
            className={cn(
              'flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 pb-8 space-y-5 font-sans text-xs bg-white dark:bg-[#141414]',
              contentClassName
            )}
          >
            {children}
          </div>

          {/* 3. Sticky Enterprise Footer */}
          {footer && (
            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-[#1f1f1f] bg-slate-50/75 dark:bg-[#141414] shrink-0 mt-auto flex items-center justify-between gap-3 z-10">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
};
