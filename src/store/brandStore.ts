import { create } from 'zustand';
import { supabase } from '@/lib/supabase';

export interface BrandSettings {
  brandName: string;
  legalEntityName: string;
  tagline: string;
  logoUrl: string;
  logoType: 'svg' | 'image' | 'monogram';
  brandSvgContent: string;
  monogramText: string;
  faviconUrl: string;
  brandAccentColor: string;
  gstin: string;
  panNumber: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  city: string;
  state: string;
}

export const DEFAULT_BRAND_SETTINGS: BrandSettings = {
  brandName: 'Asopalav',
  legalEntityName: 'Asopalav Endeavours LLP',
  tagline: 'Showroom Cash Counter & Expense Management',
  logoUrl: '',
  logoType: 'svg',
  brandSvgContent: '',
  monogramText: 'ASI',
  faviconUrl: '',
  brandAccentColor: '#3ecf8e',
  gstin: '24ABVFA8046N1ZQ',
  panNumber: 'ABVFA8046N',
  contactPhone: '+91 9925009050',
  contactEmail: 'satellite@asopalav.com',
  address: 'Asopalav House, Opp Keshav Baug Party Plot, Near Shivranjani Cross Road, Satellite - 380015',
  city: 'Ahmedabad',
  state: 'Gujarat',
};

const STORAGE_KEY = 'asopalav_brand_settings';

interface BrandState extends BrandSettings {
  loading: boolean;
  updateBrandSettings: (updates: Partial<BrandSettings>) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  fetchBrandSettings: () => Promise<void>;
  applyBrandToDocument: () => void;
}

const getStoredBrand = (): BrandSettings => {
  if (typeof window === 'undefined') return DEFAULT_BRAND_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULT_BRAND_SETTINGS, ...JSON.parse(raw) } : DEFAULT_BRAND_SETTINGS;
  } catch {
    return DEFAULT_BRAND_SETTINGS;
  }
};

export const useBrandStore = create<BrandState>((set, get) => ({
  ...getStoredBrand(),
  loading: false,

  applyBrandToDocument: () => {
    if (typeof window === 'undefined') return;
    const { brandName, faviconUrl, monogramText, brandAccentColor } = get();

    // 1. Update Title
    if (brandName) {
      document.title = `${brandName} ERP • Showroom Workspace`;
    }

    // 2. Update Favicon dynamically
    let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.getElementsByTagName('head')[0].appendChild(link);
    }

    if (faviconUrl && faviconUrl.trim()) {
      link.href = faviconUrl;
    } else {
      // Generate Dynamic SVG Favicon with Brand Accent & Monogram
      const svgFavicon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
          <rect width="32" height="32" rx="8" fill="#141414"/>
          <rect x="6" y="6" width="20" height="20" rx="4" transform="rotate(45 16 16)" fill="${brandAccentColor || '#3ecf8e'}" fill-opacity="0.2" stroke="${brandAccentColor || '#3ecf8e'}" stroke-width="1.5"/>
          <text x="16" y="21" font-family="system-ui, sans-serif" font-size="11" font-weight="bold" fill="${brandAccentColor || '#3ecf8e'}" text-anchor="middle">${monogramText?.slice(0, 3) || 'ASI'}</text>
        </svg>
      `.trim();
      link.href = `data:image/svg+xml,${encodeURIComponent(svgFavicon)}`;
    }
  },

  fetchBrandSettings: async () => {
    try {
      const { data, error } = await supabase.from('brand_settings').select('*').limit(1).maybeSingle();
      if (!error && data) {
        const remoteSettings: Partial<BrandSettings> = {
          brandName: data.brand_name || DEFAULT_BRAND_SETTINGS.brandName,
          legalEntityName: data.legal_entity_name || DEFAULT_BRAND_SETTINGS.legalEntityName,
          tagline: data.tagline || DEFAULT_BRAND_SETTINGS.tagline,
          logoUrl: data.logo_url || DEFAULT_BRAND_SETTINGS.logoUrl,
          logoType: data.logo_type || DEFAULT_BRAND_SETTINGS.logoType,
          brandSvgContent: data.brand_svg_content || DEFAULT_BRAND_SETTINGS.brandSvgContent,
          monogramText: data.monogram_text || DEFAULT_BRAND_SETTINGS.monogramText,
          faviconUrl: data.favicon_url || DEFAULT_BRAND_SETTINGS.faviconUrl,
          brandAccentColor: data.brand_accent_color || DEFAULT_BRAND_SETTINGS.brandAccentColor,
          gstin: data.gstin || DEFAULT_BRAND_SETTINGS.gstin,
          panNumber: data.pan_number || DEFAULT_BRAND_SETTINGS.panNumber,
          contactPhone: data.contact_phone || DEFAULT_BRAND_SETTINGS.contactPhone,
          contactEmail: data.contact_email || DEFAULT_BRAND_SETTINGS.contactEmail,
          address: data.address || DEFAULT_BRAND_SETTINGS.address,
          city: data.city || DEFAULT_BRAND_SETTINGS.city,
          state: data.state || DEFAULT_BRAND_SETTINGS.state,
        };
        set(remoteSettings);
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...get(), ...remoteSettings }));
        }
        get().applyBrandToDocument();
      }
    } catch {
      // Fallback to local storage
      get().applyBrandToDocument();
    }
  },

  updateBrandSettings: async (updates: Partial<BrandSettings>) => {
    const newState = { ...get(), ...updates };
    set(updates);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    }

    get().applyBrandToDocument();

    // Background sync to database if table exists
    try {
      await supabase.from('brand_settings').upsert({
        id: 'brand-singleton',
        brand_name: newState.brandName,
        legal_entity_name: newState.legalEntityName,
        tagline: newState.tagline,
        logo_url: newState.logoUrl,
        logo_type: newState.logoType,
        brand_svg_content: newState.brandSvgContent,
        monogram_text: newState.monogramText,
        favicon_url: newState.faviconUrl,
        brand_accent_color: newState.brandAccentColor,
        gstin: newState.gstin,
        pan_number: newState.panNumber,
        contact_phone: newState.contactPhone,
        contact_email: newState.contactEmail,
        address: newState.address,
        city: newState.city,
        state: newState.state,
        updated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.warn('Brand settings synced locally:', err);
    }
  },

  resetToDefaults: async () => {
    set(DEFAULT_BRAND_SETTINGS);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_BRAND_SETTINGS));
    }
    get().applyBrandToDocument();

    try {
      await supabase.from('brand_settings').upsert({
        id: 'brand-singleton',
        brand_name: DEFAULT_BRAND_SETTINGS.brandName,
        legal_entity_name: DEFAULT_BRAND_SETTINGS.legalEntityName,
        tagline: DEFAULT_BRAND_SETTINGS.tagline,
        logo_url: DEFAULT_BRAND_SETTINGS.logoUrl,
        logo_type: DEFAULT_BRAND_SETTINGS.logoType,
        brand_svg_content: DEFAULT_BRAND_SETTINGS.brandSvgContent,
        monogram_text: DEFAULT_BRAND_SETTINGS.monogramText,
        favicon_url: DEFAULT_BRAND_SETTINGS.faviconUrl,
        brand_accent_color: DEFAULT_BRAND_SETTINGS.brandAccentColor,
        gstin: DEFAULT_BRAND_SETTINGS.gstin,
        pan_number: DEFAULT_BRAND_SETTINGS.panNumber,
        contact_phone: DEFAULT_BRAND_SETTINGS.contactPhone,
        contact_email: DEFAULT_BRAND_SETTINGS.contactEmail,
        address: DEFAULT_BRAND_SETTINGS.address,
        city: DEFAULT_BRAND_SETTINGS.city,
        state: DEFAULT_BRAND_SETTINGS.state,
        updated_at: new Date().toISOString(),
      });
    } catch {
      // local reset
    }
  },
}));
