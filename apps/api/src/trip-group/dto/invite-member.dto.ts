import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class InviteMemberDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  fullName!: string;
}
