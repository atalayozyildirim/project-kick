import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { alevilikQuiz } from "@/data/alevilik-quiz";
import {
  getQuizState,
  hydrateQuestions,
  nextQuestion,
  onQuizState,
  registerVote,
  resetQuestionVotes,
  showResults,
  startQuiz,
} from "@/lib/quiz-store";

type ClientCommand =
  | { type: "start" }
  | { type: "next" }
  | { type: "showResults" }
  | { type: "resetVotes" }
  | { type: "mockVote"; username?: string; message: string };

const globalForRealtime = globalThis as typeof globalThis & {
  __kickQuizIo?: Server;
  __kickQuizResultsTimer?: NodeJS.Timeout;
};

export function attachQuizSocket(httpServer: HttpServer) {
  hydrateQuestions(alevilikQuiz);

  if (globalForRealtime.__kickQuizIo) {
    return globalForRealtime.__kickQuizIo;
  }

  const io = new Server(httpServer, {
    path: "/api/socket/io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  globalForRealtime.__kickQuizIo = io;

  io.on("connection", (socket) => {
    socket.emit("quiz:state", getQuizState());

    socket.on("admin:command", (command: ClientCommand) => {
      handleAdminCommand(command);
    });
  });

  onQuizState((state) => {
    io.emit("quiz:state", state);
  });

  return io;
}

export function emitQuizState() {
  globalForRealtime.__kickQuizIo?.emit("quiz:state", getQuizState());
}

export function handleAdminCommand(command: ClientCommand) {
  if (command.type === "start") {
    clearResultsTimer();
    startQuiz();
  }

  if (command.type === "next") {
    clearResultsTimer();
    const state = nextQuestion();
    if (state.phase === "ended") {
      globalForRealtime.__kickQuizResultsTimer = setTimeout(() => {
        showResults();
        broadcastResultsRedirect();
      }, 5000);
    }
  }

  if (command.type === "showResults") {
    clearResultsTimer();
    showResults();
  }

  if (command.type === "resetVotes") {
    resetQuestionVotes();
  }

  if (command.type === "mockVote") {
    registerVote(command.username ?? `test-${Date.now()}`, command.message);
  }

  emitQuizState();
  return getQuizState();
}

function clearResultsTimer() {
  if (globalForRealtime.__kickQuizResultsTimer) {
    clearTimeout(globalForRealtime.__kickQuizResultsTimer);
    globalForRealtime.__kickQuizResultsTimer = undefined;
  }
}

function broadcastResultsRedirect() {
  const io = globalForRealtime.__kickQuizIo;
  if (!io) {
    return;
  }

  io.emit("quiz:redirect", "/results");

  for (const delay of [250, 750, 1500, 2500]) {
    setTimeout(() => {
      if (getQuizState().phase === "results") {
        io.emit("quiz:redirect", "/results");
      }
    }, delay);
  }
}
