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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentUser = exports.Auth = exports.AuthorizationGuard = exports.JwtAuthGuard = exports.Permission = exports.Roles = exports.AUTH_PERMISSION_KEY = exports.AUTH_ROLES_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const jwt_1 = require("../jwt");
const roles_1 = require("../roles");
exports.AUTH_ROLES_KEY = 'farm:auth:roles';
exports.AUTH_PERMISSION_KEY = 'farm:auth:permission';
/**
 * Restrict a controller method to one or more roles. Combine with
 * `@UseGuards(JwtAuthGuard)` (the guard is the same as `JwtAuthGuard`
 * exported here).
 *
 *   @Roles('ORGANIZATION_OWNER', 'FARM_MANAGER')
 *   @UseGuards(JwtAuthGuard)
 *   @Post('farms')
 *   create() {}
 */
const Roles = (...roles) => (0, common_1.SetMetadata)(exports.AUTH_ROLES_KEY, roles);
exports.Roles = Roles;
/**
 * Require a fine-grained permission string (e.g. `farm.write`). Pair with
 * `JwtAuthGuard`.
 *
 *   @Permission('finance.write')
 *   @UseGuards(JwtAuthGuard)
 *   @Post('sales')
 *   create() {}
 */
const Permission = (permission) => (0, common_1.SetMetadata)(exports.AUTH_PERMISSION_KEY, permission);
exports.Permission = Permission;
/**
 * Passport-free JWT guard. We deliberately do not pull in `@nestjs/passport`
 * here so the same guard works in services that do not depend on Passport.
 */
let JwtAuthGuard = class JwtAuthGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const token = (0, jwt_1.extractBearerToken)(req.headers.authorization);
        if (!token) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        try {
            req.user = (0, jwt_1.verifyAccessToken)(token);
        }
        catch (err) {
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)()
], JwtAuthGuard);
/**
 * Authorization guard that reads role/permission metadata set by the
 * `Roles` and `Permission` decorators. Always pair with `JwtAuthGuard` so
 * `req.user` is populated before the role check runs.
 */
let AuthorizationGuard = class AuthorizationGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const requiredRoles = this.reflector.getAllAndOverride(exports.AUTH_ROLES_KEY, [context.getHandler(), context.getClass()]);
        const requiredPermission = this.reflector.getAllAndOverride(exports.AUTH_PERMISSION_KEY, [context.getHandler(), context.getClass()]);
        if (!requiredRoles && !requiredPermission) {
            return true;
        }
        const { user } = context
            .switchToHttp()
            .getRequest();
        if (!user) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        if (requiredRoles && requiredRoles.length > 0) {
            if (!(0, roles_1.userHasAnyRole)(user.role, requiredRoles)) {
                throw new common_1.ForbiddenException('Insufficient role');
            }
        }
        if (requiredPermission) {
            if (!(0, roles_1.roleHasPermission)(user.role, requiredPermission)) {
                throw new common_1.ForbiddenException('Insufficient permission');
            }
        }
        return true;
    }
};
exports.AuthorizationGuard = AuthorizationGuard;
exports.AuthorizationGuard = AuthorizationGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector])
], AuthorizationGuard);
/**
 * Convenience: `JwtAuthGuard` + `AuthorizationGuard` so a single decorator
 * covers both authentication and authorization.
 */
const Auth = (...roles) => (0, common_1.SetMetadata)(exports.AUTH_ROLES_KEY, roles);
exports.Auth = Auth;
/**
 * Param decorator for the verified user. Use it on handler signatures:
 *
 *   @Get('me')
 *   me(@CurrentUser() user: VerifiedUser) { return user; }
 */
exports.CurrentUser = (0, common_1.createParamDecorator)((_data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    if (!req.user) {
        throw new common_1.UnauthorizedException('Authentication required');
    }
    return req.user;
});
