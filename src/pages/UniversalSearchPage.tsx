import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useUIStore } from '@/store/uiStore';
import { useBranchStore } from '@/store/branchStore';
import { searchEngine, SearchResultItem, SearchCategory, SearchFilterOptions, SearchQueryResult } from '@/lib/searchEngine';
import { formatINR, formatDate, cn, triggerHaptic } from '@/lib/utils';
import { showToast } from '@/components/ui/ToastContainer';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import {
  Search,
  Receipt,
  HandCoins,
  Users,
  Sliders,
  Filter,
  ArrowRight,
  ExternalLink,
  Printer,
  Copy,
  Check,
  Calendar,
  Layers,
  Sparkles,
  RefreshCw,
  Download,
  X,
  Tag,
  Building2,
  Wallet,
  Coins,
  CornerDownLeft,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Info,
  FileSpreadsheet,
} from 'lucide-react';
import { MetricCard } from '@/components/ui/MetricCard';

type DateFilterChip = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'last30';
type AmountFilterChip = 'all' | 'under1k' | '1k-5k' | '5k-25k' | 'over25k';
type SortOption = 'relevance' | 'newest' | 'oldest' | 'amount_desc' | 'amount_asc';

export const UniversalSearchPage: React.FC = () => {
  const { setActivePage, openDrawer, setSettleTargetAdvance, openLightbox } = useUIStore();
  const { branches, selectedBranchId, setSelectedBranchId, getActiveBranch } = useBranchStore();

  // Search Query & Filters State
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<SearchCategory>('all');
  const [branchFilter, setBranchFilter] = useState<string>(selectedBranchId || 'ALL');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterChip>('all');
  const [amountFilter, setAmountFilter] = useState<AmountFilterChip>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('relevance');

  // Query Result State
  const [searchData, setSearchData] = useState<SearchQueryResult>({
    results: [],
    categoryCounts: {
      all: 0,
      vouchers: 0,
      advances: 0,
      treasury: 0,
      closings: 0,
      staff: 0,
      master: 0,
      actions: 0,
    },
    total: 0,
    totalFinancialVolume: 0,
    vouchersFinancialVolume: 0,
    advancesFinancialVolume: 0,
    vouchersCount: 0,
    advancesCount: 0,
    staffCount: 0,
    masterCount: 0,
    executionTimeMs: 0,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);
  const activeCardRef = useRef<HTMLDivElement | null>(null);

  // Read initial query from URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const qParam = params.get('q');
    const catParam = params.get('category') as SearchCategory;
    const branchParam = params.get('branch');

    if (qParam) setQuery(qParam);
    if (catParam) setCategory(catParam);
    if (branchParam) setBranchFilter(branchParam);
  }, []);

  // Sync URL with current query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('page', 'search');
    if (query) {
      params.set('q', query);
    } else {
      params.delete('q');
    }
    if (category !== 'all') {
      params.set('category', category);
    } else {
      params.delete('category');
    }
    if (branchFilter !== 'ALL') {
      params.set('branch', branchFilter);
    } else {
      params.delete('branch');
    }
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [query, category, branchFilter]);

  // Derive Date Range
  const dateRange = useMemo(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (dateFilter === 'today') {
      const todayStr = toYMD(now);
      return { from: todayStr, to: todayStr };
    }
    if (dateFilter === 'yesterday') {
      const y = new Date(now);
      y.setDate(now.getDate() - 1);
      const yStr = toYMD(y);
      return { from: yStr, to: yStr };
    }
    if (dateFilter === 'week') {
      const s = new Date(now);
      s.setDate(now.getDate() - now.getDay());
      return { from: toYMD(s), to: toYMD(now) };
    }
    if (dateFilter === 'month') {
      const mStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;
      return { from: mStr, to: toYMD(now) };
    }
    if (dateFilter === 'last30') {
      const s = new Date(now);
      s.setDate(now.getDate() - 30);
      return { from: toYMD(s), to: toYMD(now) };
    }
    return { from: undefined, to: undefined };
  }, [dateFilter]);

  // Derive Amount Range
  const amountRange = useMemo(() => {
    if (amountFilter === 'under1k') return { min: 0, max: 1000 };
    if (amountFilter === '1k-5k') return { min: 1000, max: 5000 };
    if (amountFilter === '5k-25k') return { min: 5000, max: 25000 };
    if (amountFilter === 'over25k') return { min: 25000, max: undefined };
    return { min: undefined, max: undefined };
  }, [amountFilter]);

  // Execute Search Engine
  const performSearch = useCallback(async () => {
    setIsLoading(true);
    try {
      const options: SearchFilterOptions = {
        category,
        branchId: branchFilter === 'ALL' ? undefined : branchFilter,
        status: statusFilter === 'all' ? undefined : statusFilter,
        minAmount: amountRange.min,
        maxAmount: amountRange.max,
        paymentMethod: paymentMethodFilter === 'ALL' ? undefined : paymentMethodFilter,
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        sortBy,
      };

      const result = await searchEngine.search(query, options);
      setSearchData(result);
      setSelectedIndex(0);
    } catch (err) {
      console.error('Search error on UniversalSearchPage:', err);
      showToast({
        type: 'error',
        title: 'Search Query Failed',
        message: 'Could not load search index. Please refresh.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    query,
    category,
    branchFilter,
    statusFilter,
    amountRange,
    paymentMethodFilter,
    dateRange,
    sortBy,
  ]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Global Keyboard Shortcuts for Universal Search Hub
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Focus search bar on '/' or 'Ctrl+F'
      if (
        (e.key === '/' && document.activeElement !== searchInputRef.current) ||
        (e.ctrlKey && e.key.toLowerCase() === 'f')
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }

      // If user is inside an input, don't hijack arrow keys
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((document.activeElement as HTMLElement)?.tagName)) {
        if (e.key === 'Escape') {
          searchInputRef.current?.blur();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (searchData.results.length > 0) {
          setSelectedIndex((prev) => (prev + 1) % searchData.results.length);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (searchData.results.length > 0) {
          setSelectedIndex((prev) => (prev - 1 + searchData.results.length) % searchData.results.length);
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const selected = searchData.results[selectedIndex];
        if (selected) {
          handleDirectOpen(selected);
        }
      } else if (e.key.toLowerCase() === 'p') {
        e.preventDefault();
        const selected = searchData.results[selectedIndex];
        if (selected && selected.actionType === 'open_voucher' && selected.rawItem) {
          handlePrintSlip(selected);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchData.results, selectedIndex]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (activeCardRef.current) {
      activeCardRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Direct Action Handlers
  const handleDirectOpen = (item: SearchResultItem) => {
    triggerHaptic('selection');
    if (item.actionType === 'open_voucher' && item.rawItem) {
      openDrawer(item.rawItem);
      showToast({
        type: 'info',
        title: 'Opening Voucher Detail',
        message: `Voucher #${item.rawItem.voucher_number}`,
      });
    } else if (item.actionType === 'open_advance' && item.rawItem) {
      setSettleTargetAdvance(item.rawItem);
      showToast({
        type: 'info',
        title: 'Opening Advance Settlement',
        message: `Advance #${item.rawItem.receipt_number} for ${item.rawItem.staff_name}`,
      });
    } else if (item.actionType === 'navigate' && item.actionPayload) {
      setActivePage(item.actionPayload.page);
    } else {
      setActivePage('dashboard');
    }
  };

  const handlePrintSlip = (item: SearchResultItem) => {
    triggerHaptic('selection');
    if (item.rawItem?.voucher_number) {
      showToast({
        type: 'info',
        title: 'Thermal Slip',
        message: `Preparing thermal print for Voucher #${item.rawItem.voucher_number}`,
      });
      window.print();
    } else if (item.rawItem?.receipt_number) {
      showToast({
        type: 'info',
        title: 'Advance Receipt Slip',
        message: `Printing Advance #${item.rawItem.receipt_number}`,
      });
      window.print();
    }
  };

  const handleCopyId = (idText: string) => {
    triggerHaptic('selection');
    navigator.clipboard.writeText(idText);
    setCopiedId(idText);
    showToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: `${idText} copied`,
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    triggerHaptic('selection');
    if (searchData.results.length === 0) {
      showToast({
        type: 'warning',
        title: 'No Data to Export',
        message: 'Refine your query to produce matching records.',
      });
      return;
    }

    const headers = ['Type', 'Identifier', 'Title', 'Amount', 'Date', 'Branch', 'Status', 'Subtitle'];
    const rows = searchData.results.map((r) => [
      `"${r.categoryLabel}"`,
      `"${r.rawItem?.voucher_number || r.rawItem?.receipt_number || r.id}"`,
      `"${r.title.replace(/"/g, '""')}"`,
      r.amount || 0,
      `"${r.date || ''}"`,
      `"${r.branchCode || ''}"`,
      `"${r.badge?.text || ''}"`,
      `"${r.subtitle.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Asopalav_Search_Results_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast({
      type: 'success',
      title: 'CSV Export Complete',
      message: `Exported ${searchData.results.length} search records`,
    });
  };

  const handleResetFilters = () => {
    triggerHaptic('selection');
    setQuery('');
    setCategory('all');
    setBranchFilter('ALL');
    setStatusFilter('all');
    setDateFilter('all');
    setAmountFilter('all');
    setPaymentMethodFilter('ALL');
    setSortBy('relevance');
    searchInputRef.current?.focus();
  };

  const insertSyntax = (syntaxText: string) => {
    triggerHaptic('selection');
    setQuery((prev) => `${prev.trim()} ${syntaxText}`.trim());
    setShowSyntaxHelp(false);
    searchInputRef.current?.focus();
  };

  const selectedItem = searchData.results[selectedIndex] || null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] font-sans antialiased selection:bg-[#3ecf8e]/20 selection:text-[#3ecf8e] pb-16 select-none flex flex-col">
      {/* 1. Universal Search Header (2-Layer Layout: Left Title & Subtitle, Right Actions) */}
      <div className="border-b border-slate-200 dark:border-[#232323] bg-white dark:bg-[#141414] px-4 lg:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 max-w-[1600px] mx-auto w-full">
          {/* Left Layer: Title, Status Badges & Subtitle */}
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-900 dark:text-[#EDEDED] font-sans flex items-center gap-2">
                <Search className="w-5 h-5 text-[#3ecf8e]" />
                <span>Search Everything</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] tabular-nums font-mono bg-slate-100 dark:bg-[#202020] text-emerald-700 dark:text-[#3ecf8e] border border-slate-200 dark:border-[#2e2e2e]">
                Live Index
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
              Search across all expense bills, staff advances, cash box, staff members, and shop settings.
            </p>
          </div>

          {/* Right Layer: Action Tools */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportCSV}
              className="h-8.5 px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8.5 px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Workspace Canvas */}
      <div className="max-w-[1600px] w-full mx-auto px-4 lg:px-6 py-6 space-y-6 flex-1 flex flex-col">
        {/* 2. Omnibar Search Control & Syntax Helper */}
        <div className="relative space-y-2">
          <div className="relative flex items-center">
            <Search className="absolute left-4 w-5 h-5 text-slate-400 dark:text-zinc-500 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by bill number, person name, staff, amount, or shop branch..."
              className="w-full pl-12 pr-28 py-3.5 bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#282828] rounded-[10px] text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] shadow-sm font-sans transition-all"
            />
            <div className="absolute right-3 flex items-center gap-1.5">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    searchInputRef.current?.focus();
                  }}
                  className="p-1 rounded-[4px] hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-400 dark:text-zinc-400 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowSyntaxHelp(!showSyntaxHelp)}
                className={cn(
                  'px-2 py-1 rounded-[5px] text-[11px] font-mono border transition-all cursor-pointer flex items-center gap-1',
                  showSyntaxHelp
                    ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30'
                    : 'bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-[#2a2a2a] hover:border-slate-300'
                )}
              >
                <Info className="w-3 h-3" />
                <span>Filters</span>
              </button>
            </div>
          </div>

          {/* Syntax Help Popover Drawer */}
          {showSyntaxHelp && (
            <div className="p-3 bg-slate-50 dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#282828] rounded-[8px] text-xs font-sans space-y-2 animate-in fade-in slide-in-from-top-2 duration-150 shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#3ecf8e]" />
                  Advanced Filter Syntax Quick-Insert
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">Click any chip to append to search</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {[
                  { label: 'Showroom: ASI', text: 'branch:ASI' },
                  { label: 'Showroom: SAT', text: 'branch:SAT' },
                  { label: 'Showroom: SUR', text: 'branch:SUR' },
                  { label: 'Amount > ₹5,000', text: 'amt:>5000' },
                  { label: 'Amount < ₹1,000', text: 'amt:<1000' },
                  { label: 'Status: Active', text: 'status:active' },
                  { label: 'Status: Settled', text: 'status:settled' },
                  { label: 'Payment: Cash', text: 'mode:cash' },
                  { label: 'Payment: UPI', text: 'mode:upi' },
                ].map((chip) => (
                  <button
                    key={chip.text}
                    type="button"
                    onClick={() => insertSyntax(chip.text)}
                    className="px-2 py-1 bg-white dark:bg-[#222222] hover:bg-slate-100 dark:hover:bg-[#2a2a2a] border border-slate-200 dark:border-[#333333] rounded-[5px] text-[11px] font-mono text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
                  >
                    + {chip.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 3. 2x3 Diagnostic Matrix / Metric Fragments */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <MetricCard
            label="Total Matches"
            value={searchData.total.toLocaleString()}
            subValue={`Executed in ${searchData.executionTimeMs}ms`}
            icon={Search}
          />
          <MetricCard
            label="Financial Volume"
            value={formatINR(searchData.totalFinancialVolume)}
            subValue="Combined Vouchers & Advances"
            icon={Wallet}
          />
          <MetricCard
            label="Expense Vouchers"
            value={searchData.vouchersCount.toString()}
            subValue={formatINR(searchData.vouchersFinancialVolume)}
            icon={Receipt}
          />
          <MetricCard
            label="Staff Advances"
            value={searchData.advancesCount.toString()}
            subValue={formatINR(searchData.advancesFinancialVolume)}
            icon={HandCoins}
          />
        </div>

        {/* 4. Multi-Faceted Filter Bar (Category Chips, Branch, Dates, Amounts, Sorting) */}
        <div className="bg-slate-50/70 dark:bg-[#171717] border border-slate-200 dark:border-[#242424] rounded-[10px] p-3 space-y-3">
          {/* Top Row: Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {[
              { id: 'all' as SearchCategory, label: 'All Records', count: searchData.categoryCounts.all, icon: Sparkles },
              { id: 'vouchers' as SearchCategory, label: 'Expense Vouchers', count: searchData.categoryCounts.vouchers, icon: Receipt },
              { id: 'advances' as SearchCategory, label: 'Staff Advances & IOUs', count: searchData.categoryCounts.advances, icon: HandCoins },
              { id: 'staff' as SearchCategory, label: 'Staff & Cashiers', count: searchData.categoryCounts.staff, icon: Users },
              { id: 'master' as SearchCategory, label: 'Master Data', count: searchData.categoryCounts.master, icon: Sliders },
              { id: 'actions' as SearchCategory, label: 'Actions', count: searchData.categoryCounts.actions, icon: SlidersHorizontal },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = category === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setCategory(tab.id);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-[6px] text-xs font-sans transition-all cursor-pointer whitespace-nowrap border',
                    isSelected
                      ? 'bg-[#3ecf8e] text-[#171717] font-medium border-[#3ecf8e] shadow-2xs'
                      : 'bg-white dark:bg-[#1a1a1a] text-slate-600 dark:text-zinc-400 border-slate-200 dark:border-[#2a2a2a] hover:border-slate-300 dark:hover:border-[#383838]'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isSelected ? 'text-[#171717]' : 'text-slate-400 dark:text-zinc-400')} />
                  <span>{tab.label}</span>
                  <span
                    className={cn(
                      'px-1.5 py-0.2 rounded-[4px] text-[10px] font-mono font-medium',
                      isSelected ? 'bg-black/20 text-[#171717]' : 'bg-slate-100 dark:bg-[#252525] text-slate-500 dark:text-zinc-400'
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Row: Granular Filters */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/80 dark:border-[#222222] text-xs">
            {/* Branch Filter */}
            <div className="w-48">
              <SearchableSelect
                size="sm"
                options={[
                  { value: 'ALL', label: 'All Showrooms' },
                  ...branches.map((b) => ({
                    value: b.branch_id,
                    label: b.branch_name,
                    badge: b.branch_code,
                  })),
                ]}
                value={branchFilter}
                onChange={setBranchFilter}
                placeholder="All Showrooms"
                searchPlaceholder="Search branch..."
                allowCustom={false}
              />
            </div>

            {/* Date Range Chips */}
            <div className="w-36">
              <SearchableSelect
                size="sm"
                options={[
                  { value: 'all', label: 'All Dates' },
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'week', label: 'This Week' },
                  { value: 'month', label: 'This Month' },
                  { value: 'last30', label: 'Last 30 Days' },
                ]}
                value={dateFilter}
                onChange={(val) => setDateFilter(val as DateFilterChip)}
                placeholder="Date range"
                searchPlaceholder="Search dates..."
                allowCustom={false}
              />
            </div>

            {/* Amount Range Filter */}
            <div className="w-40">
              <SearchableSelect
                size="sm"
                options={[
                  { value: 'all', label: 'Any Amount' },
                  { value: 'under1k', label: '< ₹1,000' },
                  { value: '1k-5k', label: '₹1,000 - ₹5,000' },
                  { value: '5k-25k', label: '₹5,000 - ₹25,000' },
                  { value: 'over25k', label: '> ₹25,000' },
                ]}
                value={amountFilter}
                onChange={(val) => setAmountFilter(val as AmountFilterChip)}
                placeholder="Amount range"
                searchPlaceholder="Search amounts..."
                allowCustom={false}
              />
            </div>

            {/* Sort Filter */}
            <div className="w-40 ml-auto">
              <SearchableSelect
                size="sm"
                options={[
                  { value: 'relevance', label: 'Best Match' },
                  { value: 'newest', label: 'Newest Date' },
                  { value: 'oldest', label: 'Oldest Date' },
                  { value: 'amount_desc', label: 'Highest Amount' },
                  { value: 'amount_asc', label: 'Lowest Amount' },
                ]}
                value={sortBy}
                onChange={(val) => setSortBy(val as SortOption)}
                placeholder="Sort by"
                searchPlaceholder="Search sort..."
                allowCustom={false}
              />
            </div>
          </div>
        </div>

        {/* 5. Master-Detail Interactive Search Results & Context Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start flex-1">
          {/* LEFT: Search Results List (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-2">
            <div className="flex items-center justify-between px-1 text-xs text-slate-500 dark:text-zinc-400 font-sans">
              <span>Showing {searchData.results.length} results</span>
              <span className="hidden sm:inline">Use ↑ ↓ to navigate · Enter to open</span>
            </div>

            <div ref={resultsContainerRef} className="space-y-2">
              {searchData.results.map((item, idx) => {
                const isSelected = selectedIndex === idx;
                const isVoucher = item.category === 'vouchers';
                const isAdvance = item.category === 'advances';
                const isStaff = item.category === 'staff';

                return (
                  <div
                    key={item.id}
                    ref={isSelected ? activeCardRef : undefined}
                    onClick={() => setSelectedIndex(idx)}
                    onDoubleClick={() => handleDirectOpen(item)}
                    className={cn(
                      'p-3.5 rounded-[10px] border transition-all cursor-pointer relative group flex flex-col sm:flex-row sm:items-center justify-between gap-3',
                      isSelected
                        ? 'bg-slate-50 dark:bg-[#1f1f1f] border-emerald-500/50 dark:border-[#3ecf8e]/50 shadow-sm'
                        : 'bg-white dark:bg-[#171717] border-slate-200 dark:border-[#262626] hover:border-slate-300 dark:hover:border-[#333333]'
                    )}
                  >
                    {/* Left: Metadata & Titles */}
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Category Icon & Label */}
                        <span className="flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-zinc-300">
                          {isVoucher && <Receipt className="w-3.5 h-3.5 text-[#3ecf8e]" />}
                          {isAdvance && <HandCoins className="w-3.5 h-3.5 text-amber-500" />}
                          {isStaff && <Users className="w-3.5 h-3.5 text-blue-400" />}
                          {!isVoucher && !isAdvance && !isStaff && <Sliders className="w-3.5 h-3.5 text-slate-400" />}
                          <span>{item.categoryLabel}</span>
                        </span>

                        {/* Branch Code */}
                        {item.branchCode && (
                          <span className="px-1.5 py-0.2 rounded-[3px] bg-slate-100 dark:bg-[#141414] text-[10px] font-mono text-slate-600 dark:text-zinc-400 border border-slate-200 dark:border-[#222222]">
                            {item.branchCode}
                          </span>
                        )}

                        {/* Status Badge */}
                        <span
                          className={cn(
                            'px-1.5 py-0.2 rounded-[3px] text-[10px] font-mono font-medium',
                            item.badge.variant === 'emerald' && 'badge-status-emerald',
                            item.badge.variant === 'amber' && 'badge-status-amber',
                            item.badge.variant === 'rose' && 'badge-status-rose',
                            item.badge.variant === 'blue' && 'badge-status-blue',
                            item.badge.variant === 'neutral' && 'badge-status-neutral'
                          )}
                        >
                          {item.badge.text}
                        </span>

                        {item.date && (
                          <span className="text-[11px] text-slate-400 dark:text-zinc-500 font-mono">
                            {item.date}
                          </span>
                        )}
                      </div>

                      {/* Main Title */}
                      <h4 className="text-sm font-medium text-slate-900 dark:text-white truncate font-sans">
                        {item.title}
                      </h4>

                      {/* Subtitle Description */}
                      <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-1 font-sans">
                        {item.subtitle}
                      </p>
                    </div>

                    {/* Right: Amount & Direct Action Triggers */}
                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-[#222222]">
                      {item.amount !== undefined && item.amount > 0 && (
                        <span className="font-mono text-sm font-medium text-emerald-600 dark:text-[#3ecf8e] tabular-nums">
                          {formatINR(item.amount)}
                        </span>
                      )}

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDirectOpen(item);
                          }}
                          className="px-2 py-1 rounded-[5px] text-[11px] font-sans font-medium bg-[#3ecf8e] text-[#171717] hover:bg-[#34b27b] transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
                        >
                          <span>Open</span>
                          <CornerDownLeft className="w-2.5 h-2.5" />
                        </button>

                        {(isVoucher || isAdvance) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePrintSlip(item);
                            }}
                            title="Print Thermal Slip"
                            className="p-1 rounded-[5px] text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#282828] transition-all cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {searchData.results.length === 0 && !isLoading && (
                <div className="py-16 text-center text-slate-400 dark:text-zinc-500 font-sans space-y-3 bg-white dark:bg-[#171717] rounded-[10px] border border-slate-200 dark:border-[#242424] p-6">
                  <Search className="w-8 h-8 mx-auto text-slate-300 dark:text-zinc-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                      No matching records found for "{query}"
                    </p>
                    <p className="text-xs text-slate-400 dark:text-zinc-500 max-w-md mx-auto">
                      Try searching with voucher serial (e.g. ASI-6590), payee name, staff code (ASI-001), or clear filters.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 rounded-[6px] text-xs font-sans font-medium text-emerald-600 dark:text-[#3ecf8e] bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Clear All Filters</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Live Context Inspector Panel (5 cols on lg) */}
          <div className="lg:col-span-5 sticky top-20">
            {selectedItem ? (
              <div className="bg-white dark:bg-[#171717] border border-slate-200 dark:border-[#262626] rounded-[12px] p-5 space-y-5 shadow-sm">
                {/* Inspector Header */}
                <div className="flex items-start justify-between gap-3 border-b border-slate-100 dark:border-[#242424] pb-4">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] text-[10px] font-mono font-medium text-[#3ecf8e] border border-slate-200 dark:border-[#2a2a2a]">
                        {selectedItem.categoryLabel}
                      </span>
                      {selectedItem.branchCode && (
                        <span className="px-1.5 py-0.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] text-[10px] font-mono text-slate-600 dark:text-zinc-400">
                          Branch: {selectedItem.branchCode}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-medium text-slate-900 dark:text-white truncate font-sans">
                      {selectedItem.title}
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyId(selectedItem.rawItem?.voucher_number || selectedItem.rawItem?.receipt_number || selectedItem.id)}
                    title="Copy Reference ID"
                    className="p-1.5 rounded-[6px] text-slate-400 hover:text-slate-800 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-[#252525] border border-slate-200 dark:border-[#2e2e2e] transition-all cursor-pointer shrink-0"
                  >
                    {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Amount Banner */}
                {selectedItem.amount !== undefined && selectedItem.amount > 0 && (
                  <div className="p-3.5 rounded-[8px] bg-emerald-500/5 dark:bg-[#3ecf8e]/5 border border-emerald-500/20 dark:border-[#3ecf8e]/20 flex items-center justify-between">
                    <span className="text-xs text-slate-600 dark:text-zinc-400 font-sans">Total Transaction Value</span>
                    <span className="text-lg font-mono font-medium text-emerald-600 dark:text-[#3ecf8e] tabular-nums">
                      {formatINR(selectedItem.amount)}
                    </span>
                  </div>
                )}

                {/* Metadata Details Grid */}
                <div className="space-y-2.5 text-xs font-sans">
                  <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#222222]">
                    <span className="text-slate-400 dark:text-zinc-500">Status</span>
                    <span className="font-mono font-medium text-slate-800 dark:text-zinc-200">
                      {selectedItem.badge.text}
                    </span>
                  </div>

                  {selectedItem.date && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#222222]">
                      <span className="text-slate-400 dark:text-zinc-500">Date</span>
                      <span className="font-mono text-slate-800 dark:text-zinc-200">
                        {selectedItem.date}
                      </span>
                    </div>
                  )}

                  {selectedItem.metadata?.category && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#222222]">
                      <span className="text-slate-400 dark:text-zinc-500">Expense Category</span>
                      <span className="text-slate-800 dark:text-zinc-200 font-medium">
                        {selectedItem.metadata.category}
                      </span>
                    </div>
                  )}

                  {selectedItem.metadata?.department && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#222222]">
                      <span className="text-slate-400 dark:text-zinc-500">Department</span>
                      <span className="text-slate-800 dark:text-zinc-200">
                        {selectedItem.metadata.department}
                      </span>
                    </div>
                  )}

                  {selectedItem.metadata?.payment_method && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#222222]">
                      <span className="text-slate-400 dark:text-zinc-500">Payment Mode</span>
                      <span className="text-slate-800 dark:text-zinc-200">
                        {selectedItem.metadata.payment_method === 'Physical_Cash' ? 'Cash Till Float' : 'Online Bank'}
                      </span>
                    </div>
                  )}

                  {selectedItem.metadata?.created_by && (
                    <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-[#222222]">
                      <span className="text-slate-400 dark:text-zinc-500">Recorded By</span>
                      <span className="text-slate-800 dark:text-zinc-200">
                        {selectedItem.metadata.created_by}
                      </span>
                    </div>
                  )}

                  {selectedItem.metadata?.purpose && (
                    <div className="py-1.5 border-b border-slate-100 dark:border-[#222222] space-y-1">
                      <span className="text-slate-400 dark:text-zinc-500 block">Advance Purpose</span>
                      <p className="text-slate-800 dark:text-zinc-200">{selectedItem.metadata.purpose}</p>
                    </div>
                  )}

                  {selectedItem.metadata?.remarks && (
                    <div className="py-1.5 border-b border-slate-100 dark:border-[#222222] space-y-1">
                      <span className="text-slate-400 dark:text-zinc-500 block">Notes & Purpose</span>
                      <p className="text-slate-800 dark:text-zinc-200 italic">{selectedItem.metadata.remarks}</p>
                    </div>
                  )}

                  {/* Attached Bill Receipt Thumbnail */}
                  {selectedItem.rawItem?.bill_image_url && (
                    <div className="py-2 space-y-1.5">
                      <span className="text-slate-400 dark:text-zinc-500 block">Attached Bill Invoice</span>
                      <div
                        onClick={() => openLightbox(selectedItem.rawItem.bill_image_url)}
                        className="relative w-full h-32 rounded-[8px] overflow-hidden border border-slate-200 dark:border-[#2a2a2a] cursor-pointer group"
                      >
                        <img
                          src={selectedItem.rawItem.bill_image_url}
                          alt="Bill preview"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[11px] font-sans font-medium text-white px-2 py-1 rounded-[4px] bg-black/60">
                            Click to Enlarge
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Direct Action Drawer Triggers */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleDirectOpen(selectedItem)}
                    className="w-full py-2.5 px-4 rounded-[6px] bg-[#3ecf8e] text-[#171717] hover:bg-[#34b27b] text-xs font-sans font-medium transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  >
                    <span>Open Full Record in Drawer</span>
                    <CornerDownLeft className="w-3.5 h-3.5" />
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePrintSlip(selectedItem)}
                      className="flex-1 py-2 px-3 rounded-[6px] border border-slate-300 dark:border-[#2e2e2e] hover:bg-slate-100 dark:hover:bg-[#222222] text-xs font-sans font-medium text-slate-800 dark:text-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Print Slip (P)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleCopyId(selectedItem.rawItem?.voucher_number || selectedItem.rawItem?.receipt_number || selectedItem.id)}
                      className="flex-1 py-2 px-3 rounded-[6px] border border-slate-300 dark:border-[#2e2e2e] hover:bg-slate-100 dark:hover:bg-[#222222] text-xs font-sans font-medium text-slate-800 dark:text-zinc-200 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy ID</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-[#171717] border border-dashed border-slate-200 dark:border-[#282828] rounded-[12px] p-8 text-center text-xs text-slate-400 dark:text-zinc-500 font-sans space-y-2">
                <Search className="w-6 h-6 mx-auto text-slate-300 dark:text-zinc-600" />
                <p className="font-medium">No Item Selected</p>
                <p>Click on any search match in the list to inspect full live metadata and take actions.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
