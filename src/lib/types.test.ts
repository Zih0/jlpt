import { describe, it, expect } from "vitest";
import { getSRSStage, ReviewCard } from "./types";

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

describe("getSRSStage", () => {
  it('returns "new" for cards with 0 repetitions and 0 interval', () => {
    const card = makeCard({ repetitions: 0, interval: 0 });
    expect(getSRSStage(card)).toBe("new");
  });

  it('returns "learning" for cards with interval < 7', () => {
    expect(getSRSStage(makeCard({ repetitions: 1, interval: 1 }))).toBe("learning");
    expect(getSRSStage(makeCard({ repetitions: 2, interval: 6 }))).toBe("learning");
  });

  it('returns "review" for cards with interval >= 7 and < 21', () => {
    expect(getSRSStage(makeCard({ repetitions: 3, interval: 7 }))).toBe("review");
    expect(getSRSStage(makeCard({ repetitions: 4, interval: 15 }))).toBe("review");
    expect(getSRSStage(makeCard({ repetitions: 5, interval: 20 }))).toBe("review");
  });

  it('returns "mature" for cards with interval >= 21', () => {
    expect(getSRSStage(makeCard({ repetitions: 5, interval: 21 }))).toBe("mature");
    expect(getSRSStage(makeCard({ repetitions: 8, interval: 90 }))).toBe("mature");
  });

  it("correctly classifies boundary values", () => {
    expect(getSRSStage(makeCard({ repetitions: 1, interval: 6 }))).toBe("learning");
    expect(getSRSStage(makeCard({ repetitions: 2, interval: 7 }))).toBe("review");
    expect(getSRSStage(makeCard({ repetitions: 3, interval: 20 }))).toBe("review");
    expect(getSRSStage(makeCard({ repetitions: 4, interval: 21 }))).toBe("mature");
  });
});
