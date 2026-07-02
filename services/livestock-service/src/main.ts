import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { livestockRouter } from './modules/livestock/livestock.module';
import { AuthError } from '@farm/auth';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config();

const app = express();
const port = process.env.LIVESTOCK_SERVICE_PORT || 4003;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('livestock.enabled'), livestockRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'livestock-service' });
});

app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AuthError) {
    return res
      .status(err.statusCode)
      .json({ statusCode: err.statusCode, message: err.message });
  }
  return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Livestock service listening at http://localhost:${port}`);
});
