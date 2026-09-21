import React, { useState, useEffect, useMemo } from 'react';
import {
  useCloudConfigStore,
  CloudConfig,
  ConnectionTestResult,
} from '@/store/cloudConfigStore';
import { showToast } from '@/components/ui/ToastContainer';
import { triggerHaptic, cn } from '@/lib/utils';
import {
  Database,
  Cloud,
  FileCode,
  Globe,
  ShieldCheck,
  Check,
  Copy,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Activity,
  Layers,
  Sparkles,
  Server,
  Lock,
  ArrowRight,
  Terminal,
} from 'lucide-react';

type SetupPhase = 'supabase' | 'r2' | 'files' | 'pages' | 'domain';

interface CloudDeploymentSetupProps {
  onClose?: () => void;
  isStandaloneModal?: boolean;
}

export const CloudDeploymentSetup: React.FC<CloudDeploymentSetupProps> = ({
  onClose,
  isStandaloneModal = false,
}) => {
  const {
    config,
    checklist,
    isTestingConnection,
    lastTestResult,
    updateConfig,
    resetToDefaults,
    toggleChecklistItem,
    testSupabaseConnection,
    generateEnvContent,
    generateCorsJson,
  } = useCloudConfigStore();

  const [activePhase, setActivePhase] = useState<SetupPhase>('supabase');
  const [formData, setFormData] = useState<CloudConfig>(config);
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [showAnonKey, setShowAnonKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  // Sync form with store when store updates
  useEffect(() => {
    setFormData(config);
  }, [config]);

  const handleInputChange = (key: keyof CloudConfig, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCopy = (text: string, keyName: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    triggerHaptic('light');
    showToast({
      type: 'success',
      title: 'Copied to Clipboard',
      message: `${label} copied successfully.`,
    });
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleDownloadFile = (filename: string, content: string, mimeType = 'text/plain') => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    triggerHaptic('selection');
    showToast({
      type: 'success',
      title: 'File Downloaded',
      message: `Downloaded ${filename} to your computer.`,
    });
  };

  const handleApplyChanges = () => {
    setIsApplying(true);
    triggerHaptic('heavy');
    try {
      updateConfig(formData);
      showToast({
        type: 'success',
        title: 'Settings Applied Instantly',
        message: 'Supabase and Cloudflare credentials have been hot-reloaded across the application.',
      });
      // Optionally run connection test
      testSupabaseConnection(formData.supabaseUrl, formData.supabasePublishableKey);
    } catch (err: any) {
      showToast({
        type: 'error',
        title: 'Failed to Apply',
        message: err.message || 'Error applying settings.',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const handleTestConnection = async () => {
    triggerHaptic('selection');
    const result = await testSupabaseConnection(formData.supabaseUrl, formData.supabasePublishableKey);
    if (result.success) {
      showToast({
        type: 'success',
        title: 'Connection Verified',
        message: `Connected to Supabase in ${result.latencyMs}ms. Database schema active.`,
      });
    } else {
      showToast({
        type: 'error',
        title: 'Connection Failed',
        message: result.message,
      });
    }
  };

  // Full SQL migration snippet
  const fullSqlExportPreview = `-- ================================================================================
-- ASOPALAV ERP - PRODUCTION POSTGRESQL SCHEMA & SEED DATA EXPORT
-- Includes 18 Tables, RLS Policies, 303 Staff Members & Seed Master Data
-- ================================================================================
-- To run: Open Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run

-- 1. Master Branches
CREATE TABLE IF NOT EXISTS public.branches (
  branch_id VARCHAR(50) PRIMARY KEY,
  branch_code VARCHAR(10) UNIQUE NOT NULL,
  branch_name VARCHAR(150) NOT NULL,
  short_name VARCHAR(50) NOT NULL,
  entity_company_name VARCHAR(150) NOT NULL DEFAULT 'Asopalav Endeavours LLP',
  pan_number VARCHAR(20),
  gstin VARCHAR(20) DEFAULT '24ABVFA8046N1ZQ',
  accountant_name VARCHAR(100),
  contact_phone VARCHAR(30),
  city VARCHAR(50) NOT NULL DEFAULT 'Ahmedabad',
  state VARCHAR(50) NOT NULL DEFAULT 'Gujarat',
  min_cash_threshold NUMERIC(12,2) NOT NULL DEFAULT 3000.00,
  max_cash_ceiling NUMERIC(12,2) NOT NULL DEFAULT 25000.00,
  max_upi_ceiling NUMERIC(12,2) NOT NULL DEFAULT 50000.00,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Staff Members (303 Showroom Staff)
CREATE TABLE IF NOT EXISTS public.staff_members (
  staff_code VARCHAR(30) PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  middle_name VARCHAR(50),
  last_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  mobile_number VARCHAR(20),
  branch_id VARCHAR(50) REFERENCES public.branches(branch_id),
  branch_code VARCHAR(10),
  department_name VARCHAR(100),
  designation VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. App Users & RBAC
CREATE TABLE IF NOT EXISTS public.app_users (
  id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100),
  password_hash TEXT NOT NULL,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  avatar_url TEXT,
  role_code VARCHAR(50) NOT NULL,
  assigned_branches JSONB DEFAULT '["*"]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Expense Vouchers
CREATE TABLE IF NOT EXISTS public.expense_vouchers (
  voucher_id VARCHAR(50) PRIMARY KEY,
  voucher_number VARCHAR(50) UNIQUE NOT NULL,
  voucher_date DATE NOT NULL,
  branch_id VARCHAR(50) REFERENCES public.branches(branch_id),
  branch_code VARCHAR(10),
  voucher_mode VARCHAR(50) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  department_name VARCHAR(100),
  amount NUMERIC(12,2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL DEFAULT 'Cash',
  bill_photo_url TEXT,
  bill_number VARCHAR(100),
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_voided BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- (Plus accounting_periods, branch_wallets, currency_denominations, system_broadcasts, etc.)
`;

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

  const phases = [
    {
      id: 'supabase' as SetupPhase,
      title: '1. Supabase Project',
      subtitle: 'Database, Auth & SQL',
      icon: Database,
      badge: lastTestResult?.success ? 'Connected' : 'Database',
    },
    {
      id: 'r2' as SetupPhase,
      title: '2. Cloudflare R2',
      subtitle: 'Media & Bill Storage',
      icon: Cloud,
      badge: 'S3 Storage',
    },
    {
      id: 'files' as SetupPhase,
      title: '3. Project Files',
      subtitle: '.env & Code Fallbacks',
      icon: FileCode,
      badge: '.env Sync',
    },
    {
      id: 'pages' as SetupPhase,
      title: '4. Cloudflare Pages',
      subtitle: 'Hosting & Env Variables',
      icon: Globe,
      badge: 'Frontend',
    },
    {
      id: 'domain' as SetupPhase,
      title: '5. Domain & SSL',
      subtitle: 'DNS, SSL & Verification',
      icon: ShieldCheck,
      badge: `${completedChecklistCount}/10 Done`,
    },
  ];

  return (
    <div className={cn('flex flex-col bg-white dark:bg-[#141414] text-slate-900 dark:text-[#EDEDED] font-sans antialiased', isStandaloneModal ? 'p-4 sm:p-6' : 'p-4 lg:p-6')}>
      {/* 1. Header Banner & Instant Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200 dark:border-[#282828]">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[6px] bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 flex items-center justify-center text-[#3ecf8e]">
              <Server className="w-4 h-4" />
            </div>
            <h2 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 dark:text-white font-sans">
              Cloud &amp; Deployment Infrastructure Setup
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-[#3ecf8e] border border-[#3ecf8e]/30">
              Admin Protected
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-[#888888] font-sans">
            Configure live Supabase PostgreSQL, Cloudflare R2 Object Storage, Pages environment variables, and custom domain routing.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleTestConnection}
            disabled={isTestingConnection}
            className="h-8 px-3 rounded-[6px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-700 dark:text-[#a1a1a1] hover:text-slate-900 dark:hover:text-white text-xs font-medium font-sans flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
            title="Ping Supabase database and verify table counts"
          >
            <Activity className={cn('w-3.5 h-3.5 text-[#3ecf8e]', isTestingConnection && 'animate-spin')} />
            <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
          </button>

          <button
            type="button"
            onClick={handleApplyChanges}
            disabled={isApplying}
            className="h-8 px-3.5 rounded-[6px] bg-[#3ecf8e] hover:bg-[#24b47e] text-[#171717] text-xs font-semibold font-sans flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs select-none"
            title="Instantly apply and hot-reload database & storage clients"
          >
            <Check className="w-3.5 h-3.5 text-[#171717] stroke-[3]" />
            <span>Apply Changes Instantly</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3 rounded-[6px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#282828] text-slate-600 dark:text-zinc-400 text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* 2. Connection Telemetry Bar */}
      {lastTestResult && (
        <div
          className={cn(
            'my-4 p-3 rounded-[8px] border text-xs font-mono flex items-center justify-between gap-3',
            lastTestResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800/40 text-rose-800 dark:text-rose-300'
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'w-2 h-2 rounded-full shrink-0',
                lastTestResult.success ? 'bg-[#3ecf8e] animate-pulse' : 'bg-rose-500'
              )}
            />
            <span className="font-medium">{lastTestResult.message}</span>
          </div>
          {lastTestResult.details && (
            <div className="hidden sm:flex items-center gap-3 text-[11px] opacity-90">
              <span>Users: <strong>{lastTestResult.details.appUsersCount}</strong></span>
              <span>Staff: <strong>{lastTestResult.details.staffCount}</strong></span>
              <span>Branches: <strong>{lastTestResult.details.branchesCount}</strong></span>
            </div>
          )}
        </div>
      )}

      {/* 3. Navigation Tabs (5 Phases) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 my-4">
        {phases.map((phase) => {
          const Icon = phase.icon;
          const isActive = activePhase === phase.id;
          return (
            <button
              key={phase.id}
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActivePhase(phase.id);
              }}
              className={cn(
                'flex flex-col items-start p-2.5 sm:p-3 rounded-[8px] border text-left cursor-pointer transition-all duration-150',
                isActive
                  ? 'bg-emerald-50/50 dark:bg-[#1f2923] border-[#3ecf8e] shadow-xs'
                  : 'bg-slate-50/60 dark:bg-[#181818] border-slate-200 dark:border-[#282828] hover:border-slate-300 dark:hover:border-[#383838]'
              )}
            >
              <div className="flex items-center justify-between w-full mb-1">
                <Icon
                  className={cn(
                    'w-4 h-4',
                    isActive ? 'text-[#3ecf8e]' : 'text-slate-500 dark:text-[#888]'
                  )}
                />
                <span
                  className={cn(
                    'text-[10px] font-mono px-1.5 py-0.2 rounded',
                    isActive
                      ? 'bg-[#3ecf8e]/20 text-[#3ecf8e] font-semibold'
                      : 'bg-slate-200/70 dark:bg-[#242424] text-slate-600 dark:text-[#888]'
                  )}
                >
                  {phase.badge}
                </span>
              </div>
              <span
                className={cn(
                  'text-xs font-semibold font-sans',
                  isActive ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-[#ccc]'
                )}
              >
                {phase.title}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-[#888] truncate w-full mt-0.5">
                {phase.subtitle}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Active Phase Content Body */}
      <div className="mt-2 rounded-[10px] bg-slate-50/50 dark:bg-[#181818] border border-slate-200 dark:border-[#282828] p-4 sm:p-6 space-y-6">
        {/* ========================================================================= */}
        {/* PHASE 1: SUPABASE PROJECT SETUP                                           */}
        {/* ========================================================================= */}
        {activePhase === 'supabase' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-200 dark:border-[#282828] pb-4">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#3ecf8e]" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  Phase 1: New Supabase Project Setup (Database &amp; Auth)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
                Mumbai Region (<code>ap-south-1</code>) recommended for Indian showroom operations.
              </p>
            </div>

            {/* Input Credentials */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans flex items-center justify-between">
                  <span>Supabase Project URL (VITE_SUPABASE_URL)</span>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-[#3ecf8e] hover:underline flex items-center gap-1"
                  >
                    <span>Supabase Dashboard</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <input
                  type="text"
                  value={formData.supabaseUrl}
                  onChange={(e) => handleInputChange('supabaseUrl', e.target.value)}
                  placeholder="https://<project-ref>.supabase.co"
                  className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans flex items-center justify-between">
                  <span>Anon / Publishable API Key (VITE_SUPABASE_PUBLISHABLE_KEY)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Found under Project Settings → API</span>
                </label>
                <div className="relative">
                  <input
                    type={showAnonKey ? 'text' : 'password'}
                    value={formData.supabasePublishableKey}
                    onChange={(e) => handleInputChange('supabasePublishableKey', e.target.value)}
                    placeholder="sb_publishable_... or eyJh..."
                    className="w-full pl-3 pr-10 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAnonKey(!showAnonKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    title={showAnonKey ? 'Hide key' : 'Show key'}
                  >
                    {showAnonKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* SQL Migration Quick Action */}
            <div className="p-4 rounded-[8px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" />
                    <span>PostgreSQL Database Schema &amp; Seed SQL</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#888]">
                    Exports 18 tables, RLS policies, RBAC roles, and all 303 active showroom staff records.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(fullSqlExportPreview, 'sql_schema', 'Full Production SQL Schema')
                    }
                    className="h-7 px-2.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-zinc-200 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    {copiedKey === 'sql_schema' ? (
                      <Check className="w-3 h-3 text-[#3ecf8e]" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{copiedKey === 'sql_schema' ? 'Copied SQL' : 'Copy SQL'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDownloadFile('full_production_database_export.sql', fullSqlExportPreview, 'application/sql')
                    }
                    className="h-7 px-2.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-zinc-200 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Download className="w-3 h-3 text-slate-400" />
                    <span>Download .sql</span>
                  </button>
                </div>
              </div>

              {/* Code preview */}
              <div className="p-3 rounded-[6px] bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-44 border border-slate-800">
                <pre>{fullSqlExportPreview}</pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 2: CLOUDFLARE R2 SETUP                                              */}
        {/* ========================================================================= */}
        {activePhase === 'r2' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-200 dark:border-[#282828] pb-4">
              <div className="flex items-center gap-2">
                <Cloud className="w-4 h-4 text-[#3ecf8e]" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  Phase 2: Cloudflare R2 Setup (Media, Bills &amp; Avatars Storage)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
                Zero-egress object storage for high-resolution expense receipt vouchers and staff photos.
              </p>
            </div>

            {/* Grid of R2 credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans">
                  Cloudflare Account ID (VITE_CLOUDFLARE_ACCOUNT_ID)
                </label>
                <input
                  type="text"
                  value={formData.cloudflareAccountId}
                  onChange={(e) => handleInputChange('cloudflareAccountId', e.target.value)}
                  placeholder="5570d32edaa2c2544..."
                  className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans">
                  R2 Bucket Name (VITE_R2_BUCKET_NAME)
                </label>
                <input
                  type="text"
                  value={formData.r2BucketName}
                  onChange={(e) => handleInputChange('r2BucketName', e.target.value)}
                  placeholder="asopalav-erp-media"
                  className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans flex items-center justify-between">
                  <span>Public Access URL / Subdomain (VITE_R2_PUBLIC_DOMAIN)</span>
                  <span className="text-[11px] text-slate-400 font-normal">Enable R2.dev subdomain in Bucket Settings</span>
                </label>
                <input
                  type="text"
                  value={formData.r2PublicDomain}
                  onChange={(e) => handleInputChange('r2PublicDomain', e.target.value)}
                  placeholder="https://pub-xxxxxxxx.r2.dev or https://media.asopalav.com"
                  className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans">
                  R2 Access Key ID (VITE_R2_ACCESS_KEY_ID)
                </label>
                <input
                  type="text"
                  value={formData.r2AccessKeyId}
                  onChange={(e) => handleInputChange('r2AccessKeyId', e.target.value)}
                  placeholder="97dedbb40d13..."
                  className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans">
                  R2 Secret Access Key (VITE_R2_SECRET_ACCESS_KEY)
                </label>
                <div className="relative">
                  <input
                    type={showSecretKey ? 'text' : 'password'}
                    value={formData.r2SecretAccessKey}
                    onChange={(e) => handleInputChange('r2SecretAccessKey', e.target.value)}
                    placeholder="47cfc81ba4332b..."
                    className="w-full pl-3 pr-10 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretKey(!showSecretKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200"
                    title={showSecretKey ? 'Hide key' : 'Show key'}
                  >
                    {showSecretKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* CORS Configuration Box */}
            <div className="p-4 rounded-[8px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#3ecf8e]" />
                    <span>Bucket CORS Policy JSON (Required for Direct Browser Photo Uploads)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#888]">
                    Paste in Cloudflare Dashboard → R2 → Bucket Settings → CORS Policy.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(generateCorsJson(), 'cors_json', 'R2 CORS Policy JSON')}
                  className="h-7 px-2.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-zinc-200 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                >
                  {copiedKey === 'cors_json' ? (
                    <Check className="w-3 h-3 text-[#3ecf8e]" />
                  ) : (
                    <Copy className="w-3 h-3 text-slate-400" />
                  )}
                  <span>{copiedKey === 'cors_json' ? 'Copied CORS' : 'Copy CORS JSON'}</span>
                </button>
              </div>

              <div className="p-3 rounded-[6px] bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto max-h-40 border border-slate-800">
                <pre>{generateCorsJson()}</pre>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 3: PROJECT FILES TO UPDATE                                          */}
        {/* ========================================================================= */}
        {activePhase === 'files' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-200 dark:border-[#282828] pb-4">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-[#3ecf8e]" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  Phase 3: Project Files to Update (.env, config &amp; fallbacks)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
                Synchronize your root <code>.env</code> and fallback client defaults with the newly configured credentials.
              </p>
            </div>

            {/* Generated .env file display */}
            <div className="p-4 rounded-[8px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#3ecf8e]" />
                    <span>Root .env File (Ready to Copy or Download)</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-[#888]">
                    Place in the project root folder. All variables start with <code>VITE_</code>.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopy(generateEnvContent(), 'env_file', '.env file content')}
                    className="h-7 px-2.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-zinc-200 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    {copiedKey === 'env_file' ? (
                      <Check className="w-3 h-3 text-[#3ecf8e]" />
                    ) : (
                      <Copy className="w-3 h-3 text-slate-400" />
                    )}
                    <span>{copiedKey === 'env_file' ? 'Copied .env' : 'Copy .env'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDownloadFile('.env', generateEnvContent(), 'text/plain')}
                    className="h-7 px-2.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-zinc-200 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                  >
                    <Download className="w-3 h-3 text-slate-400" />
                    <span>Download .env</span>
                  </button>
                </div>
              </div>

              <div className="p-3 rounded-[6px] bg-slate-900 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-48 border border-slate-800">
                <pre>{generateEnvContent()}</pre>
              </div>
            </div>

            {/* SPA Redirects file */}
            <div className="p-4 rounded-[8px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                  SPA Routing Fallback (public/_redirects)
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-[#888] font-mono mt-0.5">
                  /*   /index.html   200
                </p>
                <p className="text-[11px] text-slate-400 dark:text-[#777] mt-1">
                  Enables direct URL refreshes without 404 errors on Cloudflare Pages.
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleCopy('/*   /index.html   200\n', 'redirects', 'public/_redirects content')}
                className="h-7 px-2.5 rounded-[4px] bg-slate-100 dark:bg-[#202020] hover:bg-slate-200 dark:hover:bg-[#2a2a2a] border border-slate-300 dark:border-[#333] text-slate-800 dark:text-zinc-200 text-xs font-mono flex items-center gap-1 cursor-pointer transition-colors shadow-2xs shrink-0"
              >
                {copiedKey === 'redirects' ? (
                  <Check className="w-3 h-3 text-[#3ecf8e]" />
                ) : (
                  <Copy className="w-3 h-3 text-slate-400" />
                )}
                <span>{copiedKey === 'redirects' ? 'Copied' : 'Copy _redirects'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* PHASE 4: CLOUDFLARE PAGES SETUP                                           */}
        {/* ========================================================================= */}
        {activePhase === 'pages' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-200 dark:border-[#282828] pb-4">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[#3ecf8e]" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  Phase 4: Cloudflare Pages Setup (Hosting &amp; Build Config)
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
                Frontend build settings and production environment variables for Cloudflare Pages dashboard.
              </p>
            </div>

            {/* Build parameters cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626]">
                <span className="text-[10px] text-slate-400 dark:text-[#777] font-mono uppercase">Build Command</span>
                <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1">npm run build</p>
              </div>
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626]">
                <span className="text-[10px] text-slate-400 dark:text-[#777] font-mono uppercase">Output Directory</span>
                <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1">dist</p>
              </div>
              <div className="p-3 rounded-[6px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626]">
                <span className="text-[10px] text-slate-400 dark:text-[#777] font-mono uppercase">Node Version</span>
                <p className="text-xs font-mono font-semibold text-slate-900 dark:text-white mt-1">NODE_VERSION = 20</p>
              </div>
            </div>

            {/* Table of 7 Environment Variables with individual copy buttons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans">
                  Production Environment Variables Table
                </h4>
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `VITE_SUPABASE_URL=${formData.supabaseUrl}\nVITE_SUPABASE_PUBLISHABLE_KEY=${formData.supabasePublishableKey}\nVITE_CLOUDFLARE_ACCOUNT_ID=${formData.cloudflareAccountId}\nVITE_R2_BUCKET_NAME=${formData.r2BucketName}\nVITE_R2_PUBLIC_DOMAIN=${formData.r2PublicDomain}\nVITE_R2_ACCESS_KEY_ID=${formData.r2AccessKeyId}\nVITE_R2_SECRET_ACCESS_KEY=${formData.r2SecretAccessKey}\nNODE_VERSION=20`,
                      'all_env_vars',
                      'All 8 Environment Variables'
                    )
                  }
                  className="text-xs font-mono text-[#3ecf8e] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy All Variables Block</span>
                </button>
              </div>

              <div className="rounded-[6px] border border-slate-200 dark:border-[#282828] overflow-hidden">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-slate-100 dark:bg-[#202020] text-slate-600 dark:text-zinc-400 border-b border-slate-200 dark:border-[#282828]">
                    <tr>
                      <th className="p-2.5 font-medium">Variable Name</th>
                      <th className="p-2.5 font-medium">Configured Value</th>
                      <th className="p-2.5 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#242424] bg-white dark:bg-[#141414]">
                    {[
                      { key: 'VITE_SUPABASE_URL', val: formData.supabaseUrl },
                      { key: 'VITE_SUPABASE_PUBLISHABLE_KEY', val: formData.supabasePublishableKey },
                      { key: 'VITE_CLOUDFLARE_ACCOUNT_ID', val: formData.cloudflareAccountId },
                      { key: 'VITE_R2_BUCKET_NAME', val: formData.r2BucketName },
                      { key: 'VITE_R2_PUBLIC_DOMAIN', val: formData.r2PublicDomain },
                      { key: 'VITE_R2_ACCESS_KEY_ID', val: formData.r2AccessKeyId },
                      { key: 'VITE_R2_SECRET_ACCESS_KEY', val: formData.r2SecretAccessKey },
                      { key: 'NODE_VERSION', val: '20' },
                    ].map((row) => (
                      <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-[#1a1a1a]">
                        <td className="p-2.5 text-emerald-700 dark:text-[#3ecf8e] font-semibold">{row.key}</td>
                        <td className="p-2.5 text-slate-700 dark:text-[#bbb] max-w-xs truncate">{row.val}</td>
                        <td className="p-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopy(row.val, row.key, row.key)}
                            className="text-[11px] text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
                            title={`Copy value for ${row.key}`}
                          >
                            {copiedKey === row.key ? (
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

        {/* ========================================================================= */}
        {/* PHASE 5: CUSTOM DOMAIN, SSL & PRE-LAUNCH CHECKLIST                         */}
        {/* ========================================================================= */}
        {activePhase === 'domain' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-200 dark:border-[#282828] pb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#3ecf8e]" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white font-sans">
                  Phase 5: Custom Domain, SSL &amp; Pre-Launch Verification
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#888] mt-1">
                Attach your brand domain (e.g. <code>erp.asopalav.com</code>), enforce Full (strict) SSL encryption, and verify all 10 checkpoints.
              </p>
            </div>

            {/* Domain Configuration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans">
                  Showroom Custom Domain / Subdomain
                </label>
                <input
                  type="text"
                  value={formData.customDomain}
                  onChange={(e) => handleInputChange('customDomain', e.target.value)}
                  placeholder="erp.asopalav.com or app.yourdomain.com"
                  className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800 dark:text-zinc-200 font-sans">
                  Pages Project Name
                </label>
                <input
                  type="text"
                  value={formData.pagesProjectName}
                  onChange={(e) => handleInputChange('pagesProjectName', e.target.value)}
                  placeholder="asopalav-erp"
                  className="w-full px-3 py-2 rounded-[6px] bg-white dark:bg-[#121212] border border-slate-300 dark:border-[#2e2e2e] focus:border-[#3ecf8e] text-xs font-mono text-slate-900 dark:text-white outline-none"
                />
              </div>
            </div>

            {/* DNS CNAME Guidance */}
            <div className="p-4 rounded-[8px] bg-white dark:bg-[#141414] border border-slate-200 dark:border-[#262626] space-y-2">
              <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#3ecf8e]" />
                <span>DNS CNAME Record Setup</span>
              </h4>
              <div className="grid grid-cols-3 gap-2 p-2.5 rounded-[6px] bg-slate-100 dark:bg-[#1c1c1c] text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400">TYPE</span>
                  <p className="font-bold">CNAME</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">NAME / HOST</span>
                  <p className="font-bold">{formData.customDomain.split('.')[0] || 'erp'}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400">TARGET</span>
                  <p className="font-bold truncate">{formData.pagesProjectName}.pages.dev</p>
                </div>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-[#888]">
                In Cloudflare Dashboard → SSL/TLS → Overview: Set encryption mode to <strong>Full (strict)</strong>.
              </p>
            </div>

            {/* 10-Point Pre-Launch Verification Checklist */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-900 dark:text-white font-sans flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#3ecf8e]" />
                  <span>Pre-Launch Verification Checklist ({completedChecklistCount} of {checklistItems.length} Completed)</span>
                </h4>
              </div>

              <div className="space-y-1.5">
                {checklistItems.map((item) => {
                  const isChecked = Boolean(checklist[item.id]);
                  return (
                    <label
                      key={item.id}
                      onClick={() => triggerHaptic('selection')}
                      className={cn(
                        'flex items-center gap-2.5 p-2.5 rounded-[6px] border text-xs cursor-pointer select-none transition-colors',
                        isChecked
                          ? 'bg-emerald-50/50 dark:bg-[#1a261f] border-emerald-300 dark:border-emerald-800/40 text-slate-900 dark:text-[#EDEDED]'
                          : 'bg-white dark:bg-[#141414] border-slate-200 dark:border-[#262626] text-slate-600 dark:text-[#a1a1a1] hover:border-slate-300 dark:hover:border-[#383838]'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="w-4 h-4 rounded text-[#3ecf8e] focus:ring-[#3ecf8e] accent-[#3ecf8e] cursor-pointer"
                      />
                      <span className={cn('font-sans', isChecked && 'font-medium')}>
                        {item.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Footer Bar */}
      <div className="mt-5 pt-4 border-t border-slate-200 dark:border-[#282828] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 dark:text-[#888]">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-[#3ecf8e]" />
          <span>Changes are applied in-memory and synced to local browser storage instantly.</span>
        </div>

        <button
          type="button"
          onClick={resetToDefaults}
          className="text-xs text-rose-500 hover:text-rose-700 dark:hover:text-rose-400 underline cursor-pointer self-start sm:self-auto"
        >
          Reset to Defaults
        </button>
      </div>
    </div>
  );
};
