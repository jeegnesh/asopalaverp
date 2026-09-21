import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getStoredCloudConfig } from '@/store/cloudConfigStore';

const initialConfig = getStoredCloudConfig();

let currentUrl =
  initialConfig.supabaseUrl ||
  import.meta.env.VITE_SUPABASE_URL ||
  '';
let currentKey =
  initialConfig.supabasePublishableKey ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  '';

let clientInstance: SupabaseClient = createClient(currentUrl, currentKey);

/**
 * Hot-reinitialize the Supabase client when runtime credentials change
 */
export const reinitializeSupabase = (url: string, key: string): SupabaseClient => {
  currentUrl = url.trim();
  currentKey = key.trim();
  clientInstance = createClient(currentUrl, currentKey);
  return clientInstance;
};

export const getSupabaseClient = (): SupabaseClient => clientInstance;

/**
 * Transparent dynamic Supabase proxy so all existing code importing `supabase`
 * immediately routes to the active clientInstance without refactoring.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const val = (clientInstance as any)[prop];
    if (typeof val === 'function') {
      return val.bind(clientInstance);
    }
    return val;
  },
});

// Automatically reinitialize on broadcast config updates
if (typeof window !== 'undefined') {
  window.addEventListener('asopalav:cloud-config-updated', ((e: CustomEvent) => {
    if (e.detail?.supabaseUrl && e.detail?.supabasePublishableKey) {
      reinitializeSupabase(e.detail.supabaseUrl, e.detail.supabasePublishableKey);
    }
  }) as EventListener);
}

/**
 * Uploads a profile avatar directly to Supabase Storage 'avatars' bucket
 * File format: profiles/{username}_{DD-MM-YYYY}_{HH-mm-ss}.{ext}
 * Example: profiles/aellpadmin_22-09-2026_22-55-30.jpg
 */
export async function uploadAvatarToSupabase(
  file: File | Blob,
  usernameOrId?: string
): Promise<string> {
  const cleanUsername = (usernameOrId || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '_');

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = pad(now.getDate());
  const month = pad(now.getMonth() + 1);
  const year = now.getFullYear();
  const hours = pad(now.getHours());
  const minutes = pad(now.getMinutes());
  const seconds = pad(now.getSeconds());

  const formattedDate = `${day}-${month}-${year}_${hours}-${minutes}-${seconds}`;
  const ext = file instanceof File ? (file.name.split('.').pop() || 'jpg').toLowerCase() : 'jpg';
  
  const fileName = `${cleanUsername}_${formattedDate}.${ext}`;
  const filePath = `profiles/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: (file as File).type || 'image/jpeg',
      });

    if (error) {
      console.warn('Supabase storage upload error:', error);
      throw error;
    }

    const { data: publicUrlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error('Failed to upload avatar to Supabase Storage:', err);
    return '';
  }
}

