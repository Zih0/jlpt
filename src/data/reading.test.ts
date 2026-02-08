import { describe, it, expect } from "vitest";
import { readingData } from "./reading";

describe("Reading Data Integrity", () => {
  it("contains reading passages", () => {
    expect(readingData.length).toBeGreaterThan(0);
  });

  it("has unique IDs", () => {
    const ids = readingData.map((r) => r.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("has all required fields populated", () => {
    for (const passage of readingData) {
      expect(passage.id).toBeTruthy();
      expect(passage.title).toBeTruthy();
      expect(passage.content).toBeTruthy();
      expect(passage.difficulty).toBeTruthy();
      expect(passage.category).toBeTruthy();
      expect(passage.questions.length).toBeGreaterThan(0);
      expect(passage.wordCount).toBeGreaterThan(0);
      expect(passage.estimatedMinutes).toBeGreaterThan(0);
    }
  });

  it("has valid difficulty levels", () => {
    for (const passage of readingData) {
      expect(
        ["short", "medium", "long"].includes(passage.difficulty),
        `${passage.id} has invalid difficulty: ${passage.difficulty}`
      ).toBe(true);
    }
  });

  it("has at least 2 questions per passage", () => {
    for (const passage of readingData) {
      expect(
        passage.questions.length,
        `${passage.id} has only ${passage.questions.length} question(s)`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("has valid question structure", () => {
    for (const passage of readingData) {
      for (const q of passage.questions) {
        expect(q.id, `question missing id in ${passage.id}`).toBeTruthy();
        expect(q.question, `question missing text in ${passage.id}`).toBeTruthy();
        expect(q.options.length, `question ${q.id} has no options`).toBeGreaterThanOrEqual(2);
        expect(
          q.correctAnswer,
          `question ${q.id} correctAnswer out of range`
        ).toBeGreaterThanOrEqual(0);
        expect(
          q.correctAnswer,
          `question ${q.id} correctAnswer ${q.correctAnswer} >= options.length ${q.options.length}`
        ).toBeLessThan(q.options.length);
        expect(q.explanation, `question ${q.id} missing explanation`).toBeTruthy();
      }
    }
  });

  it("has unique question IDs across all passages", () => {
    const allQIds = readingData.flatMap((r) => r.questions.map((q) => q.id));
    const uniqueQIds = new Set(allQIds);
    expect(uniqueQIds.size).toBe(allQIds.length);
  });

  it("has Japanese content in passages", () => {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    for (const passage of readingData) {
      expect(
        japaneseRegex.test(passage.content),
        `${passage.id} content is not in Japanese`
      ).toBe(true);
    }
  });

  it("has variety in difficulty levels", () => {
    const difficulties = new Set(readingData.map((r) => r.difficulty));
    expect(
      difficulties.size,
      "Should have at least 2 different difficulty levels"
    ).toBeGreaterThanOrEqual(2);
  });
});

describe("Reading Content Accuracy", () => {
  it("has correct answer for first passage first question", () => {
    const passage = readingData.find((r) => r.id === "r001");
    expect(passage).toBeDefined();
    // Q1: テクノロジーの発展がもたらした問題 -> 従来の労働者が職を失う (index 1)
    expect(passage!.questions[0].correctAnswer).toBe(1);
  });

  it("short passages have reasonable word counts", () => {
    const shorts = readingData.filter((r) => r.difficulty === "short");
    for (const passage of shorts) {
      expect(
        passage.wordCount,
        `Short passage ${passage.id} has ${passage.wordCount} chars, expected ~200`
      ).toBeLessThan(250);
    }
  });

  it("long passages have appropriate word counts", () => {
    const longs = readingData.filter((r) => r.difficulty === "long");
    for (const passage of longs) {
      expect(
        passage.wordCount,
        `Long passage ${passage.id} has ${passage.wordCount} chars, expected > 250`
      ).toBeGreaterThan(250);
    }
  });
});
