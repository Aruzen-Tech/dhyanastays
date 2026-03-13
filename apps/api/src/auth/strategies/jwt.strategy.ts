import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';

// ─── Payload shapes ───────────────────────────────────────────────────────────

/** Custom JWT payload (issued by our own AuthService) */
export type CustomJwtPayload = {
  sub: string;
  email: string;
  role: string;
  type?: string;
};

/** Auth0 JWT payload — role injected via Auth0 Action as a namespaced claim */
export type Auth0JwtPayload = {
  sub: string;                                    // e.g. "auth0|abc123"
  email?: string;
  'https://dhyanastays.in/role'?: string;         // custom claim set by Auth0 Action
  'https://dhyanastays.in/email'?: string;        // fallback email claim
  aud?: string | string[];
  iss?: string;
  exp?: number;
  iat?: number;
};

export type JwtPayload = CustomJwtPayload | Auth0JwtPayload;

/** Shape attached to req.user after validation — used by all guards/decorators */
export type RequestUser = {
  sub: string;
  email: string;
  role: string;
};

// ─── Strategy ─────────────────────────────────────────────────────────────────

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor() {
    const auth0Domain = process.env.AUTH0_DOMAIN?.trim();
    const auth0Audience = process.env.AUTH0_AUDIENCE?.trim();

    const useAuth0 = Boolean(auth0Domain && auth0Audience);

    const strategyOptions = useAuth0
      ? {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKeyProvider: passportJwtSecret({
            cache: true,
            rateLimit: true,
            jwksRequestsPerMinute: 5,
            jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
          }),
          audience: auth0Audience,
          issuer: `https://${auth0Domain}/`,
          algorithms: ['RS256'] as const,
        }
      : {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKey: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
          algorithms: ['HS256'] as const,
        };

    super(strategyOptions);

    this.logger.log(
      useAuth0
        ? 'JWT strategy initialized in AUTH0 mode'
        : 'JWT strategy initialized in CUSTOM mode (HS256)',
    );
  }

  validate(payload: JwtPayload): RequestUser {
    // Support both Auth0 namespaced claims and our own flat claims
    const role =
      (payload as Auth0JwtPayload)['https://dhyanastays.in/role'] ??
      (payload as CustomJwtPayload).role ??
      'GUEST';

    const email =
      (payload as Auth0JwtPayload)['https://dhyanastays.in/email'] ??
      (payload as Auth0JwtPayload).email ??
      (payload as CustomJwtPayload).email ??
      '';

    return {
      sub: payload.sub,
      email,
      role,
    };
  }
}
