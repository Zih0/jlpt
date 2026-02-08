"use client";

import { useState, useMemo, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { grammarData } from "@/data/grammar";
import { getReviewCards } from "@/lib/storage";
import { ReviewCard, getSRSStage, SRSStage, GrammarPattern, stageBadgeStyle, stageLabel, isStruggling, formatRelativeDate } from "@/lib/types";

const functionGroups = [
  "all",
  ...Array.from(new Set(grammarData.map((g) => g.functionGroup))),
];

const stages: (SRSStage | "all" | "struggling")[] = ["all", "new", "learning", "review", "mature", "struggling"];

const stageFilterLabel: Record<string, string> = {
  all: "전체",
  new: "신규",
  learning: "학습중",
  review: "복습",
  mature: "완료",
};

export default function GrammarPage() {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("all");
  const [stageFilter, setStageFilter] = useState<SRSStage | "all" | "struggling">("all");
  const [cardMap, setCardMap] = useState<Map<string, ReviewCard>>(new Map());
  const [, startTransition] = useTransition();

  useEffect(() => {
    const cards = getReviewCards();
    const map = new Map<string, ReviewCard>();
    cards
      .filter((c) => c.contentType === "grammar")
      .forEach((c) => map.set(c.contentId, c));
    setCardMap(map);
  }, []);

  const getStage = useCallback((item: GrammarPattern): SRSStage => {
    const card = cardMap.get(item.id);
    if (!card) return "new";
    return getSRSStage(card);
  }, [cardMap]);

  const filtered = useMemo(() => {
    let items = grammarData;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (g) =>
          g.pattern.includes(q) ||
          g.meaning.toLowerCase().includes(q) ||
          g.formation.toLowerCase().includes(q)
      );
    }
    if (group !== "all") {
      items = items.filter((g) => g.functionGroup === group);
    }
    if (stageFilter === "struggling") {
      items = items.filter((g) => {
        const card = cardMap.get(g.id);
        return card ? isStruggling(card) : false;
      });
    } else if (stageFilter !== "all") {
      items = items.filter((g) => {
        const card = cardMap.get(g.id);
        if (!card) return stageFilter === "new";
        return getSRSStage(card) === stageFilter;
      });
    }
    return items;
  }, [search, group, stageFilter, cardMap]);

  const strugglingCount = useMemo(
    () => Array.from(cardMap.values()).filter(isStruggling).length,
    [cardMap]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">문법 패턴</h1>
        <div className="flex gap-2">
          <Link
            href="/grammar/compare"
            className="inline-flex items-center h-11 px-5 rounded-lg text-body-sm font-semibold border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            비교
          </Link>
          <Link
            href="/grammar/confusion-drill"
            className="inline-flex items-center h-11 px-5 rounded-lg text-body-sm font-semibold border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            혼동 연습
          </Link>
          <Link
            href="/grammar/keigo-drill"
            className="inline-flex items-center h-11 px-5 rounded-lg text-body-sm font-semibold border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-primary)",
            }}
          >
            경어 연습
          </Link>
          <Link
            href="/grammar/review"
            className="inline-flex items-center h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            복습
          </Link>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="패턴 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-11 rounded-lg border px-4 text-body-sm"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      />

      {/* Group filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {functionGroups.map((fg) => (
          <button
            key={fg}
            onClick={() => startTransition(() => setGroup(fg))}
            className="h-9 px-3 rounded-lg text-body-sm font-medium whitespace-nowrap border"
            style={{
              backgroundColor:
                group === fg ? "var(--primary)" : "var(--bg-secondary)",
              color: group === fg ? "white" : "var(--text-secondary)",
              borderColor: group === fg ? "var(--primary)" : "var(--border)",
            }}
          >
            {fg === "all" ? "전체" : fg}
          </button>
        ))}
      </div>

      {/* Stage filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {stages.map((s) => {
          const isStrugglingFilter = s === "struggling";
          return (
            <button
              key={s}
              onClick={() => startTransition(() => setStageFilter(s))}
              className="h-9 px-3 rounded-lg text-body-sm font-medium whitespace-nowrap border"
              style={{
                backgroundColor:
                  stageFilter === s
                    ? isStrugglingFilter
                      ? "var(--error)"
                      : "var(--primary)"
                    : "var(--bg-secondary)",
                color: stageFilter === s ? "white" : "var(--text-secondary)",
                borderColor:
                  stageFilter === s
                    ? isStrugglingFilter
                      ? "var(--error)"
                      : "var(--primary)"
                    : "var(--border)",
              }}
            >
              {isStrugglingFilter
                ? `어려운 항목${strugglingCount > 0 ? ` (${strugglingCount})` : ""}`
                : stageFilterLabel[s] ?? s}
            </button>
          );
        })}
      </div>

      <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
        {filtered.length}개 패턴
      </p>

      {/* List */}
      <div className="space-y-2">
        {filtered.map((item) => {
          const stage = getStage(item);
          const badge = stageBadgeStyle[stage];
          const card = cardMap.get(item.id);
          const lastReviewed = card ? formatRelativeDate(card.lastReviewDate) : "";
          return (
            <Link
              key={item.id}
              href={`/grammar/${item.id}`}
              className="block p-4 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-h3 font-jp" lang="ja">
                    {item.pattern}
                  </p>
                  <p className="text-body mt-1">{item.meaning}</p>
                  <p
                    className="text-body-sm mt-1"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {item.formation}
                  </p>
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
              {item.examples.length > 0 && item.examples[0] && (
                <div
                  className="mt-2 p-2 rounded"
                  style={{ backgroundColor: "var(--bg-tertiary)" }}
                >
                  <p className="text-body-sm font-jp" lang="ja">
                    {item.examples[0].japanese}
                  </p>
                  <p className="text-caption mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {item.examples[0].translation}
                  </p>
                </div>
              )}
              <span
                className="inline-flex items-center h-6 px-2.5 rounded text-caption font-medium mt-2"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  color: "var(--text-secondary)",
                }}
              >
                {item.functionGroup}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
