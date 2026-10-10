/**
 * Vercel entry point (zero-config Express detection: `server.js` at project root).
 *
 * farm-server runs as two processes in production (see scripts/start-prod.js):
 *   - gateway — app-server/dist/microservices/api.main.js   (HTTP router + reverse proxy)
 *   - domains — app-server/dist/microservices/domains.main.js (every domain module)
 *
 * On Vercel both run inside this single function process, using the same
 * merged-process mode as Render (see ../../render.yaml): the `domains` app
 * listens on 127.0.0.1:4099 and the gateway proxies to it through the
 * *_SERVICE_URL variables, exactly as in production.
 *
 * Vercel sees this file import `express` and export an Express app, so it
 * deploys the app as one function (Fluid compute, 300s default max duration).
 */
const { loadEnv } = require('@farm/env');
loadEnv();

const express = require('express');

const DOMAIN_PORT = Number(process.env.DOMAINS_SERVICE_PORT) || 4099;
const DOMAIN_BASE = `http://127.0.0.1:${DOMAIN_PORT}`;
const BOOTSTRAP_TIMEOUT_MS = Number(process.env.BOOTSTRAP_TIMEOUT_MS) || 120000;

// The gateway proxy reads these when GatewayProxyService is constructed
// (app-server/src/modules/api/proxy/http-proxy.service.ts). Point every service
// at the in-process domains app unless the environment already overrides them.
for (const key of [
  'AUTH', 'FARM', 'CROP', 'LIVESTOCK', 'POULTRY', 'FINANCE', 'HR',
  'NOTIFICATION', 'ORGANIZATION', 'PLATFORM', 'REPORTING',
]) {
  if (!process.env[`${key}_SERVICE_URL`]) {
    process.env[`${key}_SERVICE_URL`] = DOMAIN_BASE;
  }
}
if (!process.env.DOMAINS_SERVICE_PORT) {
  process.env.DOMAINS_SERVICE_PORT = String(DOMAIN_PORT);
}

/** Resolve once the domains app accepts connections on DOMAIN_PORT. */
function waitForPort(port, timeoutMs) {
  const net = require('net');
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.connect({ port, host: '127.0.0.1' }, () => {
        socket.end();
        resolve();
      });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() > deadline) {
          reject(new Error(`domains app did not start listening on ${port} within ${timeoutMs}ms`));
        } else {
          setTimeout(attempt, 250);
        }
      });
    };
    attempt();
  });
}

let readyPromise = null;

function bootstrap() {
  if (!readyPromise) {
    readyPromise = (async () => {
      console.log('[server.js] booting domains app (require + Nest init)...');
      // 1. Domains app — requiring the module self-bootstraps and listens on
      //    DOMAIN_PORT (mirrors start-prod.js, which spawns it as a child process).
      require('./app-server/dist/microservices/domains.main.js');
      await waitForPort(DOMAIN_PORT, BOOTSTRAP_TIMEOUT_MS);
      console.log(`[server.js] domains app listening on ${DOMAIN_PORT}`);

      // 2. Gateway — createApiApp() configures and initializes Nest without
      //    binding a port; we use its Express instance as the function handler.
      console.log('[server.js] booting gateway app...');
      const { createApiApp } = require('./app-server/dist/microservices/api.main.js');
      const app = await createApiApp();
      console.log('[server.js] gateway ready');
      return app.getHttpAdapter().getInstance();
    })();
    // Allow a retry on the next request if this cold start failed.
    readyPromise.catch(() => {
      readyPromise = null;
    });
  }
  return readyPromise;
}

const app = express();

// Delegate each request to the gateway once bootstrapping has finished. The
// first request after a cold start pays for the Nest/Prisma startup; later
// requests reuse the warm process (Fluid compute keeps it alive).
app.use((req, res, next) => {
  bootstrap().then((gateway) => gateway(req, res), next);
});

// JSON error responses (Express' default HTML error page would swallow state).
app.use((err, req, res, _next) => {
  console.error('[server.js] request failed:', err);
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      detail: err && (err.stack || err.message || String(err)),
    });
  }
});

module.exports = app;
