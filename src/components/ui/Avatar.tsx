import React, { createContext, useContext, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface AvatarContextValue {
  imageLoaded: boolean;
  setImageLoaded: (loaded: boolean) => void;
}

const AvatarContext = createContext<AvatarContextValue>({
  imageLoaded: false,
  setImageLoaded: () => {},
});

export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type AvatarShape = 'circle' | 'square';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: AvatarSize;
  shape?: AvatarShape;
  children?: React.ReactNode;
  className?: string;
}

const SIZE_MAP: Record<AvatarSize, string> = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-12 h-12 text-base',
};

/**
 * Avatar Container Component
 * Follows Supabase Design System:
 * - Default Shape: rounded-full (erpskill.md Section 4, Line 129)
 * - Surfaces: calibrated light/dark background and hairlines
 */
export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ size = 'md', shape = 'circle', className, children, ...props }, ref) => {
    const [imageLoaded, setImageLoaded] = useState(false);

    const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-[6px]';
    const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

    return (
      <AvatarContext.Provider value={{ imageLoaded, setImageLoaded }}>
        <div
          ref={ref}
          className={cn(
            'relative inline-flex items-center justify-center shrink-0 select-none overflow-hidden',
            'bg-slate-100 dark:bg-[#222222] text-slate-800 dark:text-zinc-200',
            'border border-slate-200 dark:border-[#333333]',
            shapeClass,
            sizeClass,
            className
          )}
          {...props}
        >
          {children}
        </div>
      </AvatarContext.Provider>
    );
  }
);
Avatar.displayName = 'Avatar';

export interface AvatarImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  alt?: string;
  className?: string;
  onLoadingStatusChange?: (status: 'loading' | 'loaded' | 'error') => void;
}

/**
 * AvatarImage Component
 * Handles image loading states gracefully with fallback detection
 */
export const AvatarImage = React.forwardRef<HTMLImageElement, AvatarImageProps>(
  ({ src, alt = 'Avatar', className, onLoadingStatusChange, ...props }, ref) => {
    const { setImageLoaded } = useContext(AvatarContext);
    const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>(src ? 'loading' : 'error');

    useEffect(() => {
      if (!src) {
        setStatus('error');
        setImageLoaded(false);
        onLoadingStatusChange?.('error');
        return;
      }

      setStatus('loading');
      onLoadingStatusChange?.('loading');

      const img = new Image();
      img.src = src;
      img.onload = () => {
        setStatus('loaded');
        setImageLoaded(true);
        onLoadingStatusChange?.('loaded');
      };
      img.onerror = () => {
        setStatus('error');
        setImageLoaded(false);
        onLoadingStatusChange?.('error');
      };
    }, [src, setImageLoaded, onLoadingStatusChange]);

    if (status !== 'loaded' || !src) {
      return null;
    }

    return (
      <img
        ref={ref}
        src={src}
        alt={alt}
        className={cn('h-full w-full object-cover transition-opacity duration-200', className)}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = 'AvatarImage';

export interface AvatarFallbackProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

/**
 * AvatarFallback Component
 * Rendered when image fails to load or no image src is provided
 */
export const AvatarFallback = React.forwardRef<HTMLDivElement, AvatarFallbackProps>(
  ({ className, children, ...props }, ref) => {
    const { imageLoaded } = useContext(AvatarContext);

    if (imageLoaded) {
      return null;
    }

    return (
      <div
        ref={ref}
        className={cn(
          'flex h-full w-full items-center justify-center font-sans font-medium select-none',
          'text-slate-700 dark:text-zinc-200',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
AvatarFallback.displayName = 'AvatarFallback';

export default Avatar;
