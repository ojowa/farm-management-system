"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = __importDefault(require("node:test"));
const strict_1 = __importDefault(require("node:assert/strict"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const jwt_1 = require("./jwt");
const roles_1 = require("./roles");
const SECRET = 'test-secret';
(0, node_test_1.default)('verifyAccessToken rejects an expired token', () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
    try {
        const token = jsonwebtoken_1.default.sign({ sub: 'u1', role: roles_1.ROLES.WORKER, organizationId: 'o1' }, SECRET, { expiresIn: '-1s' });
        strict_1.default.throws(() => (0, jwt_1.verifyAccessToken)(token));
    }
    finally {
        process.env.JWT_SECRET = originalSecret;
    }
});
(0, node_test_1.default)('verifyAccessToken rejects a malformed token', () => {
    strict_1.default.throws(() => (0, jwt_1.verifyAccessToken)('not-a-jwt'));
});
(0, node_test_1.default)('verifyAccessToken returns the verified principal on a valid token', () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
    try {
        const token = jsonwebtoken_1.default.sign({ sub: 'u1', role: roles_1.ROLES.FARM_MANAGER, organizationId: 'o1', email: 'a@b.c' }, SECRET, { expiresIn: '5m' });
        const user = (0, jwt_1.verifyAccessToken)(token);
        strict_1.default.deepEqual(user, {
            id: 'u1',
            email: 'a@b.c',
            role: roles_1.ROLES.FARM_MANAGER,
            organizationId: 'o1',
        });
    }
    finally {
        process.env.JWT_SECRET = originalSecret;
    }
});
(0, node_test_1.default)('verifyAccessToken throws for missing fields', () => {
    const originalSecret = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SECRET;
    try {
        const token = jsonwebtoken_1.default.sign({ sub: 'u1' }, SECRET, { expiresIn: '5m' });
        strict_1.default.throws(() => (0, jwt_1.verifyAccessToken)(token), /Invalid token payload/);
    }
    finally {
        process.env.JWT_SECRET = originalSecret;
    }
});
(0, node_test_1.default)('extractBearerToken parses the header', () => {
    strict_1.default.equal((0, jwt_1.extractBearerToken)('Bearer abc.def.ghi'), 'abc.def.ghi');
    strict_1.default.equal((0, jwt_1.extractBearerToken)('bearer xyz'), 'xyz');
    strict_1.default.equal((0, jwt_1.extractBearerToken)('Basic abc'), null);
    strict_1.default.equal((0, jwt_1.extractBearerToken)(undefined), null);
    strict_1.default.equal((0, jwt_1.extractBearerToken)(''), null);
});
(0, node_test_1.default)('roleHasPermission grants wildcard to SUPER_ADMIN', () => {
    strict_1.default.equal((0, roles_1.roleHasPermission)(roles_1.ROLES.SUPER_ADMIN, 'farm.write'), true);
});
(0, node_test_1.default)('roleHasPermission matches explicit grants', () => {
    strict_1.default.equal((0, roles_1.roleHasPermission)(roles_1.ROLES.FARM_MANAGER, 'farm.write'), true);
    strict_1.default.equal((0, roles_1.roleHasPermission)(roles_1.ROLES.WORKER, 'farm.write'), false);
});
(0, node_test_1.default)('roleHasPermission matches wildcards on the granted permission', () => {
    strict_1.default.equal((0, roles_1.roleHasPermission)(roles_1.ROLES.ORGANIZATION_OWNER, 'finance.delete'), true);
});
(0, node_test_1.default)('roleHasPermission returns false for unknown roles', () => {
    strict_1.default.equal((0, roles_1.roleHasPermission)('UNKNOWN_ROLE', 'farm.read'), false);
});
(0, node_test_1.default)('userHasAnyRole works for allowed and denied roles', () => {
    strict_1.default.equal((0, roles_1.userHasAnyRole)(roles_1.ROLES.FARM_MANAGER, [roles_1.ROLES.FARM_MANAGER, roles_1.ROLES.SUPER_ADMIN]), true);
    strict_1.default.equal((0, roles_1.userHasAnyRole)(roles_1.ROLES.WORKER, [roles_1.ROLES.FARM_MANAGER]), false);
    strict_1.default.equal((0, roles_1.userHasAnyRole)('', [roles_1.ROLES.WORKER]), false);
    strict_1.default.equal((0, roles_1.userHasAnyRole)(roles_1.ROLES.WORKER, []), false);
});
