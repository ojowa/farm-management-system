import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { workerRouter } from './modules/worker/worker.module';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.WORKER_SERVICE_PORT || 4007;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('worker.enabled'), workerRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'worker-service' });
});

app.listen(port, () => {
  console.log(`Worker service listening at http://localhost:${port}`);
});
