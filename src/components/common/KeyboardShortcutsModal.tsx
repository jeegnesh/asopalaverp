import React, { useRef, useEffect } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useUIStore, PageId } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { animateModalOpen, animateModalClose } from '@/lib/animations';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/Kbd';
import {
  Keyboard,
  X,
  Compass,
  FileText,
  Sliders,
} from 'lucide-react';
import { AsopalavLogo } from '@/components/icons/AsopalavLogo';

export const KeyboardShortcutsModal: React.FC = () => {
  const {
    isShortcutsModalOpen,
    setShortcutsModalOpen,
    setActivePage,
    setSearchOpen,
    toggleSidebarCollapse,
  } = useUIStore();
  const { lockScreen } = useAuthStore();

  useScrollLock(isShortcutsModalOpen);

  const backdropRef = useRef<HTMLDivElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isShortcutsModalOpen) {
      animateModalOpen(modalRef.current, backdropRef.current);
    }
  }, [isShortcutsModalOpen]);

  const handleClose = () => {
    animateModalClose(modalRef.current, backdropRef.current, () => {
      setShortcutsModalOpen(false);
    });
  };

  if (!isShortcutsModalOpen) return null;

  const handleAction = (type: 'page' | 'action', val: string) => {
    handleClose();
    if (type === 'page') {
      setActivePage(val as PageId);
    } else if (val === 'search') {
      setSearchOpen(true);
    } else if (val === 'lock') {
      lockScreen();
    } else if (val === 'sidebar') {
      toggleSidebarCollapse();
    }
  };

  const SHORTCUT_GROUPS = [
    {
      title: 'PAGE NAVIGATION',
      items: [
        { label: 'Dashboard', keys: ['F1'], action: () => handleAction('page', 'dashboard') },
        { label: 'Add Expense', keys: ['F2'], action: () => handleAction('page', 'new-voucher') },
        { label: 'All Expenses & Ledger', keys: ['F3'], action: () => handleAction('page', 'expenses') },
        { label: 'Cash Box & Bank', keys: ['F4'], action: () => handleAction('page', 'treasury') },
        { label: 'Staff Advances & IOU', keys: ['F7'], action: () => handleAction('page', 'advances') },
        { label: 'Activity History (Audit)', keys: ['F8'], action: () => handleAction('page', 'audit') },
        { label: 'Daily Cash Closing', keys: ['F9'], action: () => handleAction('page', 'closing') },
        { label: 'Staff Directory', keys: ['F10'], action: () => handleAction('page', 'staff') },
        { label: 'Shop Settings', keys: ['F11'], action: () => handleAction('page', 'settings') },
        { label: 'My Profile & Security', keys: ['F12'], action: () => handleAction('page', 'profile') },
      ],
    },
    {
      title: 'EXPENSE ENTRY MODES',
      items: [
        { label: 'Standard Shop Bill Mode', keys: ['Alt', '1'], action: () => handleAction('page', 'new-voucher') },
        { label: 'Staff Meal Split Mode', keys: ['Alt', '2'], action: () => handleAction('page', 'new-voucher') },
        { label: 'Courier Parcel Delivery Mode', keys: ['Alt', '3'], action: () => handleAction('page', 'new-voucher') },
      ],
    },
    {
      title: 'SYSTEM & POS TOOLS',
      items: [
        { label: 'POS Quick Math Calculator', keys: ['F6'], action: () => { handleClose(); useUIStore.getState().setCalculatorOpen(true); } },
        { label: 'Instant Terminal Lock Screen', keys: ['Alt', 'L'], action: () => handleAction('action', 'lock') },
        { label: 'Search Everything (Universal)', keys: ['Ctrl', 'K'], action: () => handleAction('action', 'search') },
        { label: 'Toggle Sidebar Collapse', keys: ['Ctrl', 'B'], action: () => handleAction('action', 'sidebar') },
        { label: 'Open Shortcuts Helper', keys: ['?'], action: () => {} },
        { label: 'Close Active Popup / Window', keys: ['Esc'], action: handleClose },
      ],
    },
  ];

  return (
    <div
      ref={backdropRef}
      onClick={handleClose}
      className="fixed inset-0 z-50 bg-black/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans"
    >
      <div
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#282828] rounded-[12px] shadow-2xl overflow-hidden text-slate-900 dark:text-zinc-100 font-sans"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-[#242424] flex items-center justify-between bg-white dark:bg-[#171717]">
          <div className="flex items-center gap-2.5">
            <Keyboard className="w-4 h-4 text-slate-400 dark:text-zinc-500 stroke-[2]" />
            <h2 className="text-sm font-medium tracking-tight text-slate-900 dark:text-zinc-100 font-sans">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1 rounded-[6px] text-slate-400 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#242424] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Content */}
        <div className="p-4 max-h-[65vh] overflow-y-auto space-y-4 text-xs font-sans">
          {SHORTCUT_GROUPS.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-mono font-medium tracking-wider text-slate-400 dark:text-zinc-500 uppercase">
                {group.title}
              </div>

              <div className="rounded-[8px] border border-slate-200 dark:border-[#242424] bg-slate-50/50 dark:bg-[#1c1c1c] divide-y divide-slate-200/70 dark:divide-[#242424] overflow-hidden">
                {group.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    onClick={() => item.action()}
                    className="flex items-center justify-between px-3 py-2 hover:bg-white dark:hover:bg-[#242424] transition-colors cursor-pointer text-xs"
                  >
                    <span className="text-slate-700 dark:text-zinc-200 font-medium font-sans">{item.label}</span>
                    <div className="flex items-center gap-1">
                      {item.keys.map((k, kIdx) => (
                        <Kbd key={kIdx} size="xs">
                          {k}
                        </Kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-slate-200 dark:border-[#242424] bg-slate-50/50 dark:bg-[#141414] flex items-center justify-between font-sans text-[11px] text-slate-500 dark:text-zinc-400">
          <span>Press ESC anytime to close</span>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400 dark:text-zinc-500">
            <AsopalavLogo size={12} className="shrink-0" />
            <span>Asopalav Enterprise</span>
          </div>
        </div>
      </div>
    </div>
  );
};
