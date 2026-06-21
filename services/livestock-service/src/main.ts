import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { livestockRouter } from './modules/livestock/livestock.module';

dotenv.config();

const app = express();
const port = process.env.PORT || 3004;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'livestock-service' });
});

app.listen(port, () => {
  console.log(`Livestock service listening at http://localhost:${port}`);
});
