import { useState, useEffect, useRef, useCallback } from 'react';

export const DROPDOWN_EVENT = 'asopalav:dropdown-open';

export function openExclusivePopover(id: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(DROPDOWN_EVENT, {
        detail: id,
      })
    );
  }
}

export function closeAllPopovers() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(DROPDOWN_EVENT, {
        detail: 'close-all-popovers',
      })
    );
  }
}

/**
 * Hook for mutually exclusive popovers, dropdowns, and flyout menus.
 * When one opens, any other component listening automatically closes.
 */
export function useExclusivePopover(id: string) {
  const [isOpen, setIsOpenState] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const open = useCallback(() => {
    setIsOpenState(true);
    openExclusivePopover(id);
  }, [id]);

  const close = useCallback(() => {
    setIsOpenState(false);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  useEffect(() => {
    const handleGlobalDropdownOpen = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail !== id) {
        setIsOpenState(false);
      }
    };

    window.addEventListener(DROPDOWN_EVENT, handleGlobalDropdownOpen);
    return () => {
      window.removeEventListener(DROPDOWN_EVENT, handleGlobalDropdownOpen);
    };
  }, [id]);

  // Click outside and ESC key handlers
  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, close]);

  return {
    isOpen,
    setIsOpen: setIsOpenState,
    open,
    close,
    toggle,
    containerRef,
  };
}
