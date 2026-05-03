import { EventEmitter } from "node:events";

export type AnswerIndex = 0 | 1 | 2;

export type QuizQuestion = {
  id: string;
  eyebrow: string;
  question: string;
  voice?: boolean;
  answers: [string, string, string];
  points: [number, number, number];
  correctAnswer: AnswerIndex;
};

export type QuizPhase = "idle" | "live" | "ended" | "results";

export type ParticipantStats = {
  username: string;
  score: number;
  answeredCount: number;
  lastAnswer?: AnswerIndex;
  lastAnswerLabel?: string;
  lastAnsweredQuestionId?: string;
  resultTitle: string;
  accuracy: number;
};

export type QuizState = {
  phase: QuizPhase;
  activeQuestionIndex: number;
  questions: QuizQuestion[];
  votes: Record<string, AnswerIndex>;
  totals: [number, number, number];
  totalVotes: number;
  participants: Record<string, ParticipantStats>;
  leaderboard: ParticipantStats[];
  lastVote?: {
    username: string;
    answer: AnswerIndex;
    gainedPoints: number;
    at: number;
  };
};

type Store = {
  state: QuizState;
  events: EventEmitter;
};

const globalForQuiz = globalThis as typeof globalThis & {
  __kickQuizStore?: Store;
};

function createStore(): Store {
  return {
    events: new EventEmitter(),
    state: {
      phase: "idle",
      activeQuestionIndex: 0,
      questions: [],
      votes: {},
      totals: [0, 0, 0],
      totalVotes: 0,
      participants: {},
      leaderboard: [],
    },
  };
}

export const quizStore = globalForQuiz.__kickQuizStore ?? createStore();
globalForQuiz.__kickQuizStore = quizStore;

export function hydrateQuestions(questions: QuizQuestion[]) {
  const currentIds = quizStore.state.questions
    .map((question) => question.id)
    .join(",");
  const nextIds = questions.map((question) => question.id).join(",");

  if (currentIds !== nextIds) {
    quizStore.state = {
      ...quizStore.state,
      questions,
      activeQuestionIndex: Math.min(
        quizStore.state.activeQuestionIndex,
        Math.max(questions.length - 1, 0),
      ),
    };
  }
  emitQuizState();
}

export function getQuizState() {
  return quizStore.state;
}

export function startQuiz() {
  quizStore.state = {
    ...quizStore.state,
    phase: "live",
    activeQuestionIndex: 0,
    votes: {},
    totals: [0, 0, 0],
    totalVotes: 0,
    participants: {},
    leaderboard: [],
    lastVote: undefined,
  };
  emitQuizState();
  return quizStore.state;
}

export function nextQuestion() {
  const nextIndex = quizStore.state.activeQuestionIndex + 1;
  const hasNext = nextIndex < quizStore.state.questions.length;

  quizStore.state = {
    ...quizStore.state,
    phase: hasNext ? "live" : "ended",
    activeQuestionIndex: hasNext
      ? nextIndex
      : quizStore.state.activeQuestionIndex,
    votes: {},
    totals: [0, 0, 0],
    totalVotes: 0,
    leaderboard: buildLeaderboard(quizStore.state.participants),
    lastVote: undefined,
  };
  emitQuizState();
  return quizStore.state;
}

export function showResults() {
  quizStore.state = {
    ...quizStore.state,
    phase: "results",
    votes: {},
    totals: [0, 0, 0],
    totalVotes: 0,
    leaderboard: buildLeaderboard(quizStore.state.participants),
    lastVote: undefined,
  };
  emitQuizState();
  return quizStore.state;
}

export function resetQuestionVotes() {
  quizStore.state = {
    ...quizStore.state,
    votes: {},
    totals: [0, 0, 0],
    totalVotes: 0,
    lastVote: undefined,
  };
  emitQuizState();
  return quizStore.state;
}

export function registerVote(username: string, rawMessage: string) {
  if (quizStore.state.phase !== "live") {
    return false;
  }

  const activeQuestion =
    quizStore.state.questions[quizStore.state.activeQuestionIndex];
  if (!activeQuestion) {
    return false;
  }

  const command = rawMessage.trim().match(/^([1-3])\b/)?.[1];
  if (!command) {
    return false;
  }

  const answer = (Number(command) - 1) as AnswerIndex;
  const previous = quizStore.state.votes[username];
  const totals = [...quizStore.state.totals] as [number, number, number];

  if (previous !== undefined) {
    totals[previous] = Math.max(0, totals[previous] - 1);
  }

  totals[answer] += 1;

  const existingParticipant = quizStore.state.participants[username] ?? {
    username,
    score: 0,
    answeredCount: 0,
    resultTitle: getResultTitle(0, quizStore.state.questions.length),
    accuracy: 0,
  };
  const isCorrect = answer === activeQuestion.correctAnswer;
  const previousIsCorrect =
    previous !== undefined ? previous === activeQuestion.correctAnswer : false;
  const previousPoints = previousIsCorrect ? 3 : 0;
  const gainedPoints = isCorrect ? 3 : 0;
  const score = Math.max(
    0,
    existingParticipant.score - previousPoints + gainedPoints,
  );
  const answeredCount =
    previous === undefined
      ? existingParticipant.answeredCount + 1
      : existingParticipant.answeredCount;
  const participant: ParticipantStats = {
    ...existingParticipant,
    score,
    answeredCount,
    lastAnswer: answer,
    lastAnswerLabel: activeQuestion.answers[answer],
    lastAnsweredQuestionId: activeQuestion.id,
    resultTitle: getResultTitle(score, quizStore.state.questions.length),
    accuracy: Math.round(
      (score / getMaxScore(quizStore.state.questions.length)) * 100,
    ),
  };
  const participants = {
    ...quizStore.state.participants,
    [username]: participant,
  };

  quizStore.state = {
    ...quizStore.state,
    votes: {
      ...quizStore.state.votes,
      [username]: answer,
    },
    totals,
    totalVotes: Object.keys({ ...quizStore.state.votes, [username]: answer })
      .length,
    participants,
    leaderboard: buildLeaderboard(participants),
    lastVote: {
      username,
      answer,
      gainedPoints,
      at: Date.now(),
    },
  };

  emitQuizState();
  return true;
}

export function onQuizState(listener: (state: QuizState) => void) {
  quizStore.events.on("state", listener);
  return () => quizStore.events.off("state", listener);
}

function emitQuizState() {
  quizStore.events.emit("state", quizStore.state);
}

export function getMaxScore(questionCount: number) {
  return Math.max(1, questionCount * 3);
}

export function getResultTitle(score: number, questionCount: number) {
  const percent = (score / getMaxScore(questionCount)) * 100;

  if (percent >= 35) {
    return "Muhteşem Alevi";
  }

  if (percent >= 28) {
    return "Muhteşem Alevi Adayı";
  }

  if (percent >= 18) {
    return "Yarı Alevi";
  }

  if (percent >= 10) {
    return "Çeyrek Alevi";
  }

  return "PİS YOBAZ";
}

function buildLeaderboard(participants: Record<string, ParticipantStats>) {
  return Object.values(participants)
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      return second.answeredCount - first.answeredCount;
    })
    .slice(0, 20);
}
