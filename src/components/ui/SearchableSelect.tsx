import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Search, X, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string | null;
  sublabel?: string | null;
  badge?: string | null;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface SearchableSelectProps {
  options: (SelectOption | string)[];
  value: string;
  onChange: (value: string) => void;
  label?: string;
  error?: string;
  hint?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  wrapperClassName?: string;
  triggerClassName?: string;
  popupClassName?: string;
  disabled?: boolean;
  clearable?: boolean;
  required?: boolean;
  id?: string;
  allowCustom?: boolean;
  size?: 'sm' | 'md' | 'lg';
  align?: 'left' | 'right';
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options = [],
  value,
  onChange,
  label,
  error,
  hint,
  placeholder = 'Select option...',
  searchPlaceholder = 'Type to search...',
  className,
  wrapperClassName,
  triggerClassName,
  popupClassName,
  disabled = false,
  clearable = false,
  id,
  allowCustom = true,
  size = 'md',
  align = 'left',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const instanceIdRef = useRef('select-' + Math.random().toString(36).substring(2, 9));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Normalize options to SelectOption[]
  const normalizedOptions: SelectOption[] = useMemo(() => {
    return options.map((opt) =>
      typeof opt === 'string' ? { value: opt, label: opt } : opt
    );
  }, [options]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return normalizedOptions;
    const q = search.toLowerCase();
    return normalizedOptions.filter((opt) => {
      const sub = opt.subLabel || opt.sublabel;
      return (
        opt.label.toLowerCase().includes(q) ||
        (sub && sub.toLowerCase().includes(q)) ||
        (opt.badge && opt.badge.toLowerCase().includes(q)) ||
        opt.value.toLowerCase().includes(q)
      );
    });
  }, [normalizedOptions, search]);

  const selectedOption = useMemo(() => {
    return normalizedOptions.find((opt) => opt.value === value);
  }, [normalizedOptions, value]);

  // Global event: close this dropdown if another dropdown opens
  useEffect(() => {
    const handleGlobalOpen = (e: Event) => {
      const customEvt = e as CustomEvent<string>;
      if (customEvt.detail !== instanceIdRef.current) {
        setIsOpen(false);
      }
    };

    window.addEventListener('asopalav:dropdown-open', handleGlobalOpen);
    return () => window.removeEventListener('asopalav:dropdown-open', handleGlobalOpen);
  }, []);

  // When isOpen changes, notify other dropdowns if opening, and focus search
  const handleToggleOpen = (openState: boolean) => {
    if (disabled) return;
    if (openState) {
      window.dispatchEvent(
        new CustomEvent('asopalav:dropdown-open', { detail: instanceIdRef.current })
      );
    }
    setIsOpen(openState);
  };

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setHighlightedIndex(0);
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Close dropdown on outside click (supports mouse, touch, stylus)
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick as any);
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick as any);
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        handleToggleOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredOptions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          onChange(filteredOptions[highlightedIndex].value);
          setIsOpen(false);
        } else if (allowCustom && search.trim()) {
          onChange(search.trim());
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
  };

  const isExactMatch = useMemo(() => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return normalizedOptions.some(
      (opt) => opt.value.toLowerCase() === q || opt.label.toLowerCase() === q
    );
  }, [normalizedOptions, search]);

  return (
    <div className={cn('w-full font-sans', (label || hint) && 'space-y-1.5', wrapperClassName)}>
      {(label || hint) && (
        <div className="flex items-center justify-between">
          {label && (
            <label htmlFor={id} className="block text-xs font-semibold text-slate-900 dark:text-gray-100 font-sans">
              {label}
            </label>
          )}
          {hint && (
            <span className="text-[11px] text-slate-500 dark:text-gray-400 font-sans">
              {hint}
            </span>
          )}
        </div>
      )}
      <div
        ref={containerRef}
        className={cn('relative w-full text-xs font-sans', isOpen ? 'z-40' : 'z-auto', className)}
        onKeyDown={handleKeyDown}
      >
        {/* Trigger Button */}
        <button
          type="button"
          id={id}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={label || placeholder}
          disabled={disabled}
          onClick={() => handleToggleOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between text-left rounded-[6px] transition-all cursor-pointer select-none text-xs font-sans',
            size === 'sm' ? 'min-h-[30px] h-[30px] px-2.5 py-1' : size === 'lg' ? 'min-h-[44px] px-3.5 py-2.5' : 'min-h-[36px] px-3 py-1.5',
            'bg-slate-50/80 dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED]',
            'border border-slate-200 dark:border-[#282828]',
            'hover:border-slate-300 dark:hover:border-[#383838]',
            'focus:outline-none focus:border-[#3ecf8e] dark:focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e]/30',
            disabled && 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-[#1c1c1c]',
            isOpen && 'border-[#3ecf8e] dark:border-[#3ecf8e] ring-1 ring-[#3ecf8e]/30 shadow-xs',
            triggerClassName
          )}
        >
          <span className="truncate pr-2">
            {selectedOption ? (
              <span className="font-medium text-slate-900 dark:text-white">{selectedOption.label}</span>
            ) : value ? (
              <span className="font-medium text-slate-900 dark:text-white">{value}</span>
            ) : (
              <span className="text-slate-400 dark:text-zinc-500">{placeholder}</span>
            )}
          </span>

          <div className="flex items-center gap-1.5 shrink-0">
            {clearable && value && !disabled && (
              <span
                role="button"
                tabIndex={0}
                aria-label="Clear selection"
                onClick={handleClear}
                className="p-1 rounded-[4px] hover:bg-slate-100 dark:hover:bg-[#242424] text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown
              className={cn(
                'w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 transition-transform duration-200',
                isOpen && 'rotate-180 text-emerald-600 dark:text-[#3ecf8e]'
              )}
            />
          </div>
        </button>

        {/* Dropdown Popup */}
        {isOpen && (
          <div
            className={cn(
              'absolute top-full mt-1.5 z-50 rounded-[8px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] shadow-2xl overflow-hidden min-w-[200px]',
              align === 'right' ? 'right-0' : 'left-0',
              !className?.includes('w-') && 'w-full',
              popupClassName
            )}
          >
            {/* Search Input Box */}
            <div className="p-1.5 border-b border-slate-200 dark:border-[#282828] bg-slate-50 dark:bg-[#141414]">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-zinc-500 absolute left-2.5 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  aria-label={searchPlaceholder}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setHighlightedIndex(0);
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full bg-white dark:bg-[#1a1a1a] text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 text-xs pl-8 pr-3 py-1 rounded-[5px] border border-slate-200 dark:border-[#2e2e2e] focus:outline-none focus:border-[#3ecf8e] dark:focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e]/30 transition-colors font-sans min-h-[28px]"
                />
              </div>
            </div>

            {/* Custom Input Quick Pick */}
            {allowCustom && search.trim() && !isExactMatch && (
              <div className="p-1 border-b border-slate-100 dark:border-[#242424] bg-[#3ecf8e]/5">
                <button
                  type="button"
                  onClick={() => handleSelect(search.trim())}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-[5px] text-xs font-sans font-medium text-emerald-700 dark:text-[#3ecf8e] hover:bg-[#3ecf8e]/15 transition-colors cursor-pointer text-left"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Use &ldquo;<span className="font-semibold">{search.trim()}</span>&rdquo;</span>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[#3ecf8e]/20 text-emerald-800 dark:text-[#3ecf8e] px-1.5 py-0.5 rounded-[3px]">
                    Custom
                  </span>
                </button>
              </div>
            )}

            {/* Options List */}
            <div ref={listRef} role="listbox" className="max-h-60 overflow-y-auto p-1 space-y-0.5">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt, idx) => {
                  const isSelected = opt.value === value;
                  const isHighlighted = idx === highlightedIndex;
                  const sub = opt.subLabel || opt.sublabel;

                  return (
                    <div
                      key={`${opt.value}-${idx}`}
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(opt.value)}
                      onMouseEnter={() => setHighlightedIndex(idx)}
                      className={cn(
                        'flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs cursor-pointer transition-colors group select-none font-sans min-h-[32px]',
                        isSelected
                          ? 'bg-[#3ecf8e]/10 text-slate-900 dark:text-white font-medium border border-[#3ecf8e]/25'
                          : isHighlighted
                          ? 'bg-slate-100 dark:bg-[#242424] text-slate-900 dark:text-white'
                          : 'text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-[#202020] hover:text-slate-900 dark:hover:text-white'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        <div
                          className={cn(
                            'w-3.5 h-3.5 rounded-[3px] border flex items-center justify-center shrink-0 transition-colors',
                            isSelected
                              ? 'border-[#3ecf8e] bg-[#3ecf8e] text-[#171717]'
                              : 'border-slate-300 dark:border-[#383838] bg-white dark:bg-[#141414]'
                          )}
                        >
                          {isSelected && <Check className="w-2.5 h-2.5 text-[#171717] stroke-[3]" />}
                        </div>

                        <div className="truncate">
                          <div className="truncate">{opt.label}</div>
                          {sub && (
                            <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono truncate">
                              {sub}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {opt.badge && (
                          <span className="px-1.5 py-0.2 rounded-[4px] text-[10px] font-mono bg-black/5 dark:bg-white/10 text-slate-600 dark:text-[#a1a1a1] border border-black/10 dark:border-white/10">
                            {opt.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="py-4 px-3 text-center text-xs text-slate-400 dark:text-zinc-500 font-sans">
                  {allowCustom && search.trim() ? (
                    <button
                      type="button"
                      onClick={() => handleSelect(search.trim())}
                      className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-[#3ecf8e] hover:underline font-medium cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Click to use &ldquo;{search.trim()}&rdquo;</span>
                    </button>
                  ) : (
                    <span>No matches found</span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-500 font-mono">{error}</p>}
    </div>
  );
};
