"use client";

import { useState, useEffect, useCallback } from "react";
import { listeningData } from "@/data/listening";
import ReviewSession from "@/components/ReviewSession";
import { getReviewCards } from "@/lib/storage";
import { getDueCards } from "@/lib/srs";

const allExpressions = listeningData.flatMap((video) =>
  video.expressions.map((expr, idx) => ({
    id: `${video.id}-${idx}`,
    videoId: video.videoId,
    videoTitle: video.title,
    ...expr,
  }))
);

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ListeningReviewPage() {
  const findExpr = useCallback(
    (id: string) => allExpressions.find((e) => e.id === id),
    []
  );
  const [crossDue, setCrossDue] = useState<{ label: string; href: string; count: number }[]>([]);

  useEffect(() => {
    const allCards = getReviewCards();
    const dueVocab = getDueCards(allCards.filter((c) => c.contentType === "vocabulary"));
    const dueGrammar = getDueCards(allCards.filter((c) => c.contentType === "grammar"));
    setCrossDue([
      { label: "단어", href: "/vocabulary/review", count: dueVocab.length },
      { label: "문법", href: "/grammar/review", count: dueGrammar.length },
    ]);
  }, []);

  const renderFront = useCallback(
    (contentId: string) => {
      const expr = findExpr(contentId);
      if (!expr) return null;
      return (
        <p className="text-kanji font-jp" lang="ja">
          {expr.expression}
        </p>
      );
    },
    [findExpr]
  );

  const renderBack = useCallback(
    (contentId: string) => {
      const expr = findExpr(contentId);
      if (!expr) return null;
      return (
        <>
          <p className="text-kanji font-jp" lang="ja" style={{ fontSize: "28px" }}>
            {expr.expression}
          </p>
          <p className="text-reading font-jp mt-1" lang="ja" style={{ color: "var(--text-secondary)" }}>
            {expr.expressionReading}
          </p>
          <p className="text-h3 mt-3">{expr.meaning}</p>
          <a
            href="/listening"
            className="inline-flex items-center gap-1.5 mt-2 px-2.5 h-7 rounded text-caption font-medium"
            style={{ backgroundColor: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
          >
            {expr.videoTitle.slice(0, 20)}{expr.videoTitle.length > 20 ? "..." : ""} · {formatTime(expr.startTime)}
          </a>
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-jp-body font-jp" lang="ja">
              {expr.example}
            </p>
            <p className="text-body-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
              {expr.exampleReading}
            </p>
            <p className="text-body-sm mt-1" style={{ color: "var(--text-secondary)" }}>
              {expr.exampleTranslation}
            </p>
          </div>
          {expr.vocabulary.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {expr.vocabulary.map((v, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center h-7 px-2.5 rounded text-caption font-medium"
                  style={{
                    backgroundColor: "var(--primary-light)",
                    color: "var(--primary)",
                  }}
                >
                  <span className="font-jp" lang="ja">{v.word}</span>
                  <span className="mx-1" style={{ color: "var(--text-tertiary)" }}>
                    {v.reading}
                  </span>
                  <span>{v.meaning}</span>
                </span>
              ))}
            </div>
          )}
        </>
      );
    },
    [findExpr]
  );

  return (
    <ReviewSession
      contentType="listening"
      contentData={allExpressions}
      dailyNewKey="dailyNewListening"
      backUrl="/listening"
      backLabel="듣기"
      crossModuleDue={crossDue}
      renderFront={renderFront}
      renderBack={renderBack}
    />
  );
}
