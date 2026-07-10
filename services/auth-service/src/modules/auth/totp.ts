import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { prisma } from '@farm/database';
import crypto from 'crypto';

export async function generateTOTPSecret(userId: string, email: string) {
  const secret = crypto.randomBytes(20).toString('hex');
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
  const otpauth = `otpauth://totp/FarmManager:${email}?secret=${secret}&issuer=FarmManager`;
  return { secret, qrCodeUrl: otpauth };
}

export async function enable2FA(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) throw new BadRequestException('Generate 2FA secret first');
  // @ts-ignore - otplib types not available
  const { authenticator } = await import('otplib');
  const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!isValid) throw new UnauthorizedException('Invalid MFA code');
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: true } });
}

export async function disable2FA(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) throw new BadRequestException('2FA not enabled');
  // @ts-ignore - otplib types not available
  const { authenticator } = await import('otplib');
  const isValid = authenticator.verify({ token: code, secret: user.twoFactorSecret });
  if (!isValid) throw new UnauthorizedException('Invalid MFA code');
  await prisma.user.update({ where: { id: userId }, data: { twoFactorEnabled: false, twoFactorSecret: null } });
}
