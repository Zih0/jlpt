import { hanjaGlossMap } from "../data/hanjaGlossMap";
import type { KanjiBreakdownItem, VocabularyItem } from "./types";

const hanCharRegex = /^\p{Script=Han}$/u;

export function getKanjiBreakdownFromWord(word: string): KanjiBreakdownItem[] {
  const seen = new Set<string>();
  const out: KanjiBreakdownItem[] = [];

  for (const ch of word) {
    if (!hanCharRegex.test(ch)) continue;
    if (seen.has(ch)) continue;
    seen.add(ch);

    out.push({
      char: ch,
      gloss: hanjaGlossMap[ch] ?? "",
    });
  }

  return out;
}

export function withKanjiBreakdown(
  item: Omit<VocabularyItem, "kanjiBreakdown">
): VocabularyItem {
  return {
    ...item,
    kanjiBreakdown: getKanjiBreakdownFromWord(item.word),
  };
}

