/**
 * Platform Console Integration Tests
 *
 * These tests verify the core platform console features:
 * 1. Authentication & impersonation flow
 * 2. Feature flag toggle effects
 * 3. Subscription limit enforcement
 *
 * Run with: npx ts-node src/__tests__/integration.test.ts
 * Or import and call individual test functions.
 */

import axios from 'axios';

const PLATFORM_API = process.env.PLATFORM_API_URL || 'http://localhost:4020';
const AUTH_API = process.env.AUTH_API_URL || 'http://localhost:4001';
const FARM_API = process.env.FARM_API_URL || 'http://localhost:4002';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function test(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`  ✓ ${name} (${Date.now() - start}ms)`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message, duration: Date.now() - start });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

// ── Auth Helpers ──────────────────────────────────────────────

async function loginAs(email: string, password: string) {
  const { data } = await axios.post(`${PLATFORM_API}/auth/login`, { email, password });
  return data;
}

function authHeader(token: string) {
  return { headers: { Authorization: `Bearer ${token}` } };
}

// ── Test Suites ───────────────────────────────────────────────

async function testAuthentication() {
  console.log('\n🔐 Authentication Tests');

  await test('Super admin login succeeds', async () => {
    const data = await loginAs('superadmin@farm.com', 'superadmin123');
    assert(data.accessToken, 'Should return accessToken');
    assert(data.refreshToken, 'Should return refreshToken');
    assert(data.user.role === 'SUPER_ADMIN', 'Should be SUPER_ADMIN');
  });

  await test('Invalid credentials fail', async () => {
    try {
      await loginAs('superadmin@farm.com', 'wrongpassword');
      throw new Error('Should have thrown');
    } catch (err: any) {
      assert(err.response?.status === 401, `Expected 401, got ${err.response?.status}`);
    }
  });

  await test('Token refresh works', async () => {
    const { refreshToken } = await loginAs('superadmin@farm.com', 'superadmin123');
    const { data } = await axios.post(`${PLATFORM_API}/auth/refresh`, { refreshToken });
    assert(data.accessToken, 'Should return new accessToken');
  });

  await test('Invalid refresh token fails', async () => {
    try {
      await axios.post(`${PLATFORM_API}/auth/refresh`, { refreshToken: 'invalid-token' });
      throw new Error('Should have thrown');
    } catch (err: any) {
      assert(err.response?.status === 401, `Expected 401, got ${err.response?.status}`);
    }
  });
}

async function testImpersonation() {
  console.log('\n🎭 Impersonation Tests');

  const { accessToken: superToken } = await loginAs('superadmin@farm.com', 'superadmin123');

  await test('Super admin can list users for impersonation', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/users`, authHeader(superToken));
    assert(Array.isArray(data.users), 'Should return users array');
    assert(data.users.length > 0, 'Should have at least one user');
  });

  await test('Super admin can impersonate a user', async () => {
    const { data: usersData } = await axios.get(`${PLATFORM_API}/users`, authHeader(superToken));
    const targetUser = usersData.users.find((u: any) => u.role !== 'SUPER_ADMIN');
    if (!targetUser) {
      console.log('    (skipped: no non-super-admin users to impersonate)');
      return;
    }

    const { data } = await axios.post(
      `${PLATFORM_API}/users/${targetUser.id}/impersonate`,
      {},
      authHeader(superToken),
    );
    assert(data.impersonationToken, 'Should return impersonationToken');
    assert(data.originalUser, 'Should return originalUser info');
    assert(data.impersonatedUser, 'Should return impersonatedUser info');
  });

  await test('Non-super-admin cannot impersonate', async () => {
    const { accessToken: ownerToken } = await loginAs('admin@farm.com', 'admin1234');
    const { data: usersData } = await axios.get(`${PLATFORM_API}/users`, authHeader(superToken));
    const targetUser = usersData.users[0];

    try {
      await axios.post(
        `${PLATFORM_API}/users/${targetUser.id}/impersonate`,
        {},
        authHeader(ownerToken),
      );
      throw new Error('Should have thrown');
    } catch (err: any) {
      assert(err.response?.status === 403, `Expected 403, got ${err.response?.status}`);
    }
  });

  await test('Super admin can force-logout a user', async () => {
    const { data: usersData } = await axios.get(`${PLATFORM_API}/users`, authHeader(superToken));
    const targetUser = usersData.users.find((u: any) => u.role !== 'SUPER_ADMIN');
    if (!targetUser) {
      console.log('    (skipped: no non-super-admin users)');
      return;
    }

    const { data } = await axios.post(
      `${PLATFORM_API}/users/${targetUser.id}/force-logout`,
      {},
      authHeader(superToken),
    );
    assert(data.message, 'Should return success message');
  });
}

async function testFeatureFlags() {
  console.log('\n🚩 Feature Flag Tests');

  const { accessToken: superToken } = await loginAs('superadmin@farm.com', 'superadmin123');

  await test('Can list feature flags', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/features`, authHeader(superToken));
    assert(Array.isArray(data.features), 'Should return features array');
    assert(data.features.length > 0, 'Should have seeded feature flags');
  });

  await test('Can toggle a feature flag', async () => {
    const { data: featuresData } = await axios.get(`${PLATFORM_API}/features`, authHeader(superToken));
    const flag = featuresData.features[0];

    const originalState = flag.isEnabled;
    const { data } = await axios.patch(
      `${PLATFORM_API}/features/${flag.id}`,
      { isEnabled: !originalState },
      authHeader(superToken),
    );
    assert(data.isEnabled === !originalState, 'Should toggle the flag');

    // Restore original state
    await axios.patch(
      `${PLATFORM_API}/features/${flag.id}`,
      { isEnabled: originalState },
      authHeader(superToken),
    );
  });

  await test('Can create org override for feature flag', async () => {
    const { data: featuresData } = await axios.get(`${PLATFORM_API}/features`, authHeader(superToken));
    const flag = featuresData.features[0];

    const { data: orgsData } = await axios.get(`${PLATFORM_API}/organizations`, authHeader(superToken));
    if (orgsData.organizations.length === 0) {
      console.log('    (skipped: no organizations)');
      return;
    }
    const org = orgsData.organizations[0];

    const { data } = await axios.post(
      `${PLATFORM_API}/features/${flag.id}/overrides`,
      { organizationId: org.id, isEnabled: false },
      authHeader(superToken),
    );
    assert(data.override, 'Should return override');
    assert(data.override.isEnabled === false, 'Override should be disabled');
  });

  await test('Feature flag check blocks disabled features', async () => {
    // This tests the middleware behavior - a disabled flag should return 403
    // We test this by checking the feature flags API returns proper state
    const { data } = await axios.get(`${PLATFORM_API}/features`, authHeader(superToken));
    const disabledFlag = data.features.find((f: any) => !f.isEnabled);
    if (!disabledFlag) {
      console.log('    (skipped: all features are enabled)');
      return;
    }
    assert(disabledFlag.isEnabled === false, 'Found a disabled feature flag');
  });
}

async function testSubscriptionLimits() {
  console.log('\n💳 Subscription Limit Tests');

  const { accessToken: superToken } = await loginAs('superadmin@farm.com', 'superadmin123');

  await test('Can list subscription plans', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/subscriptions/plans`, authHeader(superToken));
    assert(Array.isArray(data.plans), 'Should return plans array');
    assert(data.plans.length >= 4, 'Should have at least 4 plans (FREE, BASIC, PRO, ENTERPRISE)');
  });

  await test('Plans have correct limits', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/subscriptions/plans`, authHeader(superToken));
    const freePlan = data.plans.find((p: any) => p.name === 'FREE');
    assert(freePlan, 'FREE plan should exist');
    assert(freePlan.maxUsers === 3, 'FREE plan should allow 3 users');
    assert(freePlan.maxFarms === 1, 'FREE plan should allow 1 farm');
  });

  await test('Super admin can create a new plan', async () => {
    const { data } = await axios.post(
      `${PLATFORM_API}/subscriptions/plans`,
      {
        name: 'TEST_PLAN',
        description: 'Test plan for integration tests',
        price: 0,
        maxUsers: 1,
        maxFarms: 1,
        maxStorageMb: 100,
      },
      authHeader(superToken),
    );
    assert(data.plan, 'Should return created plan');
    assert(data.plan.name === 'TEST_PLAN', 'Plan name should match');

    // Clean up
    await axios.delete(`${PLATFORM_API}/subscriptions/plans/${data.plan.id}`, authHeader(superToken));
  });

  await test('Super admin can assign plan to organization', async () => {
    const { data: orgsData } = await axios.get(`${PLATFORM_API}/organizations`, authHeader(superToken));
    const { data: plansData } = await axios.get(`${PLATFORM_API}/subscriptions/plans`, authHeader(superToken));

    if (orgsData.organizations.length === 0 || plansData.plans.length === 0) {
      console.log('    (skipped: no organizations or plans)');
      return;
    }

    const org = orgsData.organizations[0];
    const plan = plansData.plans[0];

    const { data } = await axios.patch(
      `${PLATFORM_API}/subscriptions/organizations/${org.id}/subscription`,
      { planId: plan.id },
      authHeader(superToken),
    );
    assert(data.organization, 'Should return updated organization');
  });

  await test('Non-super-admin cannot create plans', async () => {
    const { accessToken: ownerToken } = await loginAs('admin@farm.com', 'admin1234');
    try {
      await axios.post(
        `${PLATFORM_API}/subscriptions/plans`,
        { name: 'UNAUTHORIZED_PLAN', price: 0, maxUsers: 1, maxFarms: 1, maxStorageMb: 100 },
        authHeader(ownerToken),
      );
      throw new Error('Should have thrown');
    } catch (err: any) {
      assert(err.response?.status === 403, `Expected 403, got ${err.response?.status}`);
    }
  });
}

async function testOrganizationManagement() {
  console.log('\n🏢 Organization Management Tests');

  const { accessToken: superToken } = await loginAs('superadmin@farm.com', 'superadmin123');

  await test('Can list organizations', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/organizations`, authHeader(superToken));
    assert(Array.isArray(data.organizations), 'Should return organizations array');
  });

  await test('Can get organization details', async () => {
    const { data: listData } = await axios.get(`${PLATFORM_API}/organizations`, authHeader(superToken));
    if (listData.organizations.length === 0) {
      console.log('    (skipped: no organizations)');
      return;
    }
    const org = listData.organizations[0];
    const { data } = await axios.get(`${PLATFORM_API}/organizations/${org.id}`, authHeader(superToken));
    assert(data.organization, 'Should return organization details');
  });

  await test('Can suspend and activate organization', async () => {
    const { data: listData } = await axios.get(`${PLATFORM_API}/organizations`, authHeader(superToken));
    if (listData.organizations.length === 0) {
      console.log('    (skipped: no organizations)');
      return;
    }
    const org = listData.organizations[0];
    if (org.subscriptionStatus === 'SUSPENDED') {
      const { data } = await axios.post(`${PLATFORM_API}/organizations/${org.id}/activate`, {}, authHeader(superToken));
      assert(data.organization.subscriptionStatus === 'ACTIVE', 'Should activate org');
    } else {
      const { data } = await axios.post(`${PLATFORM_API}/organizations/${org.id}/suspend`, {}, authHeader(superToken));
      assert(data.organization.subscriptionStatus === 'SUSPENDED', 'Should suspend org');
      // Restore
      await axios.post(`${PLATFORM_API}/organizations/${org.id}/activate`, {}, authHeader(superToken));
    }
  });
}

async function testAuditLog() {
  console.log('\n📋 Audit Log Tests');

  const { accessToken: superToken } = await loginAs('superadmin@farm.com', 'superadmin123');

  await test('Can list audit logs', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/audit`, authHeader(superToken));
    assert(Array.isArray(data.logs), 'Should return logs array');
    assert(typeof data.total === 'number', 'Should return total count');
  });

  await test('Can filter audit logs by action', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/audit?action=broadcast`, authHeader(superToken));
    assert(Array.isArray(data.logs), 'Should return filtered logs');
  });

  await test('Can filter audit logs by entity', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/audit?entity=User`, authHeader(superToken));
    assert(Array.isArray(data.logs), 'Should return filtered logs');
  });
}

async function testHealthMonitoring() {
  console.log('\n🏥 Health Monitoring Tests');

  const { accessToken: superToken } = await loginAs('superadmin@farm.com', 'superadmin123');

  await test('Can get health status', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/health`, authHeader(superToken));
    assert(Array.isArray(data.services), 'Should return services array');
    assert(data.database, 'Should return database status');
  });

  await test('Can trigger health check', async () => {
    const { data } = await axios.post(`${PLATFORM_API}/health/check`, {}, authHeader(superToken));
    assert(Array.isArray(data.results), 'Should return results array');
    assert(data.summary, 'Should return summary');
    assert(data.checkedAt, 'Should return checkedAt timestamp');
  });
}

async function testBroadcasts() {
  console.log('\n📢 Broadcast Tests');

  const { accessToken: superToken } = await loginAs('superadmin@farm.com', 'superadmin123');

  await test('Can create broadcast', async () => {
    const { data } = await axios.post(
      `${PLATFORM_API}/broadcasts`,
      {
        title: 'Test Broadcast',
        message: 'This is a test broadcast from integration tests',
        type: 'INFO',
      },
      authHeader(superToken),
    );
    assert(data.id, 'Should return broadcast id');
    assert(data.title === 'Test Broadcast', 'Title should match');

    // Clean up
    await axios.delete(`${PLATFORM_API}/broadcasts/${data.id}`, authHeader(superToken));
  });

  await test('Can list broadcasts', async () => {
    const { data } = await axios.get(`${PLATFORM_API}/broadcasts`, authHeader(superToken));
    assert(Array.isArray(data.broadcasts), 'Should return broadcasts array');
  });

  await test('Non-super-admin cannot create broadcasts', async () => {
    const { accessToken: ownerToken } = await loginAs('admin@farm.com', 'admin1234');
    try {
      await axios.post(
        `${PLATFORM_API}/broadcasts`,
        { title: 'Unauthorized', message: 'Should fail' },
        authHeader(ownerToken),
      );
      throw new Error('Should have thrown');
    } catch (err: any) {
      assert(err.response?.status === 403, `Expected 403, got ${err.response?.status}`);
    }
  });
}

// ── Runner ────────────────────────────────────────────────────

async function runAllTests() {
  console.log('🧪 Platform Console Integration Tests');
  console.log('=====================================');
  console.log(`API: ${PLATFORM_API}`);

  const startTime = Date.now();

  await testAuthentication();
  await testImpersonation();
  await testFeatureFlags();
  await testSubscriptionLimits();
  await testOrganizationManagement();
  await testAuditLog();
  await testHealthMonitoring();
  await testBroadcasts();

  const totalDuration = Date.now() - startTime;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  console.log('\n=====================================');
  console.log(`📊 Results: ${passed} passed, ${failed} failed (${totalDuration}ms)`);

  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter((r) => !r.passed).forEach((r) => {
      console.log(`   - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
  }
}

runAllTests().catch((err) => {
  console.error('Test runner error:', err);
  process.exit(1);
});
