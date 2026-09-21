import { useEffect } from 'react';

let lockCount = 0;

/**
 * Custom hook to lock background window scrolling when an overlay/drawer/modal/search is open.
 * Uses reference counting so nested or sequential overlays do not prematurely unlock the scroll.
 */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (isLocked) {
      lockCount++;
      document.body.style.overflow = 'hidden';
    }

    return () => {
      if (isLocked) {
        lockCount = Math.max(0, lockCount - 1);
        if (lockCount === 0) {
          document.body.style.overflow = 'unset';
        }
      }
    };
  }, [isLocked]);
}
