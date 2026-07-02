import { AdminLevel, UserKind } from '@prisma/client';
export type RequestUser = {
    sub: string;
    role: string;
    email: string;
    kind?: UserKind;
    adminLevel?: AdminLevel;
};
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
