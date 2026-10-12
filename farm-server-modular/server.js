/**
 * Vercel entry point (zero-config Express detection: `server.js` at project root).
 *
 * Modular monolith: one Nest application serves every bounded context, so
 * this file only has to wrap it. `createApp()` configures and initializes
 * Nest without binding a port; we expose its Express instance through an
 * http.Server and attach socket.io to it (Vercel only upgrades WebSockets
 * when the module exports an http.Server, so the Nest IoAdapter never owns
 * the server here — RealtimeGateway.broadcastRealtimeEvent() falls back to
 * `global.__FMS_SOCKET_IO__`, which we set below).
 *
 * The first request after a cold start pays for the Nest/Prisma startup;
 * later requests reuse the warm process (Fluid compute keeps it alive).
 */
const { loadEnv } = require('./app-server/dist/kernel/env');
loadEnv();

const http = require('http');
const { Server: SocketIOServer } = require('socket.io');
const { verifyAccessToken } = require('./app-server/dist/kernel/auth');

let readyPromise = null;

function bootstrap() {
  if (!readyPromise) {
    readyPromise = (async () => {
      console.log('[server.js] booting modular monolith (require + Nest init)...');
      const { createApp } = require('./app-server/dist/main.js');
      const app = await createApp();
      console.log('[server.js] monolith initialized');
      // The underlying Express instance is a (req, res) handler once Nest
      // has finished app.init().
      return app.getHttpAdapter().getInstance();
    })();
    // Cold-start failure → allow the next request to retry.
    readyPromise.catch(() => {
      readyPromise = null;
    });
  }
  return readyPromise;
}

function parseOrigins() {
  const raw = process.env.CORS_ORIGINS;
  if (!raw) return ['http://localhost:3000'];
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function parseCookieHeader(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  for (const pair of cookieHeader.split(';')) {
    const [key, ...rest] = pair.split('=');
    if (key) cookies[key.trim()] = rest.join('=').trim();
  }
  return cookies;
}

const httpServer = http.createServer((req, res) => {
  bootstrap()
    .then((expressApp) => expressApp(req, res))
    .catch((err) => {
      // JSON error response (Express' default HTML error page would swallow state).
      console.error('[server.js] request failed:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: 'Internal server error' });
      }
    });
});

// ---------------------------------------------------------------------------
// Realtime (socket.io)
//
// This is single-instance delivery: a user's room lives on whichever function
// instance accepted the socket, so an event raised by another instance will not
// reach it. Adding Redis pub/sub would lift that limitation.
// ---------------------------------------------------------------------------
const io = new SocketIOServer(httpServer, {
  cors: { origin: parseOrigins(), credentials: true },
  // Vercel only upgrades WebSocket connections; long-polling is unsupported,
  // so clients must use transports: ['websocket'].
  transports: ['websocket'],
});

// Let the realtime gateway broadcast to these same connections.
global.__FMS_SOCKET_IO__ = io;

io.on('connection', (socket) => {
  let token = socket.handshake.auth?.token;
  if (!token && socket.handshake.headers?.cookie) {
    token = parseCookieHeader(socket.handshake.headers.cookie).accessToken;
  }

  let userId;
  try {
    if (!token || typeof token !== 'string') throw new Error('missing token');
    const user = verifyAccessToken(token);
    userId = user.id;
  } catch (err) {
    console.warn(`[server.js] socket rejected: ${err?.message || 'invalid token'} (${socket.id})`);
    socket.disconnect(true);
    return;
  }

  socket.on('join', (data = {}) => {
    // Only ever let a socket join its own room.
    if (data.userId !== userId) return;
    socket.join(`user:${userId}`);
    if (data.organizationId) socket.join(`org:${data.organizationId}`);
    socket.emit('joined', { success: true, userId });
  });

  socket.on('leave', (data = {}) => {
    if (data.userId !== userId) return;
    socket.leave(`user:${userId}`);
    socket.emit('left', { success: true, userId });
  });
});

if (require.main === module) {
  const port = Number(process.env.PORT || process.env.API_SERVICE_PORT) || 4022;
  httpServer.listen(port, process.env.LISTEN_HOST || '0.0.0.0', () => {
    console.log(`[server.js] listening on port ${port}`);
  });
} else {
  module.exports = httpServer;
}