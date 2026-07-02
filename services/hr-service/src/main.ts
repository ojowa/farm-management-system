import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { leaveTypesRouter } from './routes/leaveTypes';
import { leaveRequestsRouter } from './routes/leaveRequests';
import { leaveBalanceRouter } from './routes/leaveBalance';
import { shiftsRouter } from './routes/shifts';
import { shiftAssignmentsRouter } from './routes/shiftAssignments';
import { messagesRouter } from './routes/messages';
import { correspondenceRouter } from './routes/correspondence';
import { AuthError } from '@farm/auth';
import { rlsMiddleware, featureFlagGuard } from '@farm/database';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const app = express();
const port = process.env.HR_SERVICE_PORT || 4012;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());
app.use(rlsMiddleware);

// Feature-flagged routes
app.use('/leave/types', featureFlagGuard('leave.enabled'), leaveTypesRouter);
app.use('/leave/requests', featureFlagGuard('leave.enabled'), leaveRequestsRouter);
app.use('/leave/balance', featureFlagGuard('leave.enabled'), leaveBalanceRouter);
app.use('/shifts', featureFlagGuard('roster.enabled'), shiftsRouter);
app.use('/shift-assignments', featureFlagGuard('roster.enabled'), shiftAssignmentsRouter);
app.use('/messages', featureFlagGuard('messaging.enabled'), messagesRouter);
app.use('/correspondence', featureFlagGuard('correspondence.enabled'), correspondenceRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hr-service' });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof AuthError) {
    return res.status(err.statusCode).json({ statusCode: err.statusCode, message: err.message });
  }
  return res.status(500).json({ statusCode: 500, message: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`HR service listening at http://localhost:${port}`);
});
