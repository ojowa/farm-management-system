import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Length, Matches, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Password must contain at least one uppercase letter, one lowercase letter,
 * one number, and be at least 8 characters long.
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number';

export class LoginDto {
  @ApiProperty({ description: 'User email address', example: 'admin@farm.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePass123' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'User email address', example: 'admin@farm.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'User password', example: 'SecurePass123' })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiProperty({ description: 'User first name', example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @ApiProperty({ description: 'User last name', example: 'Doe' })
  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @ApiPropertyOptional({ description: 'Organization ID to join', example: 'org_123' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  /** Name of a new organization to create; the registrant becomes its ORGANIZATION_OWNER. */
  @ApiPropertyOptional({ description: 'New organization name', example: 'Green Valley Farm' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  organizationName?: string;
}

export class RefreshTokenDto {
  // Optional: both frontends call /auth/refresh bodyless and rely on the
  // httpOnly refreshToken cookie (see auth.controller: req.cookies || body).
  @ApiPropertyOptional({ description: 'Refresh token', example: 'eyJhbG...' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class VerifyMfaDto {
  @ApiProperty({ description: 'MFA token', example: 'mfa_token_xyz' })
  @IsString()
  mfaToken!: string;

  @ApiProperty({ description: '6-digit MFA code', example: '123456' })
  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ description: 'Current password', example: 'OldPass123' })
  @IsString()
  currentPassword!: string;

  @ApiProperty({ description: 'New password', example: 'NewPass123' })
  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

export class UpdateProfileDto {
  @ApiPropertyOptional({ description: 'User first name', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'User email address', example: 'john@farm.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Avatar URL', example: 'https://cdn.farm.com/avatars/123.png' })
  @IsOptional()
  @IsString()
  avatar?: string;
}

/**
 * Whitelisted fields for `PUT /auth/users/:userId` and
 * `PUT /admin/users/:userId`. The service re-whitelists and validates
 * `roleId` before anything reaches Prisma — the raw request body must
 * never be forwarded (it could otherwise rewrite passwordHash,
 * twoFactorSecret, email or phone).
 */
export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'User first name', example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'User last name', example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Whether the user is active', example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Role ID', example: 'role_123' })
  @IsOptional()
  @IsString()
  roleId?: string;

  /** Platform admins only — moving a user between organizations. */
  @ApiPropertyOptional({ description: 'Organization ID', example: 'org_123' })
  @IsOptional()
  @IsString()
  organizationId?: string;
}
