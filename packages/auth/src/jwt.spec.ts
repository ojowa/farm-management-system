import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { verifyAccessToken, extractBearerToken } from './jwt';
import { userHasPermission, userHasAnyRole, ROLES } from './roles';

const SECRET = 'test-secret';

test('verifyAccessToken rejects an expired token', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SECRET;
  try {
    const token = jwt.sign(
      { sub: 'u1', role: ROLES.WORKER, permissions: [], organizationId: 'o1' },
      SECRET,
      { expiresIn: '-1s' },
    );
    assert.throws(() => verifyAccessToken(token));
  } finally {
    process.env.JWT_SECRET = originalSecret;
  }
});

test('verifyAccessToken rejects a malformed token', () => {
  assert.throws(() => verifyAccessToken('not-a-jwt'));
});

test('verifyAccessToken returns the verified principal on a valid token', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SECRET;
  try {
    const token = jwt.sign(
      { sub: 'u1', role: ROLES.FARM_MANAGER, permissions: ['farm.read', 'farm.write'], organizationId: 'o1', email: 'a@b.c' },
      SECRET,
      { expiresIn: '5m' },
    );
    const user = verifyAccessToken(token);
    assert.deepEqual(user, {
      id: 'u1',
      email: 'a@b.c',
      role: ROLES.FARM_MANAGER,
      permissions: ['farm.read', 'farm.write'],
      organizationId: 'o1',
    });
  } finally {
    process.env.JWT_SECRET = originalSecret;
  }
});

test('verifyAccessToken throws for missing fields', () => {
  const originalSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = SECRET;
  try {
    const token = jwt.sign({ sub: 'u1' }, SECRET, { expiresIn: '5m' });
    assert.throws(() => verifyAccessToken(token), /Invalid token payload/);
  } finally {
    process.env.JWT_SECRET = originalSecret;
  }
});

test('extractBearerToken parses the header', () => {
  assert.equal(extractBearerToken('Bearer abc.def.ghi'), 'abc.def.ghi');
  assert.equal(extractBearerToken('bearer xyz'), 'xyz');
  assert.equal(extractBearerToken('Basic abc'), null);
  assert.equal(extractBearerToken(undefined), null);
  assert.equal(extractBearerToken(''), null);
});

test('userHasPermission grants wildcard to SUPER_ADMIN', () => {
  assert.equal(userHasPermission(['*'], 'farm.write'), true);
});

test('userHasPermission matches explicit grants', () => {
  assert.equal(userHasPermission(['farm.read', 'farm.write'], 'farm.write'), true);
  assert.equal(userHasPermission(['farm.read'], 'farm.write'), false);
});

test('userHasPermission matches wildcards on the granted permission', () => {
  assert.equal(userHasPermission(['finance.*'], 'finance.delete'), true);
});

test('userHasPermission returns false for empty permissions', () => {
  assert.equal(userHasPermission([], 'farm.read'), false);
});

test('userHasAnyRole works for allowed and denied roles', () => {
  assert.equal(userHasAnyRole(ROLES.FARM_MANAGER, [ROLES.FARM_MANAGER, ROLES.SUPER_ADMIN]), true);
  assert.equal(userHasAnyRole(ROLES.WORKER, [ROLES.FARM_MANAGER]), false);
  assert.equal(userHasAnyRole('', [ROLES.WORKER]), false);
  assert.equal(userHasAnyRole(ROLES.WORKER, []), false);
});
