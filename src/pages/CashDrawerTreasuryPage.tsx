import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { format as formatDateFns } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { useUIStore } from '@/store/uiStore';
import { erpService } from '@/lib/erpService';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
import { formatINR, numberToWordsINR, formatDate, cn, triggerHaptic } from '@/lib/utils';
import { useOverrideStore } from '@/store/overrideStore';
import { SafeDropDrawer } from '@/components/treasury/SafeDropDrawer';
import {
  Wallet,
  Coins,
  CheckCircle2,
  AlertCircle,
  Building2,
  Lock,
  History,
  Check,
  Plus,
  Minus,
  RotateCcw,
  ShieldCheck,
  AlertTriangle,
  Search,
  Download,
  FileSpreadsheet,
  Code,
  Copy,
  Terminal,
  MoreVertical,
  ChevronDown,
  X,
  SlidersHorizontal,
  Calendar,
  Clock,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Layers,
  LayoutList,
  Banknote,
  QrCode,
  User,
  Sparkles,
  FileText,
  Tag,
  Shield,
  RefreshCw,
} from 'lucide-react';
import { useGsapContext } from '@/hooks/useGsap';
import { animateStaggerCards } from '@/lib/animations';

type DateFilter = 'today' | 'yesterday' | 'week' | 'all' | 'custom';
type ScopeFilter = 'Float_Topup' | 'ALL';

interface DenomCount {
  [key: number]: number;
}

function parseLedgerNotes(remarks?: string) {
  if (!remarks) return { title: 'Cash Added to Drawer', chips: [], modeDetails: null };

  let title = remarks;
  const chips: string[] = [];
  let modeDetails: string | null = null;

  // Extract [Transfer Mode: ...]
  const modeMatch = remarks.match(/\[Transfer Mode:\s*([^\]]+)\]/i);
  if (modeMatch) {
    modeDetails = modeMatch[1].trim();
    title = title.replace(modeMatch[0], '').trim();
  }

  // Extract [Notes: ₹500×3, ...] or [₹100 x 15 = ₹1500 | ...]
  const notesMatch = remarks.match(/\[(?:Notes:\s*)?([^\]]+)\]/i);
  if (notesMatch) {
    const rawBreakdown = notesMatch[1];
    const parts = rawBreakdown.split(/[|,]/).map((p) => p.trim()).filter(Boolean);
    parts.forEach((p) => {
      chips.push(p);
    });
    title = title.replace(notesMatch[0], '').trim();
  }

  if (!title) {
    title = 'Morning Opening Till Float';
  }

  return { title, chips, modeDetails };
}

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const CashDrawerTreasuryPage: React.FC = () => {
  const { user } = useAuthStore();
  const isDeveloper = user?.role_code === 'Developer' || user?.role_code === 'Super_Admin';
  const { branches, selectedBranchId, getActiveBranch } = useBranchStore();
  const { setActivePage } = useUIStore();

  const activeBranch = getActiveBranch();
  const [selectedBranch, setSelectedBranch] = useState(selectedBranchId || activeBranch.branch_id);
  const [walletType, setWalletType] = useState<'Cash' | 'UPI'>('Cash');
  const [upiAmount, setUpiAmount] = useState<number | ''>('');
  const [transferMode, setTransferMode] = useState('Opening Float from Safe');
  const [referenceNotes, setReferenceNotes] = useState('Morning Opening Till Float');

  // Denomination notes state (₹500, ₹200, ₹100, ₹50, ₹20, ₹10)
  const [counts, setCounts] = useState<DenomCount>({
    500: 0,
    200: 0,
    100: 0,
    50: 0,
    20: 0,
    10: 0,
  });

  const [currentCashBalance, setCurrentCashBalance] = useState(0);
  const [currentUpiBalance, setCurrentUpiBalance] = useState(0);
  const [allLedgerEntries, setAllLedgerEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pro Enterprise Ledger View & Filter State
  const [scopeFilter, setScopeFilter] = useState<ScopeFilter>('ALL');
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customDate, setCustomDate] = useState<string>(formatDateFns(new Date(), 'yyyy-MM-dd'));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerWalletFilter, setLedgerWalletFilter] = useState<'ALL' | 'Cash' | 'UPI'>('ALL');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [activeRowDropdownId, setActiveRowDropdownId] = useState<string | null>(null);
  const [clipboardToast, setClipboardToast] = useState<string | null>(null);

  // Safe Drop Drawer State
  const [isSafeDropOpen, setIsSafeDropOpen] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const containerRef = useGsapContext(() => {
    animateStaggerCards(containerRef.current, '.stagger-card', 0.03);
  }, [selectedBranch]);

  useEffect(() => {
    setSelectedBranch(selectedBranchId || activeBranch.branch_id);
  }, [selectedBranchId, activeBranch.branch_id]);

  // Global keyboard shortcuts ('/' to search ledger, ESC to close popovers)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setActiveRowDropdownId(null);
        setIsExportMenuOpen(false);
        setShowDatePicker(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent | TouchEvent) {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setIsExportMenuOpen(false);
      }
      if (
        activeRowDropdownId &&
        !(e.target as HTMLElement).closest(`[data-dropdown-id="${activeRowDropdownId}"]`)
      ) {
        setActiveRowDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeRowDropdownId]);

  const copyToClipboard = useCallback((text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setClipboardToast(label);
    setTimeout(() => setClipboardToast(null), 2200);
  }, []);

  const loadTreasuryData = async () => {
    setLoading(true);
    try {
      const [wallet, ledger] = await Promise.all([
        erpService.getBranchWallet(selectedBranch),
        erpService.getWalletLedger(selectedBranch),
      ]);
      setCurrentCashBalance(wallet.cash_balance);
      setCurrentUpiBalance(wallet.upi_balance);
      setAllLedgerEntries(ledger || []);
    } catch (err) {
      console.warn('Error loading treasury data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTreasuryData();
    const handleUpdates = () => {
      loadTreasuryData();
    };
    window.addEventListener('asopalav:wallet-updated', handleUpdates);
    window.addEventListener('asopalav:ledger-updated', handleUpdates);
    return () => {
      window.removeEventListener('asopalav:wallet-updated', handleUpdates);
      window.removeEventListener('asopalav:ledger-updated', handleUpdates);
    };
  }, [selectedBranch]);

  // Filtered allocations for Pro Enterprise Timeline / Table
  const filteredAllocations = useMemo(() => {
    let list = allLedgerEntries;

    if (scopeFilter === 'Float_Topup') {
      list = list.filter((l) => l.transaction_type === 'Float_Topup');
    }

    if (ledgerWalletFilter !== 'ALL') {
      list = list.filter((l) => l.wallet_type === ledgerWalletFilter);
    }

    const now = new Date();
    if (dateFilter === 'today') {
      const todayStr = formatDateFns(now, 'yyyy-MM-dd');
      list = list.filter((l) => (l.created_at || '').slice(0, 10) === todayStr);
    } else if (dateFilter === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yesterdayStr = formatDateFns(y, 'yyyy-MM-dd');
      list = list.filter((l) => (l.created_at || '').slice(0, 10) === yesterdayStr);
    } else if (dateFilter === 'week') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      list = list.filter((l) => {
        if (!l.created_at) return false;
        const entryDate = new Date(l.created_at);
        return entryDate >= sevenDaysAgo && entryDate <= now;
      });
    } else if (dateFilter === 'custom' && customDate) {
      list = list.filter((l) => (l.created_at || '').slice(0, 10) === customDate);
    }

    if (ledgerSearch.trim()) {
      const q = ledgerSearch.toLowerCase();
      list = list.filter(
        (l) =>
          (l.remarks && l.remarks.toLowerCase().includes(q)) ||
          (l.cashier_name && l.cashier_name.toLowerCase().includes(q)) ||
          (l.authorized_by_name && l.authorized_by_name.toLowerCase().includes(q)) ||
          (l.id && String(l.id).toLowerCase().includes(q)) ||
          (l.reference_number && String(l.reference_number).toLowerCase().includes(q)) ||
          String(l.credit_amount || l.debit_amount || '').includes(q)
      );
    }
    return list;
  }, [allLedgerEntries, scopeFilter, ledgerWalletFilter, dateFilter, customDate, ledgerSearch]);

  const ledgerTotalSum = useMemo(() => {
    return filteredAllocations.reduce((acc, curr) => acc + (Number(curr.credit_amount) || 0), 0);
  }, [filteredAllocations]);

  const handleExportLedger = (format: 'csv' | 'json' | 'sql') => {
    setIsExportMenuOpen(false);
    const dateStr = new Date().toISOString().slice(0, 10);
    const esc = (val?: string | null) => (val ? `'${val.replace(/'/g, "''")}'` : 'NULL');

    if (format === 'json') {
      downloadBlob(`asopalav_treasury_ledger_${dateStr}.json`, JSON.stringify(filteredAllocations, null, 2), 'application/json');
    } else if (format === 'csv') {
      const headers = ['Record ID', 'Date & Time', 'Credit Amount', 'Wallet Type', 'Remarks', 'Cashier', 'Authorized By'];
      const rows = filteredAllocations.map((l) => [
        l.id,
        l.created_at,
        l.credit_amount,
        l.wallet_type,
        `"${(l.remarks || '').replace(/"/g, '""')}"`,
        l.cashier_name || '',
        l.authorized_by_name || '',
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      downloadBlob(`asopalav_treasury_ledger_${dateStr}.csv`, csv, 'text/csv');
    } else if (format === 'sql') {
      const sql = filteredAllocations
        .map(
          (l) =>
            `INSERT INTO wallet_ledgers (id, branch_id, transaction_type, wallet_type, credit_amount, remarks, cashier_name, authorized_by_name, created_at) VALUES (${esc(l.id)}, ${esc(l.branch_id)}, '${l.transaction_type || 'Float_Topup'}', ${esc(l.wallet_type)}, ${Number(l.credit_amount) || 0}, ${esc(l.remarks)}, ${esc(l.cashier_name)}, ${esc(l.authorized_by_name)}, ${esc(l.created_at)});`
        )
        .join('\n');
      downloadBlob(`asopalav_treasury_ledger_${dateStr}.sql`, sql, 'text/plain');
    }
  };

  const cashNotesTotal = useMemo(() => {
    return Object.entries(counts).reduce((acc, [denomStr, count]) => {
      const denom = Number(denomStr);
      return acc + denom * (count || 0);
    }, 0);
  }, [counts]);

  const handleStepCount = (denom: number, delta: number) => {
    triggerHaptic(Math.abs(delta) > 1 ? 'medium' : 'selection');
    setCounts((prev) => ({
      ...prev,
      [denom]: Math.max(0, (prev[denom] || 0) + delta),
    }));
  };

  const handleCountChange = (denom: number, val: string) => {
    const num = parseInt(val, 10);
    setCounts((prev) => ({
      ...prev,
      [denom]: isNaN(num) || num < 0 ? 0 : num,
    }));
  };

  const handleResetCounts = () => {
    triggerHaptic('light');
    setCounts({
      500: 0,
      200: 0,
      100: 0,
      50: 0,
      20: 0,
      10: 0,
    });
  };

  const handleTopupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const amountToAdd = walletType === 'Cash' ? cashNotesTotal : Number(upiAmount) || 0;

    if (amountToAdd <= 0) {
      setFeedback({ type: 'error', message: 'Please enter a valid float amount greater than ₹0.' });
      return;
    }

    setSubmitting(true);
    try {
      let notesSummary = '';
      if (walletType === 'Cash') {
        const parts = Object.entries(counts)
          .filter(([_, c]) => c > 0)
          .map(([denom, c]) => `₹${denom}×${c}`);
        notesSummary = parts.length > 0 ? `[Notes: ${parts.join(', ')}]` : '';
      }

      const fullRemarks = `${referenceNotes.trim() || 'Opening Till Float'} [Transfer Mode: ${transferMode}] ${notesSummary}`.trim();

      const userName = `${user?.first_name || 'Cashier'} ${user?.last_name || ''}`.trim();
      const authName = `${user?.first_name || 'Store'} ${user?.last_name || 'Manager'}`.trim();

      await erpService.createFloatTopup({
        branchId: selectedBranch,
        branchCode: activeBranch.branch_code,
        walletType,
        amount: amountToAdd,
        referenceNotes: fullRemarks,
        receivedByName: userName,
        authorizedByName: authName,
      });

      triggerHaptic('heavy');
      setFeedback({
        type: 'success',
        message: `Successfully added ${formatINR(amountToAdd)} to ${walletType} till!`,
      });

      if (walletType === 'UPI') setUpiAmount('');
      handleResetCounts();
      loadTreasuryData();
      window.dispatchEvent(new Event('asopalav:wallet-updated'));
    } catch (err: any) {
      console.error('Error adding float:', err);
      setFeedback({ type: 'error', message: err.message || 'Failed to add float.' });
    } finally {
      setSubmitting(false);
    }
  };

  const { isCeilingExceededAllowed } = useOverrideStore();
  const safeDropExceeded = currentCashBalance > 50000 && !isCeilingExceededAllowed();

  return (
    <div ref={containerRef} className="min-h-screen bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] font-sans antialiased selection:bg-[#3ecf8e]/20 selection:text-[#3ecf8e] pb-16 select-none flex flex-col">
      {/* 1. Cash Box & Bank Header */}
      <div className="px-4 lg:px-6 py-4 border-b border-slate-200 dark:border-[#232323] bg-white dark:bg-[#141414]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          {/* Left Layer: Title, Status Badges & Subtitle */}
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-900 dark:text-[#EDEDED] font-sans flex items-center gap-2">
                <Wallet className="w-5 h-5 text-[#3ecf8e]" />
                <span>Cash Box & Bank</span>
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] tabular-nums font-mono bg-slate-100 dark:bg-[#202020] text-emerald-700 dark:text-[#3ecf8e] border border-slate-200 dark:border-[#2e2e2e]">
                {filteredAllocations.length} records
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
              Manage morning cash, count currency notes, move cash to safe, and view cash history.
            </p>
          </div>

          {/* Right Layer: Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setIsSafeDropOpen(true);
              }}
              className="h-8.5 px-3 py-1.5 rounded-[6px] border border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Transfer excess cash from box to showroom safe"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              <span>Move Cash to Safe</span>
            </button>

            <button
              type="button"
              onClick={loadTreasuryData}
              disabled={loading}
              className="h-8.5 w-8.5 flex items-center justify-center rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] transition-colors cursor-pointer shadow-xs"
              title="Refresh Cash Box"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin text-[#3ecf8e]")} />
            </button>

            {/* Export Menu */}
            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="h-8.5 px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-slate-400 dark:text-[#707070]" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-[6px] shadow-xl py-1 z-40">
                  <button
                    type="button"
                    onClick={() => handleExportLedger('csv')}
                    className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] flex items-center gap-2 cursor-pointer font-mono"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    CSV format
                  </button>
                  {isDeveloper && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleExportLedger('json')}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] flex items-center gap-2 cursor-pointer font-mono"
                      >
                        <Code className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                        JSON format
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExportLedger('sql')}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-100 dark:hover:bg-[#222222] flex items-center gap-2 cursor-pointer font-mono"
                      >
                        <Terminal className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        SQL statements
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Studio Content Area */}
      <div className="px-4 lg:px-6 py-4 space-y-4 flex-1">
        {/* Tier 2: Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-[8px] border border-slate-200 dark:border-[#242424] bg-slate-50 dark:bg-[#171717]">
          <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={ledgerSearch}
                onChange={(e) => setLedgerSearch(e.target.value)}
                placeholder="Search ledger entries (/)..."
                className="w-full bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2e2e2e] rounded-[6px] pl-8 pr-8 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#737373] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-colors font-sans"
              />
              {ledgerSearch ? (
                <button
                  type="button"
                  onClick={() => setLedgerSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#737373] hover:text-slate-900 dark:hover:text-white text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>

            {/* Scope / Activity Filter */}
            <div className="w-36">
              <SearchableSelect
                size="sm"
                options={[
                  { value: 'ALL', label: 'All Activity' },
                  { value: 'Float_Topup', label: 'Top-ups Only' },
                  { value: 'Cash', label: 'Cash Only' },
                  { value: 'UPI', label: 'UPI / Bank Only' },
                ]}
                value={ledgerWalletFilter}
                onChange={(val) => setLedgerWalletFilter(val as any)}
                placeholder="All Activity"
                searchPlaceholder="Search activity..."
                allowCustom={false}
              />
            </div>

            {/* Date Range Selector */}
            <div className="relative w-36">
              <SearchableSelect
                size="sm"
                options={[
                  { value: 'all', label: 'All Time' },
                  { value: 'today', label: 'Today' },
                  { value: 'yesterday', label: 'Yesterday' },
                  { value: 'week', label: 'Last 7 Days' },
                  { value: 'custom', label: 'Custom Date...' },
                ]}
                value={dateFilter}
                onChange={(val) => {
                  const dVal = val as DateFilter;
                  setDateFilter(dVal);
                  if (dVal === 'custom') setShowDatePicker(true);
                  else setShowDatePicker(false);
                }}
                placeholder="Date range"
                searchPlaceholder="Search date..."
                allowCustom={false}
              />

              {showDatePicker && (
                <div className="absolute left-0 mt-1 z-50 p-2 rounded-[8px] bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] shadow-xl space-y-2">
                  <input
                    type="date"
                    value={customDate}
                    onChange={(e) => {
                      setCustomDate(e.target.value);
                      setDateFilter('custom');
                      setShowDatePicker(false);
                    }}
                    className="bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2e2e2e] rounded-[4px] px-2 py-1 text-xs text-slate-900 dark:text-white font-mono focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e]"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Branch Selector */}
          <div className="w-full sm:w-64">
            <SearchableSelect
              value={selectedBranch}
              onChange={setSelectedBranch}
              options={branches.map((b) => ({
                value: b.branch_id,
                label: b.branch_name,
                badge: b.branch_code,
              }))}
              placeholder="Select branch..."
            />
          </div>
        </div>

      {/* Safe Deposit Alert Banner */}
      {safeDropExceeded && (
        <div className="stagger-card p-3.5 rounded-[12px] bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-sans">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <div>
              <strong className="block font-medium text-amber-800 dark:text-amber-300">Move Cash to Safe (Cash in Box is High)</strong>
              <span className="text-[11px] text-amber-700 dark:text-amber-200/80">
                Cash in box ({formatINR(currentCashBalance)}) is over ₹50,000. Please move extra cash to the shop safe.
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('selection');
              setIsSafeDropOpen(true);
            }}
            className="px-3.5 py-2 rounded-[6px] bg-amber-500 hover:bg-amber-400 text-[#171717] font-semibold text-xs font-sans flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 shadow-xs"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#171717] stroke-[2.5]" />
            <span>Move to Safe ({formatINR(Math.max(0, currentCashBalance - 40000))})</span>
          </button>
        </div>
      )}

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="stagger-card p-4 rounded-[12px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#242424] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#A1A1A1]">Cash in Box</span>
            <div className="w-7 h-7 rounded-[6px] bg-emerald-50 dark:bg-[#1f1f1f] text-emerald-600 dark:text-[#3ecf8e] border border-emerald-200 dark:border-[#2e2e2e] flex items-center justify-center">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-mono font-medium text-slate-900 dark:text-white tabular-nums">
              {formatINR(currentCashBalance)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#737373] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
              <span>Cash notes in counter</span>
            </div>
          </div>
        </div>

        <div className="stagger-card p-4 rounded-[12px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#242424] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#A1A1A1]">Bank & UPI Balance</span>
            <div className="w-7 h-7 rounded-[6px] bg-sky-50 dark:bg-[#1f1f1f] text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-[#2e2e2e] flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-mono font-medium text-slate-900 dark:text-white tabular-nums">
              {formatINR(currentUpiBalance)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#737373] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-sky-400" />
              <span>Shop UPI bank account</span>
            </div>
          </div>
        </div>

        <div className="stagger-card p-4 rounded-[12px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#242424] flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-slate-500 dark:text-[#A1A1A1]">Total Available Money</span>
            <div className="w-7 h-7 rounded-[6px] bg-emerald-50 dark:bg-[#1f1f1f] text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-[#2e2e2e] flex items-center justify-center">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-mono font-medium text-emerald-600 dark:text-[#3ecf8e] tabular-nums">
              {formatINR(currentCashBalance + currentUpiBalance)}
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-500 dark:text-[#737373] font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
              <span>Total Cash + UPI Money</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Dual Column Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Add Cash Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleTopupSubmit} className="stagger-card p-4 rounded-[12px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#242424] space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#242424]">
              <div className="flex items-center gap-2">
                <Coins className="w-3.5 h-3.5 text-[#3ecf8e]" />
                <h2 className="text-xs font-medium text-slate-900 dark:text-white font-sans">
                  Add Money to Cash Box / Bank
                </h2>
              </div>
              <div className="inline-flex rounded-[6px] p-0.5 bg-slate-100 dark:bg-[#171717] border border-slate-200 dark:border-[#2e2e2e]">
                <button
                  type="button"
                  onClick={() => setWalletType('Cash')}
                  className={cn(
                    'px-2.5 py-1 rounded-[4px] text-xs font-sans transition-all cursor-pointer font-medium',
                    walletType === 'Cash'
                      ? 'bg-white dark:bg-[#282828] text-slate-900 dark:text-white font-medium border border-slate-300 dark:border-[#383838] shadow-xs'
                      : 'text-slate-500 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-white border border-transparent'
                  )}
                >
                  Cash Notes
                </button>
                <button
                  type="button"
                  onClick={() => setWalletType('UPI')}
                  className={cn(
                    'px-2.5 py-1 rounded-[4px] text-xs font-sans transition-all cursor-pointer font-medium',
                    walletType === 'UPI'
                      ? 'bg-white dark:bg-[#282828] text-slate-900 dark:text-white font-medium border border-slate-300 dark:border-[#383838] shadow-xs'
                      : 'text-slate-500 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-white border border-transparent'
                  )}
                >
                  Bank UPI
                </button>
              </div>
            </div>

            {walletType === 'Cash' ? (
              /* Denomination Fast-Pad */
              <div className="space-y-3 font-mono">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-[#A1A1A1] font-medium font-sans">
                    Count Cash Notes (₹500 to ₹10)
                  </span>
                  <button
                    type="button"
                    onClick={handleResetCounts}
                    className="text-xs text-slate-500 dark:text-[#A1A1A1] hover:text-rose-500 dark:hover:text-rose-400 flex items-center gap-1 cursor-pointer font-sans font-medium transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Counts</span>
                  </button>
                </div>

                {/* Mobile Steppers (< lg) */}
                <div className="lg:hidden space-y-2.5 font-sans">
                  {[500, 200, 100, 50, 20, 10].map((denom, idx) => {
                    const count = counts[denom] || 0;
                    const subtotal = denom * count;

                    return (
                      <div
                        key={denom}
                        className="p-3 rounded-[8px] bg-slate-50 dark:bg-[#171717] border border-slate-200 dark:border-[#282828] space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-[4px] text-xs font-mono font-bold bg-slate-200 dark:bg-[#1f1f1f] text-emerald-700 dark:text-[#3ecf8e] border border-slate-300 dark:border-[#2e2e2e]">
                              ₹{denom}
                            </span>
                            <span className="text-xs font-mono text-slate-500 dark:text-[#A1A1A1]">
                              {count} pcs
                            </span>
                          </div>

                          <div className="text-right font-mono font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                            {formatINR(subtotal)}
                          </div>
                        </div>

                        <div className="grid grid-cols-5 gap-1.5 pt-0.5 font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('selection');
                              handleStepCount(denom, -10);
                            }}
                            disabled={count < 10}
                            className="py-2 rounded-[6px] bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] text-slate-700 dark:text-[#A1A1A1] text-xs font-bold disabled:opacity-30 cursor-pointer active:scale-95 transition-all flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#282828]"
                          >
                            -10
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('selection');
                              handleStepCount(denom, -1);
                            }}
                            disabled={count <= 0}
                            className="py-2 rounded-[6px] bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] text-slate-700 dark:text-[#A1A1A1] text-xs font-bold disabled:opacity-30 cursor-pointer active:scale-95 transition-all flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#282828]"
                          >
                            -1
                          </button>

                          <input
                            id={`float-denom-mob-${idx}`}
                            type="number"
                            min="0"
                            value={count || ''}
                            onChange={(e) => handleCountChange(denom, e.target.value)}
                            placeholder="0"
                            className="py-1.5 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2e2e2e] rounded-[6px] text-center text-sm font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] tabular-nums"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('selection');
                              handleStepCount(denom, 1);
                            }}
                            className="py-2 rounded-[6px] bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] text-slate-700 dark:text-[#A1A1A1] text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#282828]"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              triggerHaptic('selection');
                              handleStepCount(denom, 10);
                            }}
                            className="py-2 rounded-[6px] bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] text-slate-700 dark:text-[#A1A1A1] text-xs font-bold cursor-pointer active:scale-95 transition-all flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#282828]"
                          >
                            +10
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Denomination Table (lg+) */}
                <div className="hidden lg:block border border-slate-200 dark:border-[#242424] rounded-[8px] overflow-hidden bg-white dark:bg-[#171717]">
                  <table className="w-full border-collapse text-left text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-[#242424] bg-slate-50 dark:bg-[#141414] text-[11px] text-slate-500 dark:text-[#A1A1A1]">
                        <th className="py-2.5 px-3">Note Type</th>
                        <th className="py-2.5 px-3 text-center">Count</th>
                        <th className="py-2.5 px-3 text-right">Total (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-[#242424]">
                      {[500, 200, 100, 50, 20, 10].map((denom, idx) => {
                        const count = counts[denom] || 0;
                        const subtotal = denom * count;

                        return (
                          <tr key={denom} className="hover:bg-slate-50/80 dark:hover:bg-[#1a1a1a] transition-colors">
                            <td className="py-2 px-3">
                              <span className="font-medium text-slate-900 dark:text-white">₹{denom} Note</span>
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center justify-center gap-1.5 max-w-[180px] mx-auto">
                                <button
                                  type="button"
                                  onClick={() => handleStepCount(denom, -1)}
                                  disabled={count <= 0}
                                  className="w-7 h-7 rounded-[4px] bg-slate-100 dark:bg-[#202020] border border-slate-200 dark:border-[#2e2e2e] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#282828] flex items-center justify-center cursor-pointer text-xs shrink-0 disabled:opacity-30 active:scale-95 transition-all"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <input
                                  id={`float-denom-${idx}`}
                                  type="number"
                                  min="0"
                                  value={count || ''}
                                  onChange={(e) => handleCountChange(denom, e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const next = document.getElementById(`float-denom-${idx + 1}`);
                                      if (next) next.focus();
                                    }
                                  }}
                                  placeholder="0"
                                  className="w-16 h-7 bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2e2e2e] rounded-[4px] text-center text-xs font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] tabular-nums"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleStepCount(denom, 1)}
                                  className="w-7 h-7 rounded-[4px] bg-slate-100 dark:bg-[#202020] border border-slate-200 dark:border-[#2e2e2e] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#282828] flex items-center justify-center cursor-pointer text-xs shrink-0 active:scale-95 transition-all"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                            <td className="py-2 px-3 text-right">
                              <span className="font-medium text-slate-900 dark:text-white tabular-nums">
                                {formatINR(subtotal)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-slate-200 dark:border-[#242424] bg-slate-50 dark:bg-[#141414] text-xs">
                        <td className="py-2.5 px-3 font-sans text-slate-900 dark:text-white font-medium">Total Cash Notes</td>
                        <td className="py-2.5 px-3 text-center text-slate-500 dark:text-[#A1A1A1] font-mono text-[11px]">
                          {Object.values(counts).reduce((a, b) => a + (b || 0), 0)} Notes
                        </td>
                        <td className="py-2.5 px-3 text-right font-medium text-emerald-600 dark:text-[#3ecf8e] font-mono tabular-nums text-sm">
                          {formatINR(cashNotesTotal)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            ) : (
              /* UPI Amount Inputs with 1-Tap Chips */
              <div className="space-y-3 font-sans">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-slate-800 dark:text-[#e0e0e0]">
                      Bank / UPI Amount (₹) *
                    </label>
                    {Number(upiAmount) > 0 && (
                      <span className="text-[11px] font-mono text-emerald-600 dark:text-[#3ecf8e]">
                        {numberToWordsINR(Number(upiAmount))}
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400 dark:text-[#737373] text-sm">
                      ₹
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={upiAmount}
                      onChange={(e) => setUpiAmount(parseFloat(e.target.value) || '')}
                      placeholder="e.g. 10000"
                      className="w-full bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2e2e2e] rounded-[6px] pl-8 pr-3 py-2 text-sm font-mono font-bold tabular-nums text-slate-900 dark:text-white focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e]"
                    />
                  </div>

                  {/* 1-Tap UPI Preset Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1 font-mono">
                    {[5000, 10000, 25000, 50000].map((quickAmt) => (
                      <button
                        key={quickAmt}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setUpiAmount(quickAmt);
                        }}
                        className="px-2.5 py-1 rounded-[5px] bg-slate-100 dark:bg-[#1a1a1a] hover:bg-slate-200 dark:hover:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] text-xs font-medium text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                      >
                        {formatINR(quickAmt)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Reference Remarks */}
            <div className="space-y-1 font-sans">
              <label className="block text-xs font-medium text-slate-800 dark:text-[#e0e0e0]">
                Reason / Note (e.g. Morning cash from safe)
              </label>
              <input
                type="text"
                value={referenceNotes}
                onChange={(e) => setReferenceNotes(e.target.value)}
                placeholder="e.g. Morning opening cash from safe / Owner cash"
                className="w-full bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#2e2e2e] rounded-[6px] px-3 py-2 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e]"
              />
            </div>

            {/* Feedback Alert */}
            {feedback && (
              <div
                className={`p-3 rounded-[6px] border font-sans text-xs font-medium ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-[#3ecf8e]/10 border-emerald-200 dark:border-[#3ecf8e]/30 text-emerald-700 dark:text-[#3ecf8e]'
                    : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-600 dark:text-rose-400'
                }`}
              >
                {feedback.message}
              </div>
            )}

            {/* Action Footer with Single Emerald CTA */}
            <div className="pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-t border-slate-200 dark:border-[#242424]">
              <div className="text-xs text-slate-600 dark:text-[#A1A1A1] font-mono flex items-center justify-between sm:justify-start gap-2">
                <span>Total to Add:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                  {formatINR(walletType === 'Cash' ? cashNotesTotal : Number(upiAmount) || 0)}
                </span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="h-10 px-5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-medium text-xs font-sans flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer select-none shadow-xs"
              >
                <Check className="w-4 h-4 text-[#171717] stroke-[3]" />
                <span>{submitting ? 'Adding Cash...' : 'Add Cash to Box'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Cash History Ledger */}
        <div className="lg:col-span-5 space-y-3">
          <div className="stagger-card p-4 rounded-[12px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#242424] space-y-3 shadow-xs">
            {/* Header with Title & Count Badge */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-[#242424]">
              <div className="flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#3ecf8e]" />
                <h2 className="text-xs font-medium text-slate-900 dark:text-white font-sans">
                  Cash Box History & Records
                </h2>
                <span className="px-1.5 py-0.2 rounded-[4px] text-[10px] font-mono font-bold bg-slate-100 dark:bg-[#1f1f1f] text-slate-600 dark:text-[#A1A1A1] border border-slate-200 dark:border-[#2e2e2e]">
                  {filteredAllocations.length}
                </span>
              </div>
            </div>

            {/* TIMELINE FEED VIEW */}
            <div className="rounded-[8px] border border-slate-200 dark:border-[#242424] bg-slate-50 dark:bg-[#171717] p-3.5">
              <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200 dark:before:bg-[#282828] space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredAllocations.map((entry, idx) => {
                  const parsed = parseLedgerNotes(entry.remarks);
                  const isCredit = Number(entry.credit_amount) > 0;
                  const amountValue = isCredit ? Number(entry.credit_amount) : Number(entry.debit_amount) || 0;
                  const isUpi = entry.wallet_type === 'UPI';

                  return (
                    <div key={entry.id || idx} className="relative group">
                      {/* Timeline Node Marker */}
                      <div
                        className={cn(
                          'absolute -left-6 top-1.5 w-5 h-5 rounded-full border flex items-center justify-center transition-transform group-hover:scale-110',
                          isUpi
                            ? 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-700 text-sky-600 dark:text-sky-400'
                            : 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-700 text-emerald-600 dark:text-[#3ecf8e]'
                        )}
                      >
                        {isUpi ? (
                          <QrCode className="w-2.5 h-2.5" />
                        ) : (
                          <Coins className="w-2.5 h-2.5" />
                        )}
                      </div>

                      {/* Timeline Card */}
                      <div className="p-3 rounded-[8px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#242424] hover:border-slate-300 dark:hover:border-[#383838] transition-all space-y-2 shadow-xs">
                        {/* Top Row: Date/Time + Amount + Mode */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-[#A1A1A1] font-mono">
                            <Clock className="w-3 h-3 text-slate-400 dark:text-[#737373]" />
                            <span>{formatDate(entry.created_at, 'dd MMM, HH:mm')}</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                'font-mono font-medium text-xs tabular-nums',
                                isCredit
                                  ? 'text-emerald-600 dark:text-[#3ecf8e]'
                                  : 'text-rose-600 dark:text-rose-400'
                              )}
                            >
                              {isCredit ? '+' : '-'}{formatINR(amountValue)}
                            </span>

                            <span
                              className={cn(
                                'px-1.5 py-0.2 rounded-[4px] text-[10px] font-mono font-medium border',
                                isUpi
                                  ? 'bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-500/20'
                                  : 'bg-emerald-50 dark:bg-[#3ecf8e]/10 text-emerald-700 dark:text-[#3ecf8e] border-emerald-200 dark:border-[#3ecf8e]/20'
                              )}
                            >
                              {entry.wallet_type}
                            </span>
                          </div>
                        </div>

                        {/* Middle Row: Primary Remarks Title */}
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-slate-900 dark:text-zinc-100 font-sans leading-snug">
                            {parsed.title}
                          </p>

                          {/* Transfer Mode Badge */}
                          {parsed.modeDetails && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-[10px] font-mono text-sky-700 dark:text-sky-300">
                              <Building2 className="w-2.5 h-2.5" />
                              {parsed.modeDetails}
                            </span>
                          )}

                          {/* Denomination Breakdown Chips */}
                          {parsed.chips.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1 pt-0.5">
                              {parsed.chips.map((chip, cIdx) => (
                                <span
                                  key={cIdx}
                                  className="px-1.5 py-0.5 rounded-[4px] bg-slate-100 dark:bg-[#222222] border border-slate-200 dark:border-[#333333] text-[10px] font-mono font-medium text-slate-700 dark:text-[#A1A1A1] tabular-nums"
                                >
                                  {chip}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Bottom Row: Attribution & Actions */}
                        <div className="pt-1.5 border-t border-slate-100 dark:border-[#242424] flex items-center justify-between text-[11px] font-sans">
                          <div className="flex items-center gap-1 text-slate-500 dark:text-[#A1A1A1] truncate">
                            <User className="w-3 h-3 text-slate-400 dark:text-[#737373] shrink-0" />
                            <span className="truncate">
                              By: <strong className="font-medium text-slate-900 dark:text-white">{entry.cashier_name || 'Cashier'}</strong>
                            </span>
                            {entry.authorized_by_name && (
                              <span className="text-[10px] text-slate-400 dark:text-[#737373] truncate">
                                (Auth: {entry.authorized_by_name})
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(String(amountValue), `Copied ₹${amountValue}`)}
                              className="px-1.5 py-0.5 rounded-[4px] border border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#222222] text-slate-600 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-white text-[10px] font-sans transition-colors cursor-pointer"
                            >
                              Copy ₹
                            </button>

                            {/* Row Dropdown */}
                            <div className="relative" data-dropdown-id={`alloc-${entry.id || idx}`}>
                              <button
                                type="button"
                                onClick={() => setActiveRowDropdownId(activeRowDropdownId === `alloc-${entry.id || idx}` ? null : `alloc-${entry.id || idx}`)}
                                className="p-1 rounded-[4px] hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-400 dark:text-[#737373] hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
                                title="Actions & JSON"
                              >
                                <MoreVertical className="w-3 h-3" />
                              </button>

                              {activeRowDropdownId === `alloc-${entry.id || idx}` && (
                                <div
                                  className={cn(
                                    "absolute right-0 w-44 rounded-[8px] bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] shadow-2xl p-1.5 z-40 space-y-1 text-xs font-sans text-left",
                                    idx >= Math.max(1, filteredAllocations.length - 2) ? 'bottom-7' : 'top-7'
                                  )}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      copyToClipboard(String(entry.id), 'Copied Entry ID');
                                      setActiveRowDropdownId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-800 dark:text-[#e0e0e0] hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                  >
                                    <Copy className="w-3.5 h-3.5 text-slate-400 dark:text-[#737373]" />
                                    <span>Copy Record ID</span>
                                  </button>
                                  {isDeveloper && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        copyToClipboard(JSON.stringify(entry, null, 2), 'Copied JSON');
                                        setActiveRowDropdownId(null);
                                      }}
                                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-[#282828] text-slate-800 dark:text-[#e0e0e0] hover:text-slate-900 dark:hover:text-white cursor-pointer"
                                    >
                                      <Code className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                      <span>Copy Record JSON</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {filteredAllocations.length === 0 && (
                  <div className="py-12 text-center text-xs font-sans text-slate-400 dark:text-[#737373]">
                    No treasury records found matching the current filters.
                  </div>
                )}
              </div>
            </div>

            {/* Ledger Summary Footer */}
            <div className="p-3 bg-slate-50 dark:bg-[#171717] border border-slate-200 dark:border-[#242424] rounded-[8px] flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 dark:text-[#A1A1A1] font-sans font-medium">
                Total Filtered Top-ups ({filteredAllocations.length})
              </span>
              <span className="font-medium text-emerald-600 dark:text-[#3ecf8e] tabular-nums">
                {formatINR(ledgerTotalSum)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Safe Drop Slide-Over Drawer */}
      <SafeDropDrawer
        isOpen={isSafeDropOpen}
        onClose={() => setIsSafeDropOpen(false)}
        branchId={selectedBranch}
        currentCashBalance={currentCashBalance}
        onSuccess={loadTreasuryData}
      />

      {/* Floating Toast Notification */}
      {clipboardToast && (
        <div className="fixed bottom-6 right-6 z-50 px-3.5 py-2 rounded-[6px] bg-slate-900 dark:bg-[#1c1c1c] text-white font-mono text-xs shadow-2xl flex items-center gap-2 border border-slate-700 dark:border-[#2e2e2e] animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Check className="w-3.5 h-3.5 text-[#3ecf8e] stroke-[3]" />
          <span>{clipboardToast}</span>
        </div>
      )}
      </div>
    </div>
  );
};
