"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";
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
  leaderboard: []
};

export default function ResultsPage() {
  const [state, setState] = useState<QuizState>(initialState);
  const [hasLoadedState, setHasLoadedState] = useState(false);

  useEffect(() => {
    const socket = io({
      path: "/api/socket/io",
      transports: ["websocket", "polling"]
    });

    socket.on("quiz:state", (nextState: QuizState) => {
      setState(nextState);
      setHasLoadedState(true);
    });

    fetch("/api/socket")
      .then((response) => response.json())
      .then((data) => {
        setState(data.state);
        setHasLoadedState(true);
      })
      .catch(() => undefined);

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (hasLoadedState && (state.phase === "idle" || state.phase === "live")) {
      window.location.replace("/overlay");
    }
  }, [hasLoadedState, state.phase]);

  const podium = state.leaderboard.slice(0, 3);
  const rest = state.leaderboard.slice(3, 12);

  return (
    <main className="obs-transparent flex min-h-screen items-center justify-center p-10 text-white">
      <section className="w-full max-w-6xl overflow-hidden border border-gold/60 bg-[#090608]/92 shadow-gold backdrop-blur-md">
        <div className="h-2 bg-gradient-to-r from-crimson-600 via-gold to-emerald-300" />
        <div className="px-9 py-8">
          <div className="text-center">
            <p className="inline-flex items-center gap-3 text-sm font-bold uppercase tracking-[0.32em] text-gold">
              <Trophy className="size-5" /> Sonuçlar
            </p>
            <h1 className="mt-3 text-5xl font-black uppercase">Final Sıralaması</h1>
            <p className="mt-3 text-lg font-bold text-white/55">{Object.keys(state.participants).length} katılımcı</p>
          </div>

          <div className="mt-8 grid items-end gap-4 md:grid-cols-3">
            {podium.map((participant, index) => {
              const rank = index + 1;
              const isWinner = rank === 1;

              return (
                <motion.div
                  key={participant.username}
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.12 }}
                  className={`${isWinner ? "md:order-2 border-gold/70 bg-gold/15 py-8" : rank === 2 ? "md:order-1 border-white/15 bg-white/[0.06] py-5" : "md:order-3 border-white/15 bg-white/[0.06] py-5"} border px-5 text-center`}
                >
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-gold">#{rank}</p>
                  <p className="mt-2 truncate text-3xl font-black">{participant.username}</p>
                  <p className="mt-2 text-sm font-bold uppercase tracking-[0.18em] text-white/55">{participant.resultTitle}</p>
                  <p className="mt-4 text-5xl font-black text-gold">{participant.score}p</p>
                </motion.div>
              );
            })}
          </div>

          {rest.length > 0 && (
            <div className="mt-6 grid gap-2 md:grid-cols-2">
              {rest.map((participant, index) => (
                <motion.div
                  key={participant.username}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + index * 0.05 }}
                  className="flex items-center justify-between border border-white/10 bg-black/35 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-lg font-black">#{index + 4} {participant.username}</p>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{participant.resultTitle}</p>
                  </div>
                  <p className="shrink-0 text-2xl font-black">{participant.score}p</p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
