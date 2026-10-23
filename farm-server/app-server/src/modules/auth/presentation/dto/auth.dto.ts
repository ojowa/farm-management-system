import { IsEmail, IsNotEmpty, IsString, MinLength, IsOptional, Length, Matches, IsBoolean } from 'class-validator';

/**
 * Password must contain at least one uppercase letter, one lowercase letter,
 * one number, and be at least 8 characters long.
 */
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, and one number';

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @IsString()
  @IsNotEmpty()
  firstName!: string;

  @IsString()
  @IsNotEmpty()
  lastName!: string;

  @IsOptional()
  @IsString()
  organizationId?: string;

  /** Name of a new organization to create; the registrant becomes its ORGANIZATION_OWNER. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  organizationName?: string;
}

export class RefreshTokenDto {
  // Optional: both frontends call /auth/refresh bodyless and rely on the
  // httpOnly refreshToken cookie (see auth.controller: req.cookies || body).
  @IsOptional()
  @IsString()
  refreshToken?: string;
}

export class VerifyMfaDto {
  @IsString()
  mfaToken!: string;

  @IsString()
  @Length(6, 6)
  code!: string;
}

export class ChangePasswordDto {
  @IsString()
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

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
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  roleId?: string;

  /** Platform admins only — moving a user between organizations. */
  @IsOptional()
  @IsString()
  organizationId?: string;
}
