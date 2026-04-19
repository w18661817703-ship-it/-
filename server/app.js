import cors from 'cors';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getModel, rewriteMessage } from './chat-service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, '../dist');
const indexFile = path.join(distDir, 'index.html');

function registerOptionalCors(app) {
  const clientOrigin = process.env.CLIENT_ORIGIN?.trim();

  if (!clientOrigin) {
    return;
  }

  app.use(
    cors({
      origin: clientOrigin,
    }),
  );
}

function serveFrontend(app) {
  if (!fs.existsSync(indexFile)) {
    return;
  }

  app.use(express.static(distDir));

  app.get('*', (request, response, next) => {
    if (request.path.startsWith('/api/')) {
      return next();
    }

    return response.sendFile(indexFile);
  });
}

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  registerOptionalCors(app);
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_request, response) => {
    return response.json({
      ok: true,
      model: getModel(),
    });
  });

  app.post('/api/chat', async (request, response) => {
    const result = await rewriteMessage(request.body?.message);

    if (!result.ok) {
      return response.status(result.status).json({
        error: result.error,
      });
    }

    return response.json({
      result: result.result,
      model: result.model,
    });
  });

  app.use('/api', (_request, response) => {
    return response.status(404).json({ error: '接口不存在。' });
  });

  serveFrontend(app);

  return app;
}
