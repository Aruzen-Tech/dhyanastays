import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Changing your own password.
 *
 * The current password is required even though the caller is already
 * authenticated: it stops someone who has walked up to an unlocked session from
 * locking the real owner out of their account.
 */
export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'New password must be at least 8 characters' })
  @MaxLength(128)
  newPassword!: string;
}
