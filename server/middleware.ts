import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to fix "Unexpected token '<'" error that sometimes occurs
 * This ensures API routes always return JSON even if there's an error
 */
export function apiErrorHandler(req: Request, res: Response, next: NextFunction) {
  // Save the original res.send
  const originalSend = res.send;
  
  // Override res.send to always set the content type properly
  // @ts-ignore - we're monkey patching the method
  res.send = function(body) {
    // Always set JSON content type for API routes
    if (req.path.startsWith('/api/')) {
      res.setHeader('Content-Type', 'application/json');
      
      // If an error occurs and we somehow got HTML instead of JSON
      if (typeof body === 'string' && body.startsWith('<!DOCTYPE')) {
        // Convert it to a JSON error
        return originalSend.call(this, JSON.stringify({
          error: 'Server error occurred',
          message: 'The server attempted to return HTML instead of JSON',
          path: req.path
        }));
      }
    }
    
    return originalSend.call(this, body);
  };
  
  next();
}

/**
 * Middleware to ensure all API responses have proper Content-Type headers
 */
export function apiContentTypeMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  next();
}
