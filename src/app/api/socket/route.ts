import { NextResponse } from "next/server";
import { alevilikQuiz } from "@/data/alevilik-quiz";
import { getQuizState, hydrateQuestions, registerVote } from "@/lib/quiz-store";
import { handleAdminCommand } from "@/lib/realtime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

hydrateQuestions(alevilikQuiz);

export async function GET() {
  return NextResponse.json({
    ok: true,
    socketPath: "/api/socket/io",
    kick: {
      channelSlug: process.env.KICK_CHANNEL_SLUG ?? null,
      chatroomId: process.env.KICK_CHATROOM_ID ?? null,
      pusherKey: process.env.KICK_PUSHER_KEY ?? "32cbd69e4b950bf97679",
    },
    state: getQuizState(),
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (body.type === "vote") {
    registerVote(body.username ?? "manual-viewer", body.message ?? "");
    return NextResponse.json({ ok: true, state: getQuizState() });
  }

  const state = handleAdminCommand(body);
  return NextResponse.json({ ok: true, state });
}
