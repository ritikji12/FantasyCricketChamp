import express from "express";
import session from "express-session";
import { registerRoutes } from "./routes.js";
import { apiErrorHandler, apiContentTypeMiddleware } from "./middleware.js";
import { setPlayerCreditPoints } from "./set-player-credits.js";

// Create Express application
const app = express();

// Parse JSON request bodies
app.use(express.json());

// Apply middleware to ensure proper API response handling
app.use(apiErrorHandler);
app.use(apiContentTypeMiddleware);

// Global error handler
app.use((err, req, res, _next) => {
  console.error(err.stack);

  res.setHeader("Content-Type", "application/json");
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: err.message,
  });
});

// Register application routes and start server
export async function startServer() {
  const server = await registerRoutes(app);
  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });

  try {
    console.log("Running player credit points setup...");
    await setPlayerCreditPoints();
    console.log("✅ Player credit points setup completed successfully.");
  } catch (error) {
    console.error("❌ Failed to set player credit points:", error);
  }
}

// ✅ ESM way to check if file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer().catch((err) => {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  });
}
