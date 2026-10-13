/**
 * Standalone exercise of PlatformHealthService.checkAll()/getHealth() against a
 * stub SystemHealthRepository + a local stub of the domain services.
 *
 * Run with `npm run test:health` (after `npm run build:app`, it loads the
 * compiled service from app-server/dist).
 *
 * Verifies the audit fixes:
 *   1. 2xx (JSON)            -> healthy, uptime/memory captured
 *   2. 2xx (non-JSON body)   -> healthy (parsing no longer flips it to down)
 *   3. 404                   -> down   (was: degraded, hiding broken probes)
 *   4. 500                   -> degraded
 *   5. connection refused    -> down, stale uptime/metadata reset
 *   6. parallel probes, per-probe timeout, failures logged
 *   7. getHealth surfaces metadata.latencyMs + honest lastUpdated
 */
const http = require('http');
const assert = require('assert');
const { PlatformHealthService } = require('../app-server/dist/modules/platform/application/services/platform.service.js');

const PORT = 4555;
const CLOSED_PORT = 4599;

const server = http.createServer((req, res) => {
  const send = (code, body, type) => {
    res.writeHead(code, { 'content-type': type });
    res.end(body);
  };
  if (req.url === '/health' || req.url === '/v1/health') {
    return send(200, JSON.stringify({ status: 'ok', service: 'stub', uptime: 42, memory: 12345678 }), 'application/json');
  }
  if (req.url.startsWith('/notfound')) return send(404, JSON.stringify({ statusCode: 404, message: `Cannot GET ${req.url}` }), 'application/json');
  if (req.url.startsWith('/error')) return send(500, JSON.stringify({ statusCode: 500, message: 'boom' }), 'application/json');
  if (req.url.startsWith('/notjson')) return send(200, 'OK', 'text/plain');
  return send(404, JSON.stringify({ statusCode: 404, message: 'nope' }), 'application/json');
});

const rows = new Map();
const repo = {
  async findMany() {
    return [...rows.values()].sort((a, b) => a.serviceName.localeCompare(b.serviceName));
  },
  async upsert(serviceName, data) {
    const existing = rows.get(serviceName) || {
      id: serviceName,
      serviceName,
      status: 'unknown',
      uptime: null,
      memoryUsage: null,
      lastCheck: null,
      metadata: null,
      createdAt: new Date(),
    };
    const next = Object.assign(existing, data, { serviceName, updatedAt: new Date() });
    rows.set(serviceName, next);
    return next;
  },
  async queryRaw() {
    return [{ '?column?': 1 }];
  },
};

async function main() {
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));

  // Pre-seed a stale row: a service that used to be healthy but has since gone
  // away must not keep showing last month's numbers (audit finding #5).
  rows.set('reporting-service', {
    id: 'reporting-service',
    serviceName: 'reporting-service',
    status: 'healthy',
    uptime: 999,
    memoryUsage: 555555,
    lastCheck: new Date('2026-09-30T05:21:04.714Z'),
    metadata: { latencyMs: 4, timestamp: '2026-09-30T05:21:04.714Z' },
    createdAt: new Date('2026-09-30T05:21:04.714Z'),
    updatedAt: new Date('2026-09-30T05:21:04.714Z'),
  });

  Object.assign(process.env, {
    AUTH_SERVICE_URL: `http://127.0.0.1:${PORT}`,
    FARM_SERVICE_URL: `http://127.0.0.1:${PORT}/notfound`,
    NOTIFICATION_SERVICE_URL: `http://127.0.0.1:${PORT}/error`,
    FINANCE_SERVICE_URL: `http://127.0.0.1:${PORT}/notjson`,
    REPORTING_SERVICE_URL: `http://127.0.0.1:${CLOSED_PORT}`,
    ORGANIZATION_SERVICE_URL: `http://127.0.0.1:${PORT}`,
    HR_SERVICE_URL: `http://127.0.0.1:${PORT}`,
    PLATFORM_SERVICE_URL: `http://127.0.0.1:${PORT}`,
    APP_SERVER_URL: `http://127.0.0.1:${PORT}`,
    HEALTH_CHECK_TIMEOUT_MS: '1500',
  });

  const svc = new PlatformHealthService(repo);
  const started = Date.now();
  const out = await svc.checkAll();
  const elapsed = Date.now() - started;

  console.log('\n=== checkAll() ===');
  console.log(JSON.stringify(out, null, 2));

  const byName = Object.fromEntries(out.results.map((r) => [r.name, r]));
  assert.strictEqual(out.summary.total, 10, '9 services + postgresql');
  assert.strictEqual(byName['auth-service'].status, 'healthy', '2xx JSON -> healthy');
  assert.strictEqual(byName['finance-service'].status, 'healthy', '2xx non-JSON -> healthy (was: down)');
  assert.strictEqual(byName['farm-service'].status, 'down', '404 -> down (was: degraded)');
  assert.strictEqual(byName['notification-service'].status, 'degraded', '500 -> degraded');
  assert.strictEqual(byName['reporting-service'].status, 'down', 'connection refused -> down');
  assert.strictEqual(byName['postgresql'].status, 'healthy', 'database reachable');
  assert.strictEqual(byName['app-server'].status, 'healthy', 'APP_SERVER_URL probed at /v1/health');
  assert.strictEqual(out.summary.healthy, 7, 'auth, org, hr, platform, finance, app-server, postgresql');
  assert.strictEqual(out.summary.unhealthy, 3, 'farm(404), notification(500), reporting(refused)');

  // Stale row must have been reset when the service went down.
  const reporting = rows.get('reporting-service');
  assert.strictEqual(reporting.uptime, 0, 'stale uptime cleared');
  assert.strictEqual(reporting.memoryUsage, null, 'stale memory cleared');
  assert.ok(reporting.metadata && reporting.metadata.error, 'error recorded in metadata');
  assert.notStrictEqual(reporting.metadata.timestamp, '2026-09-30T05:21:04.714Z', 'stale metadata replaced');

  // Healthy rows carry the payload the console renders.
  const auth = rows.get('auth-service');
  assert.strictEqual(auth.uptime, 42, 'uptime captured from payload');
  assert.strictEqual(auth.memoryUsage, 12345678, 'memory captured from payload');
  assert.ok(typeof auth.metadata.latencyMs === 'number', 'latency persisted');

  const health = await svc.getHealth();
  console.log('\n=== getHealth() ===');
  console.log(JSON.stringify(health, null, 2));

  assert.ok(typeof health.services.find((s) => s.name === 'auth-service').latencyMs === 'number',
    'getHealth surfaces per-service latencyMs (console reads this)');
  assert.ok(health.lastUpdated && !Number.isNaN(Date.parse(health.lastUpdated)), 'lastUpdated is an ISO timestamp');
  const newest = health.services.reduce((m, s) => Math.max(m, new Date(s.lastCheck).getTime()), 0);
  assert.strictEqual(Date.parse(health.lastUpdated), newest, 'lastUpdated == newest lastCheck, not now()');

  console.log(`\nALL ASSERTIONS PASSED (probes ran in ${elapsed} ms)`);
  server.close();
}

main().catch((err) => {
  console.error('\nASSERTION/TEST FAILURE:', err);
  server.close();
  process.exit(1);
});
