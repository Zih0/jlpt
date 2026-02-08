import { ReviewCard, SRSRating } from "./types";

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr + "T00:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export function reviewCard(card: ReviewCard, rating: SRSRating): ReviewCard {
  const today = todayISO();

  // SM-2: only recalculate ease factor for ratings >= 3
  let newEF = card.easeFactor;
  if (rating >= 3) {
    const q = rating;
    newEF = card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    newEF = Math.max(1.3, newEF);
  }

  let newInterval: number;
  let newRepetitions: number;

  if (rating === 0) {
    // Again: reset repetitions, interval = 1 day
    newInterval = 1;
    newRepetitions = 0;
  } else if (card.repetitions === 0) {
    newInterval = 1;
    newRepetitions = 1;
  } else if (card.repetitions === 1) {
    newInterval = 6;
    newRepetitions = 2;
  } else {
    newInterval = Math.round(card.interval * newEF);
    newRepetitions = card.repetitions + 1;
  }

  return {
    ...card,
    easeFactor: newEF,
    interval: newInterval,
    repetitions: newRepetitions,
    dueDate: addDays(today, newInterval),
    lastReviewDate: today,
    totalReviews: card.totalReviews + 1,
    totalCorrect: card.totalCorrect + (rating > 0 ? 1 : 0),
    lastIncorrectDate: rating === 0 ? today : card.lastIncorrectDate,
  };
}

export function createReviewCard(
  contentType: "vocabulary" | "grammar" | "listening",
  contentId: string
): ReviewCard {
  return {
    id: `${contentType}-${contentId}`,
    contentType,
    contentId,
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: todayISO(),
    lastReviewDate: "",
    totalReviews: 0,
    totalCorrect: 0,
    lastIncorrectDate: "",
  };
}

export function getDueCards(cards: ReviewCard[]): ReviewCard[] {
  const today = todayISO();
  return cards
    .filter((c) => c.dueDate <= today)
    .sort((a, b) => {
      // Overdue first (oldest due date), then by ease factor (hardest first)
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.easeFactor - b.easeFactor;
    });
}

export function getRecentMistakes(cards: ReviewCard[], days: number = 7): ReviewCard[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return cards
    .filter(c => c.lastIncorrectDate >= cutoffStr)
    .sort((a, b) => b.lastIncorrectDate.localeCompare(a.lastIncorrectDate));
}

export function getNextInterval(card: ReviewCard, rating: SRSRating): string {
  if (rating === 0) return "<1m";
  const updated = reviewCard(card, rating);
  const days = updated.interval;
  if (days === 1) return "1d";
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.round(days / 7)}w`;
  return `${Math.round(days / 30)}mo`;
}
