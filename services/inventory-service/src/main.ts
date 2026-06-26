import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { inventoryRouter } from './modules/inventory/inventory.module';
import { AuthError } from '@farm/auth';

dotenv.config();

const app = express();
const port = process.env.INVENTORY_SERVICE_PORT || 3011;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', inventoryRouter);

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
