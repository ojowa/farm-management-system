import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { poultryRouter } from './modules/poultry/poultry.module';
import { medicationRouter } from './modules/poultry/medication.module';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.POULTRY_SERVICE_PORT || 4004;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('poultry.enabled'), poultryRouter);
app.use('/api', featureFlagGuard('poultry.enabled'), medicationRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'poultry-service' });
});

app.listen(port, () => {
  console.log(`Poultry service listening at http://localhost:${port}`);
});
