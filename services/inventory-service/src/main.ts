import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { inventoryRouter } from './modules/inventory/inventory.module';
import { AuthError } from '@farm/auth';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.INVENTORY_SERVICE_PORT || 4010;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

app.use('/api', featureFlagGuard('inventory.enabled'), inventoryRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-service' });
});

app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AuthError) {
    return res
      .status(err.statusCode)
      .json({ statusCode: err.statusCode, message: err.message });
  }
  return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`Inventory service listening at http://localhost:${port}`);
});
