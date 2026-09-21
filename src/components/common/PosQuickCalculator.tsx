import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useScrollLock } from '@/hooks/useScrollLock';
import { useUIStore } from '@/store/uiStore';
import { cn, formatINR, numberToWordsINR, triggerHaptic } from '@/lib/utils';
import { animateModalOpen, animateModalClose } from '@/lib/animations';
import { showToast } from '@/components/ui/ToastContainer';
import {
  Calculator,
  X,
  RotateCcw,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Receipt,
  Banknote,
  Coins,
  Percent,
  Plus,
  Minus,
  Divide,
  X as MultiplyIcon,
  Equal,
  AlertTriangle,
} from 'lucide-react';

type CalcMode = 'math' | 'tender';

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1];

export const PosQuickCalculator: React.FC = () => {
  const { isCalculatorOpen, setCalculatorOpen, setActivePage, activePage } = useUIStore();
  useScrollLock(isCalculatorOpen);

  const [mode, setMode] = useState<CalcMode>('math');
  const [expression, setExpression] = useState<string>('0');
  const [copied, setCopied] = useState(false);

  // Cash Tender / Change Return Mode State
  const [tenderAmount, setTenderAmount] = useState<string>('2000');
  const [billAmount, setBillAmount] = useState<string>('640');

  const modalRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const tenderInputRef = useRef<HTMLInputElement | null>(null);

  const handleClose = useCallback(() => {
    animateModalClose(modalRef.current, backdropRef.current, () => {
      setCalculatorOpen(false);
    });
  }, [setCalculatorOpen]);

  // Handle Open animation & auto-focus
  useEffect(() => {
    if (isCalculatorOpen) {
      setCopied(false);
      animateModalOpen(modalRef.current, backdropRef.current);
    }
  }, [isCalculatorOpen]);

  // Safe Math Evaluator
  const evaluateMath = (expr: string): number => {
    try {
      // Replace arithmetic visual symbols with JS operators
      const sanitized = expr
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/,/g, '')
        .replace(/[^-()\d/*+.]/g, '');
      if (!sanitized || sanitized === '-') return 0;
      // Evaluate mathematical expression safely
      const fn = new Function(`return (${sanitized})`);
      const val = fn();
      return typeof val === 'number' && !isNaN(val) && isFinite(val) ? Math.round(val * 100) / 100 : 0;
    } catch {
      return 0;
    }
  };

  const currentMathResult = evaluateMath(expression);

  // Handle calculator key press
  const handleKeyClick = (key: string) => {
    triggerHaptic('light');
    setCopied(false);

    if (key === 'C') {
      setExpression('0');
      return;
    }

    if (key === 'DEL') {
      if (expression.length <= 1) {
        setExpression('0');
      } else {
        setExpression(expression.slice(0, -1));
      }
      return;
    }

    if (key === '=') {
      const res = evaluateMath(expression);
      setExpression(String(res));
      return;
    }

    if (expression === '0' && !['+', '-', '×', '÷', '.'].includes(key)) {
      setExpression(key);
    } else {
      // Avoid double consecutive operators
      const lastChar = expression.slice(-1);
      if (['+', '-', '×', '÷'].includes(lastChar) && ['+', '-', '×', '÷'].includes(key)) {
        setExpression(expression.slice(0, -1) + key);
      } else {
        setExpression((prev) => prev + key);
      }
    }
  };

  // Add GST Percentage
  const handleAddGst = (gstPercent: number) => {
    triggerHaptic('selection');
    const base = evaluateMath(expression);
    if (base > 0) {
      const withTax = Math.round(base * (1 + gstPercent / 100) * 100) / 100;
      setExpression(String(withTax));
      showToast({
        type: 'info',
        title: `+${gstPercent}% GST Applied`,
        message: `₹${base.toLocaleString('en-IN')} + ${gstPercent}% = ₹${withTax.toLocaleString('en-IN')}`,
      });
    }
  };

  // Tender Change Calculation
  const numTender = parseFloat(tenderAmount.replace(/,/g, '')) || 0;
  const numBill = parseFloat(billAmount.replace(/,/g, '')) || 0;
  const changeDue = Math.max(0, numTender - numBill);
  const shortfall = Math.max(0, numBill - numTender);

  // Suggested Denomination breakdown
  const changeBreakdown = React.useMemo(() => {
    if (changeDue <= 0) return [];
    let remaining = changeDue;
    const notes: { denom: number; count: number }[] = [];

    for (const d of DENOMINATIONS) {
      if (remaining >= d) {
        const count = Math.floor(remaining / d);
        notes.push({ denom: d, count });
        remaining = remaining % d;
      }
    }
    return notes;
  }, [changeDue]);

  // Copy result to clipboard
  const handleCopyResult = () => {
    const val = mode === 'math' ? currentMathResult : changeDue;
    navigator.clipboard.writeText(String(val));
    setCopied(true);
    triggerHaptic('success');
    showToast({
      type: 'success',
      title: 'Amount Copied',
      message: `₹${val.toLocaleString('en-IN')} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Apply Calculated Amount Directly to F2 Voucher
  const handleApplyToVoucher = () => {
    const finalAmount = mode === 'math' ? currentMathResult : numBill > 0 ? numBill : changeDue;
    if (finalAmount <= 0) {
      showToast({
        type: 'warning',
        title: 'Zero Amount',
        message: 'Please calculate a valid amount greater than ₹0 to apply.',
      });
      return;
    }

    triggerHaptic('success');
    handleClose();

    // Navigate to new-voucher if not already there
    if (activePage !== 'new-voucher') {
      setActivePage('new-voucher');
    }

    // Dispatch event to NewVoucherPage
    setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('asopalav:apply-voucher-amount', {
          detail: { amount: finalAmount },
        })
      );
      showToast({
        type: 'success',
        title: 'Amount Injected into Voucher',
        message: `₹${finalAmount.toLocaleString('en-IN')} applied to F2 disbursal form.`,
      });
    }, 100);
  };

  // Keyboard Shortcuts inside modal
  useEffect(() => {
    if (!isCalculatorOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (mode === 'math') {
        if (e.key >= '0' && e.key <= '9') {
          handleKeyClick(e.key);
        } else if (e.key === '+') {
          handleKeyClick('+');
        } else if (e.key === '-') {
          handleKeyClick('-');
        } else if (e.key === '*' || e.key === 'x') {
          handleKeyClick('×');
        } else if (e.key === '/') {
          e.preventDefault();
          handleKeyClick('÷');
        } else if (e.key === '.' || e.key === ',') {
          handleKeyClick('.');
        } else if (e.key === 'Enter' || e.key === '=') {
          e.preventDefault();
          handleKeyClick('=');
        } else if (e.key === 'Backspace') {
          handleKeyClick('DEL');
        } else if (e.key.toLowerCase() === 'c') {
          handleKeyClick('C');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCalculatorOpen, mode, expression, handleClose]);

  if (!isCalculatorOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="POS Counter Quick Calculator"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      {/* Backdrop */}
      <div
        ref={backdropRef}
        onClick={handleClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity duration-200"
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#242424] rounded-[12px] shadow-2xl overflow-hidden flex flex-col z-10 transition-all font-sans select-none"
      >
        {/* 1. Header with Mode Tabs */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#1f1f1f] bg-slate-50/50 dark:bg-[#181818]/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[6px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-[#3ecf8e] flex items-center justify-center">
              <Calculator className="w-4 h-4 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-medium text-slate-900 dark:text-white tracking-tight">
                  POS Counter Calculator
                </h3>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-[#202020] p-0.5 rounded-[6px] border border-slate-200 dark:border-[#2e2e2e]">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setMode('math');
                }}
                className={cn(
                  'px-2 py-1 text-[11px] font-medium rounded-[4px] transition-all cursor-pointer flex items-center gap-1',
                  mode === 'math'
                    ? 'bg-white dark:bg-[#141414] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-[#a1a1a1] hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Percent className="w-3 h-3" />
                Math & GST
              </button>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('selection');
                  setMode('tender');
                }}
                className={cn(
                  'px-2 py-1 text-[11px] font-medium rounded-[4px] transition-all cursor-pointer flex items-center gap-1',
                  mode === 'tender'
                    ? 'bg-white dark:bg-[#141414] text-slate-900 dark:text-white shadow-2xs'
                    : 'text-slate-500 dark:text-[#a1a1a1] hover:text-slate-900 dark:hover:text-white'
                )}
              >
                <Banknote className="w-3 h-3" />
                Change Return
              </button>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center rounded-[6px] text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#202020] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Main Body */}
        {mode === 'math' ? (
          <div className="p-4 flex flex-col gap-3">
            {/* Display Screen */}
            <div className="bg-slate-50 dark:bg-[#171717] border border-slate-200 dark:border-[#282828] rounded-[8px] p-3 flex flex-col justify-end items-end min-h-[76px] relative overflow-hidden">
              <div className="text-xs font-mono text-slate-400 dark:text-[#707070] truncate max-w-full">
                {expression}
              </div>
              <div className="text-2xl font-mono font-semibold tabular-nums text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1">
                <span className="text-sm font-sans text-slate-400">₹</span>
                {formatINR(currentMathResult)}
              </div>

              {/* Copy Icon Overlay */}
              <button
                type="button"
                onClick={handleCopyResult}
                title="Copy result"
                className="absolute top-2 left-2 p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-[4px] hover:bg-slate-200 dark:hover:bg-[#202020] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* GST Fast Tax Chips */}
            <div className="grid grid-cols-4 gap-1.5">
              {[5, 12, 18, 28].map((gst) => (
                <button
                  key={gst}
                  type="button"
                  onClick={() => handleAddGst(gst)}
                  className="py-1 px-1.5 text-[11px] font-mono font-medium rounded-[6px] bg-slate-100 dark:bg-[#1d1d1d] hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-[#3ecf8e] border border-slate-200 dark:border-[#282828] transition-colors cursor-pointer text-slate-700 dark:text-zinc-300"
                >
                  +{gst}% GST
                </button>
              ))}
            </div>

            {/* Keypad Grid (4x5) */}
            <div className="grid grid-cols-4 gap-1.5 font-mono text-sm select-none">
              <button
                type="button"
                onClick={() => handleKeyClick('C')}
                className="h-10 rounded-[6px] bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 font-semibold cursor-pointer"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('DEL')}
                className="h-10 rounded-[6px] bg-slate-100 dark:bg-[#1f1f1f] text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#282828] cursor-pointer"
              >
                ⌫
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('÷')}
                className="h-10 rounded-[6px] bg-slate-100 dark:bg-[#1f1f1f] text-emerald-600 dark:text-[#3ecf8e] hover:bg-slate-200 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#282828] font-bold cursor-pointer"
              >
                ÷
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('×')}
                className="h-10 rounded-[6px] bg-slate-100 dark:bg-[#1f1f1f] text-emerald-600 dark:text-[#3ecf8e] hover:bg-slate-200 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#282828] font-bold cursor-pointer"
              >
                ×
              </button>

              {['7', '8', '9'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKeyClick(n)}
                  className="h-10 rounded-[6px] bg-slate-50 dark:bg-[#1a1a1a] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#222] border border-slate-200 dark:border-[#2a2a2a] text-base font-medium cursor-pointer"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeyClick('-')}
                className="h-10 rounded-[6px] bg-slate-100 dark:bg-[#1f1f1f] text-emerald-600 dark:text-[#3ecf8e] hover:bg-slate-200 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#282828] font-bold cursor-pointer"
              >
                -
              </button>

              {['4', '5', '6'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKeyClick(n)}
                  className="h-10 rounded-[6px] bg-slate-50 dark:bg-[#1a1a1a] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#222] border border-slate-200 dark:border-[#2a2a2a] text-base font-medium cursor-pointer"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeyClick('+')}
                className="h-10 rounded-[6px] bg-slate-100 dark:bg-[#1f1f1f] text-emerald-600 dark:text-[#3ecf8e] hover:bg-slate-200 dark:hover:bg-[#282828] border border-slate-200 dark:border-[#282828] font-bold cursor-pointer"
              >
                +
              </button>

              {['1', '2', '3'].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => handleKeyClick(n)}
                  className="h-10 rounded-[6px] bg-slate-50 dark:bg-[#1a1a1a] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#222] border border-slate-200 dark:border-[#2a2a2a] text-base font-medium cursor-pointer"
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                onClick={() => handleKeyClick('=')}
                className="h-10 rounded-[6px] bg-slate-200 dark:bg-[#282828] text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-[#333] border border-slate-300 dark:border-[#383838] font-bold text-lg cursor-pointer"
              >
                =
              </button>

              <button
                type="button"
                onClick={() => handleKeyClick('0')}
                className="col-span-2 h-10 rounded-[6px] bg-slate-50 dark:bg-[#1a1a1a] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#222] border border-slate-200 dark:border-[#2a2a2a] text-base font-medium cursor-pointer"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('.')}
                className="h-10 rounded-[6px] bg-slate-50 dark:bg-[#1a1a1a] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#222] border border-slate-200 dark:border-[#2a2a2a] text-base font-bold cursor-pointer"
              >
                .
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('00')}
                className="h-10 rounded-[6px] bg-slate-50 dark:bg-[#1a1a1a] text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-[#222] border border-slate-200 dark:border-[#2a2a2a] text-sm font-medium cursor-pointer"
              >
                00
              </button>
            </div>
          </div>
        ) : (
          /* Tender / Change Return Mode */
          <div className="p-4 flex flex-col gap-3">
            {/* Input 1: Cash Given */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-[#a1a1a1] flex items-center justify-between">
                <span>Customer / Cashier Tendered (₹)</span>
                <span className="text-[10px] text-slate-400">Cash Received</span>
              </label>
              <div className="relative">
                <input
                  ref={tenderInputRef}
                  type="number"
                  value={tenderAmount}
                  onChange={(e) => setTenderAmount(e.target.value)}
                  placeholder="2000"
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-[#171717] border border-slate-200 dark:border-[#282828] rounded-[6px] text-base font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#3ecf8e] tabular-nums"
                />
                <div className="absolute right-2 top-2 flex items-center gap-1">
                  {[500, 1000, 2000].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTenderAmount(String(t))}
                      className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-slate-200 dark:bg-[#222] hover:bg-emerald-500/10 hover:text-emerald-600 text-slate-700 dark:text-zinc-300 cursor-pointer"
                    >
                      ₹{t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input 2: Bill / Voucher Amount */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-600 dark:text-[#a1a1a1] flex items-center justify-between">
                <span>Bill / Expense Amount (₹)</span>
                <span className="text-[10px] text-slate-400">Net To Pay</span>
              </label>
              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="640"
                className="w-full h-10 px-3 bg-slate-50 dark:bg-[#171717] border border-slate-200 dark:border-[#282828] rounded-[6px] text-base font-mono font-medium text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500 dark:focus:border-[#3ecf8e] tabular-nums"
              />
            </div>

            {/* Result Display: Change Return or Shortfall */}
            <div
              className={cn(
                'p-3.5 rounded-[8px] border flex flex-col gap-1',
                shortfall > 0
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-[#3ecf8e]'
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium flex items-center gap-1.5">
                  {shortfall > 0 ? (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span>Cash Shortfall / Due:</span>
                    </>
                  ) : (
                    <>
                      <Coins className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Return Change to Hand Out:</span>
                    </>
                  )}
                </span>
                <strong className="text-xl font-mono font-bold tabular-nums">
                  ₹{formatINR(shortfall > 0 ? shortfall : changeDue)}
                </strong>
              </div>

              {changeDue > 0 && (
                <div className="text-[10px] font-mono opacity-80 truncate">
                  {numberToWordsINR(changeDue)}
                </div>
              )}
            </div>

            {/* Suggested Denominations Breakdown */}
            {changeBreakdown.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-medium text-slate-500 dark:text-[#a1a1a1]">
                  Suggested Currency Denominations:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {changeBreakdown.map((item) => (
                    <span
                      key={item.denom}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-[4px] bg-slate-100 dark:bg-[#1e1e1e] border border-slate-200 dark:border-[#2a2a2a] text-xs font-mono font-medium text-slate-900 dark:text-white"
                    >
                      <Coins className="w-3 h-3 text-slate-400" />
                      ₹{item.denom} <span className="text-slate-400">×</span> {item.count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. Footer Action: Single Signature Primary Emerald CTA */}
        <div className="p-3 border-t border-slate-200 dark:border-[#1f1f1f] bg-slate-50/80 dark:bg-[#161616] flex items-center justify-between gap-2">
          <div className="text-xs text-slate-500 dark:text-[#707070] hidden sm:flex items-center gap-1">
            <span>Result:</span>
            <strong className="font-mono text-slate-800 dark:text-zinc-200">
              ₹{formatINR(mode === 'math' ? currentMathResult : numBill > 0 ? numBill : changeDue)}
            </strong>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="px-3 h-8 text-xs font-medium text-slate-600 dark:text-[#a1a1a1] hover:text-slate-900 dark:hover:text-white rounded-[6px] border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-100 dark:hover:bg-[#202020] transition-colors cursor-pointer"
            >
              Close
            </button>

            {/* Signature Emerald CTA */}
            <button
              type="button"
              onClick={handleApplyToVoucher}
              className="px-3.5 h-8 bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-medium text-xs rounded-[6px] flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs active:scale-[0.98] select-none"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Apply to Voucher</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PosQuickCalculator;
