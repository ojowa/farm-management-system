import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { farmRouter } from './modules/farm/farm.module';
import { authMiddleware } from '@farm/auth/express';
import { AuthError } from '@farm/auth';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config();

const app = express();
const port = process.env.FARM_SERVICE_PORT || 4002;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('farm.enabled'), farmRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'farm-service' });
});

// Centralized auth error handler: turns AuthError thrown from the per-route
// middleware into a clean 401/403 response. Other errors fall through.
app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AuthError) {
    return res
      .status(err.statusCode)
      .json({ statusCode: err.statusCode, message: err.message });
  }
  return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});

void authMiddleware; // ensure import is not tree-shaken

app.listen(port, () => {
  console.log(`Farm service listening at http://localhost:${port}`);
});
