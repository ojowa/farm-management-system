"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_PERMISSION_KEY = exports.AUTH_ROLES_KEY = exports.CurrentUser = exports.Permission = exports.Roles = exports.AuthorizationGuard = exports.JwtAuthGuard = exports.asyncHandler = exports.requireAuth = exports.authMiddleware = void 0;
__exportStar(require("./jwt"), exports);
__exportStar(require("./roles"), exports);
var index_1 = require("./express/index");
Object.defineProperty(exports, "authMiddleware", { enumerable: true, get: function () { return index_1.authMiddleware; } });
Object.defineProperty(exports, "requireAuth", { enumerable: true, get: function () { return index_1.requireAuth; } });
Object.defineProperty(exports, "asyncHandler", { enumerable: true, get: function () { return index_1.asyncHandler; } });
var index_2 = require("./nestjs/index");
Object.defineProperty(exports, "JwtAuthGuard", { enumerable: true, get: function () { return index_2.JwtAuthGuard; } });
Object.defineProperty(exports, "AuthorizationGuard", { enumerable: true, get: function () { return index_2.AuthorizationGuard; } });
Object.defineProperty(exports, "Roles", { enumerable: true, get: function () { return index_2.Roles; } });
Object.defineProperty(exports, "Permission", { enumerable: true, get: function () { return index_2.Permission; } });
Object.defineProperty(exports, "CurrentUser", { enumerable: true, get: function () { return index_2.CurrentUser; } });
Object.defineProperty(exports, "AUTH_ROLES_KEY", { enumerable: true, get: function () { return index_2.AUTH_ROLES_KEY; } });
Object.defineProperty(exports, "AUTH_PERMISSION_KEY", { enumerable: true, get: function () { return index_2.AUTH_PERMISSION_KEY; } });
