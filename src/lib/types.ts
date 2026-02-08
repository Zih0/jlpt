export interface KanjiBreakdownItem {
  char: string;
  /**
   * 예: "희미할 애"
   * (뜻 + 공백 + 음)
   */
  gloss: string;
}

export interface VocabularyItem {
  id: string;
  word: string;
  reading: string;
  meaning: string;
  kanjiBreakdown: KanjiBreakdownItem[];
  partOfSpeech: string;
  exampleSentence: string;
  exampleSentenceReading: string;
  exampleSentenceMeaning: string;
  category: string;
  frequencyRank: number;
  pitchAccent?: number; // 0=平板, 1=頭高, 2+=中高/尾高 (accent on nth mora)
}

export interface GrammarPattern {
  id: string;
  pattern: string;
  meaning: string;
  formation: string;
  functionGroup: string;
  examples: {
    japanese: string;
    reading: string;
    translation: string;
  }[];
  similarPatterns: string[];
  notes: string;
  writingPrompt?: string; // Korean writing prompt suggestion
}

export interface ReadingPassage {
  id: string;
  title: string;
  content: string;
  difficulty: "short" | "medium" | "long";
  category: string;
  questions: {
    id: string;
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
  }[];
  wordCount: number;
  estimatedMinutes: number;
}

export interface ReviewCard {
  id: string;
  contentType: "vocabulary" | "grammar" | "listening";
  contentId: string;
  easeFactor: number;
  interval: number;
  repetitions: number;
  dueDate: string;
  lastReviewDate: string;
  totalReviews: number;
  totalCorrect: number;
  lastIncorrectDate: string; // ISO date string, "" if never incorrect
}

export interface UserSettings {
  dailyNewVocab: number;
  dailyNewGrammar: number;
  dailyNewListening: number;
  streakCount: number;
  lastStudyDate: string;
  autoPlayAudio: boolean;
}

export interface StudySession {
  id: string;
  date: string;
  module: "vocabulary" | "grammar" | "reading" | "listening";
  cardsReviewed: number;
  cardsCorrect: number;
  newCardsStudied: number;
}

export interface ReadingProgress {
  passageId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
}

export interface ListeningVideo {
  id: string;
  videoId: string;
  title: string;
  channelTitle: string;
  expressions: ListeningExpression[];
  subtitles?: ListeningSubtitle[];
}

export interface ListeningSubtitle {
  text: string;
  startTime: number;
}

export interface ListeningExpression {
  expression: string;
  expressionReading: string;
  meaning: string;
  example: string;
  exampleReading: string;
  exampleTranslation: string;
  startTime: number;
  vocabulary: {
    word: string;
    reading: string;
    meaning: string;
  }[];
}

export type SRSRating = 0 | 3 | 4 | 5;

export type SRSStage = "new" | "learning" | "review" | "mature";

export function getSRSStage(card: ReviewCard): SRSStage {
  if (card.repetitions === 0 && card.interval === 0) return "new";
  if (card.interval < 7) return "learning";
  if (card.interval < 21) return "review";
  return "mature";
}

export const stageBadgeStyle: Record<SRSStage, { bg: string; color: string }> = {
  new: { bg: "var(--primary-light)", color: "var(--primary)" },
  learning: { bg: "var(--accent-light)", color: "var(--accent)" },
  review: { bg: "var(--error-light)", color: "var(--warning)" },
  mature: { bg: "var(--success-light)", color: "var(--success)" },
};

export const stageLabel: Record<SRSStage, string> = {
  new: "신규",
  learning: "학습중",
  review: "복습",
  mature: "완료",
};

export function isStruggling(card: ReviewCard): boolean {
  return card.totalReviews >= 3 && card.totalCorrect / card.totalReviews < 0.6;
}

export const difficultyLabel: Record<"short" | "medium" | "long", string> = {
  short: "단문",
  medium: "중문",
  long: "장문",
};

export const categoryLabel: Record<string, string> = {
  society: "사회",
  culture: "문화",
  science: "과학",
  philosophy: "사상",
  economics: "경제",
  environment: "환경",
  linguistics: "언어",
};

export function formatRelativeDate(dateStr: string): string {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "오늘";
  if (diffDays === 1) return "1일 전";
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return `${Math.floor(diffDays / 30)}개월 전`;
}
