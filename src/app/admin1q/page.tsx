"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Play,
  RotateCcw,
  Signal,
  Sparkles,
  Trophy,
} from "lucide-react";
import { io } from "socket.io-client";
import type { QuizState } from "@/lib/quiz-store";

const initialState: QuizState = {
  phase: "idle",
  activeQuestionIndex: 0,
  questions: [],
  votes: {},
  totals: [0, 0, 0],
  totalVotes: 0,
  participants: {},
  leaderboard: [],
};

export default function AdminPage() {
  const [state, setState] = useState<QuizState>(initialState);
  const [mockName, setMockName] = useState("Deniz");
  const [kickTarget, setKickTarget] = useState("Mock / admin oyları");
  const [isConnected, setIsConnected] = useState(false);

  const socket = useMemo(
    () =>
      io({
        path: "/api/socket/io",
        autoConnect: false,
        transports: ["websocket", "polling"],
      }),
    [],
  );

  useEffect(() => {
    socket.connect();
    socket.on("quiz:state", setState);
    socket.on("connect", () => setIsConnected(true));
    socket.on("disconnect", () => setIsConnected(false));

    fetch("/api/socket")
      .then((response) => response.json())
      .then((data) => {
        setState(data.state);
        setKickTarget(
          data.kick?.chatroomId
            ? `chatrooms.${data.kick.chatroomId}.v2`
            : (data.kick?.channelSlug ?? "Mock / admin oyları"),
        );
      })
      .catch(() => undefined);

    return () => {
      socket.disconnect();
    };
  }, [socket]);

  const question = state.questions[state.activeQuestionIndex];
  const participantCount = Object.keys(state.participants).length;
  const progressPercent = state.questions.length
    ? ((state.phase === "ended" || state.phase === "results"
        ? state.questions.length
        : state.activeQuestionIndex + 1) /
        state.questions.length) *
      100
    : 0;
  const phaseLabel =
    state.phase === "live"
      ? "Canlı Oylama"
      : state.phase === "results"
        ? "Sonuç Ekranı"
        : state.phase === "ended"
          ? "Test Tamamlandı"
          : "Hazır Bekliyor";
  const primaryAction =
    state.phase === "idle" ||
    state.phase === "ended" ||
    state.phase === "results"
      ? "Testi Başlat"
      : "Testi Yeniden Başlat";
  const canGoNext = state.phase === "live";

  function sendCommand(type: "start" | "next" | "resetVotes" | "showResults") {
    if (socket.connected) {
      socket.emit("admin:command", { type });
      return;
    }

    fetch("/api/socket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    }).catch(() => undefined);
  }

  function mockVote(answer: 1 | 2 | 3) {
    const username = `${mockName}-${Math.floor(Math.random() * 999)}`;
    socket.emit("admin:command", {
      type: "mockVote",
      username,
      message: `${answer}`,
    });
  }

  return (
    <main className="min-h-screen bg-[#050407] px-6 py-8 text-white">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col justify-between gap-5 border-b border-white/10 pb-6 md:flex-row md:items-end">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.28em] text-gold">
              <Signal className="size-4" /> Yayıncı Paneli
            </p>
            <h1 className="mt-2 text-4xl font-black">Kick Interactive Quiz</h1>
            <p className="mt-2 text-sm font-bold text-white/55">
              Admin komutları overlay ve chat istatistiklerine anında yansır.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <div
              className={`${state.phase === "live" ? "border-gold/80 bg-gold/15 shadow-gold" : "border-crimson-500/50 bg-crimson-900/30 shadow-glow"} border px-5 py-3 transition`}
            >
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
                Durum
              </p>
              <p className="text-2xl font-black">{phaseLabel}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.04] px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
                Soru
              </p>
              <p className="text-2xl font-black">
                {state.questions.length ? state.activeQuestionIndex + 1 : 0}/
                {state.questions.length}
              </p>
            </div>
            <div className="border border-white/10 bg-white/[0.04] px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
                Katılımcı
              </p>
              <p className="text-2xl font-black">{participantCount}</p>
            </div>
            <div className="border border-white/10 bg-white/[0.04] px-5 py-3">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
                Socket
              </p>
              <p
                className={`text-2xl font-black ${isConnected ? "text-emerald-300" : "text-crimson-500"}`}
              >
                {isConnected ? "Bağlı" : "Koptu"}
              </p>
            </div>
          </div>
        </header>

        <section className="mt-6 overflow-hidden border border-white/10 bg-white/[0.04]">
          <div className="flex flex-col justify-between gap-4 px-5 py-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">
                Akış Durumu
              </p>
              <p className="mt-1 text-lg font-black">
                {state.phase === "live"
                  ? `Test başladı: ${state.activeQuestionIndex + 1}. soru yayında`
                  : state.phase === "ended"
                    ? "Final tamamlandı; overlay /results sayfasına yönlendi"
                    : state.phase === "results"
                      ? "Sonuç ekranı /results sayfasında yayında"
                      : "Test henüz başlatılmadı"}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm font-bold text-white/60">
              <Activity className="size-4 text-gold" />
              {state.totalVotes} canlı oy ·{" "}
              {state.leaderboard[0]?.username
                ? `Lider ${state.leaderboard[0].username}`
                : "Lider bekleniyor"}
            </div>
          </div>
          <div className="h-2 bg-black/50">
            <motion.div
              className="h-full bg-gradient-to-r from-crimson-600 via-gold to-emerald-300"
              animate={{ width: `${Math.min(progressPercent, 100)}%` }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-white/10 bg-white/[0.04] p-6"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-bold uppercase tracking-[0.24em] text-gold">
                {question?.eyebrow ?? "Hazır"}
              </p>
              {state.phase === "live" && (
                <span className="inline-flex items-center gap-2 border border-emerald-300/40 bg-emerald-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-200">
                  <span className="size-2 animate-pulse rounded-full bg-emerald-300" />{" "}
                  Yayında
                </span>
              )}
            </div>
            <h2 className="mt-3 text-3xl font-black leading-tight">
              {question?.question ?? "Test henüz yükleniyor"}
            </h2>

            <div className="mt-6 space-y-3">
              {question?.answers.map((answer, index) => {
                const total = state.totals[index] ?? 0;
                const percent = state.totalVotes
                  ? Math.round((total / state.totalVotes) * 100)
                  : 0;

                return (
                  <div
                    key={answer}
                    className="border border-white/10 bg-black/35 p-4"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <span className="font-bold">
                        {index + 1} {answer}
                      </span>
                      <span className="font-black text-gold">
                        {percent}% · {total} oy ·{" "}
                        {index === question.correctAnswer ? "+3p" : "0p"}
                      </span>
                    </div>
                    <div className="mt-3 h-3 overflow-hidden bg-white/10">
                      <div
                        className="h-full bg-gradient-to-r from-crimson-600 to-gold transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <aside className="space-y-6">
            <div className="border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-black">Kontroller</h2>
              <div className="mt-5 grid gap-3">
                <button
                  onClick={() => sendCommand("start")}
                  className="flex items-center justify-between bg-crimson-600 px-5 py-4 text-left text-lg font-black transition hover:bg-crimson-500"
                >
                  <span>{primaryAction}</span>
                  <Play className="size-5" />
                </button>
                <button
                  onClick={() => sendCommand("next")}
                  disabled={!canGoNext}
                  className="flex items-center justify-between bg-gold px-5 py-4 text-left text-lg font-black text-black transition hover:bg-ember disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/35"
                >
                  <span>
                    {state.activeQuestionIndex + 1 >= state.questions.length
                      ? "Finale Geç"
                      : "Sıradaki Soruya Geç"}
                  </span>
                  <ArrowRight className="size-5" />
                </button>
                <button
                  onClick={() => sendCommand("resetVotes")}
                  disabled={state.phase !== "live"}
                  className="flex items-center justify-between border border-white/15 bg-black/40 px-5 py-4 text-left text-lg font-black transition hover:border-gold/70 disabled:cursor-not-allowed disabled:text-white/35"
                >
                  <span>Bu Sorunun Oylarını Sıfırla</span>
                  <RotateCcw className="size-5" />
                </button>
              </div>
              <p className="mt-4 border border-white/10 bg-black/30 px-4 py-3 text-sm font-bold text-white/60">
                {state.phase === "live"
                  ? "Test başladı; chat 1, 2, 3 yazarak bu soruya oy verebilir."
                  : state.phase === "ended"
                    ? "Final tamamlandı. Overlay /results sayfasına yönlendi."
                    : state.phase === "results"
                      ? "Sonuç sahnesi /results sayfasında yayında. Yeni test için başlat düğmesini kullan."
                      : "Overlay bekleme ekranında. Testi başlatınca canlı oylama görünür."}
              </p>
            </div>

            <div className="border border-white/10 bg-white/[0.04] p-6">
              <h2 className="text-xl font-black">Test Oyları</h2>
              <input
                value={mockName}
                onChange={(event) => setMockName(event.target.value)}
                className="mt-4 w-full border border-white/10 bg-black/40 px-4 py-3 font-bold outline-none focus:border-gold"
                placeholder="Test kullanıcı adı"
              />
              <div className="mt-3 grid grid-cols-3 gap-3">
                {[1, 2, 3].map((answer) => (
                  <button
                    key={answer}
                    onClick={() => mockVote(answer as 1 | 2 | 3)}
                    disabled={state.phase !== "live"}
                    className="border border-gold/40 bg-gold/10 py-4 text-xl font-black text-gold transition hover:bg-gold hover:text-black disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/30"
                  >
                    {answer}
                  </button>
                ))}
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.04] p-6">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Trophy className="size-5 text-gold" /> Canlı Liderlik
              </h2>
              <div className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
                {state.leaderboard.length === 0 && (
                  <p className="border border-white/10 bg-black/35 px-4 py-3 font-bold text-white/60">
                    Henüz puan alan yok.
                  </p>
                )}
                {state.leaderboard
                  .slice(0, state.phase === "results" ? 5 : 8)
                  .map((participant, index) => (
                    <div
                      key={participant.username}
                      className="border border-white/10 bg-black/35 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-black">
                            #{index + 1} {participant.username}
                          </p>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
                            {participant.resultTitle}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-2xl font-black">
                            {participant.score}p
                          </p>
                          <p className="text-xs font-bold text-white/50">
                            {participant.answeredCount}/18
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="border border-white/10 bg-white/[0.04] p-6">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <Sparkles className="size-5 text-gold" /> Yayın Bilgisi
              </h2>
              <p className="mt-3 break-all rounded-none bg-black/45 px-4 py-3 font-bold text-gold">
                http://127.0.0.1:3000/overlay
              </p>
              <p className="mt-2 break-all rounded-none bg-black/45 px-4 py-3 font-bold text-emerald-200">
                http://127.0.0.1:3000/results
              </p>
              <h3 className="mt-5 text-sm font-black uppercase tracking-[0.22em] text-white/45">
                Kick Hedefi
              </h3>
              <p className="mt-2 break-all rounded-none bg-black/45 px-4 py-3 font-bold text-white/80">
                {kickTarget}
              </p>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
