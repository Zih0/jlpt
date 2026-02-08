"use client";

import { useEffect, useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { readingData } from "@/data/reading";
import { getReadingProgress } from "@/lib/storage";
import { ReadingProgress, difficultyLabel, categoryLabel } from "@/lib/types";

const difficultyStyle = {
  short: { bg: "var(--success-light)", color: "var(--success)" },
  medium: { bg: "var(--accent-light)", color: "var(--warning)" },
  long: { bg: "var(--error-light)", color: "var(--error)" },
};

const difficulties: ("all" | "short" | "medium" | "long")[] = ["all", "short", "medium", "long"];
const totalCount = readingData.length;

export default function ReadingPage() {
  const [progress, setProgress] = useState<ReadingProgress[]>([]);
  const [difficultyFilter, setDifficultyFilter] = useState<"all" | "short" | "medium" | "long">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [, startTransition] = useTransition();

  useEffect(() => {
    setProgress(getReadingProgress());
  }, []);

  const completedCount = progress.length;

  const categories = useMemo(() => {
    const cats = new Set<string>();
    readingData.forEach((item) => {
      if (item.category) cats.add(item.category);
    });
    return Array.from(cats).sort();
  }, []);

  const filtered = useMemo(() => {
    let items = readingData;
    if (difficultyFilter !== "all") items = items.filter((p) => p.difficulty === difficultyFilter);
    if (categoryFilter !== "all") items = items.filter((p) => p.category === categoryFilter);
    return items;
  }, [difficultyFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">독해 연습</h1>
        <span className="text-body-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {completedCount} / {totalCount} 완료
        </span>
      </div>

      {/* Difficulty filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {difficulties.map((d) => (
          <button
            key={d}
            onClick={() => startTransition(() => setDifficultyFilter(d))}
            className="h-9 px-3 rounded-lg text-body-sm font-medium whitespace-nowrap border"
            style={{
              backgroundColor:
                difficultyFilter === d ? "var(--primary)" : "var(--bg-secondary)",
              color: difficultyFilter === d ? "white" : "var(--text-secondary)",
              borderColor:
                difficultyFilter === d ? "var(--primary)" : "var(--border)",
            }}
          >
            {d === "all" ? "전체" : difficultyLabel[d]}
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
            className="h-9 px-3 rounded-lg text-body-sm font-medium whitespace-nowrap border"
            style={{
              backgroundColor:
                categoryFilter === cat ? "var(--accent)" : "var(--bg-secondary)",
              color: categoryFilter === cat ? "white" : "var(--text-secondary)",
              borderColor:
                categoryFilter === cat ? "var(--accent)" : "var(--border)",
            }}
          >
            {categoryLabel[cat] || cat}
          </button>
        ))}
      </div>

      <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
        {filtered.length} / {totalCount}개 표시 중
      </p>

      <div className="space-y-2">
        {filtered.map((passage) => {
          const diff = difficultyStyle[passage.difficulty];
          const passageProgress = progress.find((p) => p.passageId === passage.id);
          return (
            <Link
              key={passage.id}
              href={`/reading/${passage.id}`}
              className="block p-4 rounded-lg border cursor-pointer"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className="h-6 px-2.5 rounded text-caption font-medium inline-flex items-center"
                  style={{ backgroundColor: diff.bg, color: diff.color }}
                >
                  {difficultyLabel[passage.difficulty]}
                </span>
                <span
                  className="h-6 px-2.5 rounded text-caption font-medium inline-flex items-center"
                  style={{
                    backgroundColor: "var(--bg-tertiary)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {categoryLabel[passage.category] || passage.category}
                </span>
                {passageProgress && (
                  <span
                    className="h-6 px-2.5 rounded text-caption font-medium inline-flex items-center gap-1"
                    style={{
                      backgroundColor: "var(--success-light)",
                      color: "var(--success)",
                    }}
                  >
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M10 3L4.5 8.5L2 6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    {passageProgress.score}/{passageProgress.totalQuestions}
                  </span>
                )}
              </div>
              <p className="text-h3 font-jp" lang="ja">
                {passage.title}
              </p>
              <p className="text-body-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
                {passage.wordCount}자 &middot; ~{passage.estimatedMinutes}분 &middot; {passage.questions.length}문제
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
