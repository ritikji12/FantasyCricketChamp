import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      password: string;
      isAdmin: boolean;
      createdAt: Date;
    }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'fantasy-app-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production'
    },
    store: storage.sessionStore,
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Login route
  app.post("/api/login", (req, res, next) => {
    // Set content type for response
    res.setHeader('Content-Type', 'application/json');
    
    passport.authenticate('local', (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }
      req.login(user, (err) => {
        if (err) {
          return next(err);
        }
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });

  // Register route
  app.post("/api/register", async (req, res, next) => {
    // Set content type for response
    res.setHeader('Content-Type', 'application/json');
    
    try {
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email exists in the schema and is provided
      if (req.body.email) {
        try {
          // Only check email if the function exists
          if (typeof storage.getUserByEmail === 'function') {
            const existingUserByEmail = await storage.getUserByEmail(req.body.email);
            if (existingUserByEmail) {
              return res.status(400).json({ message: "Email already exists" });
            }
          }
        } catch (error) {
          // Ignore error if getUserByEmail doesn't exist
          console.log("Email check skipped - getUserByEmail may not be implemented");
        }
      }

      const userData = {
        ...req.body,
        password: await hashPassword(req.body.password),
        isAdmin: req.body.isAdmin || false
      };

      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...userWithoutPassword } = user;
        return res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      return res.status(500).json({ 
        message: "Registration failed", 
        error: String(error)
      });
    }
  });

  // Logout route
  app.post("/api/logout", (req, res, next) => {
    // Set content type for response
    res.setHeader('Content-Type', 'application/json');
    
    req.logout((err) => {
      if (err) return next(err);
      return res.status(200).json({ message: "Logged out successfully" });
    });
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    // Set content type for response
    res.setHeader('Content-Type', 'application/json');
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = req.user as User;
    return res.json(userWithoutPassword);
  });
  
  return { hashPassword, comparePasswords };
}
