import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '10mb' }));

  const distPath = path.join(process.cwd(), 'dist');

  // Explicit routes for clean URLs
  app.get('/login', (req, res, next) => {
    if (process.env.NODE_ENV !== "production") return next();
    res.sendFile(path.join(distPath, 'login.html'));
  });

  app.get('/checkout1', (req, res) => {
    const filePath = process.env.NODE_ENV !== "production"
      ? path.join(process.cwd(), 'checkout1', 'index.html')
      : path.join(distPath, 'checkout1/index.html');
    
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      // Inject Gemini API Key
      const apiKey = process.env.GEMINI_API_KEY || '';
      content = content.replace('window.GEMINI_API_KEY = "";', `window.GEMINI_API_KEY = "${apiKey}";`);
      res.send(content);
    } catch (e) {
      res.status(500).send("Error loading checkout page");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "mpa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: since this app has multiple HTML files, we need special handling if we were to serve them
    app.use(express.static(distPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
