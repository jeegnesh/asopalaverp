import React from 'react';
import { KeyRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SupabaseFieldRowProps {
  columnName: string;
  dataType: string;
  required?: boolean;
  isPrimaryKey?: boolean;
  description?: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const SupabaseFieldRow: React.FC<SupabaseFieldRowProps> = ({
  columnName,
  dataType,
  required = false,
  isPrimaryKey = false,
  description,
  badge,
  children,
  className,
}) => {
  return (
    <div className={cn('space-y-1.5 font-sans', className)}>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          {isPrimaryKey && (
            <span className="text-amber-500 flex items-center" title="Primary Key">
              <KeyRound className="w-3 h-3" />
            </span>
          )}
          <label className="font-mono font-medium text-slate-900 dark:text-zinc-100 select-none">
            {columnName}
          </label>
          {required && <span className="text-rose-500 font-sans" title="Required column">*</span>}
          {badge}
        </div>
        <span className="font-mono text-[11px] text-slate-400 dark:text-[#707070] select-none lowercase">
          {dataType}
        </span>
      </div>

      <div className="relative">
        {children}
      </div>

      {description && (
        <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans leading-tight">
          {description}
        </p>
      )}
    </div>
  );
};
