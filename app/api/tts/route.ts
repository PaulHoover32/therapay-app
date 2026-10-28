import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { AI_CONFIG } from "@/lib/ai/config";
import { checkCap, recordUsage } from "@/lib/usage";

export const runtime = "nodejs";

// GET tells the client whether server TTS is configured (otherwise it uses browser voices)
export async function GET() {
  return NextResponse.json({ available: Boolean(process.env.CARTESIA_API_KEY) });
}

const body = z.object({ text: z.string().min(1).max(AI_CONFIG.tts.maxChars) });

// POST { text } → audio/mpeg. Input is assistant output, which only ever contains [NAME] placeholders.
export async function POST(req: NextRequest) {
  const key = process.env.CARTESIA_API_KEY;
  if (!key) return NextResponse.json({ error: "TTS not configured" }, { status: 501 });

  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const characters = parsed.data.text.length;
  const capMessage = await checkCap(supabase, user.id, "tts", characters);
  if (capMessage) return NextResponse.json({ error: capMessage }, { status: 429 });

  const res = await fetch("https://api.cartesia.ai/tts/bytes", {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Cartesia-Version": AI_CONFIG.tts.apiVersion,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model_id: AI_CONFIG.tts.model,
      transcript: parsed.data.text,
      voice: { mode: "id", id: process.env.CARTESIA_VOICE_ID ?? AI_CONFIG.tts.defaultVoiceId },
      output_format: { container: "mp3", sample_rate: 44100, bit_rate: 128000 },
      language: "en",
    }),
  });
  if (!res.ok || !res.body) {
    console.error("Cartesia TTS failed:", res.status, await res.text().catch(() => ""));
    return NextResponse.json({ error: "TTS failed" }, { status: 502 });
  }
  await recordUsage(supabase, user.id, { kind: "tts", model: AI_CONFIG.tts.model, characters });
  return new Response(res.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
