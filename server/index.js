import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { generateReply, getModel } from './chat-service.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.use(
  cors({
    origin: clientOrigin,
  }),
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true, model: getModel() });
});

app.post('/api/chat', async (request, response) => {
  const result = await generateReply(request.body?.message);

  if (!result.ok) {
    return response.status(result.status).json({ error: result.error });
  }

  return response.json({ result: result.result, model: result.model });
});

app.listen(port, () => {
  console.log(`Express API listening on http://localhost:${port}`);
});
