import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { financeRouter } from './modules/finance/finance.module';
import { profitabilityRouter } from './routes/profitability';
import { contractsRouter } from './routes/contracts';
import { marketplaceRouter } from './routes/marketplace';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.FINANCE_SERVICE_PORT || 4006;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('finance.enabled'), financeRouter);
app.use('/api/profitability', featureFlagGuard('finance.enabled'), profitabilityRouter);
app.use('/api/contracts', featureFlagGuard('finance.enabled'), contractsRouter);
app.use('/api/marketplace', featureFlagGuard('finance.enabled'), marketplaceRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'finance-service' });
});

app.listen(port, () => {
  console.log(`Finance service listening at http://localhost:${port}`);
});
