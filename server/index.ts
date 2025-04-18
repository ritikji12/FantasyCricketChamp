import express, { Express } from 'express';
import { createServer, type Server } from 'http';
import playersRouter from './routes/players';
import teamsRouter from './routes/teams';

const app: Express = express();

// Middleware setup (e.g., JSON parser, authentication, etc.)
app.use(express.json());

// Register routes from players and teams
app.use('/api', playersRouter);
app.use('/api', teamsRouter);

// Optionally add more routes or middleware

// Start the server
const server: Server = createServer(app);
server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});

export default server;
