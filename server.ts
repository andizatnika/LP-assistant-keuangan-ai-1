import express from "express";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images
  app.use(express.json({ limit: '10mb' }));

  // API Route for verifying receipt
  app.post("/api/verify-receipt", async (req, res) => {
    try {
      const { imageBase64, expectedPrice, expectedBank } = req.body;
      
      if (!imageBase64) {
        return res.status(400).json({ error: "Missing image" });
      }

      // Convert base64 string to part object for Gemini
      // Assuming imageBase64 is data:image/png;base64,.....
      const matches = imageBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return res.status(400).json({ error: "Invalid image format" });
      }

      const mimeType = matches[1];
      const base64Data = matches[2];

      const prompt = `You are a financial verification assistant. Look at this uploaded transfer receipt.
Please check:
1. Is this a seemingly valid and genuine bank transfer receipt (not an obvious fake, completely unrelated image, or badly edited)?
2. Does the transfer amount match EXACTLY Rp ${expectedPrice}?
3. Does the destination bank match ${expectedBank}?
Reply ONLY with a strictly valid JSON object:
{
  "isValid": true|false,
  "reason": "Brief explanation of why it is valid or invalid"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              },
              {
                text: prompt
              }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const text = response.text || "{}";
      const result = JSON.parse(text);
      
      res.json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to verify receipt." });
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
    const distPath = path.join(process.cwd(), 'dist');
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
