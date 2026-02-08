"use client";

import { useState, useMemo, useEffect, useTransition, useCallback } from "react";
import Link from "next/link";
import { vocabularyData } from "@/data/vocabulary";
import { getReviewCards } from "@/lib/storage";
import { ReviewCard, getSRSStage, SRSStage, VocabularyItem, stageBadgeStyle, stageLabel, isStruggling, formatRelativeDate } from "@/lib/types";

const stages: (SRSStage | "all" | "struggling")[] = ["all", "new", "learning", "review", "mature", "struggling"];

const stageLabelKo: Record<SRSStage | "all" | "struggling", string> = {
  all: "전체",
  struggling: "어려운 항목",
  new: "신규",
  learning: "학습중",
  review: "복습",
  mature: "완료",
};

export default function VocabularyPage() {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<SRSStage | "all" | "struggling">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cardMap, setCardMap] = useState<Map<string, ReviewCard>>(new Map());
  const [visibleCount, setVisibleCount] = useState(50);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const cards = getReviewCards();
    const map = new Map<string, ReviewCard>();
    cards
      .filter((c) => c.contentType === "vocabulary")
      .forEach((c) => map.set(c.contentId, c));
    setCardMap(map);
  }, []);

  useEffect(() => {
    setVisibleCount(50);
  }, [search, stageFilter, categoryFilter]);

  const categories = useMemo(() => {
    const cats = new Set<string>();
    vocabularyData.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, []);

  const getStage = useCallback((item: VocabularyItem): SRSStage => {
    const card = cardMap.get(item.id);
    if (!card) return "new";
    return getSRSStage(card);
  }, [cardMap]);

  const filtered = useMemo(() => {
    let items = vocabularyData;

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (v) =>
          v.word.includes(q) ||
          v.reading.includes(q) ||
          v.meaning.toLowerCase().includes(q)
      );
    }

    if (categoryFilter !== "all") {
      items = items.filter((v) => v.category === categoryFilter);
    }

    if (stageFilter === "struggling") {
      items = items.filter((v) => {
        const card = cardMap.get(v.id);
        return card ? isStruggling(card) : false;
      });
    } else if (stageFilter !== "all") {
      items = items.filter((v) => {
        const card = cardMap.get(v.id);
        if (!card) return stageFilter === "new";
        return getSRSStage(card) === stageFilter;
      });
    }

    return items;
  }, [search, stageFilter, categoryFilter, cardMap]);

  const strugglingCount = useMemo(
    () => Array.from(cardMap.values()).filter(isStruggling).length,
    [cardMap]
  );

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const remaining = filtered.length - visibleCount;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">단어</h1>
        <Link
          href="/vocabulary/review"
          className="inline-flex items-center h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          복습
        </Link>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="단어 검색..."
        value={search}
        onChange={(e) => { const v = e.target.value; startTransition(() => setSearch(v)); }}
        className="w-full h-11 rounded-lg border px-4 text-body-sm"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      />

      {/* Stage filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {stages.map((s) => (
            <button
              key={s}
              onClick={() => startTransition(() => setStageFilter(s))}
              className="h-9 px-3 rounded-lg text-body-sm font-medium whitespace-nowrap border"
              style={{
                backgroundColor:
                  stageFilter === s
                    ? s === "struggling"
                      ? "var(--error)"
                      : "var(--primary)"
                    : "var(--bg-secondary)",
                color: stageFilter === s ? "white" : "var(--text-secondary)",
                borderColor:
                  stageFilter === s
                    ? s === "struggling"
                      ? "var(--error)"
                      : "var(--primary)"
                    : "var(--border)",
              }}
            >
              {s === "struggling" && strugglingCount > 0
                ? `${stageLabelKo[s]} (${strugglingCount})`
                : stageLabelKo[s]}
            </button>
          ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => startTransition(() => setCategoryFilter("all"))}
          className="h-9 px-3 rounded-lg text-body-sm font-medium whitespace-nowrap border"
          style={{
            backgroundColor:
              categoryFilter === "all" ? "var(--accent)" : "var(--bg-secondary)",
            color: categoryFilter === "all" ? "white" : "var(--text-secondary)",
            borderColor:
              categoryFilter === "all" ? "var(--accent)" : "var(--border)",
          }}
        >
          전체
        </button>
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => startTransition(() => setCategoryFilter(cat))}
            className="h-9 px-3 rounded-lg text-body-sm font-medium whitespace-nowrap border capitalize"
            style={{
              backgroundColor:
                categoryFilter === cat ? "var(--accent)" : "var(--bg-secondary)",
              color: categoryFilter === cat ? "white" : "var(--text-secondary)",
              borderColor:
                categoryFilter === cat ? "var(--accent)" : "var(--border)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
        {visible.length} / {filtered.length}개 표시 중
      </p>

      {/* List */}
      <div className="space-y-2">
        {visible.map((item) => {
          const stage = getStage(item);
          const badge = stageBadgeStyle[stage];
          const card = cardMap.get(item.id);
          const lastReviewed = card ? formatRelativeDate(card.lastReviewDate) : "";
          return (
            <Link
              key={item.id}
              href={`/vocabulary/${item.id}`}
              className="block p-4 rounded-lg border transition-colors"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-kanji font-jp" lang="ja" style={{ fontSize: "28px" }}>
                    {item.word}
                  </p>
                  <p className="text-reading font-jp" lang="ja" style={{ color: "var(--text-secondary)" }}>
                    {item.reading}
                  </p>
                  <p className="text-body mt-1">{item.meaning}</p>
                  {item.kanjiBreakdown.length > 0 && (
                    <div className="mt-2 space-y-0.5 text-caption" style={{ color: "var(--text-tertiary)" }}>
                      {item.kanjiBreakdown.map((k) => (
                        <p key={k.char}>
                          <span className="font-jp font-semibold" lang="ja">
                            {k.char}
                          </span>
                          {": "}
                          {k.gloss}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
                <div className="shrink-0 flex flex-col items-end gap-1">
                  <span
                    className="h-6 px-2.5 rounded text-caption font-medium inline-flex items-center"
                    style={{ backgroundColor: badge.bg, color: badge.color }}
                  >
                    {stageLabel[stage]}
                  </span>
                  {lastReviewed && (
                    <span
                      className="text-caption"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      최근: {lastReviewed}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span
                  className="h-6 px-2.5 rounded text-caption font-medium inline-flex items-center"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {item.partOfSpeech}
                </span>
              </div>
              <p
                className="text-body-sm mt-2 font-jp"
                lang="ja"
                style={{ color: "var(--text-secondary)" }}
              >
                {item.exampleSentence}
              </p>
              <p className="text-caption" style={{ color: "var(--text-tertiary)" }}>
                {item.exampleSentenceMeaning}
              </p>
            </Link>
          );
        })}
      </div>

      {/* Load More button */}
      {remaining > 0 && (
        <div className="flex flex-col items-center gap-2 pt-4">
          <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            {remaining}개 더
          </p>
          <button
            onClick={() => setVisibleCount((prev) => prev + 50)}
            className="h-11 px-5 rounded-lg border text-body-sm font-medium"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            더 보기
          </button>
        </div>
      )}
    </div>
  );
}
