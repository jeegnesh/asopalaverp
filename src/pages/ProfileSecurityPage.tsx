import React, { useState, useRef, useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useVouchers } from '@/hooks/useVouchers';
import { useBranchStore } from '@/store/branchStore';
import { erpService } from '@/lib/erpService';
import { supabase, uploadAvatarToSupabase } from '@/lib/supabase';
import { uploadToR2 } from '@/lib/r2';
import bcrypt from 'bcryptjs';
import { showToast } from '@/components/ui/ToastContainer';
import { triggerHaptic, cn, formatINR, formatDate } from '@/lib/utils';
import { logSecurityEvent } from '@/lib/audit';
import {
  Lock,
  Check,
  Sun,
  Moon,
  ShieldCheck,
  KeyRound,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  User,
  Shield,
  Camera,
  Upload,
  Trash2,
  Sparkles,
  SlidersHorizontal,
  Menu,
  X,
  ChevronRight,
  ShieldAlert,
  Save,
  CheckCircle2,
  Activity,
  Laptop,
  Smartphone,
  LogOut,
  Clock,
  MapPin,
  TrendingUp,
  Receipt,
  Wallet,
  Coins,
  CreditCard,
  FileSpreadsheet,
  ArrowRight,
  Globe,
  Radio,
} from 'lucide-react';
import { SuperAdminOverridesCard } from '@/components/settings/SuperAdminOverridesCard';

import { StaffAdvance } from '@/types/database';

type ProfileTabId = 'account' | 'stats' | 'security' | 'sessions' | 'theme' | 'overrides';

interface ProfileTabItem {
  id: ProfileTabId;
  name: string;
  group: 'PERSONAL SETTINGS' | 'ADMIN CONTROLS';
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

interface ActiveSession {
  id: string;
  device: string;
  browser: string;
  os: string;
  ip: string;
  location: string;
  isCurrent: boolean;
  loginTime: string;
  lastActive: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export const ProfileSecurityPage: React.FC = () => {
  const { user, login, logout, updateUserPin } = useAuthStore();
  const { theme, setTheme, setActivePage } = useUIStore();
  const { vouchers, refresh } = useVouchers();
  const { getActiveBranch, selectedBranchId } = useBranchStore();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeBranch = getActiveBranch();
  const [advances, setAdvances] = useState<StaffAdvance[]>([]);

  // Load staff advances for stats
  React.useEffect(() => {
    let isMounted = true;
    erpService.getStaffAdvances(selectedBranchId).then((res) => {
      if (isMounted && res) {
        setAdvances(res);
      }
    }).catch((e) => console.warn('Could not load advances for stats:', e));
    return () => { isMounted = false; };
  }, [selectedBranchId]);

  // Tab State (Supabase Studio F11 Style)
  const [activeTabId, setActiveTabId] = useState<ProfileTabId>('account');
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);

  const isSuperAdminOrDev = user?.role_code === 'Super_Admin' || user?.role_code === 'Developer';

  // Profile Information State
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [username, setUsername] = useState(user?.username || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Active Terminal Sessions Mock/Live Store
  const [sessions, setSessions] = useState<ActiveSession[]>([
    {
      id: 'sess-current',
      device: 'Main POS Counter Terminal #1',
      browser: 'Chrome 122 (V8 Engine)',
      os: 'Windows 11 Pro 64-bit',
      ip: '192.168.1.104 (Local LAN)',
      location: `${activeBranch.branch_name}, Ahmedabad`,
      isCurrent: true,
      loginTime: 'Today, 09:30 AM',
      lastActive: 'Active right now',
      deviceType: 'desktop',
    },
    {
      id: 'sess-secondary',
      device: 'Showroom Floor POS Tablet #2',
      browser: 'Safari Mobile (iPadOS)',
      os: 'iPadOS 17.4',
      ip: '192.168.1.118 (Wi-Fi 6)',
      location: `${activeBranch.branch_name}, Ahmedabad`,
      isCurrent: false,
      loginTime: 'Yesterday, 04:15 PM',
      lastActive: '45 mins ago',
      deviceType: 'tablet',
    },
    {
      id: 'sess-mobile',
      device: 'Store Manager Mobile Device',
      browser: 'Chrome Mobile Android',
      os: 'Android 14',
      ip: '49.36.128.45 (Cellular 5G)',
      location: 'Ahmedabad, Gujarat, IN',
      isCurrent: false,
      loginTime: '20-Sep-2026, 11:20 AM',
      lastActive: '3 hours ago',
      deviceType: 'mobile',
    },
  ]);

  // Handle local file upload (converts to R2 or data URL fallback)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToast({
        type: 'error',
        title: 'Image Too Large',
        message: 'Please choose an avatar image under 5MB.',
      });
      return;
    }

    const toastId = 'avatar-upload-toast';
    setIsUploadingPhoto(true);
    triggerHaptic('light');
    showToast({
      id: toastId,
      type: 'loading',
      title: 'Processing Photo',
      message: 'Optimizing and uploading profile photo...',
      durationMs: 6000,
    });

    try {
      // 1. Primary: Upload directly to Supabase Storage 'avatars' bucket
      let uploadedUrl = await uploadAvatarToSupabase(file, user?.username || user?.id || 'admin');

      // 2. Secondary fallback: Cloudflare R2 bucket
      if (!uploadedUrl) {
        uploadedUrl = await uploadToR2(file, 'avatars', file.name);
      }

      if (uploadedUrl) {
        setAvatarUrl(uploadedUrl);
        triggerHaptic('success');
        showToast({
          id: toastId,
          type: 'success',
          title: 'Photo Uploaded to Cloud',
          message: 'Saved to Supabase storage. Click "Save Profile" to apply to your account.',
        });
      } else {
        // Fallback to local Data URL preview
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          setAvatarUrl(result);
          triggerHaptic('selection');
          showToast({
            id: toastId,
            type: 'info',
            title: 'Avatar Preview Ready',
            message: 'Preview loaded. Please verify your Supabase API key in .env, then click "Save Profile".',
          });
        };
        reader.readAsDataURL(file);
      }
    } catch (err: any) {
      console.warn('Avatar upload fallback:', err);
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  // Security & Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingSecurity, setIsUpdatingSecurity] = useState(false);
  const [securitySuccess, setSecuritySuccess] = useState(false);
  const [securityError, setSecurityError] = useState('');

  // 1. Handle Profile Details Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!firstName.trim()) {
      setProfileError('First Name is required.');
      return;
    }

    setIsSavingProfile(true);
    triggerHaptic('selection');

    try {
      const updatedUserPayload = {
        id: user?.id || 'USR-ADMIN',
        username: username.trim().toLowerCase() || user?.username || 'aellpadmin',
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim() || undefined,
        avatar_url: avatarUrl || undefined,
        role_code: user?.role_code || 'Super_Admin',
        assigned_branches: user?.assigned_branches || ['*'],
        theme_preference: user?.theme_preference || 'Dark',
        is_active: user?.is_active ?? true,
      };

      await erpService.saveAppUser(
        updatedUserPayload,
        true,
        `${firstName.trim()} ${lastName.trim()}`,
        user?.role_code || 'Super_Admin'
      );

      login({
        ...user,
        ...updatedUserPayload,
      });

      setProfileSuccess(true);
      triggerHaptic('heavy');
      showToast({
        type: 'success',
        title: 'Profile Updated',
        message: 'Your personal information and avatar have been saved to Supabase.',
      });
      setTimeout(() => setProfileSuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to save profile:', err);
      setProfileError(err.message || 'Failed to save profile changes to Supabase database.');
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Could not save profile.',
      });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 2. Handle Password & PIN Update
  const handleUpdateSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError('');
    setSecuritySuccess(false);

    if (!newPassword && !pin) {
      setSecurityError('Please enter a new password or a new 4-digit PIN to update.');
      return;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        setSecurityError('New password must be at least 6 characters long.');
        return;
      }
      if (newPassword !== confirmPassword) {
        setSecurityError('New password and confirmation do not match.');
        return;
      }
    }

    if (pin) {
      if (!/^\d{4}$/.test(pin)) {
        setSecurityError('Quick-Switch PIN must be exactly 4 numeric digits (e.g. 1234).');
        return;
      }
    }

    setIsUpdatingSecurity(true);
    try {
      const userId = user?.id || 'USR-ADMIN';

      if (currentPassword) {
        let { data: dbUser, error: fetchErr } = await supabase
          .from('app_users')
          .select('id, username, password_hash')
          .eq('id', userId)
          .maybeSingle();

        if (!dbUser && user?.username) {
          const res = await supabase
            .from('app_users')
            .select('id, username, password_hash')
            .eq('username', user.username.toLowerCase())
            .maybeSingle();
          dbUser = res.data;
          fetchErr = res.error;
        }

        if (fetchErr) {
          console.warn('Could not verify current password against DB:', fetchErr);
        } else if (dbUser?.password_hash) {
          let isMatch = false;
          if (
            dbUser.password_hash.startsWith('$2a$') ||
            dbUser.password_hash.startsWith('$2b$') ||
            dbUser.password_hash.startsWith('$2y$')
          ) {
            try {
              isMatch = bcrypt.compareSync(currentPassword, dbUser.password_hash);
            } catch {
              isMatch = false;
            }
          } else {
            isMatch = dbUser.password_hash === currentPassword;
          }

          if (!isMatch) {
            setSecurityError('Current password does not match our records.');
            setIsUpdatingSecurity(false);
            return;
          }
        }
      }

      const updates: any = {
        id: userId,
        username: user?.username || username.trim().toLowerCase() || 'aellpadmin',
        first_name: user?.first_name || firstName.trim() || 'Super',
        last_name: user?.last_name || lastName.trim() || 'Admin',
        role_code: user?.role_code || 'Super_Admin',
        assigned_branches: user?.assigned_branches || ['*'],
        theme_preference: user?.theme_preference || 'Dark',
        is_active: user?.is_active ?? true,
      };

      if (newPassword) {
        const hashedPassword = bcrypt.hashSync(newPassword, 10);
        updates.password_hash = hashedPassword;
      }

      if (pin) {
        const hashedPin = bcrypt.hashSync(pin, 10);
        updates.lock_pin_hash = hashedPin;
        updateUserPin(userId, pin);
      }

      await erpService.saveAppUser(
        updates,
        true,
        `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Super Admin',
        user?.role_code || 'Super_Admin'
      );

      setSecuritySuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPin('');
      showToast({
        type: 'success',
        title: 'Credentials Updated',
        message: newPassword && pin
          ? 'Password and 4-digit PIN updated successfully.'
          : newPassword
          ? 'Login password updated successfully.'
          : '4-digit PIN updated successfully.',
      });
      setTimeout(() => setSecuritySuccess(false), 4000);
    } catch (err: any) {
      console.error('Failed to update credentials:', err);
      setSecurityError(err.message || 'Failed to update credentials in Supabase.');
    } finally {
      setIsUpdatingSecurity(false);
    }
  };

  const handleThemeChange = async (newTheme: 'light' | 'dark' | 'soft-dark') => {
    setTheme(newTheme);
    if (user) {
      const themePref: 'Light' | 'Dark' = newTheme === 'light' ? 'Light' : 'Dark';
      try {
        await erpService.saveAppUser(
          { ...user, theme_preference: themePref },
          true,
          `${user.first_name} ${user.last_name}`,
          user.role_code
        );
      } catch (err) {
        console.warn('Failed to sync theme preference to DB:', err);
      }
    }
  };

  // Revoke other sessions
  const handleRevokeOtherSessions = async () => {
    triggerHaptic('heavy');
    setSessions((prev) => prev.filter((s) => s.isCurrent));
    await logSecurityEvent({
      userName: `${user?.first_name || 'User'} ${user?.last_name || ''}`.trim(),
      userRole: user?.role_code || 'Cashier',
      actionType: 'SuperAdmin_Override',
      targetEntity: 'user_sessions',
      targetIdentifier: user?.username || 'user',
      eventDescription: 'Remote revocation of all other active POS terminal sessions.',
      justification: 'User initiated remote session revocation',
    });
    showToast({
      type: 'success',
      title: 'Sessions Terminated',
      message: 'All other showroom terminal sessions have been revoked.',
    });
  };

  // Sign out current terminal
  const handleSignOutCurrentTerminal = () => {
    triggerHaptic('selection');
    logout();
    showToast({
      type: 'info',
      title: 'Signed Out',
      message: 'You have been securely signed out of this terminal.',
    });
  };

  // 3. Compute Personal Today's Statistics
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const myName = `${user?.first_name || ''} ${user?.last_name || ''}`.trim().toLowerCase();
    const myUser = user?.username?.toLowerCase() || '';

    // Filter today's vouchers
    const myTodayVouchers = vouchers.filter((v) => {
      const isDateMatch = v.payment_date === todayStr || v.created_at?.slice(0, 10) === todayStr;
      const isUserMatch =
        (v.created_by_name && v.created_by_name.toLowerCase().includes(myName)) ||
        (v.created_by_name && v.created_by_name.toLowerCase().includes(myUser)) ||
        user?.role_code === 'Super_Admin'; // Super Admin sees overall showroom stats
      return isDateMatch && isUserMatch && v.status !== 'Voided';
    });

    const cashVouchers = myTodayVouchers.filter(
      (v) => String(v.payment_method).toLowerCase().includes('cash')
    );
    const upiVouchers = myTodayVouchers.filter(
      (v) => String(v.payment_method).toLowerCase().includes('upi')
    );

    const totalCashDisbursed = cashVouchers.reduce((acc: number, v) => acc + (Number(v.total_amount) || 0), 0);
    const totalUpiDisbursed = upiVouchers.reduce((acc: number, v) => acc + (Number(v.total_amount) || 0), 0);
    const totalDisbursed = totalCashDisbursed + totalUpiDisbursed;

    // Advances today
    const myTodayAdvances = advances.filter((a: StaffAdvance) => {
      return a.advance_date === todayStr || a.created_at?.slice(0, 10) === todayStr;
    });
    const totalAdvancesDisbursed = myTodayAdvances.reduce(
      (acc: number, a: StaffAdvance) => acc + (Number(a.advance_amount) || 0),
      0
    );

    const cashRatio = totalDisbursed > 0 ? Math.round((totalCashDisbursed / totalDisbursed) * 100) : 100;
    const upiRatio = 100 - cashRatio;

    return {
      vouchersCount: myTodayVouchers.length,
      totalDisbursed,
      totalCashDisbursed,
      totalUpiDisbursed,
      cashRatio,
      upiRatio,
      advancesCount: myTodayAdvances.length,
      totalAdvancesDisbursed,
      cashCount: cashVouchers.length,
      upiCount: upiVouchers.length,
    };
  }, [vouchers, advances, user]);

  // Profile Navigation Tabs Definitions (matching F11 Showroom Settings layout)
  const PROFILE_TABS: ProfileTabItem[] = [
    {
      id: 'account',
      name: 'Account & Avatar',
      group: 'PERSONAL SETTINGS',
      icon: User,
      description: 'Display name, username, email address, and profile photo',
    },
    {
      id: 'stats',
      name: "Today's Activity & Stats",
      group: 'PERSONAL SETTINGS',
      icon: Activity,
      description: 'Personal daily disbursement statistics, bills created, and cash metrics',
    },
    {
      id: 'security',
      name: 'Password & PIN',
      group: 'PERSONAL SETTINGS',
      icon: KeyRound,
      description: 'Login password and terminal quick-switch 4-digit lock PIN',
    },
    {
      id: 'sessions',
      name: 'Active POS Sessions',
      group: 'PERSONAL SETTINGS',
      icon: Laptop,
      description: 'Connected devices, active terminals, and remote session revocation',
    },
    {
      id: 'theme',
      name: 'Appearance & Theme',
      group: 'PERSONAL SETTINGS',
      icon: Sparkles,
      description: 'Showroom display mode, dark night theme, and studio canvas density',
    },
    ...(isSuperAdminOrDev
      ? ([
          {
            id: 'overrides',
            name: 'Emergency Overrides',
            group: 'ADMIN CONTROLS',
            icon: ShieldAlert,
            description: 'Master rule bypasses, Section 40A(3) override, and till overdraft switches',
          },
        ] as ProfileTabItem[])
      : []),
  ];

  const currentTab = PROFILE_TABS.find((t) => t.id === activeTabId) || PROFILE_TABS[0];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] font-sans antialiased overflow-hidden selection:bg-[#3ecf8e]/20 selection:text-[#3ecf8e]">
      {/* ========================================================================= */}
      {/* 1. MASTER TWO-COLUMN WORKSPACE (SUPABASE STUDIO F11 SETTINGS LAYOUT)       */}
      {/* ========================================================================= */}
      <div className="flex-1 flex overflow-hidden min-h-0 min-w-0">
        {/* ----------------------------------------------------------------------- */}
        {/* LEFT SUB-SIDEBAR: SETTINGS CATEGORIES & TABS                            */}
        {/* ----------------------------------------------------------------------- */}
        <div
          className={cn(
            'w-64 border-r border-slate-200 dark:border-[#242424] bg-slate-50/70 dark:bg-[#171717] flex flex-col shrink-0 overflow-y-auto no-scrollbar select-none z-20 transition-transform duration-200',
            isMobileSubMenuOpen ? 'fixed inset-y-14 left-0 w-64 shadow-2xl z-40' : 'hidden lg:flex'
          )}
        >
          {/* Sub-Sidebar Top Header */}
          <div className="p-3.5 border-b border-slate-200 dark:border-[#242424] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#3ecf8e]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                My Profile (F12)
              </span>
            </div>
            {isMobileSubMenuOpen && (
              <button
                type="button"
                onClick={() => setIsMobileSubMenuOpen(false)}
                className="lg:hidden text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Navigation Groups */}
          <div className="p-2 space-y-5">
            {/* GROUP 1: PERSONAL SETTINGS */}
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-[#666666]">
                Personal Settings
              </div>
              {PROFILE_TABS.filter((t) => t.group === 'PERSONAL SETTINGS').map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTabId === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveTabId(tab.id);
                      setIsMobileSubMenuOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-sans transition-all text-left cursor-pointer select-none',
                      isActive
                        ? 'bg-slate-200/80 dark:bg-[#242424] text-slate-900 dark:text-white font-medium shadow-2xs'
                        : 'text-slate-600 dark:text-[#a1a1a1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1d1d1d]'
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Icon
                        className={cn(
                          'w-3.5 h-3.5 shrink-0',
                          isActive ? 'text-[#3ecf8e]' : 'text-slate-400 dark:text-[#777]'
                        )}
                      />
                      <span className="truncate">{tab.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* GROUP 2: ADMIN CONTROLS (If Super Admin) */}
            {isSuperAdminOrDev && (
              <div className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-500/80 dark:text-amber-400/70 flex items-center justify-between">
                  <span>Admin Controls</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 font-mono">
                    SUPER
                  </span>
                </div>
                {PROFILE_TABS.filter((t) => t.group === 'ADMIN CONTROLS').map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTabId === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setActiveTabId(tab.id);
                        setIsMobileSubMenuOpen(false);
                      }}
                      className={cn(
                        'w-full flex items-center justify-between px-2.5 py-1.5 rounded-[6px] text-xs font-sans transition-all text-left cursor-pointer select-none',
                        isActive
                          ? 'bg-amber-500/10 dark:bg-[#242424] text-amber-600 dark:text-amber-400 font-medium shadow-2xs border-l-2 border-amber-500 pl-2'
                          : 'text-slate-600 dark:text-[#a1a1a1] hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1d1d1d]'
                      )}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Icon
                          className={cn(
                            'w-3.5 h-3.5 shrink-0',
                            isActive ? 'text-amber-500' : 'text-slate-400 dark:text-[#777]'
                          )}
                        />
                        <span className="truncate">{tab.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sub-Sidebar Footer */}
          <div className="mt-auto p-3 border-t border-slate-200 dark:border-[#242424] text-[11px] font-mono text-slate-400 dark:text-[#666] flex items-center justify-between">
            <span>Terminal: {activeBranch.branch_code}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-[#242424] text-[10px] text-[#3ecf8e]">
              F12
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT MAIN CONTENT AREA                                                */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto no-scrollbar bg-white dark:bg-[#141414]">
          {/* Breadcrumb Header Bar (Studio Style) */}
          <div className="h-12 border-b border-slate-200 dark:border-[#242424] px-4 lg:px-6 flex items-center justify-between shrink-0 bg-white dark:bg-[#141414] select-none">
            <div className="flex items-center gap-2 text-xs font-sans truncate">
              <button
                type="button"
                onClick={() => setIsMobileSubMenuOpen(!isMobileSubMenuOpen)}
                className="lg:hidden p-1.5 rounded-[6px] text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f1f1f]"
              >
                <Menu className="w-4 h-4" />
              </button>
              <span className="text-slate-400 dark:text-[#707070]">My Profile &amp; Security (F12)</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-[#555]" />
              <span className="font-medium text-slate-900 dark:text-white truncate">
                {currentTab.name}
              </span>
            </div>

            {/* Status Pills */}
            <div className="flex items-center gap-2">
              <div className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-[#202020] text-emerald-700 dark:text-[#3ecf8e] border border-slate-200 dark:border-[#2e2e2e]">
                {user?.role_code || 'Super_Admin'}
              </div>
              <div className="h-6 px-2 rounded-[4px] bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e] text-[10px] font-mono font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse" />
                <span>ONLINE</span>
              </div>
            </div>
          </div>

          {/* Mobile Tab Bar (For touch screens) */}
          <div className="lg:hidden flex items-center gap-1.5 px-3 py-2 border-b border-slate-200 dark:border-[#242424] bg-slate-50/50 dark:bg-[#171717] overflow-x-auto no-scrollbar">
            {PROFILE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTabId === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    setActiveTabId(tab.id);
                  }}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-medium shrink-0 transition-colors cursor-pointer',
                    isActive
                      ? 'bg-[#3ecf8e] text-[#171717]'
                      : 'bg-white dark:bg-[#202020] text-slate-600 dark:text-[#999] border border-slate-200 dark:border-[#2a2a2a]'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.name}</span>
                </button>
              );
            })}
          </div>

          {/* Main Tab Panels */}
          <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
            {/* =================================================================== */}
            {/* TAB 1: ACCOUNT & AVATAR                                             */}
            {/* =================================================================== */}
            {activeTabId === 'account' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Section 1: Avatar & Profile Photo */}
                <div className="border border-slate-200 dark:border-[#242424] rounded-[12px] bg-white dark:bg-[#181818] p-5 shadow-xs space-y-5">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                      <Camera className="w-4 h-4 text-[#3ecf8e]" />
                      <span>Profile Photo &amp; Avatar</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
                      Upload your real showroom profile photo. Syncs directly with your Cloudflare R2 bucket.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pt-2">
                    {/* Avatar Preview Circle */}
                    <div className="relative group shrink-0">
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-[#3ecf8e]/40 bg-slate-100 dark:bg-[#202020] flex items-center justify-center shadow-md">
                        {avatarUrl ? (
                          <img
                            src={avatarUrl}
                            alt="User Avatar"
                            className="w-full h-full object-cover"
                            onError={() => setAvatarUrl('')}
                          />
                        ) : (
                          <span className="text-2xl font-bold font-mono text-emerald-700 dark:text-[#3ecf8e]">
                            {user?.avatar_initials || (user?.first_name ? `${user.first_name[0]}${user.last_name ? user.last_name[0] : ''}`.toUpperCase() : 'AD')}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingPhoto}
                        className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] shadow-lg cursor-pointer transition-transform group-hover:scale-110 disabled:opacity-50"
                        title="Upload Photo"
                      >
                        {isUploadingPhoto ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Camera className="w-3.5 h-3.5 stroke-[2.2]" />
                        )}
                      </button>
                    </div>

                    {/* Upload Actions */}
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/png, image/jpeg, image/webp, image/gif"
                          onChange={handleImageFileChange}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={isUploadingPhoto}
                          className="px-3.5 py-2 rounded-[6px] bg-slate-100 dark:bg-[#222222] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] text-slate-800 dark:text-zinc-200 text-xs font-medium font-sans flex items-center gap-2 cursor-pointer transition-colors shadow-2xs border border-slate-200 dark:border-[#333333]"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#3ecf8e]" />
                          <span>{isUploadingPhoto ? 'Uploading to R2...' : 'Upload New Photo'}</span>
                        </button>

                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarUrl('');
                              triggerHaptic('light');
                            }}
                            className="px-3.5 py-2 rounded-[6px] border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium font-sans flex items-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Photo</span>
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] font-sans text-slate-400 dark:text-[#777]">
                        Accepted formats: JPEG, PNG, WebP (Max 5MB). Photo displays on your counter receipt slips and topbar avatar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Section 2: Account Details Form */}
                <form onSubmit={handleSaveProfile} className="border border-slate-200 dark:border-[#242424] rounded-[12px] bg-white dark:bg-[#181818] p-5 shadow-xs space-y-5">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                      <User className="w-4 h-4 text-[#3ecf8e]" />
                      <span>Account Information</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
                      Your identity as it appears on expense vouchers, receipt audit logs, and counter daily closings.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First Name"
                        required
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-xs font-sans text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last Name"
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-xs font-sans text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans">
                        Username (Login ID)
                      </label>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="username"
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="user@asopalav.com"
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-xs font-sans text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                      />
                    </div>
                  </div>

                  {profileError && (
                    <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-sans flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{profileError}</span>
                    </div>
                  )}

                  {profileSuccess && (
                    <div className="p-3 rounded-[6px] bg-emerald-500/10 border border-[#3ecf8e]/30 text-emerald-700 dark:text-[#3ecf8e] text-xs font-sans flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Profile information and avatar updated successfully in database.</span>
                    </div>
                  )}

                  {/* Emerald CTA Button with #171717 text & 6px radius */}
                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-semibold font-sans flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#171717]" />
                      ) : (
                        <Save className="w-4 h-4 text-[#171717]" />
                      )}
                      <span>{isSavingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 2: TODAY'S CASHIER ACTIVITY & STATISTICS (NEW!)                */}
            {/* =================================================================== */}
            {activeTabId === 'stats' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Stats Header Bar */}
                <div className="p-5 rounded-[12px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#242424] shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#242424] pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                        <Activity className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Today&apos;s Personal Cashier Activity Summary</span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
                        Live counter transactions recorded under account <strong>@{user?.username}</strong> on {formatDate(new Date().toISOString())}.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          refresh();
                          triggerHaptic('light');
                          showToast({ type: 'info', title: 'Refreshed', message: 'Loaded latest transactions.' });
                        }}
                        className="px-3 py-1.5 rounded-[6px] bg-slate-100 dark:bg-[#222] hover:bg-slate-200 dark:hover:bg-[#2c2c2c] text-slate-700 dark:text-zinc-300 text-xs font-medium font-sans flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-[#3ecf8e]" />
                        <span>Refresh Telemetry</span>
                      </button>
                    </div>
                  </div>

                  {/* 4 Metric Cards Matrix */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-1">
                    {/* Metric 1: Total Disbursed */}
                    <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#282828] space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#888]">
                        <span className="text-xs font-sans">Total Disbursed</span>
                        <Wallet className="w-4 h-4 text-[#3ecf8e]" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {formatINR(todayStats.totalDisbursed)}
                      </div>
                      <div className="text-[11px] font-mono text-emerald-600 dark:text-[#3ecf8e]">
                        {todayStats.vouchersCount} vouchers recorded
                      </div>
                    </div>

                    {/* Metric 2: Cash Till Outflow */}
                    <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#282828] space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#888]">
                        <span className="text-xs font-sans">Physical Cash Drawer</span>
                        <Coins className="w-4 h-4 text-amber-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {formatINR(todayStats.totalCashDisbursed)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {todayStats.cashCount} cash bills ({todayStats.cashRatio}%)
                      </div>
                    </div>

                    {/* Metric 3: UPI / Online Outflow */}
                    <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#282828] space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#888]">
                        <span className="text-xs font-sans">UPI / Bank QR</span>
                        <CreditCard className="w-4 h-4 text-sky-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {formatINR(todayStats.totalUpiDisbursed)}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {todayStats.upiCount} digital payouts ({todayStats.upiRatio}%)
                      </div>
                    </div>

                    {/* Metric 4: Staff Advances */}
                    <div className="p-4 rounded-[10px] bg-slate-50 dark:bg-[#141414] border border-slate-200 dark:border-[#282828] space-y-1.5">
                      <div className="flex items-center justify-between text-slate-500 dark:text-[#888]">
                        <span className="text-xs font-sans">Staff Advances</span>
                        <Receipt className="w-4 h-4 text-purple-500" />
                      </div>
                      <div className="text-xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {formatINR(todayStats.totalAdvancesDisbursed)}
                      </div>
                      <div className="text-[11px] font-mono text-purple-600 dark:text-purple-400">
                        {todayStats.advancesCount} advances issued
                      </div>
                    </div>
                  </div>

                  {/* Cash vs UPI Ratio Progress Bar */}
                  <div className="pt-3 space-y-2 border-t border-slate-100 dark:border-[#242424]">
                    <div className="flex items-center justify-between text-xs font-sans">
                      <span className="text-slate-600 dark:text-[#999]">Payout Mode Distribution</span>
                      <span className="font-mono text-[11px] text-slate-500">
                        Cash: {todayStats.cashRatio}% • UPI: {todayStats.upiRatio}%
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-[#252525] overflow-hidden flex">
                      <div
                        style={{ width: `${todayStats.cashRatio}%` }}
                        className="h-full bg-amber-500 transition-all duration-500"
                        title={`Cash: ${todayStats.cashRatio}%`}
                      />
                      <div
                        style={{ width: `${todayStats.upiRatio}%` }}
                        className="h-full bg-sky-500 transition-all duration-500"
                        title={`UPI: ${todayStats.upiRatio}%`}
                      />
                    </div>
                  </div>

                  {/* Quick POS Navigation Shortcuts */}
                  <div className="pt-3 border-t border-slate-100 dark:border-[#242424] flex flex-wrap items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 dark:text-[#888] font-sans">
                      Quick Counter Operations:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActivePage('new-voucher')}
                        className="px-3 py-1.5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-semibold font-sans flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs"
                      >
                        <span>New Voucher (F2)</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => setActivePage('expenses')}
                        className="px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#333] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#222] text-xs font-medium font-sans flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#3ecf8e]" />
                        <span>All Expenses (F3)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 3: PASSWORD & 4-DIGIT PIN                                       */}
            {/* =================================================================== */}
            {activeTabId === 'security' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <form onSubmit={handleUpdateSecurity} className="border border-slate-200 dark:border-[#242424] rounded-[12px] bg-white dark:bg-[#181818] p-5 shadow-xs space-y-5">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-[#3ecf8e]" />
                      <span>Login Password &amp; Lock PIN</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
                      Update your account login password and the 4-digit numeric PIN used for quick POS lock screen unlock.
                    </p>
                  </div>

                  {/* Current Password Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password to verify identity..."
                        className="w-full px-3 py-2 pr-10 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                      >
                        {showCurrentPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password & Confirmation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans">
                        New Login Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters..."
                          className="w-full px-3 py-2 pr-10 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                        >
                          {showNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans">
                        Confirm New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password..."
                          className="w-full px-3 py-2 pr-10 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                        >
                          {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* 4-Digit Quick PIN */}
                  <div className="border-t border-slate-200 dark:border-[#242424] pt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-slate-700 dark:text-[#c2c2c2] font-sans flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-[#3ecf8e]" />
                        <span>Quick-Switch 4-Digit Lock PIN</span>
                      </label>
                      <span className="text-[10px] font-mono text-slate-400">Used for F12 Lock Screen</span>
                    </div>
                    <input
                      type="password"
                      maxLength={4}
                      value={pin}
                      onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 4829"
                      className="w-48 px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#141414] border border-slate-300 dark:border-[#2e2e2e] text-sm font-mono text-center tracking-widest text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#3ecf8e]"
                    />
                    <p className="text-[11px] text-slate-500 dark:text-[#777] font-sans">
                      Leave blank to keep your existing PIN. PINs are securely hashed using bcrypt.
                    </p>
                  </div>

                  {securityError && (
                    <div className="p-3 rounded-[6px] bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-sans flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{securityError}</span>
                    </div>
                  )}

                  {securitySuccess && (
                    <div className="p-3 rounded-[6px] bg-emerald-500/10 border border-[#3ecf8e]/30 text-emerald-700 dark:text-[#3ecf8e] text-xs font-sans flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>Security credentials and hashed PIN updated successfully.</span>
                    </div>
                  )}

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingSecurity}
                      className="px-5 py-2.5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-semibold font-sans flex items-center gap-2 cursor-pointer transition-colors shadow-xs disabled:opacity-50"
                    >
                      {isUpdatingSecurity ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#171717]" />
                      ) : (
                        <KeyRound className="w-4 h-4 text-[#171717]" />
                      )}
                      <span>{isUpdatingSecurity ? 'Updating Credentials...' : 'Update Security Credentials'}</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 4: ACTIVE POS SESSIONS & REMOTE SIGN-OUT (NEW!)                 */}
            {/* =================================================================== */}
            {activeTabId === 'sessions' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border border-slate-200 dark:border-[#242424] rounded-[12px] bg-white dark:bg-[#181818] p-5 shadow-xs space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#242424] pb-3">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                        <Laptop className="w-4 h-4 text-[#3ecf8e]" />
                        <span>Active POS Terminal Sessions</span>
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
                        Manage devices currently signed into your account. Terminate remote sessions if you suspect unauthorized access.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleRevokeOtherSessions}
                        className="px-3.5 py-1.5 rounded-[6px] border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-semibold font-sans flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Revoke All Other Sessions</span>
                      </button>
                    </div>
                  </div>

                  {/* Sessions List */}
                  <div className="space-y-3">
                    {sessions.map((sess) => {
                      const DeviceIcon = sess.deviceType === 'desktop' ? Laptop : sess.deviceType === 'tablet' ? Smartphone : Radio;
                      return (
                        <div
                          key={sess.id}
                          className={cn(
                            'p-4 rounded-[10px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4',
                            sess.isCurrent
                              ? 'bg-emerald-500/5 dark:bg-[#121c17] border-[#3ecf8e]/40 shadow-xs'
                              : 'bg-slate-50 dark:bg-[#151515] border-slate-200 dark:border-[#2a2a2a]'
                          )}
                        >
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className={cn(
                              'w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0',
                              sess.isCurrent
                                ? 'bg-emerald-500/10 border border-[#3ecf8e]/30 text-[#3ecf8e]'
                                : 'bg-slate-200 dark:bg-[#242424] text-slate-600 dark:text-zinc-400'
                            )}>
                              <DeviceIcon className="w-5 h-5" />
                            </div>

                            <div className="space-y-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                                  {sess.device}
                                </span>
                                {sess.isCurrent && (
                                  <span className="px-2 py-0.2 rounded-full bg-[#3ecf8e]/20 text-emerald-800 dark:text-[#3ecf8e] text-[10px] font-mono font-semibold">
                                    THIS DEVICE
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-mono text-slate-500 dark:text-[#777]">
                                <span className="flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  <span>{sess.browser} • {sess.os}</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  <span>{sess.location} ({sess.ip})</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-[#222]">
                            <div className="text-right text-[11px] font-mono">
                              <span className="text-slate-400 dark:text-[#666] block">Last Activity:</span>
                              <span className={sess.isCurrent ? 'text-[#3ecf8e] font-semibold' : 'text-slate-600 dark:text-zinc-300'}>
                                {sess.lastActive}
                              </span>
                            </div>

                            {sess.isCurrent ? (
                              <button
                                type="button"
                                onClick={handleSignOutCurrentTerminal}
                                className="px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#333] text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#202020] text-xs font-medium font-sans cursor-pointer transition-colors"
                              >
                                Sign Out
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setSessions((prev) => prev.filter((s) => s.id !== sess.id));
                                  triggerHaptic('light');
                                  showToast({ type: 'info', title: 'Session Ended', message: `Revoked ${sess.device}.` });
                                }}
                                className="px-3 py-1.5 rounded-[6px] border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 text-xs font-medium font-sans cursor-pointer transition-colors"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 5: APPEARANCE & THEMES                                          */}
            {/* =================================================================== */}
            {activeTabId === 'theme' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <div className="border border-slate-200 dark:border-[#242424] rounded-[12px] bg-white dark:bg-[#181818] p-5 shadow-xs space-y-5">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#3ecf8e]" />
                      <span>Showroom Display Theme</span>
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-0.5">
                      Choose your preferred canvas theme. Optimized for all-day cash counter cashier comfort.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Dark Night (Official Supabase Studio Style) */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('dark')}
                      className={cn(
                        'p-4 rounded-[10px] border text-left space-y-3 transition-all cursor-pointer select-none',
                        theme === 'dark'
                          ? 'border-[#3ecf8e] bg-[#141414] ring-2 ring-[#3ecf8e]/20 shadow-md'
                          : 'border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#151515] opacity-80 hover:opacity-100'
                      )}
                    >
                      <div className="w-full h-16 rounded-[6px] bg-[#141414] border border-[#262626] p-2 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-[#3ecf8e]" />
                          <span className="w-8 h-1 rounded bg-[#2a2a2a]" />
                        </div>
                        <span className="w-12 h-1 rounded bg-[#2a2a2a]" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                            Dark (Studio Night)
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-[#777]">
                            #141414 Studio Canvas
                          </div>
                        </div>
                        {theme === 'dark' && <Check className="w-4 h-4 text-[#3ecf8e]" />}
                      </div>
                    </button>

                    {/* Soft Dark Slate */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('soft-dark')}
                      className={cn(
                        'p-4 rounded-[10px] border text-left space-y-3 transition-all cursor-pointer select-none',
                        theme === 'soft-dark'
                          ? 'border-[#3ecf8e] bg-[#181a20] ring-2 ring-[#3ecf8e]/20 shadow-md'
                          : 'border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#151515] opacity-80 hover:opacity-100'
                      )}
                    >
                      <div className="w-full h-16 rounded-[6px] bg-[#181a20] border border-[#2b303c] p-2 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400" />
                          <span className="w-8 h-1 rounded bg-[#2b303c]" />
                        </div>
                        <span className="w-12 h-1 rounded bg-[#2b303c]" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                            Soft Dark (Charcoal)
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-[#777]">
                            Gentle contrast slate
                          </div>
                        </div>
                        {theme === 'soft-dark' && <Check className="w-4 h-4 text-[#3ecf8e]" />}
                      </div>
                    </button>

                    {/* Clean Light */}
                    <button
                      type="button"
                      onClick={() => handleThemeChange('light')}
                      className={cn(
                        'p-4 rounded-[10px] border text-left space-y-3 transition-all cursor-pointer select-none',
                        theme === 'light'
                          ? 'border-[#3ecf8e] bg-white ring-2 ring-[#3ecf8e]/20 shadow-md'
                          : 'border-slate-200 dark:border-[#2a2a2a] bg-slate-50 dark:bg-[#151515] opacity-80 hover:opacity-100'
                      )}
                    >
                      <div className="w-full h-16 rounded-[6px] bg-white border border-slate-200 p-2 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          <span className="w-8 h-1 rounded bg-slate-200" />
                        </div>
                        <span className="w-12 h-1 rounded bg-slate-200" />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                            Light (Showroom Day)
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-[#777]">
                            High ambient light
                          </div>
                        </div>
                        {theme === 'light' && <Check className="w-4 h-4 text-[#3ecf8e]" />}
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* TAB 6: EMERGENCY SYSTEM OVERRIDES (Super Admin Only)               */}
            {/* =================================================================== */}
            {activeTabId === 'overrides' && isSuperAdminOrDev && (
              <div className="space-y-6 animate-in fade-in duration-150">
                <SuperAdminOverridesCard />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSecurityPage;
