export declare class ExpenseShareInput {
    memberId: string;
    amountMinor: number;
}
export declare class CreateExpenseDto {
    title: string;
    totalMinor: number;
    method: 'EQUAL' | 'CUSTOM';
    notes?: string;
    incurredAt?: string;
    memberIds?: string[];
    shares?: ExpenseShareInput[];
}
