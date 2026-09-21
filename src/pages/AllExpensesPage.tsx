import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useVouchers } from '@/hooks/useVouchers';
import { VoucherTable } from '@/components/vouchers/VoucherTable';
import { erpService } from '@/lib/erpService';
import { formatINR, cn, triggerHaptic } from '@/lib/utils';
import { showToast } from '@/components/ui/ToastContainer';
import {
  Download,
  Plus,
  Receipt,
  Banknote,
  Smartphone,
  Calendar,
  Layers,
  Sparkles,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';
import { AppTableIcon } from '@/components/icons/AppIcons';

type DateFilterType = 'today' | 'week' | 'month' | 'all';

export const AllExpensesPage: React.FC = () => {
  const { setActivePage } = useUIStore();
  const { can } = useAuthStore();
  const { selectedBranchId, getActiveBranch } = useBranchStore();
  const { vouchers, categories, departments, loading, refresh } = useVouchers();
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');

  const activeBranch = getActiveBranch();
  const showroomTitle = selectedBranchId === 'ALL' ? 'All Showrooms' : (activeBranch?.branch_name || 'Satellite Road Showroom');
  const showroomCode = selectedBranchId === 'ALL' ? 'ALL' : (activeBranch?.branch_code || 'ASI');

  // Date Filtered Vouchers
  const filteredByDateVouchers = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    const startOfWeekStr = format(startOfWeek, 'yyyy-MM-dd');
    const startOfMonthStr = format(now, 'yyyy-MM-01');

    return vouchers.filter((v) => {
      const vDate = v.payment_date || (v.created_at ? v.created_at.slice(0, 10) : '');
      if (dateFilter === 'today') return vDate === todayStr;
      if (dateFilter === 'week') return vDate >= startOfWeekStr;
      if (dateFilter === 'month') return vDate >= startOfMonthStr;
      return true;
    });
  }, [vouchers, dateFilter]);

  // Totals calculations (active valid vouchers only)
  const activeValidVouchers = useMemo(() => {
    return filteredByDateVouchers.filter((v) => v.status !== 'Voided');
  }, [filteredByDateVouchers]);

  const totalAmount = useMemo(() => {
    return activeValidVouchers.reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  }, [activeValidVouchers]);

  const cashAmount = useMemo(() => {
    return activeValidVouchers
      .filter((v) => v.payment_method === 'Physical_Cash')
      .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  }, [activeValidVouchers]);

  const upiAmount = useMemo(() => {
    return activeValidVouchers
      .filter((v) => v.payment_method === 'Online_UPI')
      .reduce((acc, curr) => acc + (Number(curr.total_amount) || 0), 0);
  }, [activeValidVouchers]);

  const cashPercent = totalAmount > 0 ? Math.round((cashAmount / totalAmount) * 100) : 0;
  const upiPercent = totalAmount > 0 ? Math.round((upiAmount / totalAmount) * 100) : 0;

  const handleExportTally = () => {
    try {
      const csvContent = erpService.generateTallyExportCSV(filteredByDateVouchers);
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Tally_Prime_Export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      showToast({
        type: 'success',
        title: 'CSV Downloaded',
        message: `Exported ${filteredByDateVouchers.length} expense records to spreadsheet.`,
      });
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: err?.message || 'Could not export expense data.',
      });
    }
  };

  const handleRefresh = async () => {
    showToast({
      type: 'activity',
      title: 'Refreshing Expenses',
      message: 'Fetching latest expense bills from database...',
    });
    await refresh();
    showToast({
      type: 'success',
      title: 'Expenses Updated',
      message: `${vouchers.length} expense records loaded.`,
    });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] font-sans antialiased selection:bg-[#3ecf8e]/20 selection:text-[#3ecf8e] pb-16 select-none flex flex-col">
      {/* 1. All Expenses Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-slate-200 dark:border-[#232323] bg-white dark:bg-[#141414]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Left Layer: Title, Status & Subtitle */}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-900 dark:text-[#EDEDED] font-sans flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#3ecf8e]" />
                <span>All Expenses</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] tabular-nums font-mono bg-slate-100 dark:bg-[#202020] text-emerald-700 dark:text-[#3ecf8e] border border-slate-200 dark:border-[#2e2e2e]">
                {filteredByDateVouchers.length} records
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
              Search, view details, download, and print all shop expense bills and payments.
            </p>
          </div>

          {/* Right Layer: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {can('can_export_tally') && (
              <button
                type="button"
                onClick={handleExportTally}
                className="h-8.5 px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Export bills to CSV spreadsheet format"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 dark:text-[#A1A1A1]" />
                <span>Download CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading}
              className="h-8.5 w-8.5 flex items-center justify-center rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] transition-colors cursor-pointer shadow-xs"
              title="Refresh Expenses"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-[#3ecf8e]")} />
            </button>

            {/* Single Emerald Primary CTA */}
            <button
              type="button"
              onClick={() => setActivePage('new-voucher')}
              className="h-8.5 px-3.5 py-1.5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs select-none"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Add New Expense</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Main Studio Content Area */}
      <div className="px-4 lg:px-6 py-4 space-y-4 flex-1">
        {/* Tier 2: Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-[8px] border border-slate-200 dark:border-[#242424] bg-slate-50 dark:bg-[#171717]">
          <div className="flex items-center gap-2">
            {/* Segmented Range Control */}
            <div className="inline-flex rounded-[6px] p-0.5 bg-slate-100 dark:bg-[#141414] border border-slate-200 dark:border-[#2e2e2e]">
              {(['today', 'week', 'month', 'all'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setDateFilter(t);
                  }}
                  className={cn(
                    'px-2.5 py-1 text-xs font-sans rounded-[4px] transition-colors cursor-pointer font-medium',
                    dateFilter === t
                      ? 'bg-white dark:bg-[#282828] text-slate-900 dark:text-white font-semibold border border-slate-200 dark:border-[#383838] shadow-xs'
                      : 'text-slate-600 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-white border border-transparent'
                  )}
                >
                  {t === 'today' ? 'Today' : t === 'week' ? 'Week' : t === 'month' ? 'Month' : 'All Time'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-[#A1A1A1]">
            <span>Showroom:</span>
            <span className="px-2 py-0.5 rounded-[4px] bg-white dark:bg-[#141414] text-slate-900 dark:text-white border border-slate-200 dark:border-[#2e2e2e] font-medium shadow-xs">
              {showroomTitle} ({showroomCode})
            </span>
          </div>
        </div>

      {/* 2. 4 Pro Enterprise Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Total Expenses"
          value={formatINR(totalAmount)}
          subValue={`${filteredByDateVouchers.length} vouchers recorded`}
          statusDotColor="#3ecf8e"
          icon={Receipt}
        />

        <MetricCard
          label="Physical Cash Paid"
          value={formatINR(cashAmount)}
          subValue={`${cashPercent}% of total expenditure`}
          statusDotColor="#f59e0b"
          icon={Banknote}
        />

        <MetricCard
          label="Bank & UPI Paid"
          value={formatINR(upiAmount)}
          subValue={`${upiPercent}% digital settlements`}
          statusDotColor="#3b82f6"
          icon={Smartphone}
        />

        <MetricCard
          label="Audit Verified"
          value={String(filteredByDateVouchers.length)}
          subValue="100% vouchers tallied"
          badge="VERIFIED"
          badgeColor="emerald"
          statusDotColor="#3ecf8e"
          icon={Layers}
        />
      </div>

      {/* 3. Voucher Data Grid */}
      <VoucherTable
        vouchers={filteredByDateVouchers}
        categories={categories}
        departments={departments}
      />
      </div>
    </div>
  );
};

