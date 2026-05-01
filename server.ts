import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import next from "next";
import { attachQuizSocket } from "@/lib/realtime";
import { startKickChatListener } from "@/lib/kick-listener";

function loadDotenv() {
  const envPath = new URL("./.env", import.meta.url);
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const [key, ...rest] = trimmed.split("=");
    const value = rest.join("=");
    if (!process.env[key] && value !== undefined) {
      process.env[key] = value;
    }
  }
}

loadDotenv();

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 3000);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  attachQuizSocket(httpServer);
  startKickChatListener();

  httpServer.listen(port, hostname, () => {
    console.log(
      `> Kick Interactive Quiz Overlay hazır: http://${hostname}:${port}`,
    );
    console.log(
      `> KICK_CHANNEL_SLUG=${process.env.KICK_CHANNEL_SLUG ?? "<yok>"}`,
    );
    console.log(
      `> KICK_CHATROOM_ID=${process.env.KICK_CHATROOM_ID ?? "<yok>"}`,
    );
  });
});
