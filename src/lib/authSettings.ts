import { supabase } from './supabase';

export interface GoogleLoginSettings {
  enabled: boolean;
  clientId: string;
  hostedDomain: string;
  autoCreateCustomers: boolean;
}

export interface AuthSettings {
  google: GoogleLoginSettings;
}

type SettingsData = Record<string, unknown> & {
  authSettings?: Partial<AuthSettings>;
};

export const DEFAULT_AUTH_SETTINGS: AuthSettings = {
  google: {
    enabled: false,
    clientId: '',
    hostedDomain: '',
    autoCreateCustomers: true,
  },
};

export function mergeAuthSettings(saved?: Partial<AuthSettings>): AuthSettings {
  return {
    google: {
      ...DEFAULT_AUTH_SETTINGS.google,
      ...saved?.google,
    },
  };
}

export async function fetchPublicAuthSettings(): Promise<AuthSettings> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('settings_data')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return mergeAuthSettings();
  const settingsData = (data.settings_data ?? {}) as SettingsData;
  return mergeAuthSettings(settingsData.authSettings);
}
