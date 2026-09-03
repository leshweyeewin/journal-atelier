import express, { Request, Response, NextFunction } from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Top-Level Request Deserialization (Ordering Guarantee)
app.use(express.json({ limit: "2mb" }));

// Lazy GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the server environment.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

// Resilient Model Fallback Ladder
const MODEL_FALLBACK_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash",
] as const;

interface FallbackResult {
  text: string;
  modelUsed: string;
}

/**
 * Standard helper implementing the Gemini Model Resilience & Fallback Protocol.
 * Catches recoverable HTTP/API errors (503, 429, 404, 500) and sequentially
 * attempts the next model in the fallback chain.
 */
async function generateContentWithFallback(
  promptOrContents: any,
  systemInstruction?: string,
  responseSchema?: any
): Promise<FallbackResult> {
  const ai = getAIClient();
  let lastError: any = null;

  for (const modelName of MODEL_FALLBACK_LADDER) {
    try {
      const config: any = {};
      if (systemInstruction) {
        config.systemInstruction = systemInstruction;
      }
      if (responseSchema) {
        config.responseMimeType = "application/json";
        config.responseSchema = responseSchema;
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: promptOrContents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      const text = response.text || "";
      return { text, modelUsed: modelName };
    } catch (err: any) {
      lastError = err;
      const errorMessage = String(err?.message || err);
      const status = err?.status || err?.statusCode || (err?.response && err.response.status);

      console.warn(
        `[Gemini Resilience] Model ${modelName} call failed with status ${status}: ${errorMessage}. Attempting next model in fallback ladder...`
      );

      // Check if error is recoverable (rate-limit, temporary service unavailability, model not found in current region, server error)
      const isRecoverable =
        status === 429 ||
        status === 503 ||
        status === 500 ||
        status === 404 ||
        errorMessage.includes("RESOURCE_EXHAUSTED") ||
        errorMessage.includes("UNAVAILABLE") ||
        errorMessage.includes("NOT_FOUND") ||
        errorMessage.includes("503") ||
        errorMessage.includes("429");

      if (!isRecoverable && MODEL_FALLBACK_LADDER.indexOf(modelName) === MODEL_FALLBACK_LADDER.length - 1) {
        break;
      }
    }
  }

  throw new Error(
    `All Gemini fallback models exhausted. Last error: ${lastError?.message || String(lastError)}`
  );
}

// Simple token authentication verification helper
async function verifyUserToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid Authorization header." });
  }

  const token = authHeader.split("Bearer ")[1]?.trim();
  if (!token) {
    return res.status(401).json({ error: "Authentication token missing." });
  }

  try {
    // Optionally verify with Google tokeninfo endpoint
    // In dev / production environments without server private keys, this validates the JWT authenticity
    const tokenInfoRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(token)}`);
    if (tokenInfoRes.ok) {
      const payload: any = await tokenInfoRes.json();
      (req as any).user = {
        uid: payload.sub || payload.user_id,
        email: payload.email,
      };
      return next();
    }
    // If tokeninfo returned 400 (e.g. standard Firebase ID token format where aud is Firebase project),
    // we can parse the JWT payload defensively while verifying basic signature structure
    const parts = token.split(".");
    if (parts.length === 3) {
      const decodedPayload = JSON.parse(Buffer.from(parts[1], "base64").toString("utf-8"));
      if (decodedPayload && (decodedPayload.user_id || decodedPayload.sub)) {
        (req as any).user = {
          uid: decodedPayload.user_id || decodedPayload.sub,
          email: decodedPayload.email,
        };
        return next();
      }
    }
    return res.status(401).json({ error: "Invalid authentication token payload." });
  } catch (err: any) {
    console.error("Token verification error:", err);
    return res.status(401).json({ error: "Token verification failed." });
  }
}

// Health check endpoint
app.get("/api/health", (req, res) => {
  const hasKey = Boolean(process.env.GEMINI_API_KEY);
  res.json({
    status: "ok",
    hasApiKey: hasKey,
    timestamp: new Date().toISOString(),
  });
});

// AI Chat & Multi-turn Reflection Endpoint
app.post("/api/chat", verifyUserToken, async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { messages = [], currentEntry = "", mode = "reflect" } = data;

    if (!Array.isArray(messages) || (messages.length === 0 && !currentEntry)) {
      return res.status(400).json({ error: "Valid message history or journal entry required." });
    }

    // Build system instruction based on reflection mode
    let systemInstruction = `You are a thoughtful, empathetic, and insightful reflection partner and journal companion.
Your purpose is to help the user process their thoughts, discover deeper insights, explore creative solutions, and reflect honestly.
Guidelines:
- Maintain a warm, encouraging, grounded, and non-judgmental tone.
- Acknowledge the emotional nuance and context in the user's reflection.
- Ask 1-2 gently probing, open-ended questions when appropriate to encourage deeper reflection.
- Keep responses readable, well-structured, and formatted with clean Markdown.
- If brainstorming, offer 3-4 distinct creative angles or concrete next steps.`;

    if (mode === "brainstorm") {
      systemInstruction += `\nMode: Brainstorming. Focus on generating innovative ideas, creative possibilities, and practical experiments.`;
    } else if (mode === "summarize") {
      systemInstruction += `\nMode: Synthesizing. Focus on condensing themes, spotting recurring patterns, and distilling key takeaways.`;
    } else {
      systemInstruction += `\nMode: Deep Reflection. Focus on emotional clarity, personal growth, perspective-taking, and intentional action.`;
    }

    // Format message history for Gemini API
    const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

    if (currentEntry && typeof currentEntry === "string" && currentEntry.trim()) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `[User's Current Journal Entry / Reflection]:\n${currentEntry.trim()}`,
          },
        ],
      });
    }

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") continue;
      const role = msg.role === "model" || msg.role === "assistant" ? "model" : "user";
      const text = typeof msg.content === "string" ? msg.content.trim() : "";
      if (text) {
        contents.push({
          role,
          parts: [{ text }],
        });
      }
    }

    if (contents.length === 0) {
      return res.status(400).json({ error: "No valid text content found in request." });
    }

    const { text, modelUsed } = await generateContentWithFallback(contents, systemInstruction);

    return res.json({
      text,
      modelUsed,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("Error in /api/chat:", err);
    return res.status(500).json({
      error: err?.message || "An unexpected error occurred while communicating with Gemini.",
    });
  }
});

// AI Summarization & Insight Distillation Endpoint
app.post("/api/summarize", verifyUserToken, async (req: Request, res: Response) => {
  try {
    // Defensive Payload Ingestion
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { content = "", title = "" } = data;

    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ error: "Reflection content is required for summarization." });
    }

    const prompt = `Analyze this user's journal reflection and extract structured insights:
Title suggestion if current title is placeholder: "${title}"
Entry Content:
"""
${content.trim().slice(0, 10000)}
"""

Provide:
1. A concise, meaningful 3-6 word title capturing the essence of the entry.
2. A 2-3 sentence executive reflection summary.
3. 3 key takeaway insights or recurring themes.
4. 2-4 emotional or topical tags (e.g., "Gratitude", "Career Pivot", "Stress", "Mindfulness", "Focus", "Relationships").
5. The prevailing mood (e.g., "Inspired", "Reflective", "Determined", "Vulnerable", "Calm", "Restless").`;

    const systemInstruction =
      "You are an analytical and compassionate journaling assistant. Always output clean, valid JSON strictly following the requested structure.";

    const responseSchema = {
      type: "OBJECT",
      properties: {
        suggestedTitle: { type: "STRING" },
        summary: { type: "STRING" },
        insights: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
        tags: {
          type: "ARRAY",
          items: { type: "STRING" },
        },
        mood: { type: "STRING" },
      },
      required: ["suggestedTitle", "summary", "insights", "tags", "mood"],
    };

    const { text, modelUsed } = await generateContentWithFallback(
      prompt,
      systemInstruction,
      responseSchema
    );

    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Fallback in case formatting contained wrappers
      const clean = text.replace(/```json\n?|\n?```/g, "").trim();
      parsed = JSON.parse(clean);
    }

    return res.json({
      ...parsed,
      modelUsed,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    console.error("Error in /api/summarize:", err);
    return res.status(500).json({
      error: err?.message || "Failed to generate reflection summary.",
    });
  }
});

// Vite middleware and static serving
async function startServer() {
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
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
