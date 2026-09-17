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

  function extractJson(text: string) {
    let t = text.trim();
    if (t.includes("```json")) {
      t = t.split("```json")[1].split("```")[0];
    } else if (t.includes("```")) {
      t = t.split("```")[1].split("```")[0];
    }
    return JSON.parse(t.trim());
  }

  // AI-powered hairstyle & color recommendation for a specific customer
  app.post("/api/ai/style-recommendation", async (req, res) => {
    try {
      const { customerName, gender, tags, memo, recentServices } = req.body;

      const prompt = `
        당신은 대한민국 1인 미용실을 운영하는 실력 있는 헤어 디자이너를 돕는 전문 스타일 컨설턴트입니다.
        아래 고객 정보를 바탕으로, 원장님이 상담 시 바로 활용할 수 있는 맞춤 헤어 스타일/컬러 추천 3가지를 제안해주세요.

        [고객 정보]
        - 이름: ${customerName}
        - 성별: ${gender}
        - 고객 태그/특징: ${(tags || []).join(", ") || "없음"}
        - 메모: ${memo || "없음"}
        - 최근 받은 시술: ${recentServices || "정보 없음"}

        실제 미용실에서 쓰는 전문 용어(펌 종류, 컬러 톤, 커트 라인 등)를 사용하되, 고객에게 설명하기 쉬운 친절한 존댓말로 작성해주세요.
        각 추천은 왜 이 고객에게 잘 어울리는지 근거를 함께 제시해야 합니다.

        아래 JSON 형식으로만 응답하세요:
        {
          "recommendations": [
            { "title": "스타일/컬러 이름 (예: 애쉬 브라운 그러데이션 염색)", "description": "구체적인 시술 방법과 스타일 설명 2-3문장", "whyItFits": "이 고객에게 어울리는 이유 1-2문장" },
            { "title": "...", "description": "...", "whyItFits": "..." },
            { "title": "...", "description": "...", "whyItFits": "..." }
          ]
        }
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", temperature: 0.9 }
      });

      res.json(extractJson(response.text ?? ""));
    } catch (error) {
      console.error("AI Style Recommendation Error:", error);
      res.status(500).json({ error: "스타일 추천 생성에 실패했습니다." });
    }
  });

  // AI-generated reminder / birthday / confirmation message for a customer
  app.post("/api/ai/reminder-message", async (req, res) => {
    try {
      const { customerName, occasion, shopName, ownerName, extra } = req.body;

      const prompt = `
        당신은 대한민국 1인 미용실 원장님을 대신해 단골 고객에게 보낼 문자(카카오톡) 메시지를 작성하는 전문 카피라이터입니다.

        [상황]
        - 메시지 목적: ${occasion}
        - 고객 이름: ${customerName}
        - 샵 이름: ${shopName}
        - 원장님 이름: ${ownerName}
        - 추가 요청/참고사항: ${extra || "없음"}

        따뜻하고 친근하지만 과하지 않은 존댓말로, 이모지를 1-2개만 적절히 사용해서 실제 문자 메시지로 바로 보낼 수 있는 길이(3~5문장)로 작성해주세요.
        고객 이름을 자연스럽게 포함하고, 샵 이름과 원장님 이름으로 마무리 인사를 해주세요.

        아래 JSON 형식으로만 응답하세요:
        { "message": "완성된 문자 메시지 전문" }
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json", temperature: 0.95 }
      });

      res.json(extractJson(response.text ?? ""));
    } catch (error) {
      console.error("AI Reminder Message Error:", error);
      res.status(500).json({ error: "메시지 생성에 실패했습니다." });
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
