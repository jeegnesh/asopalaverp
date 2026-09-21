import React from 'react';
import { LucideIcon, Inbox, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  actionShortcut?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
  compact?: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionIcon: ActionIcon = Plus,
  actionShortcut,
  onAction,
  secondaryActionLabel,
  secondaryLabel,
  onSecondaryAction,
  className,
  compact = false,
}) => {
  const effectiveSecondaryLabel = secondaryActionLabel || secondaryLabel;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center select-none font-sans',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
    >
      <div className="w-12 h-12 rounded-[10px] bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#2e2e2e] flex items-center justify-center text-slate-500 dark:text-zinc-400 mb-3 shadow-xs">
        <Icon className="w-6 h-6 stroke-[1.75]" />
      </div>

      <h3 className="text-sm font-medium text-slate-900 dark:text-white tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}

      {(onAction || (onSecondaryAction && effectiveSecondaryLabel)) && (
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {onSecondaryAction && effectiveSecondaryLabel && (
            <button
              type="button"
              onClick={onSecondaryAction}
              className="h-8 px-3 rounded-[6px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] text-xs font-medium text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>{effectiveSecondaryLabel}</span>
            </button>
          )}

          {onAction && actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="h-8 px-3.5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-medium transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
            >
              <ActionIcon className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>{actionLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

