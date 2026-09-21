import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { useVouchers } from '@/hooks/useVouchers';
import { useBranchStore } from '@/store/branchStore';
import { erpService } from '@/lib/erpService';
import {
  useCloudConfigStore,
  CloudConfig,
} from '@/store/cloudConfigStore';
import {
  AccountingPeriod,
  CurrencyDenomination,
  AppRole,
  RolePermissions,
  Branch,
  ExpenseCategory,
  Department,
  CourierPartner,
  StaffMember,
} from '@/types/database';
import { formatINR, formatDate, formatIndianPhone, cn, triggerHaptic } from '@/lib/utils';
import { MasterDataDrawer, MasterDrawerType } from '@/components/settings/MasterDataDrawer';
import { BrandIdentitySetup } from '@/components/settings/BrandIdentitySetup';
import { ThermalPrinterCustomizer } from '@/components/settings/ThermalPrinterCustomizer';
import { useNotificationStore, BroadcastMessage } from '@/store/notificationStore';
import { EmptyState } from '@/components/ui/EmptyState';
import { toast, showToast } from '@/components/ui/ToastContainer';
import {
  Building2,
  Tags,
  Printer,
  Briefcase,
  Truck,
  Coins,
  Calendar,
  Lock,
  Unlock,
  Plus,
  Edit2,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  Store,
  Check,
  Search,
  Download,
  Code2,
  Copy,
  Terminal,
  ChevronDown,
  X,
  RotateCcw,
  Megaphone,
  Radio,
  Send,
  Trash2,
  Sparkles,
  ExternalLink,
  Shield,
  Users,
  Database,
  Table as TableIcon,
  RefreshCw,
  LucideIcon,
  SlidersHorizontal,
  Filter,
  Cloud,
  Globe,
  FileCode,
  ShieldCheck,
  Server,
  Activity,
  KeyRound,
  Eye,
  EyeOff,
  UserCheck,
  ChevronRight,
  Menu,
} from 'lucide-react';

export type SettingsTabId =
  // CONFIGURATION
  | 'general'
  | 'supabase'
  | 'r2'
  | 'print'
  | 'files'
  | 'pages'
  | 'domain'
  // MASTER DATA & SHOWROOM
  | 'brand'
  | 'periods'
  | 'branches'
  | 'categories'
  | 'departments'
  | 'couriers'
  | 'staff'
  | 'roles'
  | 'denominations'
  | 'broadcasts';

type TableDensity = 'compact' | 'normal' | 'relaxed';
type ViewMode = 'grid' | 'ddl';

interface SettingsTabMeta {
  id: SettingsTabId;
  name: string;
  group: 'CONFIGURATION' | 'SHOWROOM MASTER DATA';
  tableName?: string;
  icon: LucideIcon;
  description: string;
  drawerType?: MasterDrawerType;
  badge?: string;
}

const SETTINGS_TABS: SettingsTabMeta[] = [
  // 1. CONFIGURATION GROUP (Matching Supabase Studio Project Settings)
  {
    id: 'general',
    name: 'General',
    group: 'CONFIGURATION',
    icon: SlidersHorizontal,
    description: 'General configuration, project ID, region, and organization access',
  },
  {
    id: 'supabase',
    name: 'API Keys & Database',
    group: 'CONFIGURATION',
    icon: Database,
    description: 'Supabase PostgreSQL database URL, anon/service keys, and latency ping test',
  },
  {
    id: 'r2',
    name: 'Storage & Media (R2)',
    group: 'CONFIGURATION',
    icon: Cloud,
    description: 'Cloudflare R2 bucket storage, S3 access tokens, and CORS policy generator',
  },
  {
    id: 'print',
    name: 'Thermal Slip & Printer',
    group: 'CONFIGURATION',
    icon: Printer,
    description: 'ESC/POS 80mm/58mm receipt paper format, GSTIN, header, copy count, and footer customizer',
  },
  {
    id: 'files',
    name: 'Project Files & .env',
    group: 'CONFIGURATION',
    icon: FileCode,
    description: 'Live .env file generator, client fallback strings, and public/_redirects',
  },
  {
    id: 'pages',
    name: 'Cloudflare Pages',
    group: 'CONFIGURATION',
    icon: Globe,
    description: 'Frontend hosting build command, output directory, and 8 environment variables',
  },
  {
    id: 'domain',
    name: 'Custom Domain & SSL',
    group: 'CONFIGURATION',
    icon: ShieldCheck,
    description: 'CNAME DNS routing, Full (strict) SSL certificate, and 10-point checklist',
  },

  // 2. SHOWROOM MASTER DATA GROUP (ERP Master Catalogues)
  {
    id: 'brand',
    name: 'Brand & Logo',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'brand_settings',
    icon: Sparkles,
    description: 'Shop logo, company name, GST number, address, and live receipt preview',
  },
  {
    id: 'periods',
    name: 'Monthly Accounts Lock',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.accounting_periods',
    icon: Calendar,
    description: 'Lock past months so expenses cannot be changed after auditing',
  },
  {
    id: 'branches',
    name: 'Shop Branches',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.branches',
    icon: Building2,
    description: 'Showroom branch locations, cash box limits, and GST details',
    drawerType: 'branch',
  },
  {
    id: 'categories',
    name: 'Expense Categories',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.expense_categories',
    icon: Tags,
    description: 'Types of expenses (Tea, Snacks, Travel, Electricity, Courier...)',
    drawerType: 'category',
  },
  {
    id: 'departments',
    name: 'Shop Departments',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.departments',
    icon: Briefcase,
    description: 'Store sections and teams (Sales, Accounts, Housekeeping)',
    drawerType: 'department',
  },
  {
    id: 'couriers',
    name: 'Courier Partners',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.courier_partners',
    icon: Truck,
    description: 'Parcel delivery partners, phone numbers, and tracking links',
    drawerType: 'courier',
  },
  {
    id: 'staff',
    name: 'Staff Directory',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.staff_members',
    icon: Users,
    description: 'All showroom employees, staff codes, and assigned branch',
    drawerType: 'staff',
  },
  {
    id: 'roles',
    name: 'Roles & Permissions',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.app_roles',
    icon: Shield,
    description: 'Who can do what (Cashier, Manager, Admin permissions)',
    drawerType: 'role',
  },
  {
    id: 'denominations',
    name: 'Cash Notes & Coins',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.currency_denominations',
    icon: Coins,
    description: 'Currency notes (₹500, ₹200, ₹100...) and coins for cash counting',
  },
  {
    id: 'broadcasts',
    name: 'Shop Announcements',
    group: 'SHOWROOM MASTER DATA',
    tableName: 'public.system_broadcasts',
    icon: Megaphone,
    description: 'Show announcement banner to all counter terminals in real-time',
  },
];

function downloadBlob(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export const ShowroomSettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const { setBulkImportOpen, setActivePage } = useUIStore();
  const { branches, fetchBranchesAndWallets } = useBranchStore();
  const { categories, departments, couriers, refresh } = useVouchers();
  const { broadcast, setBroadcast } = useNotificationStore();

  // Cloud Config Store
  const {
    config: cloudConfig,
    checklist,
    isTestingConnection,
    lastTestResult,
    updateConfig: updateCloudConfig,
    resetToDefaults: resetCloudConfigDefaults,
    toggleChecklistItem,
    testSupabaseConnection,
    generateEnvContent,
    generateCorsJson,
  } = useCloudConfigStore();

  // Active Tab State (Default to 'general' matching Supabase Studio settings)
  const [activeTabId, setActiveTabId] = useState<SettingsTabId>('general');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [density, setDensity] = useState<TableDensity>('normal');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopiedDdl, setIsCopiedDdl] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form State for Cloud Settings
  const [cloudFormData, setCloudFormData] = useState<CloudConfig>(cloudConfig);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [isMobileSubMenuOpen, setIsMobileSubMenuOpen] = useState(false);

  // Data Stores
  const [periods, setPeriods] = useState<AccountingPeriod[]>([]);
  const [denominations, setDenominations] = useState<CurrencyDenomination[]>([]);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);

  // Drawer / Modal Controls
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerType, setDrawerType] = useState<MasterDrawerType>('branch');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);

  // Period Lock Modal State
  const [lockModalOpen, setLockModalOpen] = useState(false);
  const [targetPeriod, setTargetPeriod] = useState<AccountingPeriod | null>(null);
  const [lockReason, setLockReason] = useState('');
  const [isSubmittingLock, setIsSubmittingLock] = useState(false);

  // Broadcast Composer State
  const [broadcastBadge, setBroadcastBadge] = useState('NEW');
  const [broadcastMessage, setBroadcastMessage] = useState(broadcast?.message || '');
  const [broadcastLink, setBroadcastLink] = useState(broadcast?.link || '');
  const [customBadge, setCustomBadge] = useState('');
  const [isCustomBadge, setIsCustomBadge] = useState(false);

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Keep cloudFormData in sync with store
  useEffect(() => {
    setCloudFormData(cloudConfig);
  }, [cloudConfig]);

  // Keyboard shortcut: Press "/" to focus search when inside master tables
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement !== searchInputRef.current &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Fetch all supplementary master data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [p, d, r, perms, stf] = await Promise.all([
        erpService.getAccountingPeriods(),
        erpService.getCurrencyDenominations(),
        erpService.getAppRoles(),
        erpService.getAllRolePermissions(),
        erpService.getStaffMembers('ALL'),
      ]);
      setPeriods(p || []);
      setDenominations(d || []);
      setRoles(r || []);
      setPermissions(perms || []);
      setStaffMembers(stf || []);
    } catch (err) {
      console.error('Failed to load master table records:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Sync broadcast state
  useEffect(() => {
    if (broadcast) {
      if (['NEW', 'ALERT', 'CLOSING', 'MAINTENANCE', 'UPDATE', 'NOTICE'].includes(broadcast.badge || 'NEW')) {
        setBroadcastBadge(broadcast.badge || 'NEW');
        setIsCustomBadge(false);
      } else {
        setBroadcastBadge('CUSTOM');
        setCustomBadge(broadcast.badge || '');
        setIsCustomBadge(true);
      }
      setBroadcastMessage(broadcast.message || '');
      setBroadcastLink(broadcast.link || '');
    }
  }, [broadcast]);

  // Active Tab Definition
  const currentTab = useMemo(
    () => SETTINGS_TABS.find((t) => t.id === activeTabId) || SETTINGS_TABS[0],
    [activeTabId]
  );

  // Table Row Counts for badges
  const counts: Record<SettingsTabId, number> = useMemo(
    () => ({
      general: 1,
      supabase: 1,
      r2: 1,
      print: 1,
      files: 1,
      pages: 8,
      domain: 10,
      brand: 1,
      periods: periods.length,
      branches: branches.length,
      categories: categories.length,
      departments: departments.length,
      couriers: couriers.length,
      staff: staffMembers.length,
      roles: roles.length,
      denominations: denominations.length,
      broadcasts: broadcast?.message ? 1 : 0,
    }),
    [periods, branches, categories, departments, couriers, staffMembers, roles, denominations, broadcast]
  );

  // Copy helper with haptic and toast
  const handleCopyText = (text: string, fieldId: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    triggerHaptic('light');
    showToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: `${label} copied.`,
    });
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Instant Cloud Settings Apply
  const handleSaveCloudChanges = async () => {
    setIsSavingCloud(true);
    triggerHaptic('heavy');
    try {
      updateCloudConfig(cloudFormData);
      showToast({
        type: 'success',
        title: 'Changes Saved & Applied',
        message: 'Configuration updated and hot-reloaded across the application.',
      });
      // Run quick ping verification
      testSupabaseConnection(cloudFormData.supabaseUrl, cloudFormData.supabasePublishableKey);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        message: err.message || 'Failed to save configuration.',
      });
    } finally {
      setIsSavingCloud(false);
    }
  };

  // Handlers for Master Data Drawer
  const handleOpenInsert = () => {
    if (!currentTab.drawerType) {
      toast.info(`Insert for ${currentTab.name} is configured via dedicated actions.`);
      return;
    }
    setSelectedRecord(null);
    setDrawerType(currentTab.drawerType);
    setDrawerOpen(true);
  };

  const handleOpenEdit = (record: any) => {
    if (!currentTab.drawerType) return;
    setSelectedRecord(record);
    setDrawerType(currentTab.drawerType);
    setDrawerOpen(true);
  };

  const handleDrawerSuccess = () => {
    setDrawerOpen(false);
    setSelectedRecord(null);
    loadData();
    refresh();
    fetchBranchesAndWallets(true);
  };

  // Period Lock Actions
  const handleOpenPeriodLockModal = (period: AccountingPeriod) => {
    setTargetPeriod(period);
    setLockReason(period.lock_reason || '');
    setLockModalOpen(true);
  };

  const handleConfirmToggleLock = async () => {
    if (!targetPeriod) return;
    setIsSubmittingLock(true);
    try {
      const willLock = !targetPeriod.is_locked;
      const userName = user ? `${user.first_name} ${user.last_name || ''}`.trim() : 'Store Manager';
      await erpService.togglePeriodLock(
        targetPeriod.period_key,
        willLock,
        userName,
        lockReason || (willLock ? 'Monthly Accounts Finalized & Audited' : 'Auditor Adjustment Request')
      );
      toast.success(`Accounting Period ${targetPeriod.period_key} ${willLock ? 'locked' : 'unlocked'}.`);
      setLockModalOpen(false);
      setTargetPeriod(null);
      loadData();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update period lock.');
    } finally {
      setIsSubmittingLock(false);
    }
  };

  // Broadcast Actions
  const handleSaveBroadcast = () => {
    if (!broadcastMessage.trim()) {
      toast.error('Broadcast message cannot be empty.');
      return;
    }
    const finalBadge = isCustomBadge ? customBadge.trim().toUpperCase() || 'ANNOUNCEMENT' : broadcastBadge;
    setBroadcast({
      id: `BCAST-${Date.now()}`,
      badge: finalBadge,
      message: broadcastMessage.trim(),
      link: broadcastLink.trim() || undefined,
      created_at: new Date().toISOString(),
    });
    toast.success('Global system broadcast banner updated.');
  };

  const handleClearBroadcast = () => {
    setBroadcast(null);
    setBroadcastMessage('');
    setBroadcastLink('');
    setBroadcastBadge('NEW');
    setIsCustomBadge(false);
    toast.info('Global broadcast banner cleared.');
  };

  // Export handlers
  const handleExportCsv = () => {
    let csvContent = '';
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `${currentTab.id}_export_${dateStr}.csv`;

    switch (activeTabId) {
      case 'periods':
        csvContent =
          'Period Key,Start Date,End Date,Status,Locked By,Lock Reason\n' +
          periods
            .map(
              (p) =>
                `"${p.period_key}","${p.start_date}","${p.end_date}","${p.is_locked ? 'Locked' : 'Open'}","${p.locked_by_name || ''}","${p.lock_reason || ''}"`
            )
            .join('\n');
        break;
      case 'branches':
        csvContent =
          'Branch Code,Branch Name,City,State,GSTIN,Min Cash,Max Cash,Max UPI,Status\n' +
          branches
            .map(
              (b) =>
                `"${b.branch_code}","${b.branch_name}","${b.city}","${b.state}","${b.gstin || ''}",${b.min_cash_threshold || 0},${b.max_cash_ceiling || 0},${b.max_upi_ceiling || 0},"${b.is_active ? 'Active' : 'Inactive'}"`
            )
            .join('\n');
        break;
      case 'categories':
        csvContent =
          'Category Name,Color Theme,Status\n' +
          categories
            .map((c) => `"${c.category_name}","${c.color_theme || ''}","${c.is_active ? 'Active' : 'Inactive'}"`)
            .join('\n');
        break;
      case 'departments':
        csvContent =
          'Department Code,Department Name,Status\n' +
          departments
            .map((d) => `"${d.department_code}","${d.department_name}","${d.is_active ? 'Active' : 'Inactive'}"`)
            .join('\n');
        break;
      case 'couriers':
        csvContent =
          'Partner Code,Partner Name,Contact Phone,Status\n' +
          couriers
            .map(
              (cr) =>
                `"${cr.partner_code}","${cr.partner_name}","${cr.contact_phone || ''}","${cr.is_active ? 'Active' : 'Inactive'}"`
            )
            .join('\n');
        break;
      case 'staff':
        csvContent =
          'Staff Code,First Name,Last Name,Branch,Department,Designation,Mobile,Status\n' +
          staffMembers
            .map(
              (s) =>
                `"${s.staff_code}","${s.first_name}","${s.last_name || ''}","${s.branch_code || ''}","${s.department_name || ''}","${s.designation || ''}","${s.mobile_number || ''}","${s.is_active ? 'Active' : 'Inactive'}"`
            )
            .join('\n');
        break;
      case 'roles':
        csvContent =
          'Role Code,Role Title,Description,System Role\n' +
          roles
            .map(
              (r) =>
                `"${r.role_code}","${r.role_title}","${r.description || ''}","${r.is_system_role ? 'Yes' : 'No'}"`
            )
            .join('\n');
        break;
      case 'denominations':
        csvContent =
          'Value,Display Label,Type,Sort Order,Status\n' +
          denominations
            .map(
              (dn) =>
                `${dn.denomination_value},"${dn.display_label}","${dn.is_coin ? 'Coin' : 'Note'}",${dn.sort_order},"${dn.is_active ? 'Active' : 'Inactive'}"`
            )
            .join('\n');
        break;
      default:
        csvContent = 'ID,Name\n';
    }

    downloadBlob(filename, csvContent, 'text/csv;charset=utf-8;');
    toast.success(`Exported ${filename}`);
  };

  const handleExportJson = () => {
    let data: any = [];
    switch (activeTabId) {
      case 'periods':
        data = periods;
        break;
      case 'branches':
        data = branches;
        break;
      case 'categories':
        data = categories;
        break;
      case 'departments':
        data = departments;
        break;
      case 'couriers':
        data = couriers;
        break;
      case 'staff':
        data = staffMembers;
        break;
      case 'roles':
        data = roles;
        break;
      case 'denominations':
        data = denominations;
        break;
      case 'broadcasts':
        data = broadcast ? [broadcast] : [];
        break;
      default:
        data = cloudConfig;
    }
    const jsonStr = JSON.stringify(data, null, 2);
    downloadBlob(`${currentTab.id}_schema.json`, jsonStr, 'application/json');
    toast.success(`Exported JSON schema for ${currentTab.name}`);
  };

  // Copy DDL definition to clipboard
  const handleCopyDdl = (ddl: string) => {
    navigator.clipboard.writeText(ddl);
    setIsCopiedDdl(true);
    triggerHaptic('light');
    toast.success('PostgreSQL DDL schema copied to clipboard.');
    setTimeout(() => setIsCopiedDdl(false), 2000);
  };

  // SQL DDL Schema generator
  const getTableDdl = useMemo(() => {
    switch (activeTabId) {
      case 'brand':
        return `-- Brand Identity Configuration Schema (Local & Remote Sync)
CREATE TABLE public.brand_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'primary_brand',
  brand_name VARCHAR(100) NOT NULL DEFAULT 'Asopalav',
  legal_entity_name VARCHAR(150) NOT NULL DEFAULT 'Asopalav Silk & Sarees',
  tagline VARCHAR(200) DEFAULT 'Silk & Sarees Flagship',
  monogram_text VARCHAR(10) DEFAULT 'ASI',
  accent_color VARCHAR(20) DEFAULT '#3ecf8e',
  gstin VARCHAR(20) DEFAULT '24ABVFA8046N1ZQ',
  pan_number VARCHAR(20) DEFAULT 'ABVFA8046N',
  logo_url TEXT,
  logo_svg TEXT,
  favicon_url TEXT,
  address TEXT,
  phone VARCHAR(30),
  email VARCHAR(100),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

      case 'periods':
        return `-- Table Definition: public.accounting_periods
CREATE TABLE public.accounting_periods (
  period_key VARCHAR(7) PRIMARY KEY, -- Format: YYYY-MM (e.g. '2026-09')
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  locked_at TIMESTAMPTZ,
  locked_by_name VARCHAR(100),
  lock_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS & Security Policy
ALTER TABLE public.accounting_periods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow read to authenticated" ON public.accounting_periods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow lock update to Store_Manager" ON public.accounting_periods FOR UPDATE TO authenticated USING (auth.jwt() ->> 'role_code' IN ('Store_Manager', 'Super_Admin', 'Developer'));`;

      case 'branches':
        return `-- Table Definition: public.branches
CREATE TABLE public.branches (
  branch_id VARCHAR(50) PRIMARY KEY, -- 'Aellp-ASI'
  branch_code VARCHAR(10) UNIQUE NOT NULL, -- 'ASI'
  branch_name VARCHAR(150) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  entity_company_name VARCHAR(150) NOT NULL DEFAULT 'Asopalav Endeavours LLP',
  pan_number VARCHAR(20),
  gstin VARCHAR(20) DEFAULT '24ABVFA8046N1ZQ',
  accountant_name VARCHAR(100),
  contact_phone VARCHAR(30),
  contact_email VARCHAR(100),
  city VARCHAR(50) NOT NULL DEFAULT 'Ahmedabad',
  state VARCHAR(50) NOT NULL DEFAULT 'Gujarat',
  address TEXT,
  min_cash_threshold NUMERIC(12,2) NOT NULL DEFAULT 3000.00,
  max_cash_ceiling NUMERIC(12,2) NOT NULL DEFAULT 25000.00,
  max_upi_ceiling NUMERIC(12,2) NOT NULL DEFAULT 50000.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_branches_code ON public.branches(branch_code);`;

      case 'categories':
        return `-- Table Definition: public.expense_categories
CREATE TABLE public.expense_categories (
  category_name VARCHAR(100) PRIMARY KEY,
  color_theme VARCHAR(50) DEFAULT 'Vanilla',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_categories_active ON public.expense_categories(is_active);`;

      case 'departments':
        return `-- Table Definition: public.departments
CREATE TABLE public.departments (
  department_code VARCHAR(30) PRIMARY KEY,
  department_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

      case 'couriers':
        return `-- Table Definition: public.courier_partners
CREATE TABLE public.courier_partners (
  partner_code VARCHAR(30) PRIMARY KEY,
  partner_name VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(30),
  tracking_template VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

      case 'staff':
        return `-- Table Definition: public.staff_members
CREATE TABLE public.staff_members (
  staff_code VARCHAR(30) PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  last_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  mobile_number VARCHAR(20),
  branch_id VARCHAR(50) REFERENCES public.branches(branch_id),
  branch_code VARCHAR(10),
  department_code VARCHAR(30),
  department_name VARCHAR(100),
  designation VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_staff_branch ON public.staff_members(branch_id);`;

      case 'roles':
        return `-- Table Definition: public.app_roles & public.role_permissions
CREATE TABLE public.app_roles (
  role_code VARCHAR(50) PRIMARY KEY,
  role_title VARCHAR(100) NOT NULL,
  description TEXT,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.role_permissions (
  role_code VARCHAR(50) PRIMARY KEY REFERENCES public.app_roles(role_code) ON DELETE CASCADE,
  can_create_voucher BOOLEAN NOT NULL DEFAULT TRUE,
  can_void_voucher BOOLEAN NOT NULL DEFAULT FALSE,
  can_backdate_voucher BOOLEAN NOT NULL DEFAULT FALSE,
  can_disburse_advance BOOLEAN NOT NULL DEFAULT FALSE,
  can_settle_advance BOOLEAN NOT NULL DEFAULT FALSE,
  max_advance_limit NUMERIC(12,2) NOT NULL DEFAULT 5000.00,
  can_inject_float BOOLEAN NOT NULL DEFAULT FALSE,
  can_verify_f9_closing BOOLEAN NOT NULL DEFAULT FALSE,
  can_export_tally BOOLEAN NOT NULL DEFAULT FALSE,
  can_download_hr_payroll BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_all_branches BOOLEAN NOT NULL DEFAULT FALSE,
  can_view_audit_logs BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_users_roles BOOLEAN NOT NULL DEFAULT FALSE,
  can_manage_periods BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

      case 'denominations':
        return `-- Table Definition: public.currency_denominations
CREATE TABLE public.currency_denominations (
  denomination_value INTEGER PRIMARY KEY, -- 500, 200, 100, etc.
  display_label VARCHAR(20) NOT NULL, -- '₹500 Note'
  is_coin BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

      case 'broadcasts':
        return `-- Table Definition: public.system_broadcasts
CREATE TABLE public.system_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge VARCHAR(30) NOT NULL DEFAULT 'NEW',
  message TEXT NOT NULL,
  link VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`;

      default:
        return `-- Configuration Schema
-- Target: Supabase PostgreSQL (Mumbai ap-south-1) + Cloudflare R2 + Cloudflare Pages`;
    }
  }, [activeTabId]);

  // Filtering data rows
  const filteredPeriods = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return periods.filter((p) => {
      if (statusFilter === 'active' && p.is_locked) return false;
      if (statusFilter === 'inactive' && !p.is_locked) return false;
      if (!q) return true;
      return (
        p.period_key.toLowerCase().includes(q) ||
        (p.lock_reason || '').toLowerCase().includes(q) ||
        (p.locked_by_name || '').toLowerCase().includes(q)
      );
    });
  }, [periods, searchQuery, statusFilter]);

  const filteredBranches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return branches.filter((b) => {
      if (statusFilter === 'active' && !b.is_active) return false;
      if (statusFilter === 'inactive' && b.is_active) return false;
      if (!q) return true;
      return (
        b.branch_name.toLowerCase().includes(q) ||
        b.branch_code.toLowerCase().includes(q) ||
        b.city.toLowerCase().includes(q) ||
        (b.gstin || '').toLowerCase().includes(q)
      );
    });
  }, [branches, searchQuery, statusFilter]);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((c) => {
      if (statusFilter === 'active' && !c.is_active) return false;
      if (statusFilter === 'inactive' && c.is_active) return false;
      if (!q) return true;
      return (
        c.category_name.toLowerCase().includes(q) ||
        (c.color_theme || '').toLowerCase().includes(q)
      );
    });
  }, [categories, searchQuery, statusFilter]);

  const filteredDepartments = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return departments.filter((d) => {
      if (statusFilter === 'active' && !d.is_active) return false;
      if (statusFilter === 'inactive' && d.is_active) return false;
      if (!q) return true;
      return (
        d.department_name.toLowerCase().includes(q) ||
        d.department_code.toLowerCase().includes(q)
      );
    });
  }, [departments, searchQuery, statusFilter]);

  const filteredCouriers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return couriers.filter((cr) => {
      if (statusFilter === 'active' && !cr.is_active) return false;
      if (statusFilter === 'inactive' && cr.is_active) return false;
      if (!q) return true;
      return (
        cr.partner_name.toLowerCase().includes(q) ||
        cr.partner_code.toLowerCase().includes(q) ||
        (cr.contact_phone || '').includes(q)
      );
    });
  }, [couriers, searchQuery, statusFilter]);

  const filteredStaff = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return staffMembers.filter((s) => {
      if (statusFilter === 'active' && !s.is_active) return false;
      if (statusFilter === 'inactive' && s.is_active) return false;
      if (!q) return true;
      return (
        s.first_name.toLowerCase().includes(q) ||
        (s.last_name || '').toLowerCase().includes(q) ||
        s.staff_code.toLowerCase().includes(q) ||
        (s.department_name || '').toLowerCase().includes(q) ||
        (s.branch_code || '').toLowerCase().includes(q)
      );
    });
  }, [staffMembers, searchQuery, statusFilter]);

  const filteredRoles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return roles.filter((r) => {
      if (!q) return true;
      return (
        r.role_title.toLowerCase().includes(q) ||
        r.role_code.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    });
  }, [roles, searchQuery]);

  const filteredDenominations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return denominations.filter((dn) => {
      if (statusFilter === 'active' && !dn.is_active) return false;
      if (statusFilter === 'inactive' && dn.is_active) return false;
      if (!q) return true;
      return (
        dn.display_label.toLowerCase().includes(q) ||
        dn.denomination_value.toString().includes(q)
      );
    });
  }, [denominations, searchQuery, statusFilter]);

  const currentFilteredCount = useMemo(() => {
    switch (activeTabId) {
      case 'periods':
        return filteredPeriods.length;
      case 'branches':
        return filteredBranches.length;
      case 'categories':
        return filteredCategories.length;
      case 'departments':
        return filteredDepartments.length;
      case 'couriers':
        return filteredCouriers.length;
      case 'staff':
        return filteredStaff.length;
      case 'roles':
        return filteredRoles.length;
      case 'denominations':
        return filteredDenominations.length;
      case 'broadcasts':
        return broadcast ? 1 : 0;
      default:
        return counts[activeTabId] || 1;
    }
  }, [
    activeTabId,
    filteredPeriods,
    filteredBranches,
    filteredCategories,
    filteredDepartments,
    filteredCouriers,
    filteredStaff,
    filteredRoles,
    filteredDenominations,
    broadcast,
    counts,
  ]);

  // Check if active tab is a Master Data table that has a data grid
  const isMasterDataTable = [
    'periods',
    'branches',
    'categories',
    'departments',
    'couriers',
    'staff',
    'roles',
    'denominations',
  ].includes(activeTabId);

  // Density padding classes
  const densityClasses = {
    compact: 'py-2 px-3 text-xs',
    normal: 'py-2.5 px-3.5 text-xs',
    relaxed: 'py-3.5 px-4 text-sm',
  }[density];

  // Hard Security Role Gate (Super_Admin & Developer only)
  const isAuthorizedAdmin = user?.role_code === 'Super_Admin' || user?.role_code === 'Developer';

  if (!isAuthorizedAdmin) {
    return (
      <div className="min-h-[calc(100vh-3.5rem)] bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] flex flex-col items-center justify-center p-6 text-center font-sans select-none">
        <div className="max-w-md w-full p-8 rounded-[12px] bg-slate-50 dark:bg-[#181818] border border-slate-200 dark:border-[#282828] shadow-2xl space-y-5">
          <div className="w-14 h-14 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
            <Lock className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] font-mono font-medium">
              HTTP 403 FORBIDDEN
            </span>
            <h1 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white font-sans">
              Settings Access Restricted
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#888888] leading-relaxed">
              Showroom configuration and cloud deployment infrastructure are restricted to <strong>Super Admin</strong> and <strong>Developer</strong> accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActivePage('dashboard')}
            className="w-full py-2.5 px-4 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-semibold font-sans flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <span>Return to Safe Dashboard</span>
          </button>
        </div>
      </div>
    );
  }

  // Pre-launch checklist items for domain tab
  const checklistItems = [
    { id: 1, title: 'Phase 1: SQL Database Schema executed in Supabase SQL Editor' },
    { id: 2, title: 'Phase 1: 303 showroom staff members visible in "staff_members"' },
    { id: 3, title: 'Phase 1: Super Admin account (USR-ADMIN / aellpadmin) verified' },
    { id: 4, title: 'Phase 2: Cloudflare R2 bucket created & Public Access enabled' },
    { id: 5, title: 'Phase 2: R2 CORS Policy JSON saved in bucket settings' },
    { id: 6, title: 'Phase 2: R2 S3 API Token generated with Object Read & Write' },
    { id: 7, title: 'Phase 3: Production .env credentials saved & verified' },
    { id: 8, title: 'Phase 4: Cloudflare Pages deployed with 7 Environment Variables' },
    { id: 9, title: 'Phase 4: Build command "npm run build" passes with 0 errors' },
    { id: 10, title: 'Phase 5: Custom Domain & Full (strict) SSL certificate verified' },
  ];
  const completedChecklistCount = checklistItems.filter((item) => checklist[item.id]).length;

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] font-sans antialiased overflow-hidden selection:bg-[#3ecf8e]/20 selection:text-[#3ecf8e]">
      {/* ========================================================================= */}
      {/* 1. MASTER TWO-COLUMN WORKSPACE (SUPABASE STUDIO SETTINGS LAYOUT)           */}
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
              <SlidersHorizontal className="w-4 h-4 text-[#3ecf8e]" />
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-900 dark:text-white font-mono">
                Settings
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
            {/* GROUP 1: CONFIGURATION (Matching Supabase Studio Project Settings) */}
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-[#666666]">
                Configuration
              </div>
              {SETTINGS_TABS.filter((t) => t.group === 'CONFIGURATION').map((tab) => {
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
                    {tab.id === 'supabase' && lastTestResult?.success && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] animate-pulse shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* GROUP 2: SHOWROOM MASTER DATA (ERP Catalogues) */}
            <div className="space-y-1">
              <div className="px-2.5 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 dark:text-[#666666]">
                Master Catalogues
              </div>
              {SETTINGS_TABS.filter((t) => t.group === 'SHOWROOM MASTER DATA').map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTabId === tab.id;
                const count = counts[tab.id];
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setActiveTabId(tab.id);
                      setSearchQuery('');
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
                    {typeof count === 'number' && (
                      <span
                        className={cn(
                          'px-1.5 py-0.2 rounded text-[10px] font-mono tabular-nums shrink-0',
                          isActive
                            ? 'bg-[#3ecf8e]/20 text-[#3ecf8e] font-semibold'
                            : 'bg-slate-200/60 dark:bg-[#222] text-slate-500 dark:text-[#777]'
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* RIGHT MAIN CONTENT AREA                                                 */}
        {/* ----------------------------------------------------------------------- */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-white dark:bg-[#141414]">
          {/* Top Mobile Bar */}
          <div className="lg:hidden p-3 border-b border-slate-200 dark:border-[#242424] flex items-center justify-between bg-slate-50 dark:bg-[#171717]">
            <button
              type="button"
              onClick={() => setIsMobileSubMenuOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-[6px] border border-slate-300 dark:border-[#333] text-xs font-mono text-slate-800 dark:text-zinc-200"
            >
              <Menu className="w-3.5 h-3.5 text-[#3ecf8e]" />
              <span>{currentTab.name}</span>
            </button>
            <span className="text-[10px] font-mono text-[#3ecf8e] bg-emerald-500/10 px-2 py-0.5 rounded border border-[#3ecf8e]/30">
              Admin Protected
            </span>
          </div>

          {/* Main Pane Header */}
          <div className="p-4 sm:p-6 lg:p-8 pb-4 border-b border-slate-200 dark:border-[#242424]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-slate-900 dark:text-white font-sans flex items-center gap-2.5">
                  <currentTab.icon className="w-5 h-5 text-[#3ecf8e]" />
                  <span>{currentTab.group === 'CONFIGURATION' ? 'Project Settings' : currentTab.name}</span>
                </h1>
                <p className="text-xs text-slate-500 dark:text-[#888888] font-sans mt-1">
                  {currentTab.description}
                </p>
              </div>

              {/* Master Data Header Actions */}
              {isMasterDataTable && (
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      loadData();
                      refresh();
                      toast.info('Refreshing records...');
                    }}
                    disabled={isLoading}
                    className="h-8.5 w-8.5 flex items-center justify-center rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] transition-colors cursor-pointer shadow-xs"
                    title="Refresh Records"
                  >
                    <RefreshCw className={cn('w-3.5 h-3.5', isLoading && 'animate-spin text-[#3ecf8e]')} />
                  </button>

                  {/* Bulk Import */}
                  {['branches', 'categories', 'departments', 'couriers', 'staff'].includes(activeTabId) && (
                    <button
                      type="button"
                      onClick={() => setBulkImportOpen(true)}
                      className="h-8.5 px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#3ecf8e]" />
                      <span>Import CSV</span>
                    </button>
                  )}

                  {/* Export Menu */}
                  <div className="relative group">
                    <button
                      type="button"
                      className="h-8.5 px-3 py-1.5 rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#262626] rounded-[6px] shadow-xl py-1 hidden group-hover:block z-40">
                      <button
                        type="button"
                        onClick={handleExportCsv}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-50 dark:hover:bg-[#222] flex items-center gap-2 cursor-pointer font-mono"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-[#3ecf8e]" />
                        <span>CSV format</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleExportJson}
                        className="w-full text-left px-3 py-1.5 text-xs text-slate-700 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] hover:bg-slate-50 dark:hover:bg-[#222] flex items-center gap-2 cursor-pointer font-mono"
                      >
                        <Code2 className="w-3.5 h-3.5 text-amber-500" />
                        <span>JSON format</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Record Primary CTA */}
                  {currentTab.drawerType && (
                    <button
                      type="button"
                      onClick={handleOpenInsert}
                      className="h-8.5 px-3.5 py-1.5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-medium font-sans flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs select-none"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Add Record</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Main Pane Body Container */}
          <div className="p-4 sm:p-6 lg:p-8 space-y-6 flex-1">
            {/* =================================================================== */}
            {/* VIEW 1: GENERAL SETTINGS (Matching media_1790011544122.png)         */}
            {/* =================================================================== */}
            {activeTabId === 'general' && (
              <div className="space-y-6 max-w-4xl animate-in fade-in">
                {/* Section 1: General Settings Card */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white font-sans">
                    General settings
                  </h3>
                  <div className="rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-5 sm:p-6 space-y-5 shadow-xs">
                    {/* Row 1: Project Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center border-b border-slate-100 dark:border-[#242424] pb-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                          Project name
                        </label>
                        <p className="text-[11px] text-slate-400 dark:text-[#888] mt-0.5">
                          Displayed throughout the dashboard.
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={cloudFormData.pagesProjectName || 'Asopalav ERP'}
                          onChange={(e) =>
                            setCloudFormData((p) => ({ ...p, pagesProjectName: e.target.value }))
                          }
                          className="w-full max-w-md px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Row 2: Project ID */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center border-b border-slate-100 dark:border-[#242424] pb-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                          Project ID
                        </label>
                        <p className="text-[11px] text-slate-400 dark:text-[#888] mt-0.5">
                          Reference used in APIs and URLs.
                        </p>
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2 max-w-md">
                        <input
                          type="text"
                          readOnly
                          value={
                            cloudFormData.supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] ||
                            'eumurshcjuvejbfnjejz'
                          }
                          className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] text-xs font-mono text-slate-700 dark:text-zinc-300 outline-none select-all"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyText(
                              cloudFormData.supabaseUrl.replace(/^https?:\/\//, '').split('.')[0] ||
                                'eumurshcjuvejbfnjejz',
                              'project_id',
                              'Project ID'
                            )
                          }
                          className="h-8.5 px-3 rounded-[6px] border border-slate-300 dark:border-[#333] hover:bg-slate-100 dark:hover:bg-[#222] text-xs font-mono flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300 shrink-0"
                        >
                          {copiedField === 'project_id' ? (
                            <Check className="w-3.5 h-3.5 text-[#3ecf8e]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedField === 'project_id' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Row 3: Project Region */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center border-b border-slate-100 dark:border-[#242424] pb-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                          Project region
                        </label>
                        <p className="text-[11px] text-slate-400 dark:text-[#888] mt-0.5">
                          South Asia (Mumbai)
                        </p>
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2 max-w-md">
                        <input
                          type="text"
                          readOnly
                          value="ap-south-1"
                          className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] text-xs font-mono text-slate-700 dark:text-zinc-300 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyText('ap-south-1', 'region', 'Project Region')}
                          className="h-8.5 px-3 rounded-[6px] border border-slate-300 dark:border-[#333] hover:bg-slate-100 dark:hover:bg-[#222] text-xs font-mono flex items-center gap-1.5 cursor-pointer text-slate-700 dark:text-zinc-300 shrink-0"
                        >
                          {copiedField === 'region' ? (
                            <Check className="w-3.5 h-3.5 text-[#3ecf8e]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedField === 'region' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Row 4: Custom Domain */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 items-center pb-2">
                      <div>
                        <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                          Custom domain
                        </label>
                        <p className="text-[11px] text-slate-400 dark:text-[#888] mt-0.5">
                          Production ERP endpoint.
                        </p>
                      </div>
                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          value={cloudFormData.customDomain}
                          onChange={(e) =>
                            setCloudFormData((p) => ({ ...p, customDomain: e.target.value }))
                          }
                          placeholder="erp.asopalav.com"
                          className="w-full max-w-md px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                        />
                      </div>
                    </div>

                    {/* Bottom Save Changes CTA */}
                    <div className="pt-3 border-t border-slate-100 dark:border-[#242424] flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveCloudChanges}
                        disabled={isSavingCloud}
                        className="px-4 py-2 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-medium text-xs font-sans flex items-center gap-2 cursor-pointer shadow-xs select-none transition-colors"
                      >
                        <Check className="w-3.5 h-3.5 text-[#171717] stroke-[3]" />
                        <span>{isSavingCloud ? 'Applying...' : 'Save changes'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: Project Access Card (Matching media_1790011544122.png) */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-slate-900 dark:text-white font-sans">
                    Project access
                  </h3>
                  <div className="rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-5 sm:p-6 space-y-4 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#242424]">
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                          Organization-wide access
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-[#888]">
                          All authorized showroom administrators can access this project.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTabId('staff')}
                        className="h-8 px-3 rounded-[6px] border border-slate-300 dark:border-[#333] hover:bg-slate-100 dark:hover:bg-[#222] text-slate-700 dark:text-zinc-300 text-xs font-sans font-medium cursor-pointer"
                      >
                        Manage members
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="text-[10px] text-slate-400 dark:text-[#707070] uppercase tracking-wider border-b border-slate-100 dark:border-[#242424]">
                            <th className="pb-2 font-medium">MEMBER</th>
                            <th className="pb-2 font-medium text-right">ROLE</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-[#242424]">
                          <tr>
                            <td className="py-3 text-slate-900 dark:text-white flex items-center gap-2">
                              <span>it@asopalav.com</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-slate-100 dark:bg-[#252525] text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-[#333]">
                                YOU
                              </span>
                            </td>
                            <td className="py-3 text-right text-slate-600 dark:text-[#aaa]">Owner</td>
                          </tr>
                          <tr>
                            <td className="py-3 text-slate-900 dark:text-white flex items-center gap-2">
                              <span>aellpadmin (Super Administrator)</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-sans font-medium bg-emerald-500/10 text-[#3ecf8e] border border-[#3ecf8e]/30">
                                ACTIVE
                              </span>
                            </td>
                            <td className="py-3 text-right text-slate-600 dark:text-[#aaa]">Super Admin</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 2: SUPABASE PROJECT SETUP                                      */}
            {/* =================================================================== */}
            {activeTabId === 'supabase' && (
              <div className="space-y-6 max-w-4xl animate-in fade-in">
                <div className="rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-5 sm:p-6 space-y-5 shadow-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#242424] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                        Supabase PostgreSQL Connection &amp; Auth
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
                        Mumbai Region (<code>ap-south-1</code>) endpoint credentials.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => testSupabaseConnection(cloudFormData.supabaseUrl, cloudFormData.supabasePublishableKey)}
                      disabled={isTestingConnection}
                      className="h-8 px-3 rounded-[6px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-zinc-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                    >
                      <Activity className={cn('w-3.5 h-3.5 text-[#3ecf8e]', isTestingConnection && 'animate-spin')} />
                      <span>{isTestingConnection ? 'Pinging...' : 'Test Connection'}</span>
                    </button>
                  </div>

                  {lastTestResult && (
                    <div
                      className={cn(
                        'p-3 rounded-[8px] border text-xs font-mono flex items-center justify-between',
                        lastTestResult.success
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
                          : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span className={cn('w-2 h-2 rounded-full shrink-0', lastTestResult.success ? 'bg-[#3ecf8e]' : 'bg-rose-500')} />
                        <span>{lastTestResult.message}</span>
                      </div>
                      {lastTestResult.details && (
                        <span className="text-[11px] opacity-80">
                          Verified: Users ({lastTestResult.details.appUsersCount}), Staff ({lastTestResult.details.staffCount})
                        </span>
                      )}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                        Supabase Project URL (VITE_SUPABASE_URL)
                      </label>
                      <input
                        type="text"
                        value={cloudFormData.supabaseUrl}
                        onChange={(e) => setCloudFormData((p) => ({ ...p, supabaseUrl: e.target.value }))}
                        placeholder="https://<project-ref>.supabase.co"
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans flex items-center justify-between">
                        <span>Anon / Publishable API Key (VITE_SUPABASE_PUBLISHABLE_KEY)</span>
                        <a
                          href="https://supabase.com/dashboard"
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-[#3ecf8e] hover:underline flex items-center gap-1 font-sans"
                        >
                          <span>Supabase Console</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </label>
                      <div className="relative">
                        <input
                          type={showAnonKey ? 'text' : 'password'}
                          value={cloudFormData.supabasePublishableKey}
                          onChange={(e) =>
                            setCloudFormData((p) => ({ ...p, supabasePublishableKey: e.target.value }))
                          }
                          placeholder="sb_publishable_... or eyJh..."
                          className="w-full pl-3 pr-10 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowAnonKey(!showAnonKey)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                        >
                          {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#242424] flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveCloudChanges}
                      disabled={isSavingCloud}
                      className="px-4 py-2 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-medium text-xs font-sans flex items-center gap-2 cursor-pointer shadow-xs select-none transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 text-[#171717] stroke-[3]" />
                      <span>{isSavingCloud ? 'Applying...' : 'Apply & Reconnect'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 3: CLOUDFLARE R2 STORAGE                                       */}
            {/* =================================================================== */}
            {activeTabId === 'r2' && (
              <div className="space-y-6 max-w-4xl animate-in fade-in">
                <div className="rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-5 sm:p-6 space-y-5 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-[#242424] pb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                      Cloudflare R2 Object Storage Configuration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
                      Zero-egress storage for expense receipts, voucher bill attachments, and staff profile avatars.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                        Cloudflare Account ID (VITE_CLOUDFLARE_ACCOUNT_ID)
                      </label>
                      <input
                        type="text"
                        value={cloudFormData.cloudflareAccountId}
                        onChange={(e) =>
                          setCloudFormData((p) => ({ ...p, cloudflareAccountId: e.target.value }))
                        }
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                        R2 Bucket Name (VITE_R2_BUCKET_NAME)
                      </label>
                      <input
                        type="text"
                        value={cloudFormData.r2BucketName}
                        onChange={(e) => setCloudFormData((p) => ({ ...p, r2BucketName: e.target.value }))}
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5 sm:col-span-2">
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                        Public Domain / R2.dev URL (VITE_R2_PUBLIC_DOMAIN)
                      </label>
                      <input
                        type="text"
                        value={cloudFormData.r2PublicDomain}
                        onChange={(e) => setCloudFormData((p) => ({ ...p, r2PublicDomain: e.target.value }))}
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                        R2 Access Key ID (VITE_R2_ACCESS_KEY_ID)
                      </label>
                      <input
                        type="text"
                        value={cloudFormData.r2AccessKeyId}
                        onChange={(e) => setCloudFormData((p) => ({ ...p, r2AccessKeyId: e.target.value }))}
                        className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                        R2 Secret Access Key (VITE_R2_SECRET_ACCESS_KEY)
                      </label>
                      <div className="relative">
                        <input
                          type={showSecretKey ? 'text' : 'password'}
                          value={cloudFormData.r2SecretAccessKey}
                          onChange={(e) =>
                            setCloudFormData((p) => ({ ...p, r2SecretAccessKey: e.target.value }))
                          }
                          className="w-full pl-3 pr-10 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSecretKey(!showSecretKey)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                        >
                          {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-[#242424] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => handleCopyText(generateCorsJson(), 'cors_json', 'R2 CORS Policy JSON')}
                      className="text-xs font-mono text-[#3ecf8e] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>{copiedField === 'cors_json' ? 'Copied CORS JSON' : 'Copy CORS JSON Policy'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveCloudChanges}
                      disabled={isSavingCloud}
                      className="px-4 py-2 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] font-medium text-xs font-sans flex items-center gap-2 cursor-pointer shadow-xs select-none transition-colors"
                    >
                      <Check className="w-3.5 h-3.5 text-[#171717] stroke-[3]" />
                      <span>{isSavingCloud ? 'Saving...' : 'Save Storage Settings'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW: THERMAL SLIP & PRINTER CUSTOMIZER                             */}
            {/* =================================================================== */}
            {activeTabId === 'print' && (
              <div className="animate-in fade-in">
                <ThermalPrinterCustomizer />
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 4: PROJECT FILES & .ENV                                        */}
            {/* =================================================================== */}
            {activeTabId === 'files' && (
              <div className="space-y-6 max-w-4xl animate-in fade-in">
                <div className="rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-5 sm:p-6 space-y-4 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#242424] pb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                        Root .env Environment File
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
                        Generated live from your current settings. Place in project root.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleCopyText(generateEnvContent(), 'env_file', '.env file content')}
                        className="h-8 px-3 rounded-[6px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-zinc-200 text-xs font-mono flex items-center gap-1.5 cursor-pointer"
                      >
                        {copiedField === 'env_file' ? (
                          <Check className="w-3 h-3 text-[#3ecf8e]" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedField === 'env_file' ? 'Copied' : 'Copy .env'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadBlob('.env', generateEnvContent(), 'text/plain')}
                        className="h-8 px-3 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-sans font-medium flex items-center gap-1.5 cursor-pointer shadow-xs"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download .env</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-[8px] bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto leading-relaxed border border-slate-800">
                    <pre>{generateEnvContent()}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 5: CLOUDFLARE PAGES                                            */}
            {/* =================================================================== */}
            {activeTabId === 'pages' && (
              <div className="space-y-6 max-w-4xl animate-in fade-in">
                <div className="rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-5 sm:p-6 space-y-4 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-[#242424] pb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                      Cloudflare Pages Build Configuration
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
                      Production build parameters and environment variables for Cloudflare Pages dashboard.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3 rounded-[8px] bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#242424]">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Build Command</span>
                      <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1">npm run build</p>
                    </div>
                    <div className="p-3 rounded-[8px] bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#242424]">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Output Directory</span>
                      <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1">dist</p>
                    </div>
                    <div className="p-3 rounded-[8px] bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#242424]">
                      <span className="text-[10px] text-slate-400 font-mono uppercase">Node Version</span>
                      <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1">NODE_VERSION = 20</p>
                    </div>
                  </div>

                  <div className="rounded-[8px] border border-slate-200 dark:border-[#282828] overflow-hidden">
                    <table className="w-full text-left text-xs font-mono">
                      <thead className="bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-[#282828]">
                        <tr>
                          <th className="p-2.5 font-medium">Variable Name</th>
                          <th className="p-2.5 font-medium">Configured Value</th>
                          <th className="p-2.5 font-medium text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-[#242424]">
                        {[
                          { key: 'VITE_SUPABASE_URL', val: cloudFormData.supabaseUrl },
                          { key: 'VITE_SUPABASE_PUBLISHABLE_KEY', val: cloudFormData.supabasePublishableKey },
                          { key: 'VITE_CLOUDFLARE_ACCOUNT_ID', val: cloudFormData.cloudflareAccountId },
                          { key: 'VITE_R2_BUCKET_NAME', val: cloudFormData.r2BucketName },
                          { key: 'VITE_R2_PUBLIC_DOMAIN', val: cloudFormData.r2PublicDomain },
                          { key: 'VITE_R2_ACCESS_KEY_ID', val: cloudFormData.r2AccessKeyId },
                          { key: 'VITE_R2_SECRET_ACCESS_KEY', val: cloudFormData.r2SecretAccessKey },
                          { key: 'NODE_VERSION', val: '20' },
                        ].map((row) => (
                          <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-[#181818]">
                            <td className="p-2.5 text-emerald-700 dark:text-[#3ecf8e] font-semibold">{row.key}</td>
                            <td className="p-2.5 text-slate-700 dark:text-[#bbb] max-w-xs truncate">{row.val}</td>
                            <td className="p-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => handleCopyText(row.val, row.key, row.key)}
                                className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                              >
                                {copiedField === row.key ? (
                                  <Check className="w-3.5 h-3.5 text-[#3ecf8e] inline" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 inline" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 6: CUSTOM DOMAIN & SSL CHECKLIST                               */}
            {/* =================================================================== */}
            {activeTabId === 'domain' && (
              <div className="space-y-6 max-w-4xl animate-in fade-in">
                <div className="rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-5 sm:p-6 space-y-4 shadow-xs">
                  <div className="border-b border-slate-100 dark:border-[#242424] pb-3">
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                      Pre-Launch Verification Checklist ({completedChecklistCount}/10 Done)
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-[#888] mt-0.5">
                      Verify all critical database, media storage, and security configurations.
                    </p>
                  </div>

                  <div className="space-y-2">
                    {checklistItems.map((item) => {
                      const isChecked = Boolean(checklist[item.id]);
                      return (
                        <label
                          key={item.id}
                          className={cn(
                            'flex items-center gap-2.5 p-2.5 rounded-[8px] border text-xs cursor-pointer select-none transition-colors',
                            isChecked
                              ? 'bg-emerald-50/50 dark:bg-[#1a261f] border-emerald-300 dark:border-emerald-800/40 text-slate-900 dark:text-white'
                              : 'bg-white dark:bg-[#121212] border-slate-200 dark:border-[#242424] text-slate-600 dark:text-[#a1a1a1] hover:border-slate-300 dark:hover:border-[#383838]'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleChecklistItem(item.id)}
                            className="w-4 h-4 rounded text-[#3ecf8e] focus:ring-[#3ecf8e] accent-[#3ecf8e] cursor-pointer"
                          />
                          <span className={cn('font-sans', isChecked && 'font-medium')}>{item.title}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 7: BRAND & IDENTITY STUDIO                                     */}
            {/* =================================================================== */}
            {activeTabId === 'brand' && (
              <div className="animate-in fade-in">
                <BrandIdentitySetup />
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 8: GLOBAL BROADCAST COMPOSER                                   */}
            {/* =================================================================== */}
            {activeTabId === 'broadcasts' && (
              <div className="max-w-3xl space-y-6 rounded-[12px] bg-white dark:bg-[#1a1a1a] border border-slate-200 dark:border-[#2e2e2e] p-6 shadow-xs animate-in fade-in">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-[8px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                    <Megaphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-[#EDEDED]">
                      Global System Broadcast Banner
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-[#808080]">
                      Broadcast real-time notices, closing alerts, or system maintenance messages to all counter terminals.
                    </p>
                  </div>
                </div>

                {/* Terminal Preview */}
                <div className="space-y-2">
                  <label className="text-xs font-mono text-slate-500 dark:text-[#808080] uppercase tracking-wider">
                    Terminal Preview
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-200 dark:border-[#2a2a2a] text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono text-[10px] font-semibold tracking-wider">
                      {isCustomBadge ? customBadge || 'CUSTOM' : broadcastBadge}
                    </span>
                    <span className="text-slate-900 dark:text-[#EDEDED] flex-1">
                      {broadcastMessage || 'Showroom notice message will appear here for all counter terminals.'}
                    </span>
                  </div>
                </div>

                {/* Form Controls */}
                <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-[#242424]">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-900 dark:text-[#EDEDED]">Badge Tag</label>
                    <div className="flex flex-wrap items-center gap-2">
                      {['NEW', 'ALERT', 'CLOSING', 'MAINTENANCE', 'UPDATE', 'NOTICE'].map((badge) => (
                        <button
                          key={badge}
                          type="button"
                          onClick={() => {
                            setBroadcastBadge(badge);
                            setIsCustomBadge(false);
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-[4px] text-xs font-mono transition-colors cursor-pointer border',
                            !isCustomBadge && broadcastBadge === badge
                              ? 'bg-[#3ecf8e]/10 text-emerald-700 dark:text-[#3ecf8e] border-[#3ecf8e]/30 font-semibold'
                              : 'bg-white dark:bg-[#121212] text-slate-600 dark:text-[#808080] border-slate-200 dark:border-[#262626] hover:text-slate-900 dark:hover:text-[#EDEDED]'
                          )}
                        >
                          {badge}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-slate-900 dark:text-[#EDEDED]">
                      Broadcast Message *
                    </label>
                    <textarea
                      rows={3}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      placeholder="e.g. Month-end closing scheduled tonight at 9:30 PM. All pending petty vouchers must be cleared."
                      className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-200 dark:border-[#262626] text-xs text-slate-900 dark:text-[#EDEDED] focus:border-[#3ecf8e] focus:outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleSaveBroadcast}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-[6px] bg-[#3ecf8e] text-[#171717] hover:bg-[#24b47e] text-xs font-semibold shadow-xs transition-all cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Publish Broadcast</span>
                    </button>
                    {broadcast?.message && (
                      <button
                        type="button"
                        onClick={handleClearBroadcast}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-[6px] border border-rose-500/20 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 text-xs font-medium transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear Banner</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================== */}
            {/* VIEW 9: MASTER CATALOGUE DATA TABLES (GRID & DDL)                   */}
            {/* =================================================================== */}
            {isMasterDataTable && (
              <div className="space-y-4 animate-in fade-in">
                {/* Master Table Filter Controls */}
                <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50 dark:bg-[#171717] p-2.5 rounded-[8px] border border-slate-200 dark:border-[#242424]">
                  {/* Search input */}
                  <div className="relative flex-1 min-w-[260px] max-w-lg">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-[#707070]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder={`Filter ${currentTab.name}...`}
                      className="w-full pl-9 pr-12 py-1.5 rounded-[6px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] text-xs text-slate-900 dark:text-[#EDEDED] placeholder-slate-400 dark:placeholder-[#606060] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] font-mono transition-colors"
                    />
                    {searchQuery ? (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-[#EDEDED] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono border border-slate-200 dark:border-[#262626] px-1 py-0.2 rounded-[3px] pointer-events-none">
                        /
                      </span>
                    )}
                  </div>

                  {/* View Mode & Density Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* View Mode Toggle (Data vs DDL) */}
                    <div className="flex items-center bg-slate-100 dark:bg-[#141414] p-0.5 rounded-[6px] border border-slate-200 dark:border-[#262626]">
                      <button
                        type="button"
                        onClick={() => setViewMode('grid')}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-mono transition-colors cursor-pointer',
                          viewMode === 'grid'
                            ? 'bg-white dark:bg-[#222222] text-emerald-700 dark:text-[#3ecf8e] shadow-xs font-medium'
                            : 'text-slate-500 dark:text-[#707070] hover:text-slate-900 dark:hover:text-[#EDEDED]'
                        )}
                      >
                        <TableIcon className="w-3.5 h-3.5" />
                        <span>Data</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setViewMode('ddl')}
                        className={cn(
                          'flex items-center gap-1 px-2.5 py-1 rounded-[4px] text-xs font-mono transition-colors cursor-pointer',
                          viewMode === 'ddl'
                            ? 'bg-white dark:bg-[#222222] text-emerald-700 dark:text-[#3ecf8e] shadow-xs font-medium'
                            : 'text-slate-500 dark:text-[#707070] hover:text-slate-900 dark:hover:text-[#EDEDED]'
                        )}
                      >
                        <Code2 className="w-3.5 h-3.5" />
                        <span>SQL Schema</span>
                      </button>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center bg-slate-100 dark:bg-[#141414] p-0.5 rounded-[6px] border border-slate-200 dark:border-[#262626]">
                      <button
                        type="button"
                        onClick={() => setStatusFilter('all')}
                        className={cn(
                          'px-2 py-1 rounded-[4px] text-[11px] font-mono transition-colors cursor-pointer',
                          statusFilter === 'all'
                            ? 'bg-white dark:bg-[#222222] text-slate-900 dark:text-[#EDEDED] font-medium shadow-xs'
                            : 'text-slate-500 dark:text-[#707070] hover:text-slate-900 dark:hover:text-[#EDEDED]'
                        )}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('active')}
                        className={cn(
                          'px-2 py-1 rounded-[4px] text-[11px] font-mono transition-colors cursor-pointer',
                          statusFilter === 'active'
                            ? 'bg-white dark:bg-[#222222] text-emerald-600 dark:text-emerald-400 font-medium shadow-xs'
                            : 'text-slate-500 dark:text-[#707070] hover:text-emerald-600 dark:hover:text-emerald-400'
                        )}
                      >
                        {activeTabId === 'periods' ? 'Open' : 'Active'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setStatusFilter('inactive')}
                        className={cn(
                          'px-2 py-1 rounded-[4px] text-[11px] font-mono transition-colors cursor-pointer',
                          statusFilter === 'inactive'
                            ? 'bg-white dark:bg-[#222222] text-amber-600 dark:text-amber-400 font-medium shadow-xs'
                            : 'text-slate-500 dark:text-[#707070] hover:text-amber-600 dark:hover:text-amber-400'
                        )}
                      >
                        {activeTabId === 'periods' ? 'Locked' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* DDL View */}
                {viewMode === 'ddl' && (
                  <div className="bg-slate-50 dark:bg-[#171717] rounded-[12px] border border-slate-200 dark:border-[#242424] overflow-hidden shadow-xs">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-[#242424] bg-white dark:bg-[#141414]">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#3ecf8e]" />
                        <span className="text-xs font-mono text-slate-900 dark:text-[#EDEDED]">
                          PostgreSQL DDL Definition &middot; <span className="text-[#3ecf8e]">{currentTab.tableName}</span>
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyDdl(getTableDdl)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-slate-200 dark:border-[#262626] bg-slate-50 dark:bg-[#1a1a1a] text-slate-600 dark:text-[#A1A1A1] hover:text-slate-900 dark:hover:text-[#EDEDED] text-xs font-mono transition-colors cursor-pointer"
                      >
                        {isCopiedDdl ? <Check className="w-3.5 h-3.5 text-[#3ecf8e]" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopiedDdl ? 'Copied' : 'Copy DDL'}</span>
                      </button>
                    </div>
                    <pre className="p-4 text-xs font-mono text-emerald-400 bg-slate-900 overflow-x-auto leading-relaxed">
                      <code>{getTableDdl}</code>
                    </pre>
                  </div>
                )}

                {/* Data Grid View */}
                {viewMode === 'grid' && (
                  <div className="bg-white dark:bg-[#1a1a1a] rounded-[12px] border border-slate-200 dark:border-[#242424] overflow-hidden shadow-xs">
                    {currentFilteredCount === 0 ? (
                      <div className="py-14">
                        <EmptyState
                          icon={currentTab.icon}
                          title={`No records found in ${currentTab.name}`}
                          description={
                            searchQuery
                              ? `No records matching "${searchQuery}". Clear your search to see all records.`
                              : `The table ${currentTab.tableName} is currently empty.`
                          }
                          actionLabel={currentTab.drawerType ? 'Insert Row' : undefined}
                          onAction={currentTab.drawerType ? handleOpenInsert : undefined}
                        />
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-mono text-xs">
                          <thead>
                            <tr className="bg-slate-50 dark:bg-[#171717] border-b border-slate-200 dark:border-[#242424] text-[11px] text-slate-500 dark:text-[#707070] uppercase tracking-wider font-semibold">
                              {activeTabId === 'periods' && (
                                <>
                                  <th className={densityClasses}>Period Key</th>
                                  <th className={densityClasses}>Date Range</th>
                                  <th className={densityClasses}>Status</th>
                                  <th className={densityClasses}>Locked By</th>
                                  <th className={densityClasses}>Audit Reason</th>
                                  <th className={cn(densityClasses, 'text-right')}>Action</th>
                                </>
                              )}

                              {activeTabId === 'branches' && (
                                <>
                                  <th className={densityClasses}>Code</th>
                                  <th className={densityClasses}>Branch Name</th>
                                  <th className={densityClasses}>City &amp; State</th>
                                  <th className={densityClasses}>GSTIN</th>
                                  <th className={densityClasses}>Cash Box Ceilings</th>
                                  <th className={densityClasses}>Status</th>
                                  <th className={cn(densityClasses, 'text-right')}>Action</th>
                                </>
                              )}

                              {activeTabId === 'categories' && (
                                <>
                                  <th className={densityClasses}>Category Name</th>
                                  <th className={densityClasses}>Theme Tag</th>
                                  <th className={densityClasses}>Status</th>
                                  <th className={cn(densityClasses, 'text-right')}>Action</th>
                                </>
                              )}

                              {activeTabId === 'departments' && (
                                <>
                                  <th className={densityClasses}>Code</th>
                                  <th className={densityClasses}>Department Name</th>
                                  <th className={densityClasses}>Status</th>
                                  <th className={cn(densityClasses, 'text-right')}>Action</th>
                                </>
                              )}

                              {activeTabId === 'couriers' && (
                                <>
                                  <th className={densityClasses}>Code</th>
                                  <th className={densityClasses}>Partner Name</th>
                                  <th className={densityClasses}>Phone</th>
                                  <th className={densityClasses}>Status</th>
                                  <th className={cn(densityClasses, 'text-right')}>Action</th>
                                </>
                              )}

                              {activeTabId === 'staff' && (
                                <>
                                  <th className={densityClasses}>Staff Code</th>
                                  <th className={densityClasses}>Full Name</th>
                                  <th className={densityClasses}>Branch</th>
                                  <th className={densityClasses}>Department</th>
                                  <th className={densityClasses}>Designation</th>
                                  <th className={densityClasses}>Status</th>
                                  <th className={cn(densityClasses, 'text-right')}>Action</th>
                                </>
                              )}

                              {activeTabId === 'roles' && (
                                <>
                                  <th className={densityClasses}>Role Code</th>
                                  <th className={densityClasses}>Role Title</th>
                                  <th className={densityClasses}>Description</th>
                                  <th className={densityClasses}>System Role</th>
                                  <th className={cn(densityClasses, 'text-right')}>Action</th>
                                </>
                              )}

                              {activeTabId === 'denominations' && (
                                <>
                                  <th className={densityClasses}>Value</th>
                                  <th className={densityClasses}>Display Label</th>
                                  <th className={densityClasses}>Type</th>
                                  <th className={densityClasses}>Sort</th>
                                  <th className={densityClasses}>Status</th>
                                </>
                              )}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-[#242424]">
                            {/* PERIODS ROWS */}
                            {activeTabId === 'periods' &&
                              filteredPeriods.map((p) => (
                                <tr key={p.period_key} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {p.period_key}
                                  </td>
                                  <td className={densityClasses}>
                                    {formatDate(p.start_date)} → {formatDate(p.end_date)}
                                  </td>
                                  <td className={densityClasses}>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-mono inline-flex items-center gap-1',
                                        p.is_locked
                                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
                                          : 'bg-emerald-500/10 text-emerald-700 dark:text-[#3ecf8e] border border-[#3ecf8e]/30'
                                      )}
                                    >
                                      {p.is_locked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                                      <span>{p.is_locked ? 'Locked' : 'Open'}</span>
                                    </span>
                                  </td>
                                  <td className={densityClasses}>{p.locked_by_name || '—'}</td>
                                  <td className={cn(densityClasses, 'max-w-xs truncate text-slate-500')}>
                                    {p.lock_reason || '—'}
                                  </td>
                                  <td className={cn(densityClasses, 'text-right')}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenPeriodLockModal(p)}
                                      className="px-2 py-1 rounded-[4px] border border-slate-200 dark:border-[#333] hover:bg-slate-100 dark:hover:bg-[#282828] text-[11px] font-mono cursor-pointer"
                                    >
                                      {p.is_locked ? 'Unlock' : 'Lock'}
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {/* BRANCHES ROWS */}
                            {activeTabId === 'branches' &&
                              filteredBranches.map((b) => (
                                <tr key={b.branch_id} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {b.branch_code}
                                  </td>
                                  <td className={densityClasses}>{b.branch_name}</td>
                                  <td className={densityClasses}>
                                    {b.city}, {b.state}
                                  </td>
                                  <td className={densityClasses}>{b.gstin || '—'}</td>
                                  <td className={densityClasses}>
                                    Max Cash: {formatINR(b.max_cash_ceiling || 25000)} | Safe Drop: {formatINR(b.min_cash_threshold || 3000)}
                                  </td>
                                  <td className={densityClasses}>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-mono',
                                        b.is_active
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#3ecf8e]'
                                          : 'bg-slate-200 dark:bg-[#252525] text-slate-500'
                                      )}
                                    >
                                      {b.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className={cn(densityClasses, 'text-right')}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(b)}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                      title="Edit Branch"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {/* CATEGORIES ROWS */}
                            {activeTabId === 'categories' &&
                              filteredCategories.map((c) => (
                                <tr key={c.category_name} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {c.category_name}
                                  </td>
                                  <td className={densityClasses}>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#252525]">
                                      {c.color_theme || 'Default'}
                                    </span>
                                  </td>
                                  <td className={densityClasses}>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-mono',
                                        c.is_active
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#3ecf8e]'
                                          : 'bg-slate-200 dark:bg-[#252525] text-slate-500'
                                      )}
                                    >
                                      {c.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className={cn(densityClasses, 'text-right')}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(c)}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {/* DEPARTMENTS ROWS */}
                            {activeTabId === 'departments' &&
                              filteredDepartments.map((d) => (
                                <tr key={d.department_code} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {d.department_code}
                                  </td>
                                  <td className={densityClasses}>{d.department_name}</td>
                                  <td className={densityClasses}>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-mono',
                                        d.is_active
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#3ecf8e]'
                                          : 'bg-slate-200 dark:bg-[#252525] text-slate-500'
                                      )}
                                    >
                                      {d.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className={cn(densityClasses, 'text-right')}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(d)}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {/* COURIERS ROWS */}
                            {activeTabId === 'couriers' &&
                              filteredCouriers.map((cr) => (
                                <tr key={cr.partner_code} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {cr.partner_code}
                                  </td>
                                  <td className={densityClasses}>{cr.partner_name}</td>
                                  <td className={densityClasses}>{cr.contact_phone || '—'}</td>
                                  <td className={densityClasses}>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-mono',
                                        cr.is_active
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#3ecf8e]'
                                          : 'bg-slate-200 dark:bg-[#252525] text-slate-500'
                                      )}
                                    >
                                      {cr.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className={cn(densityClasses, 'text-right')}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(cr)}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {/* STAFF ROWS */}
                            {activeTabId === 'staff' &&
                              filteredStaff.slice(0, 100).map((s) => (
                                <tr key={s.staff_code} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {s.staff_code}
                                  </td>
                                  <td className={densityClasses}>
                                    {s.first_name} {s.last_name}
                                  </td>
                                  <td className={densityClasses}>{s.branch_code || 'ASI'}</td>
                                  <td className={densityClasses}>{s.department_name || 'Showroom Sales'}</td>
                                  <td className={densityClasses}>{s.designation || 'Sales Executive'}</td>
                                  <td className={densityClasses}>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-mono',
                                        s.is_active
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#3ecf8e]'
                                          : 'bg-slate-200 dark:bg-[#252525] text-slate-500'
                                      )}
                                    >
                                      {s.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                  <td className={cn(densityClasses, 'text-right')}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(s)}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {/* ROLES ROWS */}
                            {activeTabId === 'roles' &&
                              filteredRoles.map((r) => (
                                <tr key={r.role_code} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {r.role_code}
                                  </td>
                                  <td className={densityClasses}>{r.role_title}</td>
                                  <td className={cn(densityClasses, 'max-w-xs truncate text-slate-500')}>
                                    {r.description || '—'}
                                  </td>
                                  <td className={densityClasses}>
                                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-slate-100 dark:bg-[#252525]">
                                      {r.is_system_role ? 'System Fixed' : 'Custom'}
                                    </span>
                                  </td>
                                  <td className={cn(densityClasses, 'text-right')}>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenEdit(r)}
                                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-[#333] text-slate-500 hover:text-slate-900 dark:hover:text-white"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}

                            {/* DENOMINATIONS ROWS */}
                            {activeTabId === 'denominations' &&
                              filteredDenominations.map((dn) => (
                                <tr key={dn.denomination_value} className="hover:bg-slate-50 dark:hover:bg-[#202020] transition-colors">
                                  <td className={cn(densityClasses, 'font-semibold text-slate-900 dark:text-white')}>
                                    {formatINR(dn.denomination_value)}
                                  </td>
                                  <td className={densityClasses}>{dn.display_label}</td>
                                  <td className={densityClasses}>{dn.is_coin ? 'Coin' : 'Currency Note'}</td>
                                  <td className={densityClasses}>{dn.sort_order}</td>
                                  <td className={densityClasses}>
                                    <span
                                      className={cn(
                                        'px-2 py-0.5 rounded-full text-[10px] font-mono',
                                        dn.is_active
                                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-[#3ecf8e]'
                                          : 'bg-slate-200 dark:bg-[#252525] text-slate-500'
                                      )}
                                    >
                                      {dn.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MASTER DATA MODAL DRAWER                                                  */}
      {/* ========================================================================= */}
      {drawerOpen && (
        <MasterDataDrawer
          isOpen={drawerOpen}
          type={drawerType}
          record={selectedRecord}
          onClose={() => setDrawerOpen(false)}
          onSuccess={handleDrawerSuccess}
        />
      )}

      {/* ========================================================================= */}
      {/* PERIOD LOCK AUDIT MODAL                                                   */}
      {/* ========================================================================= */}
      {lockModalOpen && targetPeriod && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="relative w-full max-w-md rounded-[12px] bg-white dark:bg-[#181818] border border-slate-200 dark:border-[#2e2e2e] p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <button
              type="button"
              onClick={() => setLockModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div
                className={cn(
                  'w-10 h-10 rounded-[8px] flex items-center justify-center',
                  targetPeriod.is_locked
                    ? 'bg-emerald-500/10 text-[#3ecf8e] border border-[#3ecf8e]/30'
                    : 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                )}
              >
                {targetPeriod.is_locked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  {targetPeriod.is_locked ? 'Unlock Accounting Period' : 'Lock Accounting Period'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#888]">
                  Period {targetPeriod.period_key} ({formatDate(targetPeriod.start_date)} → {formatDate(targetPeriod.end_date)})
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans block">
                Audit Justification / Lock Reason
              </label>
              <textarea
                rows={3}
                value={lockReason}
                onChange={(e) => setLockReason(e.target.value)}
                placeholder="e.g. Monthly books verified by chartered accountant. Final tally complete."
                className="w-full px-3 py-2 rounded-[6px] bg-slate-50 dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] text-xs font-mono text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#3ecf8e] outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-[#242424]">
              <button
                type="button"
                onClick={() => setLockModalOpen(false)}
                className="px-3 py-1.5 rounded-[6px] border border-slate-300 dark:border-[#333] text-xs font-medium text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-[#222]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmToggleLock}
                disabled={isSubmittingLock}
                className={cn(
                  'px-4 py-1.5 rounded-[6px] text-xs font-medium flex items-center gap-1.5 cursor-pointer shadow-xs',
                  targetPeriod.is_locked
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717]'
                )}
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
                <span>
                  {isSubmittingLock
                    ? 'Saving...'
                    : targetPeriod.is_locked
                    ? 'Confirm Unlock'
                    : 'Confirm Lock'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowroomSettingsPage;
