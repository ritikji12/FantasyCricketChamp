**1. Entry Point (`src/index.ts`)**  
```ts
import express from 'express';
import { createServer } from 'http';
import { registerRoutes } from './routes';

async function main() {
  const app = express();
  app.use(express.json());

  // Register all API routes
  const httpServer = await registerRoutes(app);

  // Listen on the port provided by Render (or 4000 as fallback)
  const port = process.env.PORT ? parseInt(process.env.PORT) : 4000;
  httpServer.listen(port, () => {
    console.log(`🚀 Server listening on port ${port}`);
  });
}

main().catch(err => {
  console.error("❌ Failed to start server", err);
  process.exit(1);
});
```  

**2. Your Routes File (`src/route.ts`)**  
(Keep exactly as you have it, exporting `registerRoutes(app)`.)  

**3. `package.json` Scripts**  
Make sure your `package.json` includes build & start commands that Render can use:  
```json
{
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```  
- **Build Command** on Render: `npm run build`  
- **Start Command** on Render: `npm run start`  

**4. TypeScript Configuration (`tsconfig.json`)**  
Ensure your compiled output lands in `dist/`:  
```json
{
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "target": "ES2019",
    "moduleResolution": "Node",
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```  

---

With this setup:  
1. Render will run `npm run build` → compiles TS into `dist/`.  
2. Then it will run `npm run start` → executes `dist/index.js`, which imports your `route.ts` code, mounts all `/api/...` endpoints, and listens on `process.env.PORT`.  

No local server calls are necessary—Render will host everything for you.  

**Project Directory Structure**  
```
/ (repo root)
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts        # the entry point above
│   ├── route.ts        # your single routes file
│   ├── storage.ts      # your DatabaseStorage
│   ├── auth.ts         # auth setup
│   ├── db.ts           # drizzle/db pool
│   └── shared/
│       └── schema.ts   # your Zod & Drizzle schemas
```

