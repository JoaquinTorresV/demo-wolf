import express from 'express';
import 'dotenv/config';
import { ensureSchema } from './db/db.js';
import { webhookRouter } from './routes/webhook.js';

// Crea las tablas si no existen (no hace falta migrar a mano).
ensureSchema();

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'wolf-control-bot' });
});

app.use('/', webhookRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[wolf-control-bot] escuchando en puerto ${PORT}`);
});
