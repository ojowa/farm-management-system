import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { workerRouter } from './modules/worker/worker.module';
import { AuthError } from '@farm/auth';

dotenv.config();

const app = express();
const port = process.env.WORKER_SERVICE_PORT || 3008;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', workerRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'worker-service' });
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
  console.log(`Worker service listening at http://localhost:${port}`);
});
