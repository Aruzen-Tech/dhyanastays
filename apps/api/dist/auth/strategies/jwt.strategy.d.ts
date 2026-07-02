import { Strategy } from 'passport-jwt';
import { AdminLevel, UserKind } from '@prisma/client';
export type CustomJwtPayload = {
    sub: string;
    email: string;
    role: string;
    kind?: UserKind;
    adminLevel?: AdminLevel;
    type?: string;
};
export type Auth0JwtPayload = {
    sub: string;
    email?: string;
    'https://dhyanastays.in/role'?: string;
    'https://dhyanastays.in/email'?: string;
    'https://dhyanastays.in/kind'?: UserKind;
    'https://dhyanastays.in/adminLevel'?: AdminLevel;
    aud?: string | string[];
    iss?: string;
    exp?: number;
    iat?: number;
};
export type JwtPayload = CustomJwtPayload | Auth0JwtPayload;
export type RequestUser = {
    sub: string;
    email: string;
    role: string;
    kind?: UserKind;
    adminLevel?: AdminLevel;
};
declare const JwtStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtStrategy extends JwtStrategy_base {
    private readonly logger;
    constructor();
    validate(payload: JwtPayload): RequestUser;
}
export {};
