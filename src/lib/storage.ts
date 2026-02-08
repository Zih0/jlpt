import { ReviewCard, UserSettings, StudySession, ReadingProgress } from "./types";

const KEYS = {
  reviewCards: "jlpt-n1-review-cards",
  settings: "jlpt-n1-settings",
  sessions: "jlpt-n1-sessions",
  readingProgress: "jlpt-n1-reading-progress",
} as const;

const DEFAULT_SETTINGS: UserSettings = {
  dailyNewVocab: 20,
  dailyNewGrammar: 5,
  dailyNewListening: 5,
  streakCount: 0,
  lastStudyDate: "",
  autoPlayAudio: true,
};

function getItem<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

function setItem<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // localStorage full or unavailable
  }
}

// Review Cards
export function getReviewCards(): ReviewCard[] {
  return getItem<ReviewCard[]>(KEYS.reviewCards, []);
}

export function saveReviewCards(cards: ReviewCard[]): void {
  setItem(KEYS.reviewCards, cards);
}

export function upsertReviewCard(card: ReviewCard): void {
  const cards = getReviewCards();
  const idx = cards.findIndex((c) => c.id === card.id);
  if (idx >= 0) {
    cards[idx] = card;
  } else {
    cards.push(card);
  }
  saveReviewCards(cards);
}

// Settings
export function getSettings(): UserSettings {
  return getItem<UserSettings>(KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(settings: UserSettings): void {
  setItem(KEYS.settings, settings);
}

export function updateStreak(): UserSettings {
  const settings = getSettings();
  const today = new Date().toISOString().split("T")[0];

  if (settings.lastStudyDate === today) {
    return settings;
  }

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  const newSettings = {
    ...settings,
    lastStudyDate: today,
    streakCount:
      settings.lastStudyDate === yesterdayStr ? settings.streakCount + 1 : 1,
  };
  saveSettings(newSettings);
  return newSettings;
}

// Sessions
export function getSessions(): StudySession[] {
  return getItem<StudySession[]>(KEYS.sessions, []);
}

export function addSession(session: Omit<StudySession, "id">): void {
  const sessions = getSessions();
  sessions.push({ ...session, id: `session-${Date.now()}` });
  setItem(KEYS.sessions, sessions);
}

export function getTodaySessions(): StudySession[] {
  const today = new Date().toISOString().split("T")[0];
  return getSessions().filter((s) => s.date === today);
}

export function resetAllData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.reviewCards);
  localStorage.removeItem(KEYS.settings);
  localStorage.removeItem(KEYS.sessions);
  localStorage.removeItem(KEYS.readingProgress);
  // Clear per-video listening favorites
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("listening-fav-")) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => localStorage.removeItem(key));
}

// Export / Import
export interface ExportData {
  version: 1;
  exportDate: string;
  reviewCards: ReviewCard[];
  settings: UserSettings;
  sessions: StudySession[];
  readingProgress: ReadingProgress[];
  listeningFavorites?: Record<string, number[]>;
}

function getListeningFavorites(): Record<string, number[]> {
  if (typeof window === "undefined") return {};
  const favs: Record<string, number[]> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith("listening-fav-")) {
      try {
        favs[key] = JSON.parse(localStorage.getItem(key) || "[]");
      } catch { /* skip */ }
    }
  }
  return favs;
}

export function exportAllData(): ExportData {
  return {
    version: 1,
    exportDate: new Date().toISOString(),
    reviewCards: getReviewCards(),
    settings: getSettings(),
    sessions: getSessions(),
    readingProgress: getReadingProgress(),
    listeningFavorites: getListeningFavorites(),
  };
}

export function validateExportData(data: unknown): data is ExportData {
  if (typeof data !== "object" || data === null) return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (!Array.isArray(d.reviewCards)) return false;
  if (typeof d.settings !== "object" || d.settings === null) return false;
  if (!Array.isArray(d.sessions)) return false;
  if (!Array.isArray(d.readingProgress)) return false;
  return true;
}

export function importAllData(data: ExportData): void {
  setItem(KEYS.reviewCards, data.reviewCards);
  setItem(KEYS.settings, data.settings);
  setItem(KEYS.sessions, data.sessions);
  setItem(KEYS.readingProgress, data.readingProgress);
  if (data.listeningFavorites) {
    for (const [key, value] of Object.entries(data.listeningFavorites)) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }
}

// Reading Progress
export function getReadingProgress(): ReadingProgress[] {
  return getItem<ReadingProgress[]>(KEYS.readingProgress, []);
}

export function saveReadingProgress(progress: ReadingProgress): void {
  const allProgress = getReadingProgress();
  const idx = allProgress.findIndex((p) => p.passageId === progress.passageId);
  if (idx >= 0) {
    allProgress[idx] = progress;
  } else {
    allProgress.push(progress);
  }
  setItem(KEYS.readingProgress, allProgress);
}
