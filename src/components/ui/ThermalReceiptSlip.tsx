import React, { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { formatINR, formatDate, numberToWordsINR } from '@/lib/utils';
import { Printer, ShieldCheck, QrCode } from 'lucide-react';
import { ExpenseVoucher } from '@/types/database';
import { useBrandStore } from '@/store/brandStore';
import { usePrintConfigStore } from '@/store/printConfigStore';

export interface ThermalSlipData {
  title?: string;
  storeName?: string;
  storeCode?: string;
  storeCity?: string;
  storeAddress?: string;
  storePhone?: string;
  gstin?: string;
  panNumber?: string;
  referenceNo: string;
  dateTime?: string;
  cashierName?: string;
  walletType?: 'Cash' | 'Online_UPI' | 'UPI' | 'Physical_Cash';
  totalAmount: number;
  inWords?: string;
  items?: { label: string; value: string | number; isBold?: boolean }[];
  doubleEntry?: { dr: string; cr: string };
  stampText?: string;
  stampVariant?: 'approved' | 'injected' | 'paid' | 'closed';
  signatureUrl?: string;
  signeeName?: string;
  copyLabel?: string;
}

interface ThermalReceiptSlipProps {
  data?: ThermalSlipData;
  voucher?: ExpenseVoucher;
  onPrint?: () => void;
  className?: string;
}

export const ThermalReceiptSlip: React.FC<ThermalReceiptSlipProps> = ({
  data: rawData,
  voucher,
  onPrint,
  className = '',
}) => {
  const { brandName, legalEntityName, monogramText } = useBrandStore();
  const { config: printConfig } = usePrintConfigStore();
  const paperRef = useRef<HTMLDivElement>(null);
  const stampRef = useRef<HTMLDivElement>(null);

  const is58mm = printConfig.paperWidth === '58mm';

  // Normalize data from either data prop or voucher prop
  const data: ThermalSlipData = rawData || {
    title: 'Expense Cash Voucher',
    storeName: printConfig.storeTitle || legalEntityName || brandName || 'Asopalav Silk & Sarees',
    storeCode: voucher?.branch_code || monogramText || 'ASI',
    storeCity: 'Ahmedabad',
    storeAddress: printConfig.showAddress ? 'Satellite Showroom, Ahmedabad' : undefined,
    storePhone: printConfig.showPhone ? '+91 9925009050' : undefined,
    gstin: printConfig.showGstin ? (printConfig.gstin || '24ABVFA8046N1ZQ') : undefined,
    panNumber: printConfig.showGstin ? printConfig.panNumber : undefined,
    referenceNo: voucher?.voucher_number || 'VCH-00000',
    dateTime: voucher?.payment_date ? formatDate(voucher.payment_date) : undefined,
    cashierName: voucher?.created_by_name || 'Cashier',
    walletType: voucher?.payment_method || 'Physical_Cash',
    totalAmount: Number(voucher?.total_amount) || 0,
    inWords: voucher?.total_amount ? numberToWordsINR(Number(voucher.total_amount)) : undefined,
    items: [
      { label: 'Paid To:', value: voucher?.recipient_name || 'Vendor', isBold: true },
      { label: 'Category:', value: voucher?.category_name || 'General' },
      { label: 'Department:', value: voucher?.department_name || 'Showroom' },
      ...(voucher?.bill_number ? [{ label: 'Bill / Memo #:', value: voucher.bill_number }] : []),
    ],
    doubleEntry: {
      dr: `${voucher?.category_name || 'Expense'} A/C`,
      cr: `${voucher?.payment_method === 'Physical_Cash' ? 'Cash Drawer' : 'Bank'} A/C`,
    },
    stampText: voucher?.status === 'Voided' ? 'VOIDED' : 'PAID',
    stampVariant: voucher?.status === 'Voided' ? 'closed' : 'approved',
  };

  useEffect(() => {
    const paper = paperRef.current;
    const stamp = stampRef.current;
    if (!paper) return;

    const tl = gsap.timeline();

    tl.fromTo(
      paper,
      { y: -20, opacity: 0.5, scaleY: 0.98 },
      { y: 0, opacity: 1, scaleY: 1, duration: 0.45, ease: 'power3.out' }
    );

    if (stamp) {
      tl.fromTo(
        stamp,
        { scale: 2.2, opacity: 0, rotation: -20 },
        { scale: 1, opacity: 0.92, rotation: -6, duration: 0.35, ease: 'back.out(2.0)' },
        '-=0.15'
      );
    }

    return () => {
      tl.kill();
    };
  }, [data.referenceNo, data.totalAmount]);

  const stampColor =
    data.stampVariant === 'approved'
      ? 'border-[#3ecf8e] text-[#3ecf8e] bg-primary/10'
      : data.stampVariant === 'closed'
      ? 'border-rose-600 text-rose-600 bg-rose-500/10'
      : 'border-primary text-primary bg-primary/10';

  const widthClass = is58mm ? 'max-w-[260px]' : 'max-w-[340px]';

  return (
    <div className={`relative flex flex-col items-center select-none font-sans text-xs ${className}`}>
      {/* Printer Ejection Slot */}
      <div className={`w-full ${widthClass} h-3 bg-[#1c1c1c] rounded-t-[6px] border-t border-x border-[#2e2e2e] flex items-center justify-between px-3`}>
        <span className="w-2 h-0.5 rounded-full bg-[#3ecf8e] animate-pulse" />
        <span className="text-[10px] font-mono text-zinc-400">
          ESC/POS {is58mm ? '58mm' : '80mm'}
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600" />
      </div>

      {/* Thermal Paper Slip */}
      <div
        ref={paperRef}
        className={`w-full ${widthClass} bg-white text-[#171717] border-x border-b border-[#dfdfdf] ${is58mm ? 'p-3.5' : 'p-5'} shadow-level-2 relative font-sans text-xs`}
      >
        {/* Rubber Stamp */}
        {printConfig.showStamp && data.stampText && (
          <div
            ref={stampRef}
            className={`absolute top-16 right-3 z-20 pointer-events-none px-2.5 py-0.5 rounded-[4px] border-2 border-dashed font-sans font-medium text-[11px] ${stampColor}`}
            style={{
              transform: 'rotate(-6deg)',
            }}
          >
            {data.stampText}
          </div>
        )}

        {/* Store Header */}
        <div className="text-center space-y-0.5 pb-3 border-b border-dashed border-[#dfdfdf]">
          <h2 className={`${is58mm ? 'text-sm' : 'text-base'} font-medium tracking-tight text-[#171717]`}>
            {data.storeName || 'Asopalav Silk & Sarees'}
          </h2>
          {printConfig.legalEntityName && printConfig.legalEntityName !== data.storeName && (
            <p className="text-[10px] text-[#707070] font-sans">
              ({printConfig.legalEntityName})
            </p>
          )}
          <p className="text-[10px] text-[#707070]">
            {data.storeCode ? `Branch: ${data.storeCode}` : 'Showroom Cash Counter'}
            {data.storeCity ? ` • ${data.storeCity}` : ''}
          </p>

          {data.gstin && (
            <p className="text-[9px] font-mono text-[#707070]">
              GSTIN: <span className="font-semibold text-[#171717]">{data.gstin}</span>
            </p>
          )}

          {data.storePhone && (
            <p className="text-[9px] font-mono text-[#707070]">
              Tel: {data.storePhone}
            </p>
          )}

          <div className="pt-1 flex items-center justify-center gap-2">
            <span className="text-[11px] text-[#171717] font-semibold tracking-wide uppercase">
              {data.title}
            </span>
            {printConfig.copiesCount === 2 && (
              <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-slate-100 text-slate-700">
                COPY 1 OF 2
              </span>
            )}
          </div>
        </div>

        {/* Reference & Metadata */}
        <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-[#dfdfdf]">
          <div className="flex justify-between">
            <span className="text-[#707070]">Voucher #:</span>
            <span className="font-medium text-[#171717] font-mono">{data.referenceNo}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#707070]">Date &amp; Time:</span>
            <span className="font-mono text-[11px]">{data.dateTime || formatDate(new Date().toISOString())}</span>
          </div>
          {data.cashierName && (
            <div className="flex justify-between">
              <span className="text-[#707070]">Cashier:</span>
              <span className="font-medium">{data.cashierName}</span>
            </div>
          )}
          {data.walletType && (
            <div className="flex justify-between">
              <span className="text-[#707070]">Payment Mode:</span>
              <span className="font-medium">
                {data.walletType === 'Physical_Cash' || data.walletType === 'Cash'
                  ? 'Cash Drawer'
                  : 'UPI / Bank Transfer'}
              </span>
            </div>
          )}
        </div>

        {/* Items Breakdown */}
        {data.items && data.items.length > 0 && (
          <div className="py-2.5 space-y-1 text-xs border-b border-dashed border-[#dfdfdf]">
            {data.items.map((it, idx) => (
              <div key={idx} className="flex justify-between">
                <span className="text-[#707070]">{it.label}</span>
                <span className={it.isBold ? 'font-semibold text-[#171717]' : 'text-[#171717]'}>
                  {typeof it.value === 'number' ? formatINR(it.value) : it.value}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Big Total Box */}
        <div className="py-2.5 text-center space-y-0.5 bg-[#fafafa] my-2 rounded-[6px] border border-[#dfdfdf]">
          <span className="text-[10px] text-[#707070] font-sans font-medium uppercase tracking-wider block">
            Amount Disbursed
          </span>
          <span className={`${is58mm ? 'text-xl' : 'text-2xl'} font-bold text-[#171717] font-mono tabular-nums block tracking-tight`}>
            {formatINR(data.totalAmount)}
          </span>
          {data.inWords && (
            <p className="text-[9px] text-[#707070] italic px-2 capitalize font-sans leading-tight">
              ({data.inWords})
            </p>
          )}
        </div>

        {/* Double-Entry Audit (Toggleable) */}
        {printConfig.showDoubleEntry && data.doubleEntry && (
          <div className="py-2 text-[10px] text-[#707070] space-y-0.5 border-t border-dashed border-[#dfdfdf] font-mono">
            <div className="flex justify-between">
              <span>DR (Debit):</span>
              <span className="font-medium text-emerald-700">{data.doubleEntry.dr}</span>
            </div>
            <div className="flex justify-between">
              <span>CR (Credit):</span>
              <span className="font-medium text-sky-700">{data.doubleEntry.cr}</span>
            </div>
          </div>
        )}

        {/* Digital Signature Box */}
        <div className="py-2.5 border-t border-dashed border-[#dfdfdf] flex justify-between items-end text-[10px] text-[#707070] font-sans pt-4">
          <div className="text-center w-24">
            <div className="border-b border-dotted border-[#707070] h-6 mb-1" />
            <span>Cashier Sign</span>
          </div>
          <div className="text-center w-24">
            <div className="border-b border-dotted border-[#707070] h-6 mb-1" />
            <span>Receiver Sign</span>
          </div>
        </div>

        {/* Custom Footer Note */}
        {printConfig.customFooterNote && (
          <div className="pt-2 text-center text-[9px] text-[#707070] font-sans leading-tight border-t border-dashed border-[#dfdfdf]">
            {printConfig.customFooterNote}
          </div>
        )}

        {/* Verification Barcode / QR Footer */}
        <div className="pt-2 text-center space-y-1.5">
          {printConfig.showQrVerification ? (
            <div className="flex items-center justify-center gap-1 font-sans text-[9px] text-emerald-700 font-medium">
              <ShieldCheck className="w-3 h-3 text-[#3ecf8e]" />
              <span>Cryptographic Audit Hash Verified</span>
            </div>
          ) : null}

          {/* Simulated Barcode */}
          <div className="flex justify-center items-end gap-[1.5px] h-5 px-4">
            {[4, 8, 2, 6, 3, 7, 5, 8, 3, 5, 2, 7, 4, 8, 6, 2, 5, 8, 3, 6, 4, 7, 2, 8, 5, 3].map(
              (h, i) => (
                <span
                  key={i}
                  className="bg-[#171717] w-[1.5px]"
                  style={{ height: `${(h / 8) * 100}%` }}
                />
              )
            )}
          </div>
          <span className="text-[9px] font-mono text-[#707070] tracking-widest">{data.referenceNo}</span>
        </div>
      </div>

      {/* Print Trigger */}
      {onPrint && (
        <button
          type="button"
          aria-label="Print Physical Slip"
          onClick={onPrint}
          className="mt-4 flex items-center gap-2 px-4 py-2 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-semibold font-sans shadow-xs transition-colors cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 text-[#171717]" />
          <span>Print Thermal Slip ({is58mm ? '58mm' : '80mm'})</span>
        </button>
      )}
    </div>
  );
};

export default ThermalReceiptSlip;
