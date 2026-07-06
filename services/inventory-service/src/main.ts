import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { inventoryRouter } from './modules/inventory/inventory.module';
import { lowStockRouter } from './routes/low-stock';
import { inventoryImportExportRouter } from './routes/import-export';
import { equipmentRouter } from './routes/equipment';
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
app.use('/api/low-stock', featureFlagGuard('inventory.enabled'), lowStockRouter);
app.use('/api', featureFlagGuard('inventory.enabled'), inventoryImportExportRouter);
app.use('/api/equipment', featureFlagGuard('inventory.enabled'), equipmentRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'inventory-service' });
});

app.listen(port, () => {
  console.log(`Inventory service listening at http://localhost:${port}`);
});
