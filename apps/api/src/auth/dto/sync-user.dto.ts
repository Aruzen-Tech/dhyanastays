import { IsOptional, IsString } from 'class-validator';

/**
 * POST /auth/sync
 *
 * Called by the frontend immediately after Auth0 login.
 * The JWT guard has already verified the Auth0 access token,
 * so req.user.sub / email / role are available.
 *
 * The body carries the user's chosen role (for new registrations)
 * and their display name from Auth0's user_metadata.
 */
export class SyncUserDto {
  /** Display name from Auth0 user_metadata.name or user profile */
  @IsOptional()
  @IsString()
  fullName?: string;

  /**
   * Desired role for NEW users only (GUEST | HOST).
   * Ignored if the user already exists in our DB.
   * Admin role cannot be self-assigned — must be set via Auth0 dashboard.
   */
  @IsOptional()
  @IsString()
  desiredRole?: string;
}
