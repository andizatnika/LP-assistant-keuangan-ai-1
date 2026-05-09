import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";

async function startServer() {
  const app = express();
  const PORT = 3000;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || "",
  });

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '10mb' }));

  // API Verification Endpoint (Anthropic)
  app.post('/api/verify-receipt', async (req, res) => {
    try {
      const { imageBase64, expectedPrice, expectedBank } = req.body;

      if (!process.env.ANTHROPIC_API_KEY) {
        return res.status(500).json({ 
          isValid: false, 
          reason: "ANTHROPIC_API_KEY is not configured in environment." 
        });
      }

      if (!imageBase64) {
        return res.status(400).json({ isValid: false, reason: "No image data provided." });
      }

      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ isValid: false, reason: "Invalid image format." });
      }
      const mediaType = matches[1];
      const base64Data = matches[2];

      const prompt = `Analisis bukti transfer ini. 
      Verifikasi apakah:
      1. Ini adalah bukti transfer bank yang valid.
      2. Nominal transfer adalah "${expectedPrice}" (angka utama harus cocok).
      3. Bank tujuan adalah "${expectedBank}".
      
      Berikan jawaban dalam format JSON:
      {
        "isValid": boolean,
        "reason": "Penjelasan singkat dalam Bahasa Indonesia jika tidak valid"
      }`;

      const message = await anthropic.messages.create({
        model: "claude-3-haiku-20240307",
        max_tokens: 1024,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType as any,
                  data: base64Data,
                },
              },
              {
                type: "text",
                text: prompt,
              },
            ],
          },
        ],
      });

      const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = jsonMatch ? JSON.parse(jsonMatch[0]) : { isValid: false, reason: "AI response format error." };

      res.json(result);
    } catch (error: any) {
      console.error("Anthropic Error:", error);
      res.status(500).json({ isValid: false, reason: "AI Verification Error: " + error.message });
    }
  });

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
    
    res.sendFile(filePath);
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
