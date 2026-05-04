"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Radio, Sparkles, Trophy, Vote } from "lucide-react";
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

export default function OverlayPage() {
  const [state, setState] = useState<QuizState>(initialState);
  const didRedirect = useRef(false);

  function goToResults() {
    if (didRedirect.current) {
      return;
    }

    didRedirect.current = true;
    window.location.replace("/results");

    window.setTimeout(() => {
      if (window.location.pathname !== "/results") {
        window.location.href = "/results";
      }
    }, 100);

    window.setTimeout(() => {
      if (window.location.pathname !== "/results") {
        window.open("/results", "_self");
      }
    }, 250);
  }

  useEffect(() => {
    const socket = io({
      path: "/api/socket/io",
      transports: ["websocket", "polling"],
    });

    socket.on("quiz:state", setState);
    socket.on("quiz:redirect", (path: string) => {
      if (path === "/results") {
        goToResults();
      }
    });

    fetch("/api/socket")
      .then((response) => response.json())
      .then((data) => setState(data.state))
      .catch(() => undefined);

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (state.phase === "results") {
      goToResults();
    }
  }, [state.phase]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      fetch("/api/socket")
        .then((response) => response.json())
        .then((data) => {
          if (data.state?.phase === "results") {
            goToResults();
          }
        })
        .catch(() => undefined);
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  const question = state.questions[state.activeQuestionIndex];
  const progress = state.questions.length ? state.activeQuestionIndex + 1 : 0;
  const progressPercent = state.questions.length
    ? (progress / state.questions.length) * 100
    : 0;
  const winningIndex = useMemo(() => {
    const max = Math.max(...state.totals);
    return state.totals.findIndex((total) => total === max && max > 0);
  }, [state.totals]);

  return (
    <main className="obs-transparent flex min-h-screen items-center justify-center p-10 text-white">
      <div className="w-full max-w-5xl">
        <AnimatePresence mode="wait">
          {state.phase === "idle" && (
            <motion.section
              key="idle"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              className="relative overflow-hidden border border-gold/50 bg-black/45 px-10 py-10 text-center shadow-glow backdrop-blur"
            >
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-crimson-600 via-gold to-crimson-600" />
              <p className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.32em] text-gold">
                <Sparkles className="size-5" /> Kick Quiz
              </p>
              <h1 className="mt-4 text-5xl font-black uppercase text-white">
                Test Başlatılmayı Bekliyor
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-xl font-semibold text-white/70">
                 Sorulara Katılmak için 1 2 3 yazarak
                chate katılabilirsiniz Örnek 1.soru A ise chate 1 ikinci soru b
                ise 2, 3 üncü soru c ise 3, yani 1 - A demek 2-B demek 3-C demek
                mala anlatır gibi anlatım
              </p>
              <div className="mx-auto mt-8 grid max-w-2xl grid-cols-3 gap-3 text-center">
                {["1", "2", "3"].map((command) => (
                  <div
                    key={command}
                    className="border border-white/10 bg-white/[0.06] px-4 py-4"
                  >
                    <p className="text-3xl font-black text-gold">{command}</p>
                    <p className="mt-1 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
                      Chat komutu
                    </p>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {state.phase === "ended" && (
            <motion.section
              key="ended"
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 0.98 }}
              className="relative overflow-hidden border border-gold/50 bg-black/45 px-10 py-10 text-center shadow-glow backdrop-blur"
            >
              <div className="absolute inset-x-0 top-0 h-2 bg-gradient-to-r from-crimson-600 via-gold to-crimson-600" />
              <p className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.32em] text-gold">
                <Trophy className="size-5" /> Test Tamamlandı
              </p>
              <h1 className="mt-4 text-5xl font-black uppercase text-white">
                Sonuçlar Hazırlanıyor
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-xl font-semibold text-white/70">
                Kısa bir süre sonra final sıralaması görüntülenecek.
              </p>
            </motion.section>
          )}

          {state.phase === "live" && question && (
            <motion.section
              key={question.id}
              initial={{ opacity: 0, x: 42, filter: "blur(8px)" }}
              animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, x: -42, filter: "blur(8px)" }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="overflow-hidden border border-crimson-500/60 bg-[#090608]/88 shadow-glow backdrop-blur-md"
            >
              <div className="h-2 bg-black/60">
                <motion.div
                  className="h-full bg-gradient-to-r from-crimson-600 via-gold to-emerald-300"
                  initial={false}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ type: "spring", stiffness: 90, damping: 18 }}
                />
              </div>
              <div className="px-9 py-8">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="inline-flex items-center gap-3 border border-emerald-300/40 bg-emerald-300/10 px-4 py-2 text-sm font-black uppercase tracking-[0.2em] text-emerald-200">
                    <span className="size-2 animate-pulse rounded-full bg-emerald-300" />
                    Canlı Oylama
                  </div>
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-white/55">
                    <Radio className="size-4 text-gold" />
                    Chat: 1 2 3
                  </div>
                </div>
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.34em] text-gold">
                      {question.eyebrow}
                    </p>
                    <h1 className="mt-3 text-4xl font-black leading-tight text-white md:text-5xl">
                      {question.question}
                    </h1>
                  </div>
                  {question.voice && (
                    <>
                      <audio controls autoPlay>
                        <source src="ısırgan.mp3" type="audio/ogg" />
                      </audio>
                    </>
                  )}

                  <div className="shrink-0 border border-gold/50 bg-gold/10 px-5 py-3 text-center">
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">
                      Soru
                    </p>
                    <p className="text-3xl font-black">
                      {progress}/{state.questions.length}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="border border-white/10 bg-black/35 px-4 py-3">
                    <p className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                      <Vote className="size-3 text-gold" /> Bu Soru
                    </p>
                    <p className="text-2xl font-black">{state.totalVotes} oy</p>
                  </div>
                  <div className="border border-white/10 bg-black/35 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                      Katılımcı
                    </p>
                    <p className="text-2xl font-black">
                      {Object.keys(state.participants).length}
                    </p>
                  </div>
                  <div className="border border-white/10 bg-black/35 px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/50">
                      Lider
                    </p>
                    <p className="truncate text-2xl font-black">
                      {state.leaderboard[0]?.username ?? "-"}
                    </p>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {question.answers.map((answer, index) => {
                    const total = state.totals[index] ?? 0;
                    const percent = state.totalVotes
                      ? Math.round((total / state.totalVotes) * 100)
                      : 0;
                    const isWinning = winningIndex === index;

                    return (
                      <motion.div
                        key={answer}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="relative overflow-hidden border border-white/12 bg-white/[0.06]"
                      >
                        <motion.div
                          className={`absolute inset-y-0 left-0 ${
                            isWinning
                              ? "bg-gradient-to-r from-crimson-600 via-crimson-500 to-gold"
                              : "bg-gradient-to-r from-crimson-900 to-crimson-600"
                          }`}
                          initial={false}
                          animate={{ width: `${percent}%` }}
                          transition={{
                            type: "spring",
                            stiffness: 90,
                            damping: 18,
                          }}
                        />
                        <div className="relative flex min-h-20 items-center justify-between gap-5 px-5 py-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <span className="flex size-12 shrink-0 items-center justify-center border border-gold/60 bg-black/50 text-xl font-black text-gold">
                              {index + 1}
                            </span>
                            <span className="text-2xl font-extrabold leading-tight text-white">
                              {answer}
                            </span>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-3xl font-black text-white">
                              {percent}%
                            </p>
                            <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">
                              {total} oy ·{" "}
                              {index === question.correctAnswer ? "" : ""}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {state.lastVote && (
                    <motion.div
                      key={`${state.lastVote.username}-${state.lastVote.at}`}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-5 inline-flex border border-gold/40 bg-black/35 px-4 py-2 text-sm font-bold text-gold"
                    >
                      Son oy: {state.lastVote.username} →{" "}
                      {state.lastVote.answer + 1} (+
                      {state.lastVote.gainedPoints})
                    </motion.div>
                  )}
                </AnimatePresence>

                {state.activeQuestionIndex === state.questions.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-5 flex justify-center"
                  ></motion.div>
                )}

                <div className="mt-6 grid grid-cols-5 gap-2">
                  {state.leaderboard.slice(0, 5).map((participant, index) => (
                    <motion.div
                      key={participant.username}
                      layout
                      className={`${index === 0 ? "border-gold/60 bg-gold/10" : "border-white/10 bg-black/30"} border px-3 py-2`}
                    >
                      <p className="truncate text-sm font-black text-gold">
                        #{index + 1} {participant.username}
                      </p>
                      <p className="text-lg font-black">{participant.score}p</p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
