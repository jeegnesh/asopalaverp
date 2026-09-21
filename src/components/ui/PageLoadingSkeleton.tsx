import React from 'react';

export const PageLoadingSkeleton: React.FC = () => {
  return (
    <div className="w-full space-y-6 animate-pulse select-none font-sans" aria-label="Loading page content...">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-[#242424]">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-48 rounded-[6px] bg-slate-200 dark:bg-[#262626]" />
            <div className="h-4 w-12 rounded-[4px] bg-slate-200 dark:bg-[#202020]" />
            <div className="h-4 w-20 rounded-[4px] bg-slate-200 dark:bg-[#202020]" />
          </div>
          <div className="h-3.5 w-72 sm:w-96 rounded-[4px] bg-slate-100 dark:bg-[#1c1c1c]" />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="h-8 w-24 rounded-[6px] bg-slate-200 dark:bg-[#202020]" />
          <div className="h-8 w-32 rounded-[6px] bg-slate-200 dark:bg-[#242424]" />
        </div>
      </div>

      {/* Slicers / Filter Bar Skeleton */}
      <div className="h-11 rounded-[12px] bg-slate-100 dark:bg-[#181818] border border-slate-200 dark:border-[#262626] flex items-center justify-between px-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-16 rounded-[4px] bg-slate-200 dark:bg-[#242424]" />
          <div className="h-6 w-20 rounded-[4px] bg-slate-200 dark:bg-[#202020]" />
          <div className="h-6 w-20 rounded-[4px] bg-slate-200 dark:bg-[#202020]" />
        </div>
        <div className="h-6 w-28 rounded-[4px] bg-slate-200 dark:bg-[#202020]" />
      </div>

      {/* Metric Cards Grid Skeleton (6 Cols Desktop, 2 Cols Mobile) */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="p-3.5 rounded-[12px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#262626] space-y-2.5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-16 rounded-[4px] bg-slate-200 dark:bg-[#262626]" />
              <div className="w-6 h-6 rounded-[6px] bg-slate-100 dark:bg-[#222222]" />
            </div>
            <div className="h-6 w-24 rounded-[4px] bg-slate-200 dark:bg-[#2c2c2c]" />
            <div className="h-2.5 w-20 rounded-[4px] bg-slate-100 dark:bg-[#202020]" />
          </div>
        ))}
      </div>

      {/* Main Visual / Content Card Skeleton */}
      <div className="rounded-[12px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#262626] p-4 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#242424]">
          <div className="h-4 w-40 rounded-[4px] bg-slate-200 dark:bg-[#262626]" />
          <div className="h-4 w-24 rounded-[4px] bg-slate-100 dark:bg-[#202020]" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center justify-between p-2.5 rounded-[8px] bg-slate-50 dark:bg-[#1c1c1c] border border-slate-100 dark:border-[#242424]"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[6px] bg-slate-200 dark:bg-[#262626]" />
                <div className="space-y-1">
                  <div className="h-3.5 w-32 rounded-[4px] bg-slate-200 dark:bg-[#282828]" />
                  <div className="h-2.5 w-20 rounded-[4px] bg-slate-100 dark:bg-[#222222]" />
                </div>
              </div>
              <div className="h-4 w-16 rounded-[4px] bg-slate-200 dark:bg-[#282828]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
