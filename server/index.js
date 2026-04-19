import 'dotenv/config';
import { createApp } from './app.js';

const host = process.env.HOST?.trim() || '0.0.0.0';
const port = Number(process.env.PORT) || 3001;
const app = createApp();
const server = app.listen(port, host, () => {
  console.log(`Server listening on http://${host}:${port}`);
});

function shutdown(signal) {
  console.log(`${signal} received, shutting down gracefully...`);

  server.close(() => {
    process.exit(0);
  });

  setTimeout(() => {
    process.exit(1);
  }, 10_000).unref();
}

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
