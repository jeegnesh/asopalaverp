# Asopalav ERP — Financial Operations & Multi-Branch Ledger System

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_15-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Cloudflare R2](https://img.shields.io/badge/Cloudflare_R2-S3_Compatible-F38020?logo=cloudflare&logoColor=white)](https://www.cloudflare.com/developer-platform/r2/)
[![Cloudflare Pages](https://img.shields.io/badge/Deployment-Cloudflare_Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)

**Asopalav ERP** is a mission-critical, enterprise-grade financial operations and multi-branch ledger management platform designed specifically for luxury Indian ethnic retail flagships. Built with high-speed POS keyboard ergonomics (F1–F12), immutable double-entry ledgering, real-time denomination closing, Cloudflare R2 document storage, and strict Supabase Studio design fidelity.

---

## 📑 Table of Contents

- [Key Architecture & Highlights](#-key-architecture--highlights)
- [System Modules](#-system-modules)
  - [1. Cash Desk & Daily Register (F1 / F2)](#1-cash-desk--daily-register-f1--f2)
  - [2. Multi-Branch Ledger & Vouchers (F3 / F4)](#2-multi-branch-ledger--vouchers-f3--f4)
  - [3. Treasury & Cash Drawer Vault (F5)](#3-treasury--cash-drawer-vault-f5)
  - [4. Thermal Receipt & Slip Engine (80mm / 58mm)](#4-thermal-receipt--slip-engine-80mm--58mm)
  - [5. Security Hardening & RBAC Matrix](#5-security-hardening--rbac-matrix)
  - [6. Cloudflare R2 Media & Avatar Vault](#6-cloudflare-r2-media--avatar-vault)
  - [7. Terminal Session Guard & Remote Sign-Out (F12)](#7-terminal-session-guard--remote-sign-out-f12)
  - [8. In-App Supabase Studio & Diagnostics](#8-in-app-supabase-studio--diagnostics)
- [Keyboard Navigation & Hotkeys (F1–F12)](#-keyboard-navigation--hotkeys-f1f12)
- [Design System & Aesthetics](#-design-system--aesthetics)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started & Local Setup](#-getting-started--local-setup)
- [Configuring Real Production Values](#-configuring-real-production-values)
  - [1. Environment Variables (.env)](#1-environment-variables-env)
  - [2. Cloudflare R2 Bucket CORS (r2-cors.json)](#2-cloudflare-r2-bucket-cors-r2-corsjson)
- [Production Build & Verification](#-production-build--verification)
- [Deployment Guide](#-deployment-guide)
- [License & Contact](#-license--contact)

---

## ⚡ Key Architecture & Highlights

- **Dual-Canvas Ergonomics**: Seamless toggle between Day Showroom (`#ffffff` canvas with `#000000` sharp typography) and Studio Night (`#141414` background with `#3ecf8e` emerald accents).
- **Sub-50ms Keyboard-First Workflow**: Zero mouse dependency for counter cashiers — create vouchers, count denominations, verify drawers, and search ledgers entirely via function keys (`F1`–`F12`) and modal shortcuts.
- **Double-Entry Financial Accuracy**: All cash, bank, supplier, and customer ledger entries maintain mathematical debit/credit balance, real-time period locking, and tamper-proof approval traces.
- **Enterprise Edge Storage**: Direct client-to-Cloudflare R2 multipart asset uploads with SHA-256 pre-signed verification for expense bills, tax invoices, and employee KYC records.
- **Zero-Trust Security**: No plaintext passwords or PINs (`bcryptjs` hashed), rate-limited authentication, strict PostgREST query sanitization, and automated offline-retry caps.

---

## 🏢 System Modules

### 1. Cash Desk & Daily Register (F1 / F2)
- **Live Physical Denomination Counter**: Real-time breakdown of ₹2000, ₹500, ₹200, ₹100, ₹50, ₹20, ₹10, ₹5, ₹2, ₹1 notes and coins.
- **Closing Variance Diagnostic**: Automatically compares physical drawer count against expected system closing balance (Opening Float + Sales Collections + Inflows − Outflows − Safe Drops).
- **Cashier Turnover & Shift Handover**: Multi-cashier shift reconciliation with supervisor digital sign-off and immediate thermal summary printing.

### 2. Multi-Branch Ledger & Vouchers (F3 / F4)
- **Voucher Workflows**: Payment, Receipt, Journal, Contra, Advance Disbursement, and Refund vouchers.
- **Multi-Branch Support**: Real-time branch-scoped ledgering across flagships (e.g. Ahmedabad, Baroda, Surat) with consolidated HQ auditing.
- **Approval Escalation**: Configurable approval limits (e.g., vouchers above ₹50,000 require Store Manager / Super Admin authorization).

### 3. Treasury & Cash Drawer Vault (F5)
- **Safe Drops**: Instant floor-to-vault transfer tracking to ensure counter drawers never exceed physical insurance thresholds.
- **Float Replenishment**: Morning opening float assignment with cashier acknowledgment and supervisor vault verification.
- **Petty Cash Disbursement**: Tagged expense ledger allocations with immediate R2 receipt photo capture.

### 4. Thermal Receipt & Slip Engine (80mm / 58mm)
- **Live Visual Customizer (F11 Settings)**: Real-time interactive split-screen editor for 80mm standard and 58mm compact POS roll formats.
- **Dynamic Content Modules**:
  - Showroom branding, tax GSTIN, and branch addresses.
  - Denomination summary tables, payment mode breakdown (Cash, UPI, Card, Net Banking).
  - High-contrast Code-128 / QR codes for instant voucher barcode verification.
  - Configurable return/exchange policy disclaimers and cashier signature blocks.
- **Auto-Print Hooks**: Direct silent thermal spooling to ESC/POS network printers or standard browser print dialog.

### 5. Security Hardening & RBAC Matrix
- **Super Admin Full CRUD Matrix**: Unrestricted bypass and full write/delete/export governance across all ledger entities, periods, and branch stores.
- **Granular RBAC**: Pre-configured permission matrices for `Super_Admin`, `Store_Manager`, `Senior_Accountant`, `Cashier`, `Auditor`, and `Viewer`.
- **Brute-Force Shield**: Client & edge rate-limiting on sensitive login/override attempts with progressive exponential cooldowns.
- **PostgREST Query Injection Defense**: Strict regex sanitization on all search filters to eliminate SQL/operator injection vectors.
- **Production Content Security Policy (CSP)**: Hardened HTTP headers (`_headers`) including `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, and strict TLS HSTS.

### 6. Cloudflare R2 Media & Avatar Vault
- **Direct S3 SDK Integration**: High-speed, zero-cost egress file uploads to Cloudflare R2 object storage.
- **Automatic Asset Categorization**: Dedicated buckets for `avatars/`, `vouchers/`, `receipts/`, and `audit-logs/`.
- **Instant Photo Upload & Crop**: Showroom staff profile photos and document attachments with live thumbnail preview and client-side compression.

### 7. Terminal Session Guard & Remote Sign-Out (F12)
- **Active POS Terminal Inspector**: Lists all active devices, browsers, IP addresses, and login timestamps.
- **One-Click Remote Revocation**: Instantly invalidate other terminal sessions upon unauthorized login detection.
- **Personal Cashier Telemetry**: Live performance card displaying today's total vouchers, cash/UPI collection ratio, and active advance balances.

### 8. In-App Supabase Studio & Diagnostics
- **Schema & Table Explorer**: Inspect live PostgreSQL tables, columns, indexes, and row counts directly from the admin panel.
- **2x3 Diagnostic Matrix**: Real-time telemetry monitoring for Database Latency, Active WebSocket Channels, Storage Egress, Queue Health, Auth Sessions, and Memory Usage.

---

## ⌨️ Keyboard Navigation & Hotkeys (F1–F12)

Designed for lightning-fast showroom cashiers and managers:

| Key | Target Destination / Action | Description |
| :--- | :--- | :--- |
| **`F1`** | **Daily Cash Register** | Cash closing, denomination counter, and shift balance |
| **`F2`** | **New Voucher Entry** | Create Payment, Receipt, or Journal vouchers instantly |
| **`F3`** | **Voucher Ledger** | Filter, search, inspect, and approve store transactions |
| **`F4`** | **Customer / Account Books** | Sub-ledger balances, customer ledger, and supplier payouts |
| **`F5`** | **Treasury & Safe Vault** | Cash drawer limits, vault drops, and morning float assignments |
| **`F6`** | **Reports & Financial P&L** | Real-time trial balance, expense summaries, and sales turnover |
| **`F7`** | **Staff & Roles Directory** | Manage showroom staff, cashier logins, and access keys |
| **`F8`** | **Live Audit Logs** | Immutable chronological record of all ledger adjustments |
| **`F9`** | **Database Schema Studio** | Super Admin table inspection and Postgres entity viewer |
| **`F10`** | **Security & System Health** | Diagnostic matrix, network latency, and offline queue status |
| **`F11`** | **Showroom Master Settings** | Thermal printer designer, branch details, and tax rules |
| **`F12`** | **Profile & Terminal Sessions** | Staff account, PIN security, active sessions, and stats |
| **`Ctrl + K`** | **Command Palette** | Universal fast search across all pages, accounts, and vouchers |
| **`Esc`** | **Close Modal / Reset** | Dismiss active dialogs and return focus to register table |

---

## 🎨 Design System & Aesthetics

Crafted strictly around the **Supabase Design System**:

- **Color Tokens**:
  - Brand Accent: `#3ecf8e` (Supabase Emerald)
  - Light Canvas: `#ffffff` with `#f8f9fa` surface cards and `#e5e7eb` hairline borders
  - Studio Dark: `#141414` background, `#1c1c1c` elevated cards, `#2e2e2e` borders
  - Primary Text: `#000000` (Light) / `#ededed` (Dark)
- **Typography**:
  - UI Font: [Inter](https://fonts.google.com/specimen/Inter) (`font-sans`, weights 400, 500, 600, 700)
  - Numbers & Financial Data: [JetBrains Mono](https://www.jetbrains.com/lp/mono/) (`font-mono`, tabular figures `tabular-nums`)
- **Component Anatomy**:
  - Standard Button Radius: `6px` (`rounded-md`)
  - Surface Card Radius: `12px` (`rounded-xl`)
  - Border Width: `1px` subtle hairline borders (`border-border`)

---

## 🛠️ Tech Stack

- **Core Framework**: [React 19](https://react.dev/) + [TypeScript 5.7](https://www.typescriptlang.org/)
- **Build Tool**: [Vite 6.2](https://vitejs.dev/)
- **State Management**: [Zustand 5.0](https://zustand.docs.pmnd.rs/) (Persistent stores with multi-tab broadcast sync)
- **Styling**: [Tailwind CSS 3.4](https://tailwindcss.com/) + PostCSS + Autoprefixer
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL 15, Row-Level Security, Realtime WebSockets)
- **Object Storage**: [Cloudflare R2](https://developers.cloudflare.com/r2/) via `@aws-sdk/client-s3`
- **Security & Cryptography**: `bcryptjs` for secure salted PIN and password verification
- **Icons & Animation**: [Lucide React](https://lucide.dev/) & [GSAP 3.15](https://greensock.com/gsap/)
- **Date Handling**: `date-fns 4.1`

---

## 📂 Repository Structure

```
asopalav-erp/
├── public/
│   ├── _headers               # Production CSP, HSTS, and security headers
│   ├── _redirects             # Cloudflare Pages SPA rewrite rules
│   ├── manifest.json          # PWA configuration
│   └── robots.txt             # Search crawler directives
├── src/
│   ├── components/
│   │   ├── advances/          # Staff advances & settle drawers
│   │   ├── common/            # Modals, calculators, search overlays
│   │   ├── fragments/         # Telemetry charts & metric blocks
│   │   ├── icons/             # Custom SVG brand & app icons
│   │   ├── layout/            # Sidebar, Topbar, banners, overlays
│   │   ├── settings/          # ThermalPrinterCustomizer & showroom setup
│   │   ├── treasury/          # SafeDropDrawer & float handlers
│   │   ├── ui/                # Supabase Design System primitives
│   │   └── vouchers/          # Multi-staff split & voucher drawers
│   ├── hooks/                 # GSAP, Hotkeys, ScrollLock, Vouchers hooks
│   ├── lib/                   # Supabase client, R2 storage, RateLimiter, Audit
│   ├── pages/                 # Full ERP module pages (F1–F12)
│   ├── store/                 # Zustand global reactive stores
│   ├── types/                 # Strict TypeScript database & ERP types
│   ├── App.tsx                # App shell, routing, and hotkey coordinator
│   ├── main.tsx               # React 19 root bootstrap
│   └── index.css              # Supabase Design System tokens & Tailwind directives
├── .env.example               # Environment variables template
├── r2-cors.json               # Cloudflare R2 CORS template configuration
├── tailwind.config.js         # Supabase token extensions
├── tsconfig.json              # TypeScript compiler configuration
├── vite.config.ts             # Vite 6 build configuration
└── package.json
```

---

## 🚀 Getting Started & Local Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher (Recommended: `v20+` LTS)
- **npm**: `v9.0.0` or higher

### Installation

1. **Clone the repository**:
   ```bash
   git clone git@github.com:jeegnesh/asopalaverp.git
   cd asopalaverp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Create local environment file**:
   ```bash
   cp .env.example .env
   ```
   *(See instructions below to fill in your real credentials).*

4. **Start development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

---

## 🔒 Configuring Real Production Values

> **Important**: Never commit your real API keys or domains to public GitHub. Replace the placeholders below in your own private environment.

### 1. Environment Variables (`.env`)
Edit `.env` on your local machine or in your hosting provider's dashboard:

```env
# ==============================================================================
# Supabase Configuration
# Replace with your actual project URL and public anon key from Supabase Dashboard:
# Settings -> API -> Project URL & anon public key
# ==============================================================================
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your_actual_supabase_anon_key_here

# ==============================================================================
# Cloudflare R2 Object Storage (S3 Compatible)
# Replace with your Cloudflare Account ID and R2 API Token credentials:
# Cloudflare Dashboard -> R2 -> Manage R2 API Tokens
# ==============================================================================
VITE_R2_ACCOUNT_ID=your_cloudflare_account_id_here
VITE_R2_ACCESS_KEY_ID=your_r2_access_key_id_here
VITE_R2_SECRET_ACCESS_KEY=your_r2_secret_access_key_here
VITE_R2_BUCKET_NAME=your_actual_bucket_name
VITE_R2_PUBLIC_URL=https://your-custom-assets-domain.com
```

### 2. Cloudflare R2 Bucket CORS (`r2-cors.json`)
When creating your Cloudflare R2 bucket, apply the CORS configuration from [`r2-cors.json`](file:///j:/twigledai/Asopalav%20ERP/r2-cors.json). 

Replace `https://your-app.pages.dev` and `https://erp.yourdomain.com` with your **actual live domain**:

```json
[
  {
    "AllowedOrigins": [
      "https://your-app.pages.dev",
      "https://erp.yourdomain.com",
      "http://localhost:5173",
      "http://localhost:4173"
    ],
    "AllowedMethods": [
      "GET",
      "PUT",
      "POST",
      "HEAD",
      "DELETE"
    ],
    "AllowedHeaders": [
      "*"
    ],
    "ExposeHeaders": [
      "ETag",
      "Content-Type",
      "Content-Length"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

To apply CORS using Wrangler CLI:
```bash
npx wrangler r2 bucket cors set your-bucket-name --file r2-cors.json
```

---

## 🧪 Production Build & Verification

```bash
# Run strict TypeScript validation + Vite optimized build
npm run build

# Preview production build locally
npm run preview
```

---

## 🌐 Deployment Guide

### Deploy to Cloudflare Pages (Recommended)

1. Connect your GitHub repository `jeegnesh/asopalaverp` to **Cloudflare Pages**.
2. Configure build settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
   - **Node.js Version**: `20`
3. Add your environment variables in Cloudflare Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_R2_ACCOUNT_ID`
   - `VITE_R2_ACCESS_KEY_ID`
   - `VITE_R2_SECRET_ACCESS_KEY`
   - `VITE_R2_BUCKET_NAME`
   - `VITE_R2_PUBLIC_URL`
4. Deploy! The included `public/_headers` and `public/_redirects` will automatically enforce security policies and SPA routing.

---

## 📄 License & Contact

Proprietary — All rights reserved © **Asopalav Endeavours LLP**.

For technical inquiries or system support:
📧 **Email**: `it@asopalav.com`
