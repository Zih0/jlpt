"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getReviewCards,
  upsertReviewCard,
  addSession,
  updateStreak,
} from "@/lib/storage";
import { reviewCard, getDueCards, getNextInterval } from "@/lib/srs";
import { ReviewCard, SRSRating } from "@/lib/types";
import { vocabularyData } from "@/data/vocabulary";
import { grammarData } from "@/data/grammar";
import { listeningData } from "@/data/listening";

const srsButtons: {
  rating: SRSRating;
  label: string;
  bg: string;
  color: string;
}[] = [
  {
    rating: 0,
    label: "다시",
    bg: "var(--error-light)",
    color: "var(--error)",
  },
  {
    rating: 3,
    label: "어려움",
    bg: "var(--accent-light)",
    color: "var(--warning)",
  },
  {
    rating: 4,
    label: "좋음",
    bg: "var(--success-light)",
    color: "var(--success)",
  },
  {
    rating: 5,
    label: "쉬움",
    bg: "var(--primary-light)",
    color: "var(--primary)",
  },
];

type ContentType = "vocabulary" | "grammar" | "listening";

const moduleBadge: Record<ContentType, { label: string; bg: string; color: string }> = {
  vocabulary: { label: "단어", bg: "var(--primary-light)", color: "var(--primary)" },
  grammar: { label: "문법", bg: "var(--accent-light)", color: "var(--accent)" },
  listening: { label: "듣기", bg: "var(--warning-light, #FFF3E0)", color: "var(--warning)" },
};

const allListeningExpressions = listeningData.flatMap((video) =>
  video.expressions.map((expr, idx) => ({
    id: `${video.id}-${idx}`,
    videoTitle: video.title,
    ...expr,
  }))
);

function interleave(
  vocab: ReviewCard[],
  grammar: ReviewCard[],
  listening: ReviewCard[]
): ReviewCard[] {
  const buckets: ReviewCard[][] = [vocab, grammar, listening].filter(
    (b) => b.length > 0
  );
  if (buckets.length === 0) return [];

  const result: ReviewCard[] = [];
  const indices = buckets.map(() => 0);

  while (indices.some((idx, i) => idx < buckets[i].length)) {
    for (let b = 0; b < buckets.length; b++) {
      if (indices[b] < buckets[b].length) {
        result.push(buckets[b][indices[b]]);
        indices[b]++;
      }
    }
  }

  return result;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

interface SessionResults {
  vocabulary: { reviewed: number; correct: number };
  grammar: { reviewed: number; correct: number };
  listening: { reviewed: number; correct: number };
}

export default function MixedReviewPage() {
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [done, setDone] = useState(false);
  const [results, setResults] = useState<SessionResults>({
    vocabulary: { reviewed: 0, correct: 0 },
    grammar: { reviewed: 0, correct: 0 },
    listening: { reviewed: 0, correct: 0 },
  });
  const [dueSummary, setDueSummary] = useState<Record<ContentType, number>>({
    vocabulary: 0,
    grammar: 0,
    listening: 0,
  });

  useEffect(() => {
    const allCards = getReviewCards();

    // Build valid content ID sets to filter out orphaned review cards
    const validVocabIds = new Set(vocabularyData.map((v) => v.id));
    const validGrammarIds = new Set(grammarData.map((g) => g.id));
    const validListeningIds = new Set(allListeningExpressions.map((e) => e.id));

    const vocabCards = getDueCards(
      allCards.filter((c) => c.contentType === "vocabulary" && validVocabIds.has(c.contentId))
    );
    const grammarCards = getDueCards(
      allCards.filter((c) => c.contentType === "grammar" && validGrammarIds.has(c.contentId))
    );
    const listeningCards = getDueCards(
      allCards.filter((c) => c.contentType === "listening" && validListeningIds.has(c.contentId))
    );

    setDueSummary({
      vocabulary: vocabCards.length,
      grammar: grammarCards.length,
      listening: listeningCards.length,
    });

    const mixed = interleave(vocabCards, grammarCards, listeningCards);
    setQueue(mixed);
  }, []);

  const currentCard = queue[currentIndex];

  const handleRate = useCallback(
    (rating: SRSRating) => {
      if (!currentCard) return;
      const updated = reviewCard(currentCard, rating);
      upsertReviewCard(updated);

      const type = currentCard.contentType;
      setResults((prev) => ({
        ...prev,
        [type]: {
          reviewed: prev[type].reviewed + 1,
          correct: prev[type].correct + (rating > 0 ? 1 : 0),
        },
      }));

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
      } else {
        setDone(true);
        updateStreak();

        // Log a session per module that had cards
        // Compute final results including this last rating (state hasn't updated yet)
        const finalResults = {
          ...results,
          [type]: {
            reviewed: results[type].reviewed + 1,
            correct: results[type].correct + (rating > 0 ? 1 : 0),
          },
        };

        const types: ContentType[] = ["vocabulary", "grammar", "listening"];
        for (const t of types) {
          if (finalResults[t].reviewed > 0) {
            addSession({
              date: new Date().toISOString().split("T")[0],
              module: t,
              cardsReviewed: finalResults[t].reviewed,
              cardsCorrect: finalResults[t].correct,
              newCardsStudied: 0,
            });
          }
        }
      }
    },
    [currentCard, currentIndex, queue.length, results]
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (done) return;
      if (!showAnswer && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShowAnswer(true);
        return;
      }
      if (showAnswer) {
        if (e.key === "1") handleRate(0);
        if (e.key === "2") handleRate(3);
        if (e.key === "3") handleRate(4);
        if (e.key === "4") handleRate(5);
      }
      if (e.key === "Escape") router.push("/");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showAnswer, done, handleRate, router]);

  // --- Render helpers ---

  function renderVocabFront(contentId: string) {
    const item = vocabularyData.find((v) => v.id === contentId);
    if (!item) return null;
    return (
      <p className="text-kanji font-jp" lang="ja">
        {item.word}
      </p>
    );
  }

  function renderVocabBack(contentId: string) {
    const item = vocabularyData.find((v) => v.id === contentId);
    if (!item) return null;
    return (
      <>
        <p className="text-kanji font-jp" lang="ja" style={{ fontSize: "28px" }}>
          {item.word}
        </p>
        <p
          className="text-reading font-jp mt-1"
          lang="ja"
          style={{ color: "var(--text-secondary)" }}
        >
          {item.reading}
        </p>
        <p className="text-h3 mt-3">{item.meaning}</p>
        {item.exampleSentence && (
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-jp-body font-jp" lang="ja">
              {item.exampleSentence}
            </p>
            <p
              className="text-body-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {item.exampleSentenceMeaning}
            </p>
          </div>
        )}
      </>
    );
  }

  function renderGrammarFront(contentId: string) {
    const item = grammarData.find((g) => g.id === contentId);
    if (!item) return null;
    return (
      <p className="text-h2 font-jp text-center" lang="ja">
        {item.pattern}
      </p>
    );
  }

  function renderGrammarBack(contentId: string) {
    const item = grammarData.find((g) => g.id === contentId);
    if (!item) return null;
    return (
      <>
        <p className="text-h3 font-jp" lang="ja">
          {item.pattern}
        </p>
        <p className="text-body mt-2">{item.meaning}</p>
        <div
          className="mt-3 p-2 rounded-lg"
          style={{ backgroundColor: "var(--bg-tertiary)" }}
        >
          <p className="text-body-sm">{item.formation}</p>
        </div>
        {item.examples.length > 0 && (
          <div
            className="mt-4 pt-4 border-t space-y-2"
            style={{ borderColor: "var(--border)" }}
          >
            {item.examples.slice(0, 2).map((ex, i) => (
              <div key={i}>
                <p className="text-body-sm font-jp" lang="ja">
                  {ex.japanese}
                </p>
                <p
                  className="text-caption"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {ex.translation}
                </p>
              </div>
            ))}
          </div>
        )}
      </>
    );
  }

  function renderListeningFront(contentId: string) {
    const expr = allListeningExpressions.find((e) => e.id === contentId);
    if (!expr) return null;
    return (
      <p className="text-kanji font-jp" lang="ja">
        {expr.expression}
      </p>
    );
  }

  function renderListeningBack(contentId: string) {
    const expr = allListeningExpressions.find((e) => e.id === contentId);
    if (!expr) return null;
    return (
      <>
        <p className="text-kanji font-jp" lang="ja" style={{ fontSize: "28px" }}>
          {expr.expression}
        </p>
        <p
          className="text-reading font-jp mt-1"
          lang="ja"
          style={{ color: "var(--text-secondary)" }}
        >
          {expr.expressionReading}
        </p>
        <p className="text-h3 mt-3">{expr.meaning}</p>
        <a
          href="/listening"
          className="inline-flex items-center gap-1.5 mt-2 px-2.5 h-7 rounded text-caption font-medium"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
          }}
        >
          {expr.videoTitle.slice(0, 20)}
          {expr.videoTitle.length > 20 ? "..." : ""} ·{" "}
          {formatTime(expr.startTime)}
        </a>
        {expr.example && (
          <div
            className="mt-4 pt-4 border-t"
            style={{ borderColor: "var(--border)" }}
          >
            <p className="text-jp-body font-jp" lang="ja">
              {expr.example}
            </p>
            <p
              className="text-body-sm mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {expr.exampleTranslation}
            </p>
          </div>
        )}
      </>
    );
  }

  function renderFront(card: ReviewCard) {
    switch (card.contentType) {
      case "vocabulary":
        return renderVocabFront(card.contentId);
      case "grammar":
        return renderGrammarFront(card.contentId);
      case "listening":
        return renderListeningFront(card.contentId);
    }
  }

  function renderBack(card: ReviewCard) {
    switch (card.contentType) {
      case "vocabulary":
        return renderVocabBack(card.contentId);
      case "grammar":
        return renderGrammarBack(card.contentId);
      case "listening":
        return renderListeningBack(card.contentId);
    }
  }

  // --- No cards due ---
  if (queue.length === 0) {
    return (
      <div className="text-center py-20">
        <h1 className="text-h1 mb-2">복습할 카드 없음</h1>
        <p
          className="text-body mb-6"
          style={{ color: "var(--text-secondary)" }}
        >
          모두 완료! 나중에 다시 오세요.
        </p>
        <button
          onClick={() => router.push("/")}
          className="h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  // --- Session complete ---
  if (done) {
    const totalReviewed =
      results.vocabulary.reviewed +
      results.grammar.reviewed +
      results.listening.reviewed;
    const totalCorrect =
      results.vocabulary.correct +
      results.grammar.correct +
      results.listening.correct;
    const accuracy =
      totalReviewed > 0 ? Math.round((totalCorrect / totalReviewed) * 100) : 0;

    const moduleRows: { label: string; type: ContentType; color: string }[] = [
      { label: "단어", type: "vocabulary", color: "var(--primary)" },
      { label: "문법", type: "grammar", color: "var(--accent)" },
      { label: "듣기", type: "listening", color: "var(--warning)" },
    ];

    return (
      <div className="text-center py-20">
        <h1 className="text-h1 mb-4">세션 완료</h1>
        <div
          className="max-w-sm mx-auto p-4 rounded-lg border space-y-3"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          {/* Overall stats */}
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>복습 완료</span>
            <span className="font-bold">{totalReviewed}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>정답률</span>
            <span className="font-bold" style={{ color: "var(--success)" }}>
              {accuracy}%
            </span>
          </div>

          {/* Per-module breakdown */}
          <div
            className="pt-3 border-t space-y-2"
            style={{ borderColor: "var(--border)" }}
          >
            {moduleRows
              .filter((m) => results[m.type].reviewed > 0)
              .map((m) => {
                const r = results[m.type];
                const acc =
                  r.reviewed > 0
                    ? Math.round((r.correct / r.reviewed) * 100)
                    : 0;
                return (
                  <div key={m.type} className="flex items-center justify-between">
                    <span
                      className="text-body-sm font-medium"
                      style={{ color: m.color }}
                    >
                      {m.label}
                    </span>
                    <span
                      className="text-body-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {r.reviewed}장 &middot; {acc}%
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
        <button
          onClick={() => router.push("/")}
          className="mt-6 h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          대시보드로 돌아가기
        </button>
      </div>
    );
  }

  // --- Active review ---
  const totalCards = queue.length;
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;
  const badge = moduleBadge[currentCard.contentType];

  return (
    <div className="max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-body-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          {currentIndex + 1} / {totalCards}
        </span>
        <button
          onClick={() => router.push("/")}
          className="text-body-sm font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          &times; 나가기
        </button>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full mb-6"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: "var(--primary)" }}
        />
      </div>

      {/* Module badge */}
      <div className="mb-3">
        <span
          className="inline-flex items-center h-6 px-2.5 rounded-full text-caption font-semibold"
          style={{ backgroundColor: badge.bg, color: badge.color }}
        >
          {badge.label}
        </span>
      </div>

      {/* Card */}
      <div
        className="rounded-lg border p-6 min-h-[300px] flex flex-col"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        {!showAnswer ? (
          <div
            className="flex-1 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setShowAnswer(true)}
            role="button"
            tabIndex={0}
            aria-label="Tap to show answer"
          >
            {renderFront(currentCard)}
            <p
              className="text-body-sm mt-6"
              style={{ color: "var(--text-tertiary)" }}
            >
              탭하여 답 확인
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {renderBack(currentCard)}
          </div>
        )}
      </div>

      {/* Rating buttons */}
      {showAnswer && currentCard && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          {srsButtons.map(({ rating, label, bg, color }) => (
            <button
              key={rating}
              onClick={() => handleRate(rating)}
              className="flex flex-col items-center justify-center h-14 rounded-lg font-semibold text-body-sm"
              style={{ backgroundColor: bg, color }}
            >
              <span>{label}</span>
              <span className="text-caption font-normal opacity-80">
                {getNextInterval(currentCard, rating)}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Keyboard hints */}
      <p
        className="text-caption mt-3 text-center hidden sm:block"
        style={{ color: "var(--text-tertiary)" }}
      >
        {showAnswer
          ? "1 다시  2 어려움  3 좋음  4 쉬움"
          : "Space / Enter로 뒤집기"}
      </p>
    </div>
  );
}
