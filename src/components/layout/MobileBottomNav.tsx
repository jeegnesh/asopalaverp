import React, { useState } from 'react';
import { useUIStore, PageId } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import {
  LayoutGrid,
  Receipt,
  Wallet,
  HandCoins,
  Plus,
  Sparkles,
  X,
  FileSpreadsheet,
  ChevronRight,
  User,
  Coins,
} from 'lucide-react';
import { cn, triggerHaptic } from '@/lib/utils';
import { useScrollLock } from '@/hooks/useScrollLock';

export const MobileBottomNav: React.FC = () => {
  const {
    activePage,
    setActivePage,
    setMobileSidebarOpen,
    setAdvanceModalOpen,
    setBulkImportOpen,
  } = useUIStore();
  const { user, can } = useAuthStore();

  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  useScrollLock(isQuickActionOpen);

  const handleNavClick = (pageId: PageId) => {
    triggerHaptic('selection');
    setActivePage(pageId);
    setMobileSidebarOpen(false);
    setIsQuickActionOpen(false);
  };

  const userInitials =
    user?.avatar_initials ||
    (user?.first_name
      ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}`.toUpperCase()
      : 'AD');

  const isCashier = user?.role_code === 'Cashier';

  const tabs: Array<{
    id: PageId;
    label: string;
    icon: React.FC<{ className?: string }>;
    badge?: number;
    isProfile?: boolean;
  }> = [
    {
      id: 'dashboard',
      label: 'Home',
      icon: LayoutGrid,
    },
    {
      id: 'expenses',
      label: 'Expenses',
      icon: Receipt,
    },
    {
      id: 'new-voucher',
      label: 'Add Expense',
      icon: Plus,
    },
    isCashier
      ? {
          id: 'advances',
          label: 'Advances',
          icon: HandCoins,
        }
      : {
          id: 'treasury',
          label: 'Cash Box',
          icon: Wallet,
        },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      isProfile: true,
    },
  ];

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. MINIMALIST ICON-ONLY BOTTOM NAVIGATION DOCK BAR                        */}
      {/* ========================================================================= */}
      <nav
        aria-label="Mobile Navigation"
        className={cn(
          'lg:hidden fixed bottom-0 left-0 right-0 z-40 select-none touch-manipulation',
          'bg-white/95 dark:bg-[#141414]/95 backdrop-blur-xl',
          'border-t border-slate-200/90 dark:border-[#222222]',
          'shadow-[0_-4px_20px_rgba(0,0,0,0.06)] dark:shadow-[0_-8px_30px_rgba(0,0,0,0.4)]',
          'pb-safe'
        )}
      >
        <div className="h-[52px] px-3 flex items-center justify-around max-w-lg mx-auto">
          {tabs.map((tab) => {
            const isActive = activePage === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleNavClick(tab.id)}
                aria-label={tab.label}
                className="flex items-center justify-center flex-1 h-full py-1 group select-none cursor-pointer active:scale-90 transition-transform"
              >
                {/* Clean Centered Icon / Avatar Container */}
                <div
                  className={cn(
                    'relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200',
                    isActive && !tab.isProfile
                      ? 'bg-emerald-500/15 dark:bg-[#3ecf8e]/15 text-emerald-600 dark:text-[#3ecf8e]'
                      : 'text-slate-400 dark:text-zinc-500 group-hover:text-slate-700 dark:group-hover:text-zinc-300'
                  )}
                >
                  {tab.isProfile ? (
                    user?.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt="Profile"
                        className={cn(
                          'w-5.5 h-5.5 rounded-full object-cover shrink-0 transition-all duration-200',
                          isActive
                            ? 'ring-[1.5px] ring-[#3ecf8e] ring-offset-1 ring-offset-white dark:ring-offset-[#141414] shadow-xs'
                            : 'ring-1 ring-slate-300/80 dark:ring-[#333333]'
                        )}
                      />
                    ) : (
                      <div
                        className={cn(
                          'w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 transition-all duration-200',
                          isActive
                            ? 'bg-[#3ecf8e] text-[#171717] ring-[1.5px] ring-[#3ecf8e] ring-offset-1 ring-offset-white dark:ring-offset-[#141414] shadow-xs'
                            : 'bg-slate-200 dark:bg-[#282828] text-slate-700 dark:text-zinc-300 ring-1 ring-slate-300/80 dark:ring-[#333333]'
                        )}
                      >
                        {userInitials}
                      </div>
                    )
                  ) : (
                    <Icon
                      className={cn(
                        'w-5 h-5 transition-all duration-150',
                        isActive
                          ? 'text-emerald-600 dark:text-[#3ecf8e] stroke-[2.4]'
                          : 'stroke-[1.8]'
                      )}
                    />
                  )}
                  {tab.badge && tab.badge > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-1 rounded-full bg-emerald-600 dark:bg-[#3ecf8e] text-white dark:text-[#141414] text-[9px] font-mono font-bold flex items-center justify-center shadow-xs">
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ========================================================================= */}
      {/* 2. MOBILE NATIVE QUICK ACTION BOTTOM SHEET                                */}
      {/* ========================================================================= */}
      {isQuickActionOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Quick Counter Actions"
          className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end select-none font-sans"
        >
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
            onClick={() => setIsQuickActionOpen(false)}
          />

          {/* Bottom Sheet Modal with Grab Handle */}
          <div className="relative w-full max-w-lg mx-auto bg-white dark:bg-[#181818] border-t border-slate-200 dark:border-[#282828] rounded-t-[20px] shadow-2xl p-4 pb-safe animate-in slide-in-from-bottom duration-200 z-10">
            {/* Native Pull Handle */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-600 rounded-full mx-auto mb-3" />

            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#242424]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 dark:text-[#3ecf8e]" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  Quick Counter Actions
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickActionOpen(false)}
                className="w-8 h-8 rounded-[6px] bg-slate-100 dark:bg-[#222222] text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Action Grid */}
            <div className="py-3 space-y-2.5 text-xs font-sans">
              {/* Primary Emerald Button: Add Expense */}
              {can('can_create_voucher') && (
                <button
                  type="button"
                  onClick={() => handleNavClick('new-voucher')}
                  className="w-full flex items-center justify-between p-3.5 rounded-[12px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-semibold transition-all active:scale-[0.98] cursor-pointer shadow-xs min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-black/10 flex items-center justify-center shrink-0">
                      <Receipt className="w-5 h-5 stroke-[2.4]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm leading-tight">Add Expense</div>
                      <div className="text-xs text-[#171717]/80 font-normal mt-0.5">Enter bill & make payment</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#171717]/70" />
                </button>
              )}

              {/* Staff Advance */}
              {can('can_disburse_advance') && (
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    setAdvanceModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-[12px] bg-slate-50 dark:bg-[#202020] hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-800 dark:text-white font-medium transition-all active:scale-[0.98] cursor-pointer border border-slate-200 dark:border-[#2e2e2e] min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <HandCoins className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm leading-tight text-slate-900 dark:text-white">Staff Advance</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Give money advance to staff</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Cash Drawer Float */}
              {can('can_inject_float') && (
                <button
                  type="button"
                  onClick={() => handleNavClick('treasury')}
                  className="w-full flex items-center justify-between p-3.5 rounded-[12px] bg-slate-50 dark:bg-[#202020] hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-800 dark:text-white font-medium transition-all active:scale-[0.98] cursor-pointer border border-slate-200 dark:border-[#2e2e2e] min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                      <Wallet className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm leading-tight text-slate-900 dark:text-white">Add Cash to Box</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Add cash notes from safe</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Daily Closing */}
              {(isCashier || can('can_verify_f9_closing')) && (
                <button
                  type="button"
                  onClick={() => handleNavClick('closing')}
                  className="w-full flex items-center justify-between p-3.5 rounded-[12px] bg-slate-50 dark:bg-[#202020] hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-800 dark:text-white font-medium transition-all active:scale-[0.98] cursor-pointer border border-slate-200 dark:border-[#2e2e2e] min-h-[52px]"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-[#3ecf8e] flex items-center justify-center shrink-0">
                      <Coins className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm leading-tight text-slate-900 dark:text-white">Daily Cash Closing</div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">Count night cash & match money</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Master Data Import (Manager / Admin only) */}
              {!isCashier && (
                <button
                  type="button"
                  onClick={() => {
                    setIsQuickActionOpen(false);
                    setBulkImportOpen(true);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-[8px] bg-slate-50 dark:bg-[#1f1f1f] hover:bg-slate-100 dark:hover:bg-[#242424] text-slate-700 dark:text-zinc-300 font-medium transition-colors cursor-pointer border border-slate-200/80 dark:border-[#262626] min-h-[44px]"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                    <span className="text-xs font-medium">Import Master Data (CSV)</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">CSV</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
