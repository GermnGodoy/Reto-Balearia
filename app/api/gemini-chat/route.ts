import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI, type Content } from "@google/generative-ai";

export const runtime = "nodejs";        // avoid Edge runtime issues
export const dynamic = "force-dynamic"; // don’t cache this route

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

const MODEL_NAME = "gemini-2.5-flash";

// cache the client across hot reloads
let cachedClient: GoogleGenerativeAI | null = null;

function ensureClient() {
  if (!cachedClient) {
    const apiKey = "YOUR-GEMINI-API-KEY"; //Delete API
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
    cachedClient = new GoogleGenerativeAI(apiKey);
  }
  return cachedClient;
}

// Gemini expects roles "user" | "model"
const toGeminiRole = (role: ChatMessage["role"]): "user" | "model" =>
  role === "assistant" ? "model" : "user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const messages = Array.isArray(body?.messages)
      ? (body.messages as ChatMessage[])
      : null;

    const systemPrompt =
      typeof body?.systemPrompt === "string" && body.systemPrompt.trim()
        ? (body.systemPrompt as string).trim()
        : undefined;

    if (!messages?.length) {
      return NextResponse.json(
        { error: "messages array is required." },
        { status: 400 }
      );
    }

    const nonEmpty = messages.filter(
      (m) => typeof m?.content === "string" && m.content.trim().length
    );
    if (!nonEmpty.length) {
      return NextResponse.json(
        { error: "All messages were empty." },
        { status: 400 }
      );
    }

    const genAI = ensureClient();
    const model = genAI.getGenerativeModel({
      model: MODEL_NAME,
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    });

    const contents: Content[] = nonEmpty.map((m) => ({
      role: toGeminiRole(m.role),
      parts: [{ text: m.content.trim() }],
    }));

    const result = await model.generateContent({ contents });
    const reply = result.response.text().trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Gemini returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("[gemini-chat] request failed:", err);

    // Surface missing key explicitly
    // if (err instanceof Error && /Missing GEMINI_API_KEY/.test(err.message)) {
    //   return NextResponse.json(
    //     { error: "GEMINI_API_KEY is not set on the server." },
    //     { status: 500 }
    //   );
    // }

    const details =
      process.env.NODE_ENV !== "production" && err instanceof Error
        ? err.message
        : undefined;

    return NextResponse.json(
      { error: "Unexpected server error while contacting Gemini.", details },
      { status: 500 }
    );
  }
}
