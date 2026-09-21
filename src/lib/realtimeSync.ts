import { supabase } from '@/lib/supabase';
import { useBranchStore } from '@/store/branchStore';
import { useVoucherStore } from '@/store/voucherStore';
import { BranchWallet, ExpenseVoucher } from '@/types/database';
import { showToast } from '@/components/ui/ToastContainer';
import { formatINR } from '@/lib/utils';

let isRealtimeInitialized = false;

/**
 * Initializes global Cloud Realtime WebSocket listener across all ERP tables.
 * Replaces polling loops with instant persistent push notifications to React state and animated toasts.
 */
export function initRealtimeSync() {
  if (isRealtimeInitialized) return;
  isRealtimeInitialized = true;

  try {
    const channel = supabase
      .channel('asopalav-live-sync')
      // 1. Live wallet balance updates (cashier payouts, safe drops & float top-ups)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branch_wallets' },
        (payload) => {
          if (payload.new) {
            const updatedWallet = payload.new as BranchWallet;
            const branchStore = useBranchStore.getState();
            branchStore.setWallets({
              ...branchStore.wallets,
              [updatedWallet.branch_id]: updatedWallet,
            });
            window.dispatchEvent(new CustomEvent('asopalav:wallet-updated', { detail: updatedWallet }));
          }
        }
      )
      // 2. Live expense vouchers (INSERT, UPDATE, DELETE)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'expense_vouchers' },
        (payload) => {
          if (payload.new) {
            const newVoucher = payload.new as ExpenseVoucher;
            useVoucherStore.getState().addVoucherLocally(newVoucher);
            useVoucherStore.getState().invalidateVouchers(newVoucher.branch_id);
            window.dispatchEvent(new CustomEvent('asopalav:vouchers-updated', { detail: { action: 'INSERT', voucher: newVoucher } }));
            window.dispatchEvent(new Event('asopalav:wallet-updated'));
            
            showToast({
              type: 'activity',
              title: 'Live Bill Recorded',
              message: `Bill #${newVoucher.voucher_number} (${formatINR(newVoucher.total_amount)}) saved live.`,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'expense_vouchers' },
        (payload) => {
          if (payload.new) {
            const updatedVoucher = payload.new as ExpenseVoucher;
            useVoucherStore.getState().updateVoucherLocally(updatedVoucher);
            useVoucherStore.getState().invalidateVouchers(updatedVoucher.branch_id);
            window.dispatchEvent(new CustomEvent('asopalav:vouchers-updated', { detail: { action: 'UPDATE', voucher: updatedVoucher } }));
            window.dispatchEvent(new Event('asopalav:wallet-updated'));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'expense_vouchers' },
        (payload) => {
          if (payload.old) {
            const oldVoucher = payload.old as Partial<ExpenseVoucher>;
            if (oldVoucher.voucher_number) {
              useVoucherStore.getState().removeVoucherLocally(oldVoucher.voucher_number, oldVoucher.branch_id);
              useVoucherStore.getState().invalidateVouchers(oldVoucher.branch_id);
              window.dispatchEvent(new CustomEvent('asopalav:vouchers-updated', { detail: { action: 'DELETE', voucher: oldVoucher } }));
              window.dispatchEvent(new Event('asopalav:wallet-updated'));
              
              showToast({
                type: 'warning',
                title: 'Expense Removed',
                message: `Bill #${oldVoucher.voucher_number} was removed.`,
              });
            }
          }
        }
      )
      // 3. Live Staff Advances (Disbursements, settlements, waivers, salary deduction tags)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_advances' },
        () => {
          window.dispatchEvent(new Event('asopalav:advances-updated'));
          window.dispatchEvent(new Event('asopalav:wallet-updated'));
        }
      )
      // 4. Live Master Data (Categories, Departments, Couriers, Staff Members, Branches)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'expense_categories' },
        () => {
          useVoucherStore.getState().invalidateMasterData();
          window.dispatchEvent(new CustomEvent('asopalav:master-data-updated', { detail: { table: 'expense_categories' } }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'departments' },
        () => {
          useVoucherStore.getState().invalidateMasterData();
          window.dispatchEvent(new CustomEvent('asopalav:master-data-updated', { detail: { table: 'departments' } }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'courier_partners' },
        () => {
          useVoucherStore.getState().invalidateMasterData();
          window.dispatchEvent(new CustomEvent('asopalav:master-data-updated', { detail: { table: 'courier_partners' } }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'staff_members' },
        () => {
          useVoucherStore.getState().invalidateMasterData();
          window.dispatchEvent(new CustomEvent('asopalav:master-data-updated', { detail: { table: 'staff_members' } }));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'branches' },
        () => {
          useBranchStore.getState().fetchBranchesAndWallets(true);
          useVoucherStore.getState().invalidateMasterData();
          window.dispatchEvent(new CustomEvent('asopalav:master-data-updated', { detail: { table: 'branches' } }));
        }
      )
      // 5. Live App Users, Roles & Permissions
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_users' },
        () => {
          window.dispatchEvent(new Event('asopalav:users-roles-updated'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_roles' },
        () => {
          window.dispatchEvent(new Event('asopalav:users-roles-updated'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        () => {
          window.dispatchEvent(new Event('asopalav:users-roles-updated'));
        }
      )
      // 6. Live Ledger, Float Topups, Safe Drops, Closings
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wallet_ledger' },
        () => {
          window.dispatchEvent(new Event('asopalav:ledger-updated'));
          window.dispatchEvent(new Event('asopalav:wallet-updated'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'float_allocations' },
        () => {
          window.dispatchEvent(new Event('asopalav:ledger-updated'));
          window.dispatchEvent(new Event('asopalav:wallet-updated'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'cash_closings' },
        () => {
          window.dispatchEvent(new Event('asopalav:ledger-updated'));
          window.dispatchEvent(new Event('asopalav:wallet-updated'));
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'drawer_sessions' },
        () => {
          window.dispatchEvent(new Event('asopalav:ledger-updated'));
          window.dispatchEvent(new Event('asopalav:wallet-updated'));
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('[Realtime] Connected to live sync channel.');
        } else if (status === 'CHANNEL_ERROR') {
          console.warn('[Realtime] Channel error, will auto-retry:', err);
        } else if (status === 'TIMED_OUT') {
          console.warn('[Realtime] Channel timed out. Check Supabase plan limits.');
        }
      });

    return () => {
      supabase.removeChannel(channel);
      isRealtimeInitialized = false;
    };
  } catch (err) {
    console.warn('Realtime channel fallback:', err);
  }
}
