import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { AuthError } from '@farm/auth';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';


dotenv.config();

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

app.use('/api', featureFlagGuard('reporting.enabled'), reportingRouter);


app.use((err: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AuthError) {
    return res
      .status(err.statusCode)
      .json({ statusCode: err.statusCode, message: err.message });
  }
  return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'reporting-service' });
});

app.listen(port, () => {
  console.log(`Reporting service listening at http://localhost:${port}`);
});
