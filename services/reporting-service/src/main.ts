import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';


dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.REPORTING_SERVICE_PORT || 4008;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

// Reporting endpoints are read-only and accessible to anyone with the
// `reporting.read` permission.
// CRUD for reporting artifacts is implemented in a dedicated router.
import reportingRouter from './modules/reporting/reporting.router';
import { scheduledReportsRouter } from './routes/scheduled-reports';

app.use('/api', featureFlagGuard('reporting.enabled'), reportingRouter);
app.use('/api/schedule', featureFlagGuard('reporting.enabled'), scheduledReportsRouter);


app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reporting-service' });
});

app.listen(port, () => {
  console.log(`Reporting service listening at http://localhost:${port}`);
});
