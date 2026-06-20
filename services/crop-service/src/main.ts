import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { cropRouter } from './modules/crop/crop.module';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', cropRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'crop-service' });
});

app.listen(port, () => {
  console.log(`Crop service listening at http://localhost:${port}`);
});
