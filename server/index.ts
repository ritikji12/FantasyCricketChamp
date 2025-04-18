import express from 'express';
import session from 'express-session';
import { createServer } from 'http';
import { registerRoutes } from './routes';    // <-- your single route file
import { db } from './db';

async function main() {
  const app = express();

  app.use(express.json());
  // (Any other global middleware you need here)

  // wire up all of your routes in one go:
  const httpServer = await registerRoutes(app);

  const port = process.env.PORT ?? 4000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server listening on http://localhost:${port}`);
  });
}

main().catch(err => {
  console.error("❌ Failed to start server", err);
  process.exit(1);
});
