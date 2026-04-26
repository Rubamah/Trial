import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Route for Translation
  app.post("/api/translate", async (req, res) => {
    const { text, source, target } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
      return res.status(500).json({ error: "Gemini API key is not configured in environment variables." });
    }

    if (!text) {
       return res.status(400).json({ error: "Text is required" });
    }

    try {
      const genAI = new GoogleGenAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `Translate the following list of subtitle lines to ${target}.
Source Language: ${source === 'auto' ? 'Detect automatically' : source}
Target Language: ${target}

Rules:
- Translate each line individually.
- Maintain the exact order.
- Do NOT include any explanations or conversational text.
- Provide ONLY the translated lines separated by newlines.

Text to translate:
---
${text}
---`;

      const result = await model.generateContent(prompt);
      const translatedText = result.response.text();

      res.json({ translatedText: translatedText.trim() });
    } catch (error) {
      console.error("Translation API Error:", error);
      res.status(500).json({ error: "Translation failed on the server." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
