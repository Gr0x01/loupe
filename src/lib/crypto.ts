import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM recommended IV length
const AUTH_TAG_LENGTH = 16;
const ENCRYPTED_PREFIX = "enc:"; // Magic prefix to identify encrypted values

/**
 * Get encryption key from environment variable.
 * Key should be 32 bytes (64 hex characters).
 */
function getEncryptionKey(): Buffer {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error("ENCRYPTION_KEY environment variable is required");
  }
  if (key.length !== 64) {
    throw new Error("ENCRYPTION_KEY must be 64 hex characters (32 bytes)");
  }
  return Buffer.from(key, "hex");
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns prefixed base64-encoded string: "enc:" + IV + ciphertext + auth tag
 */
export function encrypt(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Combine IV + ciphertext + authTag with prefix for identification
  const combined = Buffer.concat([iv, encrypted, authTag]);
  return ENCRYPTED_PREFIX + combined.toString("base64");
}

/**
 * Decrypt a prefixed base64-encoded ciphertext that was encrypted with encrypt().
 * Returns the original plaintext string.
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    throw new Error("Invalid encrypted value: missing prefix");
  }

  const key = getEncryptionKey();
  const base64Data = ciphertext.slice(ENCRYPTED_PREFIX.length);
  const combined = Buffer.from(base64Data, "base64");

  // Extract IV, encrypted data, and auth tag
  const iv = combined.subarray(0, IV_LENGTH);
  const authTag = combined.subarray(combined.length - AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(IV_LENGTH, combined.length - AUTH_TAG_LENGTH);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

/**
 * Check if encryption is configured.
 * Use this to gracefully handle missing encryption key during development.
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.ENCRYPTION_KEY;
  return Boolean(key && key.length === 64);
}

/**
 * Safely encrypt - returns plaintext if encryption is not configured.
 * Useful for gradual rollout or development environments.
 */
export function safeEncrypt(plaintext: string): string {
  if (!isEncryptionConfigured()) {
    console.warn("ENCRYPTION_KEY not configured - storing credentials in plaintext");
    return plaintext;
  }
  return encrypt(plaintext);
}

/**
 * Safely decrypt - attempts to decrypt, falls back to returning as-is if it fails.
 * Handles migration from plaintext to encrypted credentials.
 */
export function safeDecrypt(ciphertext: string): string {
  if (!isEncryptionConfigured()) {
    return ciphertext;
  }

  // Check for our encrypted prefix - reliable detection
  if (!ciphertext.startsWith(ENCRYPTED_PREFIX)) {
    // Plaintext value from before encryption was enabled
    return ciphertext;
  }

  try {
    return decrypt(ciphertext);
  } catch (err) {
    // Encrypted value but decryption failed - this is a real error
    // (wrong key, corrupted data, etc.)
    console.error("Decryption failed for encrypted value:", err);
    throw new Error("Failed to decrypt credential - check ENCRYPTION_KEY");
  }
}
