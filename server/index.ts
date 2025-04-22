
import express, { Request, Response, NextFunction } from "express";
import session from "express-session";
import { registerRoutes } from "./routes";
import { apiErrorHandler, apiContentTypeMiddleware } from "./middleware";
import { setPlayerCreditPoints } from "./set-player-credits";

// Create Express application
const app = express();

// Parse JSON request bodies
app.use(express.json());

// Apply middleware to ensure proper API response handling
app.use(apiErrorHandler);
app.use(apiContentTypeMiddleware);

// Global error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  
  // Ensure we don't send HTML error pages for API requests
  res.setHeader('Content-Type', 'application/json');
  
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message
  });
});

// Register application routes and start server
async function startServer() {
  const server = await registerRoutes(app);
  const port = process.env.PORT || 3000;
  
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
  
  // Run player credit points setup on server start
  try {
    console.log("Running player credit points setup...");
    await setPlayerCreditPoints();
    console.log("Player credit points setup completed successfully.");
  } catch (error) {
    console.error("Failed to set player credit points:", error);
  }
}

// Start server if this is the main module
// Start server immediately since we're using ES modules
startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
