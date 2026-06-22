const HASH_PREFIX = 'pbkdf2_sha256';
const HASH_ITERATIONS = 210000;
const HASH_BYTES = 32;

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

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    HASH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }
  return diff === 0;
}

export function isHashedPassword(stored: string | null | undefined) {
  return typeof stored === 'string' && stored.startsWith(`${HASH_PREFIX}$`);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivePassword(password, salt, HASH_ITERATIONS);
  return `${HASH_PREFIX}$${HASH_ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(hash)}`;
}

export async function verifyPassword(password: string, stored: string | null | undefined) {
  if (!stored) return false;

  if (!isHashedPassword(stored)) {
    return stored === password;
  }

  const [, iterationsRaw, saltRaw, hashRaw] = stored.split('$');
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(iterations) || iterations <= 0 || !saltRaw || !hashRaw) return false;

  const salt = base64ToBytes(saltRaw);
  const expected = base64ToBytes(hashRaw);
  const actual = await derivePassword(password, salt, iterations);
  return timingSafeEqual(actual, expected);
}
