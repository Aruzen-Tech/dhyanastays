import { InvestorDocumentKind } from '@prisma/client';
export declare class UploadInvestorDocumentDto {
    investorUserId: string;
    kind: InvestorDocumentKind;
    title: string;
    url: string;
}
