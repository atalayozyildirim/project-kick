import WebSocket from "ws";
import { registerVote } from "@/lib/quiz-store";

type KickChatPayload = {
  content?: string;
  sender?: {
    username?: string;
  };
};

const DEFAULT_PUSHER_KEY = "32cbd69e4b950bf97679";

export async function startKickChatListener() {
  const chatroomId = "25320051";

  if (!chatroomId) {
    console.log(
      "[kick] KICK_CHATROOM_ID veya KICK_CHANNEL_SLUG yok; mock/admin oyları aktif.",
    );
    return;
  }

  const pusherKey = process.env.KICK_PUSHER_KEY ?? DEFAULT_PUSHER_KEY;
  const url = `wss://ws-us2.pusher.com/app/${pusherKey}?protocol=7&client=js&version=8.4.0&flash=false`;

  let reconnectTimer: NodeJS.Timeout | undefined;

  const connect = () => {
    const ws = new WebSocket(url);

    ws.on("open", () => {
      console.log(`[kick] chatrooms.${chatroomId}.v2 dinleniyor`);
      ws.send(
        JSON.stringify({
          event: "pusher:subscribe",
          data: {
            auth: "",
            channel: `chatrooms.${chatroomId}.v2`,
          },
        }),
      );
    });

    ws.on("message", (raw) => {
      try {
        const event = JSON.parse(raw.toString());
        if (event.event !== "App\\Events\\ChatMessageEvent") {
          return;
        }

        const data = JSON.parse(event.data) as KickChatPayload;
        const username = data.sender?.username ?? "kick-viewer";
        const content = data.content ?? "";
        registerVote(username, content);
      } catch (error) {
        console.warn("[kick] mesaj parse edilemedi", error);
      }
    });

    ws.on("close", () => {
      reconnectTimer = setTimeout(connect, 2500);
    });

    ws.on("error", (error) => {
      console.warn("[kick] websocket hatası", error.message);
      ws.close();
    });
  };

  connect();

  process.on("SIGTERM", () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
    }
  });
}

async function resolveChatroomId() {
  if (process.env.KICK_CHATROOM_ID) {
    return process.env.KICK_CHATROOM_ID;
  }

  const slug = process.env.KICK_CHANNEL_SLUG;
  if (!slug) {
    return undefined;
  }

  try {
    const response = await fetch(
      `https://kick.com/api/v2/channels/${slug}/chatroom`,
    );
    if (!response.ok) {
      throw new Error(`Kick API ${response.status}`);
    }

    const data = (await response.json()) as { id?: number | string };
    console.log(data.id);
    return data.id?.toString();
  } catch (error) {
    console.warn("[kick] chatroom id çözülemedi", error);
    return undefined;
  }
}
