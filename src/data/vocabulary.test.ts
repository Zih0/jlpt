import { describe, it, expect } from "vitest";
import { vocabularyData } from "./vocabulary";

describe("Vocabulary Data Integrity", () => {
  it("contains vocabulary items", () => {
    expect(vocabularyData.length).toBeGreaterThan(0);
  });

  it("has unique IDs", () => {
    const ids = vocabularyData.map((v) => v.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("has all required fields populated", () => {
    for (const item of vocabularyData) {
      expect(item.id, `${item.word} missing id`).toBeTruthy();
      expect(item.word, `${item.id} missing word`).toBeTruthy();
      expect(
        item.reading,
        `${item.id} (${item.word}) missing reading`
      ).toBeTruthy();
      expect(
        item.meaning,
        `${item.id} (${item.word}) missing meaning`
      ).toBeTruthy();
      const kanjiRegex = /[\u4E00-\u9FAF]/;
      if (kanjiRegex.test(item.word)) {
        expect(
          item.kanjiBreakdown?.length,
          `${item.id} (${item.word}) missing kanjiBreakdown`
        ).toBeGreaterThan(0);
      }
      expect(
        item.partOfSpeech,
        `${item.id} (${item.word}) missing partOfSpeech`
      ).toBeTruthy();
      expect(
        item.exampleSentence,
        `${item.id} (${item.word}) missing exampleSentence`
      ).toBeTruthy();
      expect(
        item.exampleSentenceMeaning,
        `${item.id} (${item.word}) missing exampleSentenceMeaning`
      ).toBeTruthy();
      expect(
        item.category,
        `${item.id} (${item.word}) missing category`
      ).toBeTruthy();
      expect(
        item.frequencyRank,
        `${item.id} (${item.word}) missing frequencyRank`
      ).toBeGreaterThan(0);
    }
  });

  it("has unique frequency ranks", () => {
    const ranks = vocabularyData.map((v) => v.frequencyRank);
    const uniqueRanks = new Set(ranks);
    expect(uniqueRanks.size).toBe(ranks.length);
  });

  it("has readings in hiragana/katakana", () => {
    const kanaRegex = /^[\u3040-\u309F\u30A0-\u30FF\u30FC]+$/;
    for (const item of vocabularyData) {
      expect(
        kanaRegex.test(item.reading),
        `${item.word} reading "${item.reading}" contains non-kana characters`
      ).toBe(true);
    }
  });

  it("has words containing kanji or kana", () => {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    for (const item of vocabularyData) {
      expect(
        japaneseRegex.test(item.word),
        `${item.word} does not contain Japanese characters`
      ).toBe(true);
    }
  });

  it("has example sentences in Japanese", () => {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    for (const item of vocabularyData) {
      expect(
        japaneseRegex.test(item.exampleSentence),
        `${item.id} (${item.word}) example sentence is not in Japanese`
      ).toBe(true);
    }
  });

  it("has Korean meanings (no Japanese characters in meaning)", () => {
    const japaneseRegex = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/;
    for (const item of vocabularyData) {
      expect(
        japaneseRegex.test(item.meaning),
        `${item.id} (${item.word}) meaning "${item.meaning}" contains Japanese characters`
      ).toBe(false);
    }
  });

  it("has valid part-of-speech values", () => {
    const validPOS = [
      "noun",
      "noun/suru-verb",
      "noun/na-adjective",
      "i-adjective",
      "na-adjective",
      "na-adjective/suru-verb",
      "godan-verb",
      "ichidan-verb",
      "adverb",
      "adverb/na-adjective",
      "expression",
      "conjunction",
      "prefix",
      "suffix",
    ];
    for (const item of vocabularyData) {
      expect(
        validPOS.includes(item.partOfSpeech),
        `${item.id} (${item.word}) has unexpected partOfSpeech: "${item.partOfSpeech}"`
      ).toBe(true);
    }
  });
});

describe("Vocabulary Content Accuracy (spot checks)", () => {
  it("曖昧 is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "曖昧");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("あいまい");
    expect(item!.meaning).toContain("모호");
    expect(item!.kanjiBreakdown).toEqual([
      { char: "曖", gloss: "희미할 애" },
      { char: "昧", gloss: "어두울 매" },
    ]);
  });

  it("同感 is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "同感");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("どうかん");
    expect(item!.meaning).toContain("동감");
  });

  it("開発 is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "開発");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("かいはつ");
    expect(item!.meaning).toContain("개발");
  });

  it("早める is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "早める");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("はやめる");
    expect(item!.meaning).toContain("앞당기다");
  });

  it("磁気 is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "磁気");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("じき");
    expect(item!.meaning).toContain("자기");
  });

  it("視点 is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "視点");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("してん");
    expect(item!.meaning).toContain("관점");
  });

  it("憂鬱 is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "憂鬱");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("ゆううつ");
    expect(item!.meaning).toContain("우울");
  });

  it("明瞭 is correctly defined", () => {
    const item = vocabularyData.find((v) => v.word === "明瞭");
    expect(item).toBeDefined();
    expect(item!.reading).toBe("めいりょう");
    expect(item!.meaning).toContain("명료");
  });
});
