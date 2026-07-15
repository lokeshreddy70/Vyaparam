const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toB64(buffer: Uint8Array) {
  let binary = "";
  for (let i = 0; i < buffer.length; i += 1) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function fromB64(value: string) {
  const binary = atob(value);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function deriveAesKey(secret: string) {
  const seed = await crypto.subtle.digest("SHA-256", encoder.encode(secret));
  return crypto.subtle.importKey("raw", seed, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptJson<T>(value: T, secret: string) {
  const key = await deriveAesKey(secret);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plain = encoder.encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plain);
  const cipherBytes = new Uint8Array(cipher);
  return `${toB64(iv)}.${toB64(cipherBytes)}`;
}

export async function decryptJson<T>(payload: string, secret: string): Promise<T | null> {
  const [ivB64, cipherB64] = payload.split(".");
  if (!ivB64 || !cipherB64) return null;

  try {
    const key = await deriveAesKey(secret);
    const iv = fromB64(ivB64);
    const cipher = fromB64(cipherB64);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return JSON.parse(decoder.decode(plain)) as T;
  } catch {
    return null;
  }
}

export async function hashCredentials(email: string, password: string) {
  const normalized = `${email.trim().toLowerCase()}::${password}`;
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(normalized));
  return toB64(new Uint8Array(hash));
}
