import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize Gemini
  const genAI = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY || "",
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Routes
  app.post("/api/ai/brand-package", async (req, res) => {
    try {
      const { productName, productInfo, brandTone } = req.body;
      
      const prompt = `
        You are a premium local brand growth specialist. 
        Create a branding package for a product called "${productName}" with the following info: "${productInfo}".
        The brand tone should be "${brandTone}".
        
        Provide the following in JSON format:
        1. tagline: A short, poetic tagline.
        2. story: A 3-sentence brand story emphasizing artisan craftsmanship and local heritage.
        3. details: A set of 3 key selling points.
        4. marketingCopy: A short paragraph for an Instagram caption.
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      
      let text = response.text;
      
      // Basic JSON extraction if model wraps it in markdown
      if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0];
      } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0];
      }

      res.json(JSON.parse(text));
    } catch (error) {
      console.error("AI Error:", error);
      res.status(500).json({ error: "Failed to generate brand package" });
    }
  });

  // Detailed Page copywriter endpoint
  app.post("/api/ai/detail-page", async (req, res) => {
    try {
      const { productName, productType, persona, prompt } = req.body;
      
      const promptText = `
        You are the absolute finest premium South Korean "Local Commerce Brand Designer & Copywriter".
        Your client is a skilled local craftsman or hand-maker, and you are building a boutique, premium product detailed page (상세페이지) focused on design-conscious customers.
        The layout must evoke local heritage, natural textures, and meticulous craft.
        
        [Target Authentic Product]:
        - Product Name: ${productName}
        - Category/Type: ${productType}
        - Target Persona: ${persona}
        - Aesthetic Mood Direction & Instructions: ${prompt || "Elegant and whisper-soft organic mood."}
        
        Create a detailed article-style page layout with exact Korean copy. The output MUST be in high-end, poetic, emotional South Korean marketing prose (matching the luxurious look of 29CM, Rawrow, or Market Kurly).
        Your prose must be sophisticated, respectful (존댓말), and use refined vocabulary (e.g. '숨결', '빚어내다', '결', '온기').
        
        Return the copy as a single JSON object. The JSON structure MUST contain these exact key names:
        {
          "intro": {
            "title": "Poetic main display headline, reflecting natural origins (e.g., '눈 덮인 고요 속에 피어난 매실 한 머금' or '대나무 마디마다 새겨진 연둣빛 바람')",
            "subtitle": "Short, elegant, modern description (e.g., '숨쉬는 유기 백자 속에 담은 완도 전복의 부드러움')",
            "summary": "1-paragraph deep ambient summary (3-4 poetic sentences) welcoming the reader into the aesthetic world of this product."
          },
          "legacy_story": {
            "headline": "A headline explaining the craftsmanship process and the artisan's philosophy (e.g., '15가지 약초가 완성한 황금 조율, 그리고 세 번의 저온 숙성')",
            "narrative": "A warm, deeply respectful 4-sentence narrative in Korean describing the artisan's environment, raw ingredient collection, and time-consuming handiwork."
          },
          "sensory_profile": {
            "visual": "A brief poetic description of its natural visual color, grain, texture, or shape.",
            "touch_text": "Sensory explanation of how it feels on the skin, smells, or tastes.",
            "atmosphere": "The silent mood, space warmth, or physical peace it introduces when placed in a beautiful home."
          },
          "features": [
            {
              "number": "01",
              "title": "A short poetic feature name (e.g., '바람과 일교차가 완성한 단단한 치밀함')",
              "explain": "A block of 2-3 sentences explaining the first feature value with design focus."
            },
            {
              "number": "02",
              "title": "Another short poetic feature name (e.g., '시간이 갈수록 은은함을 더하는 자연 유래 옻칠')",
              "explain": "A block of 2-3 sentences explaining the second feature value."
            },
            {
              "number": "03",
              "title": "A third short poetic feature name",
              "explain": "A block of 2-3 sentences explaining the third feature value."
            }
          ],
          "lifestyle_matching": {
            "headline": "A matching scenario title tailored specifically for the persona (e.g., '오롯이 나다운 휴식을 수집하는 수집가를 위해')",
            "matching_points": [
              "Poetic lifestyle matching point 1 suited to the persona's daily routine",
              "Poetic lifestyle matching point 2",
              "Poetic lifestyle matching point 3"
            ]
          },
          "guide": {
            "usage": "Highly refined ritual guide on how to consume, wear, burn, or operate this product (e.g., '오후 4시의 미온수에 가볍게 한 스푼 개어내어')",
            "storage": "Careful storage instructions to keep natural fibers, live organic matter, or raw clays intact (e.g., '생명이 숨쉬는 옹기 항아리째 냉장고 가장 깊은 곳에')"
          }
        }
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: promptText }] }],
        config: { 
          responseMimeType: "application/json",
          temperature: 0.95
        }
      });
      
      let text = response.text;
      if (text.includes("```json")) {
        text = text.split("```json")[1].split("```")[0];
      } else if (text.includes("```")) {
        text = text.split("```")[1].split("```")[0];
      }

      res.json(JSON.parse(text.trim()));
    } catch (error) {
      console.error("AI Detailed Page Error:", error);
      res.status(500).json({ error: "Failed to generate detailed page copy" });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
