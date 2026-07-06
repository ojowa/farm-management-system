import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import organizationsRoutes from './routes/organizations.routes';
import featuresRoutes from './routes/features.routes';
import subscriptionsRoutes from './routes/subscriptions.routes';
import healthRoutes from './routes/health.routes';
import auditRoutes from './routes/audit.routes';
import broadcastsRoutes from './routes/broadcasts.routes';
import configRoutes from './routes/config.routes';
import { weatherRouter } from './routes/weather';
import { documentsRouter } from './routes/documents';
import { apiLimiter, authLimiter, healthCheckLimiter } from './middleware/rate-limiter';
import { cspHeaders } from './middleware/csp';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.PLATFORM_SERVICE_PORT || 4020;

// Security headers
app.use(helmet());
app.use(cspHeaders);

// CORS configuration
const allowedOrigins = (process.env.CONSOLE_ALLOWED_ORIGINS || 'http://localhost:4100,http://localhost:3000')
  .split(',')
  .map((s) => s.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Organization-Id'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
}));

// Logging
app.use(morgan('combined'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
app.use('/auth', authLimiter);
app.use('/health', healthCheckLimiter);
app.use(apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/users', usersRoutes);
app.use('/organizations', organizationsRoutes);
app.use('/features', featuresRoutes);
app.use('/subscriptions', subscriptionsRoutes);
app.use('/health', healthRoutes);
app.use('/audit', auditRoutes);
app.use('/broadcasts', broadcastsRoutes);
app.use('/config', configRoutes);
app.use('/weather', weatherRouter);
app.use('/documents', documentsRouter);

// Serve uploaded files statically
const uploadsPath = path.resolve(__dirname, '../../uploads');
app.use('/uploads', express.static(uploadsPath));

app.get('/health-check', (_req, res) => {
  res.json({ status: 'ok', service: 'platform-service', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Centralized error handler
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof Error && err.message === 'Not allowed by CORS') {
    return res.status(403).json({ statusCode: 403, message: 'Origin not allowed by CORS policy' });
  }
  return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Platform service listening at http://localhost:${port}`);
});
