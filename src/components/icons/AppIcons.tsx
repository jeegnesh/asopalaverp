import React from 'react';
import { cn } from '@/lib/utils';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * 1. Data Table Editor SVG Icon (Supabase Studio Table Editor)
 */
export const AppTableIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 6.5H14" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 6.5V13.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

/**
 * 2. SQL Command Console SVG Icon (Supabase Studio SQL Editor '>_')
 */
export const AppSqlIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <path
      d="M3 4.5L6.5 8L3 11.5"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8.5 12H13"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 3. Database Schema & Architecture SVG Icon (Supabase Schema Visualizer)
 */
export const AppSchemaIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <rect x="2" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="9.5" y="2.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <rect x="6" y="9.5" width="4.5" height="4.5" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4.25 7V8.5H11.75V7" stroke="currentColor" strokeWidth="1.1" />
    <path d="M8.25 8.5V9.5" stroke="currentColor" strokeWidth="1.1" />
  </svg>
);

/**
 * 4. Authentication & Users SVG Icon (Supabase Auth)
 */
export const AppAuthIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M3 13.5C3 11 5.2 9.5 8 9.5C10.8 9.5 13 11 13 13.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 5. Storage & Buckets SVG Icon (Supabase Storage)
 */
export const AppStorageIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <ellipse cx="8" cy="4.5" rx="5.5" ry="2" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M2.5 4.5V11.5C2.5 12.6046 4.96243 13.5 8 13.5C11.0376 13.5 13.5 12.6046 13.5 11.5V4.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M2.5 8C2.5 9.10457 4.96243 10 8 10C11.0376 10 13.5 9.10457 13.5 8"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

/**
 * 6. Edge Functions SVG Icon (Supabase Lambda / Functions '{ }' or 'λ')
 */
export const AppFunctionsIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <path
      d="M4.5 3.5C4.5 3.5 5.5 3 6.5 3C7.6 3 8.5 3.9 8.5 5V13"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M3.5 8H9.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M7 11L12.5 13.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 7. Live Realtime Broadcast SVG Icon (Supabase Realtime)
 */
export const AppRealtimeIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <circle cx="8" cy="8" r="1.8" fill="currentColor" />
    <path
      d="M4.8 5C6.6 3.2 9.4 3.2 11.2 5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M2.8 3C6.4 -0.6 12.2 -0.6 15.2 3"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M11.2 11C9.4 12.8 6.6 12.8 4.8 11"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M15.2 13C12.2 16.6 6.4 16.6 2.8 13"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 8. Security & Compliance Advisor SVG Icon (Supabase Advisors)
 */
export const AppAdvisorIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <path
      d="M8 2L13.5 4.5V8.5C13.5 11.8 11.1 14.3 8 15C4.9 14.3 2.5 11.8 2.5 8.5V4.5L8 2Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinejoin="round"
    />
    <path
      d="M6 8L7.5 9.5L10.5 6.5"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * 9. Observatory & Unified Logs Explorer SVG Icon (Supabase Logs / Telescope)
 */
export const AppLogsIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <path d="M2.5 13.5H13.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M4.5 11V7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M8 11V4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M11.5 11V8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

/**
 * 10. Reports & Custom Queries SVG Icon
 */
export const AppReportsIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <path d="M3 4H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M3 8H10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M3 12H13" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

/**
 * 11. Enterprise Settings SVG Icon
 */
export const AppSettingsIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M8 1.5V3M8 13V14.5M1.5 8H3M13 8H14.5M3.4 3.4L4.5 4.5M11.5 11.5L12.6 12.6M3.4 12.6L4.5 11.5M11.5 4.5L12.6 3.4"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
  </svg>
);

/**
 * 12. Postgres Database Server Icon (Database Cylinder Stack)
 */
export const AppPostgresIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <ellipse cx="8" cy="4" rx="5" ry="1.8" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M3 4V8C3 8.99 5.24 9.8 8 9.8C10.76 9.8 13 8.99 13 8V4"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <path
      d="M3 8V12C3 12.99 5.24 13.8 8 13.8C10.76 13.8 13 12.99 13 12V8"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
);

/**
 * 13. Sidebar Panel Toggle Icons (Collapse '<' / Expand '>')
 */
export const AppSidebarCollapseIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5.5 2.5V13.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M10 6L8 8L10 10"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AppSidebarExpandIcon: React.FC<IconProps> = ({ className, size = 16, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={cn('shrink-0', className)}
    {...props}
  >
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M5.5 2.5V13.5" stroke="currentColor" strokeWidth="1.2" />
    <path
      d="M8.5 6L10.5 8L8.5 10"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const EnterprisePanelLeftCloseIcon = AppSidebarCollapseIcon;
export const EnterprisePanelLeftOpenIcon = AppSidebarExpandIcon;
