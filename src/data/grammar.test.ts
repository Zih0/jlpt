import { describe, it, expect } from "vitest";
import { grammarData } from "./grammar";

describe("Grammar Data Integrity", () => {
  it("contains grammar patterns", () => {
    expect(grammarData.length).toBeGreaterThan(0);
  });

  it("has unique IDs", () => {
    const ids = grammarData.map((g) => g.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("has all required fields populated", () => {
    for (const item of grammarData) {
      expect(item.id, `missing id`).toBeTruthy();
      expect(item.pattern, `${item.id} missing pattern`).toBeTruthy();
      expect(item.meaning, `${item.id} (${item.pattern}) missing meaning`).toBeTruthy();
      expect(item.formation, `${item.id} (${item.pattern}) missing formation`).toBeTruthy();
      expect(item.functionGroup, `${item.id} (${item.pattern}) missing functionGroup`).toBeTruthy();
      expect(item.examples.length, `${item.id} (${item.pattern}) has no examples`).toBeGreaterThan(0);
      expect(item.notes, `${item.id} (${item.pattern}) missing notes`).toBeTruthy();
    }
  });

  it("has at least 2 examples per pattern", () => {
    for (const item of grammarData) {
      expect(
        item.examples.length,
        `${item.id} (${item.pattern}) has only ${item.examples.length} example(s), need >= 2`
      ).toBeGreaterThanOrEqual(2);
    }
  });

  it("has Japanese text in examples", () => {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    for (const item of grammarData) {
      for (const ex of item.examples) {
        expect(
          japaneseRegex.test(ex.japanese),
          `${item.id} example "${ex.japanese}" is not Japanese`
        ).toBe(true);
        expect(ex.translation, `${item.id} missing translation for example`).toBeTruthy();
        expect(ex.reading, `${item.id} missing reading for example`).toBeTruthy();
      }
    }
  });

  it("has valid similar pattern references", () => {
    const allIds = new Set(grammarData.map((g) => g.id));
    for (const item of grammarData) {
      for (const ref of item.similarPatterns) {
        expect(
          allIds.has(ref),
          `${item.id} (${item.pattern}) references non-existent pattern: ${ref}`
        ).toBe(true);
      }
    }
  });

  it("has Korean meanings (no Japanese in meaning field)", () => {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    for (const item of grammarData) {
      expect(
        japaneseRegex.test(item.meaning),
        `${item.id} (${item.pattern}) meaning contains Japanese: "${item.meaning}"`
      ).toBe(false);
    }
  });
});

describe("Grammar Content Accuracy (spot checks)", () => {
  it("~ものなら is a conditional pattern", () => {
    const item = grammarData.find((g) => g.pattern.includes("ものなら") && g.id === "g001");
    expect(item).toBeDefined();
    expect(item!.functionGroup).toBe("condition");
  });

  it("~にほかならない expresses emphasis", () => {
    const item = grammarData.find((g) => g.pattern.includes("にほかならない"));
    expect(item).toBeDefined();
    expect(item!.functionGroup).toBe("emphasis");
  });

  it("~ざるを得ない expresses inevitability", () => {
    const item = grammarData.find((g) => g.pattern.includes("ざるを得ない"));
    expect(item).toBeDefined();
    expect(item!.functionGroup).toBe("inevitability");
  });

  it("~にもかかわらず expresses contrast", () => {
    const item = grammarData.find((g) => g.pattern.includes("にもかかわらず"));
    expect(item).toBeDefined();
    expect(item!.functionGroup).toBe("contrast");
  });

  it("~つつある expresses progressive change", () => {
    const item = grammarData.find((g) => g.pattern.includes("つつある"));
    expect(item).toBeDefined();
    expect(item!.functionGroup).toBe("progressive");
  });

  it("~かねる is about difficulty/polite refusal", () => {
    const item = grammarData.find((g) => g.pattern.includes("かねる"));
    expect(item).toBeDefined();
    expect(item!.functionGroup).toBe("difficulty");
  });
});
