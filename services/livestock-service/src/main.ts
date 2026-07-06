import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { livestockRouter } from './modules/livestock/livestock.module';
import { healthRouter } from './modules/livestock/health.routes';
import { breedingRouter } from './modules/livestock/breeding.routes';
import { weightRouter } from './modules/livestock/weight.routes';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.LIVESTOCK_SERVICE_PORT || 4003;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('livestock.enabled'), livestockRouter);
app.use('/api/health', featureFlagGuard('livestock.enabled'), healthRouter);
app.use('/api/breeding', featureFlagGuard('livestock.enabled'), breedingRouter);
app.use('/api/weight', featureFlagGuard('livestock.enabled'), weightRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'livestock-service' });
});

app.listen(port, () => {
  console.log(`Livestock service listening at http://localhost:${port}`);
});
