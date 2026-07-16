import { IssueCategory, IssueUrgency } from '@prisma/client';
export declare class CreateIssueDto {
    category: IssueCategory;
    description: string;
    urgency?: IssueUrgency;
    photoUrl?: string;
}
