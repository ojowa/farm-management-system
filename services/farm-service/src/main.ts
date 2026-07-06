import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { farmRouter } from './modules/farm/farm.module';
import { importExportRouter } from './routes/import-export';
import { mapRouter } from './routes/map';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.FARM_SERVICE_PORT || 4002;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('farm.enabled'), farmRouter);
app.use('/api', featureFlagGuard('farm.enabled'), importExportRouter);
app.use('/api/map', featureFlagGuard('farm.enabled'), mapRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'farm-service' });
});

app.listen(port, () => {
  console.log(`Farm service listening at http://localhost:${port}`);
});
