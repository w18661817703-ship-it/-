import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { generateReply, getModel } from './chat-service.js';
import { consumeDailyQuota, getClientIp } from './daily-rate-limit.js';

const app = express();
const port = Number(process.env.PORT) || 3001;
const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';

app.set('trust proxy', true);

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
  const clientIp = getClientIp(request);
  const quota = consumeDailyQuota(clientIp);

  if (!quota.allowed) {
    return response.status(429).json({
      error: '今日可用次数已用完，请明天再试',
      remainingCount: quota.remainingCount,
    });
  }

  const result = await generateReply(request.body?.message);

  if (!result.ok) {
    return response.status(result.status).json({
      error: result.error,
      remainingCount: quota.remainingCount,
    });
  }

  return response.json({
    result: result.result,
    model: result.model,
    remainingCount: quota.remainingCount,
  });
});

app.listen(port, () => {
  console.log(`Express API listening on http://localhost:${port}`);
});
