import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export type PaymentSecretName =
  | 'stripe_secret_key'
  | 'stripe_webhook_secret'
  | 'paypal_client_secret'
  | 'paypal_webhook_id';

export interface PaymentSecretStatus {
  providerId: string;
  secretName: PaymentSecretName;
  exists: boolean;
  maskedHint: string;
  updatedAt: string | null;
}

export async function saveEncryptedPaymentSecrets(
  supabase: SupabaseClient,
  providerId: string,
  secrets: Partial<Record<PaymentSecretName, string>>,
) {
  const rows = [];
  for (const [secretName, rawValue] of Object.entries(secrets) as Array<[PaymentSecretName, string | undefined]>) {
    const value = rawValue?.trim();
    if (!value) continue;
    const encrypted = await encryptSecret(value);
    rows.push({
      provider_id: providerId,
      secret_name: secretName,
      encrypted_value: encrypted.encryptedValue,
      nonce: encrypted.nonce,
      masked_hint: maskSecret(value),
      updated_at: new Date().toISOString(),
    });
  }

  if (rows.length === 0) return [];
  const { error } = await supabase
    .from('payment_secrets')
    .upsert(rows, { onConflict: 'provider_id,secret_name' });
  if (error) throw new Error(`Failed to save payment secrets: ${error.message}`);
  return rows;
}

export async function getPaymentSecretStatus(supabase: SupabaseClient): Promise<PaymentSecretStatus[]> {
  const { data, error } = await supabase
    .from('payment_secrets')
    .select('provider_id, secret_name, masked_hint, updated_at')
    .order('updated_at', { ascending: false });
  if (error) throw new Error(`Failed to read payment secret status: ${error.message}`);

  return (data ?? []).map((row) => ({
    providerId: row.provider_id as string,
    secretName: row.secret_name as PaymentSecretName,
    exists: true,
    maskedHint: row.masked_hint as string,
    updatedAt: row.updated_at as string | null,
  }));
}

export async function getPaymentSecret(
  supabase: SupabaseClient,
  providerId: string,
  secretName: PaymentSecretName,
  envFallbackName?: string,
) {
  const { data, error } = await supabase
    .from('payment_secrets')
    .select('encrypted_value, nonce')
    .eq('provider_id', providerId)
    .eq('secret_name', secretName)
    .maybeSingle();

  if (error) throw new Error(`Failed to read payment secret: ${error.message}`);
  if (data?.encrypted_value && data?.nonce) {
    return decryptSecret(data.encrypted_value as string, data.nonce as string);
  }

  if (envFallbackName) {
    const value = Deno.env.get(envFallbackName);
    if (value) return value;
  }

  throw new Error(`Missing payment secret: ${providerId}.${secretName}`);
}

async function encryptSecret(value: string) {
  const key = await getCryptoKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(value);
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    encryptedValue: bytesToBase64(new Uint8Array(cipher)),
    nonce: bytesToBase64(iv),
  };
}

async function decryptSecret(encryptedValue: string, nonce: string) {
  const key = await getCryptoKey();
  const cipher = base64ToBytes(encryptedValue);
  const iv = base64ToBytes(nonce);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

async function getCryptoKey() {
  const keyMaterial = Deno.env.get('PAYMENT_SECRETS_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!keyMaterial) throw new Error('Missing PAYMENT_SECRETS_KEY or SUPABASE_SERVICE_ROLE_KEY');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyMaterial));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function maskSecret(value: string) {
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
