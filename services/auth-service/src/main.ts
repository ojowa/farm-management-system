import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes';
import rolesRoutes from './routes/roles.routes';
import permissionsRoutes from './routes/permissions.routes';
import adminRoutes from './routes/admin.routes';
import orgAdminRoutes from './routes/org-admin.routes';
import apiKeysRoutes from './routes/api-keys.routes';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.AUTH_SERVICE_PORT || 4001;

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:3004',
  'http://localhost:3005',
  'http://localhost:8081',
];

app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(morgan('short'));
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/auth', authRoutes);
app.use('/roles', rolesRoutes);
app.use('/permissions', permissionsRoutes);
app.use('/admin/organizations', adminRoutes);
app.use('/org-admin', orgAdminRoutes);
app.use('/api-keys', apiKeysRoutes);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'auth-service' });
});

app.listen(port, () => {
  console.log(`Auth service listening at http://localhost:${port}`);
});
