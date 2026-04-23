import { InvestorDocumentKind } from '@prisma/client';
import { IsEnum, IsString, IsUrl, Length } from 'class-validator';

export class UploadInvestorDocumentDto {
  @IsString()
  investorUserId!: string;

  @IsEnum(InvestorDocumentKind)
  kind!: InvestorDocumentKind;

  @IsString()
  @Length(1, 240)
  title!: string;

  @IsUrl({ require_tld: false })
  url!: string;
}
