"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var JwtStrategy_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_jwt_1 = require("passport-jwt");
const jwks_rsa_1 = require("jwks-rsa");
let JwtStrategy = JwtStrategy_1 = class JwtStrategy extends (0, passport_1.PassportStrategy)(passport_jwt_1.Strategy) {
    constructor() {
        const auth0Domain = process.env.AUTH0_DOMAIN?.trim();
        const auth0Audience = process.env.AUTH0_AUDIENCE?.trim();
        const useAuth0 = Boolean(auth0Domain && auth0Audience);
        const strategyOptions = useAuth0
            ? {
                jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
                ignoreExpiration: false,
                secretOrKeyProvider: (0, jwks_rsa_1.passportJwtSecret)({
                    cache: true,
                    rateLimit: true,
                    jwksRequestsPerMinute: 5,
                    jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
                }),
                audience: auth0Audience,
                issuer: `https://${auth0Domain}/`,
                algorithms: ['RS256'],
            }
            : {
                jwtFromRequest: passport_jwt_1.ExtractJwt.fromAuthHeaderAsBearerToken(),
                ignoreExpiration: false,
                secretOrKey: process.env.JWT_ACCESS_SECRET || (() => { throw new Error('JWT_ACCESS_SECRET is required'); })(),
                algorithms: ['HS256'],
            };
        super(strategyOptions);
        this.logger = new common_1.Logger(JwtStrategy_1.name);
        this.logger.log(useAuth0
            ? 'JWT strategy initialized in AUTH0 mode'
            : 'JWT strategy initialized in CUSTOM mode (HS256)');
    }
    validate(payload) {
        const role = payload['https://dhyanastays.in/role'] ??
            payload.role ??
            'GUEST';
        const email = payload['https://dhyanastays.in/email'] ??
            payload.email ??
            payload.email ??
            '';
        const kind = payload['https://dhyanastays.in/kind'] ??
            payload.kind ??
            undefined;
        const adminLevel = payload['https://dhyanastays.in/adminLevel'] ??
            payload.adminLevel ??
            undefined;
        return { sub: payload.sub, email, role, kind, adminLevel };
    }
};
exports.JwtStrategy = JwtStrategy;
exports.JwtStrategy = JwtStrategy = JwtStrategy_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], JwtStrategy);
//# sourceMappingURL=jwt.strategy.js.map