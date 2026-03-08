/**
 * Multi-Factor Authentication (MFA) Utilities
 * Implements TOTP-based 2FA using speakeasy
 */

import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import * as crypto from "crypto";

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[]; // Hashed codes for storage
  plaintextBackupCodes: string[]; // Plaintext codes to show user ONCE
}

/**
 * Generate MFA secret and QR code for user to scan
 */
export async function generateMFASecret(
  email: string,
  appName: string = "Spend Tracker"
): Promise<MFASetup> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    length: 32,
  });

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url as string);

  // Generate backup codes (both plaintext and hashed)
  const { plaintext, hashed } = generateBackupCodesWithPlaintext(10);

  return {
    secret: secret.base32,
    qrCode,
    backupCodes: hashed, // Store hashed codes in database
    plaintextBackupCodes: plaintext, // Return to user ONCE for saving
  };
}

/**
 * Verify MFA token
 */
export function verifyMFAToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps before and after
  });
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, backupCodes: string[]): boolean {
  const hashedCode = hashBackupCode(code);
  return backupCodes.includes(hashedCode);
}

/**
 * Generate backup codes (DEPRECATED - use generateBackupCodesWithPlaintext)
 * This function only returns hashed codes, which is incorrect for initial setup
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;

    // Store hashed version
    codes.push(hashBackupCode(formattedCode));
  }

  return codes;
}

/**
 * Generate backup codes with both plaintext (for display) and hashed (for storage)
 * CRITICAL: Plaintext codes must be shown to user ONCE and then discarded
 */
export function generateBackupCodesWithPlaintext(count: number = 10): {
  plaintext: string[];
  hashed: string[];
} {
  const plaintext: string[] = [];
  const hashed: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;

    // Keep plaintext for display
    plaintext.push(formattedCode);

    // Hash for storage
    hashed.push(hashBackupCode(formattedCode));
  }

  return { plaintext, hashed };
}

/**
 * Hash backup code for storage
 */
function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Remove used backup code from array
 */
export function removeBackupCode(
  code: string,
  backupCodes: string[]
): string[] {
  const hashedCode = hashBackupCode(code);
  return backupCodes.filter((bc) => bc !== hashedCode);
}

/**
 * Format backup codes for display
 */
export function formatBackupCodesForDisplay(count: number = 10): string[] {
  const displayCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    displayCodes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return displayCodes;
}
