import { describe, it, expect } from "vitest";
import { reviewCard, createReviewCard, getDueCards, getNextInterval } from "./srs";
import { ReviewCard, SRSRating } from "./types";

function makeCard(overrides: Partial<ReviewCard> = {}): ReviewCard {
  return {
    id: "test-1",
    contentType: "vocabulary",
    contentId: "v001",
    easeFactor: 2.5,
    interval: 0,
    repetitions: 0,
    dueDate: "2026-02-07",
    lastReviewDate: "",
    totalReviews: 0,
    totalCorrect: 0,
    lastIncorrectDate: "",
    ...overrides,
  };
}

describe("createReviewCard", () => {
  it("creates a vocabulary review card with correct defaults", () => {
    const card = createReviewCard("vocabulary", "v001");
    expect(card.id).toBe("vocabulary-v001");
    expect(card.contentType).toBe("vocabulary");
    expect(card.contentId).toBe("v001");
    expect(card.easeFactor).toBe(2.5);
    expect(card.interval).toBe(0);
    expect(card.repetitions).toBe(0);
    expect(card.totalReviews).toBe(0);
    expect(card.totalCorrect).toBe(0);
    expect(card.lastReviewDate).toBe("");
    // dueDate should be today
    expect(card.dueDate).toBe(new Date().toISOString().split("T")[0]);
  });

  it("creates a grammar review card", () => {
    const card = createReviewCard("grammar", "g005");
    expect(card.id).toBe("grammar-g005");
    expect(card.contentType).toBe("grammar");
    expect(card.contentId).toBe("g005");
  });
});

describe("reviewCard - SM-2 Algorithm", () => {
  describe("rating: Again (0)", () => {
    it("resets repetitions to 0 and interval to 1", () => {
      const card = makeCard({ repetitions: 5, interval: 30, easeFactor: 2.5 });
      const updated = reviewCard(card, 0);
      expect(updated.repetitions).toBe(0);
      expect(updated.interval).toBe(1);
    });

    it("does not recalculate ease factor for rating < 3", () => {
      const card = makeCard({ easeFactor: 2.5 });
      const updated = reviewCard(card, 0);
      // SM-2: EF only recalculated for ratings >= 3
      expect(updated.easeFactor).toBe(2.5);
    });

    it("preserves ease factor at minimum when rating Again", () => {
      const card = makeCard({ easeFactor: 1.3 });
      const updated = reviewCard(card, 0);
      expect(updated.easeFactor).toBe(1.3);
    });

    it("counts as incorrect (totalCorrect not incremented)", () => {
      const card = makeCard({ totalReviews: 5, totalCorrect: 3 });
      const updated = reviewCard(card, 0);
      expect(updated.totalReviews).toBe(6);
      expect(updated.totalCorrect).toBe(3);
    });
  });

  describe("rating: Hard (3)", () => {
    it("sets interval to 1 and repetitions to 1 for new cards", () => {
      const card = makeCard({ repetitions: 0, interval: 0 });
      const updated = reviewCard(card, 3);
      expect(updated.repetitions).toBe(1);
      expect(updated.interval).toBe(1);
    });

    it("sets interval to 6 for second review", () => {
      const card = makeCard({ repetitions: 1, interval: 1, easeFactor: 2.5 });
      const updated = reviewCard(card, 3);
      expect(updated.repetitions).toBe(2);
      expect(updated.interval).toBe(6);
    });

    it("multiplies interval by ease factor for subsequent reviews", () => {
      const card = makeCard({ repetitions: 3, interval: 10, easeFactor: 2.5 });
      const updated = reviewCard(card, 3);
      // EF' for q=3: 2.5 + (0.1 - 2*(0.08 + 2*0.02)) = 2.5 + (0.1 - 2*0.12) = 2.5 - 0.14 = 2.36
      // Interval = round(10 * 2.36) = 24
      expect(updated.interval).toBe(24);
    });

    it("counts as correct", () => {
      const card = makeCard({ totalReviews: 0, totalCorrect: 0 });
      const updated = reviewCard(card, 3);
      expect(updated.totalReviews).toBe(1);
      expect(updated.totalCorrect).toBe(1);
    });
  });

  describe("rating: Good (4)", () => {
    it("sets interval to 1 and repetitions to 1 for new cards", () => {
      const card = makeCard({ repetitions: 0, interval: 0 });
      const updated = reviewCard(card, 4);
      expect(updated.repetitions).toBe(1);
      expect(updated.interval).toBe(1);
    });

    it("sets interval to 6 for second review", () => {
      const card = makeCard({ repetitions: 1, interval: 1, easeFactor: 2.5 });
      const updated = reviewCard(card, 4);
      expect(updated.repetitions).toBe(2);
      expect(updated.interval).toBe(6);
    });

    it("multiplies interval by ease factor for subsequent reviews", () => {
      const card = makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 });
      const updated = reviewCard(card, 4);
      // EF' for q=4: 2.5 + (0.1 - 1*0.10) = 2.5 + 0 = 2.5
      // Interval = round(6 * 2.5) = 15
      expect(updated.interval).toBe(15);
      expect(updated.repetitions).toBe(3);
    });

    it("does not modify ease factor much", () => {
      const card = makeCard({ easeFactor: 2.5 });
      const updated = reviewCard(card, 4);
      // EF' = 2.5 + (0.1 - 1*0.10) = 2.5
      expect(updated.easeFactor).toBeCloseTo(2.5, 2);
    });
  });

  describe("rating: Easy (5)", () => {
    it("sets interval to 1 for new cards", () => {
      const card = makeCard({ repetitions: 0, interval: 0 });
      const updated = reviewCard(card, 5);
      expect(updated.repetitions).toBe(1);
      expect(updated.interval).toBe(1);
    });

    it("multiplies interval by ease factor for easy rating", () => {
      const card = makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 });
      const updated = reviewCard(card, 5);
      // EF' for q=5: 2.5 + 0.1 = 2.6
      // Interval = round(6 * 2.6) = 16
      expect(updated.interval).toBe(16);
    });

    it("increases ease factor", () => {
      const card = makeCard({ easeFactor: 2.5 });
      const updated = reviewCard(card, 5);
      // EF' = 2.5 + (0.1 - 0*0.08) = 2.5 + 0.1 = 2.6
      expect(updated.easeFactor).toBeCloseTo(2.6, 2);
    });
  });

  describe("edge cases", () => {
    it("ease factor stays unchanged when rating Again", () => {
      let card = makeCard({ easeFactor: 2.0, repetitions: 0 });
      // Rating Again should not change EF (only ratings >= 3 recalculate EF)
      for (let i = 0; i < 5; i++) {
        card = reviewCard(card, 0);
        expect(card.easeFactor).toBe(2.0);
      }
    });

    it("sets lastReviewDate to today", () => {
      const card = makeCard();
      const updated = reviewCard(card, 4);
      expect(updated.lastReviewDate).toBe(new Date().toISOString().split("T")[0]);
    });

    it("increments totalReviews on every review", () => {
      let card = makeCard({ totalReviews: 0 });
      card = reviewCard(card, 4);
      expect(card.totalReviews).toBe(1);
      card = reviewCard(card, 0);
      expect(card.totalReviews).toBe(2);
      card = reviewCard(card, 5);
      expect(card.totalReviews).toBe(3);
    });
  });
});

describe("getDueCards", () => {
  it("returns cards with dueDate <= today", () => {
    const today = new Date().toISOString().split("T")[0];
    const cards: ReviewCard[] = [
      makeCard({ id: "past", dueDate: "2020-01-01" }),
      makeCard({ id: "today", dueDate: today }),
      makeCard({ id: "future", dueDate: "2030-01-01" }),
    ];
    const due = getDueCards(cards);
    expect(due.length).toBe(2);
    expect(due.map((c) => c.id)).toContain("past");
    expect(due.map((c) => c.id)).toContain("today");
  });

  it("returns empty array when no cards are due", () => {
    const cards: ReviewCard[] = [
      makeCard({ dueDate: "2030-01-01" }),
    ];
    expect(getDueCards(cards)).toHaveLength(0);
  });

  it("sorts overdue cards first (oldest due date)", () => {
    const today = new Date().toISOString().split("T")[0];
    const cards: ReviewCard[] = [
      makeCard({ id: "recent", dueDate: today, easeFactor: 2.5 }),
      makeCard({ id: "old", dueDate: "2020-01-01", easeFactor: 2.5 }),
      makeCard({ id: "older", dueDate: "2019-06-15", easeFactor: 2.5 }),
    ];
    const due = getDueCards(cards);
    expect(due[0].id).toBe("older");
    expect(due[1].id).toBe("old");
    expect(due[2].id).toBe("recent");
  });

  it("sorts by ease factor (hardest first) when dates are equal", () => {
    const cards: ReviewCard[] = [
      makeCard({ id: "easy", dueDate: "2020-01-01", easeFactor: 2.5 }),
      makeCard({ id: "hard", dueDate: "2020-01-01", easeFactor: 1.3 }),
      makeCard({ id: "medium", dueDate: "2020-01-01", easeFactor: 1.8 }),
    ];
    const due = getDueCards(cards);
    expect(due[0].id).toBe("hard");
    expect(due[1].id).toBe("medium");
    expect(due[2].id).toBe("easy");
  });

  it("handles empty array", () => {
    expect(getDueCards([])).toHaveLength(0);
  });
});

describe("getNextInterval", () => {
  it('returns "<1m" for Again rating', () => {
    const card = makeCard();
    expect(getNextInterval(card, 0)).toBe("<1m");
  });

  it('returns "1d" for first-time Good rating', () => {
    const card = makeCard({ repetitions: 0, interval: 0 });
    expect(getNextInterval(card, 4)).toBe("1d");
  });

  it("returns day format for intervals under 7 days", () => {
    const card = makeCard({ repetitions: 1, interval: 1, easeFactor: 2.5 });
    const result = getNextInterval(card, 4);
    // interval becomes 6, so "6d"
    expect(result).toBe("6d");
  });

  it("returns week format for intervals 7-29 days", () => {
    const card = makeCard({ repetitions: 2, interval: 6, easeFactor: 2.5 });
    const result = getNextInterval(card, 4);
    // interval = round(6 * 2.5) = 15, 15/7 = 2.14 -> 2w
    expect(result).toBe("2w");
  });

  it("returns month format for intervals >= 30 days", () => {
    const card = makeCard({ repetitions: 3, interval: 15, easeFactor: 2.5 });
    const result = getNextInterval(card, 5);
    // EF' = 2.5 + 0.1 = 2.6
    // interval = round(15 * 2.6) = 39, 39/30 = 1.3 -> 1mo
    expect(result).toBe("1mo");
  });
});
