import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore, CashierProfile } from '@/store/authStore';
import { Lock, Key, LogOut, Eye, EyeOff, ArrowRight, Delete, RotateCcw, User, ShieldCheck } from 'lucide-react';
import { AsopalavLogo } from '@/components/icons/AsopalavLogo';
import { animateModalOpen, animateShake } from '@/lib/animations';
import { cn, triggerHaptic } from '@/lib/utils';

export const PinLockOverlay: React.FC = () => {
  const {
    isLocked,
    unlockScreen,
    quickSwitchCashierByPin,
    user,
    logout,
    availableCashiers,
    selectedCashier,
    setSelectedCashier,
    fetchAvailableCashiers,
  } = useAuthStore();

  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const cardRef = useRef<HTMLDivElement | null>(null);
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeCashier = selectedCashier || (user ? availableCashiers.find((c) => c.id === user.id) : availableCashiers[0]) || (user as any);

  useEffect(() => {
    if (isLocked) {
      fetchAvailableCashiers();
      animateModalOpen(cardRef.current, backdropRef.current);
      setPin('');
      setShowPin(false);
      setError(false);
      setErrorMessage('');
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isLocked, fetchAvailableCashiers]);

  if (!isLocked) return null;

  const handleKeypadPress = (val: string) => {
    triggerHaptic('light');
    setError(false);
    setErrorMessage('');
    if (pin.length < 8) {
      const newPin = pin + val;
      setPin(newPin);
      if (newPin.length === 4) {
        // Auto-check on 4 digits
        setTimeout(() => triggerUnlock(newPin), 100);
      }
    }
  };

  const handleBackspace = () => {
    triggerHaptic('medium');
    setError(false);
    setErrorMessage('');
    setPin((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic('medium');
    setError(false);
    setErrorMessage('');
    setPin('');
    inputRef.current?.focus();
  };

  const triggerUnlock = (pinToTest: string) => {
    if (!pinToTest.trim()) {
      inputRef.current?.focus();
      return;
    }

    const success = quickSwitchCashierByPin(pinToTest, activeCashier?.id);
    if (!success) {
      triggerHaptic('error');
      setError(true);
      setErrorMessage(`Incorrect PIN for ${activeCashier?.first_name || 'user'}. Please try again.`);
      animateShake(cardRef.current);
      setTimeout(() => {
        setPin('');
        setError(false);
        inputRef.current?.focus();
      }, 800);
    } else {
      triggerHaptic('heavy');
    }
  };

  const handleFormSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    triggerUnlock(pin);
  };

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/85 backdrop-blur-md flex items-center justify-center p-3 select-none font-sans overflow-y-auto"
    >
      <div
        ref={cardRef}
        className="w-full max-w-[420px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#282828] rounded-[16px] p-6 shadow-2xl flex flex-col items-center text-center space-y-4 relative text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-200 my-auto"
      >
        {/* Top Brand Logo & Lock Indicator */}
        <div className="flex items-center justify-between w-full pb-2 border-b border-slate-100 dark:border-[#242424]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[6px] bg-slate-50 dark:bg-[#202020] border border-slate-200 dark:border-[#2e2e2e] flex items-center justify-center shadow-xs">
              <AsopalavLogo size={16} />
            </div>
            <div className="text-left">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 block font-semibold leading-tight">
                Asopalav ERP
              </span>
              <span className="text-xs font-medium text-slate-900 dark:text-white leading-tight">
                POS Terminal Lock
              </span>
            </div>
          </div>

          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-[10px] font-mono font-medium">
            <Lock className="w-3 h-3" />
            <span>Screen Locked</span>
          </div>
        </div>

        {/* Cashier Selector Carousel (Quick Counter Shift Switch) */}
        <div className="w-full space-y-1.5 text-left">
          <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-zinc-400 font-semibold block">
            Select Counter Cashier / Shift
          </label>
          <div className="grid grid-cols-5 gap-1.5">
            {availableCashiers.map((cashier) => {
              const isSelected = activeCashier?.id === cashier.id;
              return (
                <button
                  key={cashier.id}
                  type="button"
                  onClick={() => {
                    setSelectedCashier(cashier);
                    setPin('');
                    setError(false);
                    setErrorMessage('');
                    inputRef.current?.focus();
                  }}
                  className={cn(
                    'p-1.5 rounded-[8px] border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1',
                    isSelected
                      ? 'border-emerald-500 dark:border-[#3ecf8e] bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-950 dark:text-white ring-1 ring-emerald-500/30'
                      : 'border-slate-200 dark:border-[#282828] bg-slate-50/50 dark:bg-[#1f1f1f] hover:border-slate-300 dark:hover:border-[#383838] text-slate-600 dark:text-zinc-400'
                  )}
                  title={`${cashier.first_name} ${cashier.last_name} (${cashier.role_code.replace('_', ' ')})`}
                >
                  <div
                    className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-mono font-bold transition-transform',
                      isSelected
                        ? 'bg-[#3ecf8e] text-[#171717] scale-105 font-semibold'
                        : 'bg-slate-200 dark:bg-[#2a2a2a] text-slate-700 dark:text-zinc-300'
                    )}
                  >
                    {cashier.avatar_initials || cashier.first_name[0]}
                  </div>
                  <span className="text-[10px] font-medium truncate w-full block leading-none">
                    {cashier.first_name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Cashier Detail Banner */}
        <div className="w-full p-2.5 rounded-[8px] bg-slate-50 dark:bg-[#1f1f1f] border border-slate-200 dark:border-[#282828] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-emerald-500/10 text-emerald-600 dark:text-[#3ecf8e] border border-emerald-500/20 flex items-center justify-center text-xs font-mono font-bold">
              {activeCashier?.avatar_initials || activeCashier?.first_name?.[0] || 'U'}
            </div>
            <div className="text-left">
              <h3 className="text-xs font-medium text-slate-900 dark:text-white leading-tight">
                {activeCashier?.first_name} {activeCashier?.last_name}
              </h3>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-sans leading-tight mt-0.5">
                {activeCashier?.designation_title || (activeCashier?.role_code ? activeCashier.role_code.replace(/_/g, ' ') : 'Cashier')}
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-zinc-400 px-2 py-0.5 rounded-[4px] bg-slate-100 dark:bg-[#252525] border border-slate-200 dark:border-[#333]">
            <Key className="w-3 h-3 text-slate-400 dark:text-zinc-500" />
            <span>4-Digit PIN</span>
          </span>
        </div>

        {/* PIN Input & Visual Indicators */}
        <form onSubmit={handleFormSubmit} className="w-full space-y-3">
          <div className="space-y-1">
            <div className="relative flex items-center">
              <input
                id="lock-screen-pin"
                ref={inputRef}
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={8}
                value={pin}
                onChange={(e) => {
                  const sanitized = e.target.value.replace(/[^0-9]/g, '');
                  setPin(sanitized);
                  setError(false);
                  setErrorMessage('');
                  if (sanitized.length === 4) {
                    setTimeout(() => triggerUnlock(sanitized), 100);
                  }
                }}
                placeholder="• • • •"
                className={cn(
                  'w-full bg-white dark:bg-[#141414] border rounded-[8px] px-3 py-2 text-center text-base font-mono tracking-[0.4em] text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-zinc-600 focus:outline-none transition-colors shadow-xs',
                  error
                    ? 'border-rose-500 focus:border-rose-500 ring-1 ring-rose-500/30'
                    : 'border-slate-200 dark:border-[#2e2e2e] focus:border-emerald-500 dark:focus:border-[#3ecf8e] focus:ring-1 focus:ring-emerald-500/30'
                )}
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title={showPin ? 'Hide PIN' : 'Show PIN'}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {error && (
              <p className="text-[11px] font-medium text-rose-600 dark:text-rose-400 text-center pt-0.5">
                {errorMessage || 'Incorrect PIN. Please try again.'}
              </p>
            )}
          </div>

          {/* On-Screen Touch Keypad (POS Counter Ergonomics) */}
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeypadPress(digit)}
                className="h-10 rounded-[6px] border border-slate-200 dark:border-[#2a2a2a] bg-slate-50/70 dark:bg-[#1f1f1f] hover:bg-slate-100 dark:hover:bg-[#282828] active:bg-slate-200 dark:active:bg-[#333] text-sm font-mono font-medium text-slate-900 dark:text-white transition-colors cursor-pointer shadow-2xs flex items-center justify-center select-none active:scale-[0.98]"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-10 rounded-[6px] border border-slate-200 dark:border-[#2a2a2a] bg-slate-100/50 dark:bg-[#1a1a1a] hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:border-rose-300 dark:hover:border-rose-800 text-xs font-mono text-slate-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer shadow-2xs flex items-center justify-center select-none active:scale-[0.98]"
              title="Clear PIN"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleKeypadPress('0')}
              className="h-10 rounded-[6px] border border-slate-200 dark:border-[#2a2a2a] bg-slate-50/70 dark:bg-[#1f1f1f] hover:bg-slate-100 dark:hover:bg-[#282828] active:bg-slate-200 dark:active:bg-[#333] text-sm font-mono font-medium text-slate-900 dark:text-white transition-colors cursor-pointer shadow-2xs flex items-center justify-center select-none active:scale-[0.98]"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleBackspace}
              className="h-10 rounded-[6px] border border-slate-200 dark:border-[#2a2a2a] bg-slate-100/50 dark:bg-[#1a1a1a] hover:bg-slate-100 dark:hover:bg-[#282828] text-xs font-mono text-slate-600 dark:text-zinc-400 transition-colors cursor-pointer shadow-2xs flex items-center justify-center select-none active:scale-[0.98]"
              title="Backspace"
            >
              <Delete className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Primary Unlock CTA Button */}
          <button
            type="submit"
            className="w-full h-10 px-4 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-medium text-xs font-sans flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer active:scale-[0.99] mt-2"
          >
            <span>Unlock Counter Terminal (Enter)</span>
            <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </form>

        {/* Footer: Sign out / Password login */}
        <div className="pt-2 border-t border-slate-100 dark:border-[#242424] w-full flex items-center justify-center">
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500" />
            <span>Sign in with full password credentials</span>
          </button>
        </div>
      </div>
    </div>
  );
};
