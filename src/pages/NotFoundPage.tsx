import React from 'react';
import { useUIStore } from '@/store/uiStore';
import { FileQuestion, Plus, Search, Home } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const { setActivePage, setSearchOpen } = useUIStore();
  const searchParams = new URLSearchParams(window.location.search);
  const requestedPage = searchParams.get('page') || 'Unknown route';

  return (
    <div className="min-h-screen bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] font-sans antialiased selection:bg-[#3ecf8e]/20 selection:text-[#3ecf8e] pb-16 select-none flex flex-col">
      {/* 2. Main Studio Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="max-w-md w-full p-8 rounded-[12px] bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#242424] shadow-md space-y-6">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-mono font-medium">
            <span>HTTP 404</span>
            <span>•</span>
            <span>Page Not Found</span>
          </div>

          {/* Icon & Heading */}
          <div className="space-y-2">
            <div className="w-14 h-14 rounded-[10px] bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#2e2e2e] flex items-center justify-center text-slate-600 dark:text-zinc-400 mx-auto shadow-xs">
              <FileQuestion className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight">
              Page Not Found
            </h1>
            <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed font-sans">
              The page <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-[#242424] font-mono text-slate-800 dark:text-zinc-200 text-[11px] font-semibold border border-slate-200 dark:border-transparent">?page={requestedPage}</code> does not exist or has moved.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setActivePage('dashboard')}
              className="flex-1 h-9 px-4 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-sans text-xs font-medium cursor-pointer transition-colors inline-flex items-center justify-center gap-2 shadow-xs select-none"
            >
              <Home className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Go to Dashboard</span>
            </button>

            <button
              type="button"
              onClick={() => setActivePage('new-voucher')}
              className="flex-1 h-9 px-4 rounded-[6px] bg-slate-100 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-200 dark:hover:bg-[#282828] text-slate-800 dark:text-white font-sans text-xs font-medium cursor-pointer transition-colors inline-flex items-center justify-center gap-2 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600 dark:text-zinc-400" />
              <span>Add Expense</span>
            </button>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-200 transition-colors inline-flex items-center gap-1 cursor-pointer font-sans"
            >
              <Search className="w-3 h-3" />
              <span>Search Everything</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
