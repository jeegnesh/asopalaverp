import { ExpenseVoucher, StaffAdvance, WalletLedger, BranchWallet, SecurityAuditLog } from '@/types/database';

export const SEED_BRANCH_WALLETS: Record<string, BranchWallet> = {
  'Aellp-ASI': { branch_id: 'Aellp-ASI', cash_balance: 0, upi_balance: 0 },
};

export const SEED_VOUCHERS: ExpenseVoucher[] = [];

export const SEED_STAFF_ADVANCES: StaffAdvance[] = [];

export const SEED_WALLET_LEDGER: WalletLedger[] = [];

export const SEED_AUDIT_LOGS: SecurityAuditLog[] = [];
