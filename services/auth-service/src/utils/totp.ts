import { TOTP } from 'otplib';
import { NodeCryptoPlugin } from '@otplib/plugin-crypto-node';
import { ScureBase32Plugin } from '@otplib/plugin-base32-scure';
import { prisma } from '@farm/database';

const APP_NAME = 'FarmMS';

const totp = new TOTP({
  crypto: new NodeCryptoPlugin(),
  base32: new ScureBase32Plugin(),
  algorithm: 'sha1',
  digits: 6,
  period: 30,
});

export interface TOTPSetupResult {
  secret: string;
  otpauthUrl: string;
  qrCodeUrl: string;
}

export async function generateTOTPSecret(userId: string, email: string): Promise<TOTPSetupResult> {
  const secret = totp.generateSecret();
  const otpauthUrl = totp.toURI({ label: email, issuer: APP_NAME, secret });
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`;

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });

  return { secret, otpauthUrl, qrCodeUrl };
}

export async function verifyTOTPCode(secret: string, code: string): Promise<boolean> {
  try {
    const result = await totp.verify(code, { secret });
    return result.valid;
  } catch {
    return false;
  }
}

export async function enable2FA(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorSecret) {
    throw new Error('2FA not set up. Please generate a secret first.');
  }
  if (user.twoFactorEnabled) {
    throw new Error('2FA is already enabled.');
  }

  const isValid = await verifyTOTPCode(user.twoFactorSecret, code);
  if (!isValid) {
    throw new Error('Invalid verification code.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  return true;
}

export async function disable2FA(userId: string, code: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled) {
    throw new Error('2FA is not enabled.');
  }
  if (!user.twoFactorSecret) {
    throw new Error('2FA secret not found.');
  }

  const isValid = await verifyTOTPCode(user.twoFactorSecret, code);
  if (!isValid) {
    throw new Error('Invalid verification code.');
  }

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return true;
}

export async function verifyMFALogin(userId: string, code: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new Error('2FA is not enabled for this account.');
  }

  const isValid = await verifyTOTPCode(user.twoFactorSecret, code);
  if (!isValid) {
    throw new Error('Invalid MFA code.');
  }

  return true;
}
