import React from 'react';
import { cn } from '@/lib/utils';

export interface KbdProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'amber' | 'ghost';
  size?: 'xs' | 'sm' | 'md';
}

export const Kbd: React.FC<KbdProps> = ({
  children,
  variant = 'default',
  size = 'sm',
  className,
  ...props
}) => {
  const sizeStyles = {
    xs: 'px-1 py-0.5 text-[9px]',
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-xs',
  }[size];

  const variantStyles = {
    default:
      'bg-slate-100 dark:bg-[#222222] text-slate-500 dark:text-zinc-400 border border-slate-200/80 dark:border-[#2e2e2e]',
    primary:
      'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25 font-semibold',
    amber:
      'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 font-semibold',
    ghost:
      'bg-transparent text-slate-400 dark:text-zinc-500 border border-transparent',
  }[variant];

  return (
    <kbd
      className={cn(
        'inline-flex items-center justify-center rounded-[4px] font-mono font-medium select-none shadow-xs tracking-tight',
        sizeStyles,
        variantStyles,
        className
      )}
      {...props}
    >
      {children}
    </kbd>
  );
};

export default Kbd;
