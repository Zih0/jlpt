"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getReviewCards } from "@/lib/storage";
import { ReviewCard, getSRSStage, isStruggling } from "@/lib/types";
import { vocabularyData } from "@/data/vocabulary";
import { grammarData } from "@/data/grammar";
import { listeningData } from "@/data/listening";

type ContentType = "vocabulary" | "grammar" | "listening";
type CramFilter = "all" | "struggling" | "mature";
type CramCount = 10 | 20 | 30 | "all";
type CramPhase = "setup" | "session" | "results";

interface CramCard {
  contentType: ContentType;
  contentId: string;
}

interface SessionResults {
  vocabulary: { reviewed: number; correct: number };
  grammar: { reviewed: number; correct: number };
  listening: { reviewed: number; correct: number };
}

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

const CRAM_COUNT_OPTIONS: CramCount[] = [10, 20, 30, "all"];

const CRAM_FILTER_OPTIONS: { value: CramFilter; label: string }[] = [
  { value: "all", label: "전체 카드" },
  { value: "struggling", label: "어려운 항목" },
  { value: "mature", label: "완료" },
];

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function CramPage() {
  const router = useRouter();

  // Setup state
  const [selectedModules, setSelectedModules] = useState<Set<ContentType>>(
    new Set(["vocabulary", "grammar", "listening"])
  );
  const [cardCount, setCardCount] = useState<CramCount>(20);
  const [filter, setFilter] = useState<CramFilter>("all");

  // Session state
  const [phase, setPhase] = useState<CramPhase>("setup");
  const [queue, setQueue] = useState<CramCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [flashColor, setFlashColor] = useState<string | null>(null);
  const [results, setResults] = useState<SessionResults>({
    vocabulary: { reviewed: 0, correct: 0 },
    grammar: { reviewed: 0, correct: 0 },
    listening: { reviewed: 0, correct: 0 },
  });

  // Available card counts per module (for display on setup screen)
  const [availableCounts, setAvailableCounts] = useState<Record<ContentType, number>>({
    vocabulary: 0,
    grammar: 0,
    listening: 0,
  });

  useEffect(() => {
    const srsCards = getReviewCards();

    const countForModule = (type: ContentType, allIds: string[]): number => {
      if (filter === "all") return allIds.length;
      const cardsOfType = srsCards.filter((c) => c.contentType === type);
      if (filter === "struggling") {
        return cardsOfType.filter(isStruggling).length;
      }
      // mature
      return cardsOfType.filter((c) => getSRSStage(c) === "mature").length;
    };

    const vocabIds = vocabularyData.map((v) => v.id);
    const grammarIds = grammarData.map((g) => g.id);
    const listeningIds = allListeningExpressions.map((e) => e.id);

    setAvailableCounts({
      vocabulary: countForModule("vocabulary", vocabIds),
      grammar: countForModule("grammar", grammarIds),
      listening: countForModule("listening", listeningIds),
    });
  }, [filter]);

  const toggleModule = (mod: ContentType) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        if (next.size > 1) next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  };

  const startCram = () => {
    const srsCards = getReviewCards();

    const getFilteredIds = (type: ContentType, allIds: string[]): string[] => {
      if (filter === "all") return allIds;
      const cardsOfType = srsCards.filter((c) => c.contentType === type);
      if (filter === "struggling") {
        return cardsOfType.filter(isStruggling).map((c) => c.contentId);
      }
      // mature
      return cardsOfType
        .filter((c) => getSRSStage(c) === "mature")
        .map((c) => c.contentId);
    };

    let cards: CramCard[] = [];

    if (selectedModules.has("vocabulary")) {
      const ids = getFilteredIds("vocabulary", vocabularyData.map((v) => v.id));
      cards.push(...ids.map((id) => ({ contentType: "vocabulary" as const, contentId: id })));
    }
    if (selectedModules.has("grammar")) {
      const ids = getFilteredIds("grammar", grammarData.map((g) => g.id));
      cards.push(...ids.map((id) => ({ contentType: "grammar" as const, contentId: id })));
    }
    if (selectedModules.has("listening")) {
      const ids = getFilteredIds("listening", allListeningExpressions.map((e) => e.id));
      cards.push(...ids.map((id) => ({ contentType: "listening" as const, contentId: id })));
    }

    cards = shuffle(cards);

    if (cardCount !== "all") {
      cards = cards.slice(0, cardCount);
    }

    if (cards.length === 0) return;

    setQueue(cards);
    setCurrentIndex(0);
    setShowAnswer(false);
    setResults({
      vocabulary: { reviewed: 0, correct: 0 },
      grammar: { reviewed: 0, correct: 0 },
      listening: { reviewed: 0, correct: 0 },
    });
    setPhase("session");
  };

  const currentCard = queue[currentIndex] as CramCard | undefined;

  const handleRate = useCallback(
    (correct: boolean) => {
      if (!currentCard) return;

      // Visual feedback flash
      setFlashColor(correct ? "var(--success)" : "var(--error)");
      setTimeout(() => setFlashColor(null), 300);

      const type = currentCard.contentType;
      setResults((prev) => ({
        ...prev,
        [type]: {
          reviewed: prev[type].reviewed + 1,
          correct: prev[type].correct + (correct ? 1 : 0),
        },
      }));

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
      } else {
        setPhase("results");
      }
    },
    [currentCard, currentIndex, queue.length]
  );

  // Keyboard shortcuts
  useEffect(() => {
    if (phase !== "session") return;

    function handleKey(e: KeyboardEvent) {
      if (!showAnswer && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setShowAnswer(true);
        return;
      }
      if (showAnswer) {
        if (e.key === "1") handleRate(false);
        if (e.key === "2") handleRate(true);
      }
      if (e.key === "Escape") router.push("/");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [phase, showAnswer, handleRate, router]);

  // --- Render helpers (same as /review) ---

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
          {expr.videoTitle.length > 20 ? "..." : ""} &middot;{" "}
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

  function renderFront(card: CramCard) {
    switch (card.contentType) {
      case "vocabulary":
        return renderVocabFront(card.contentId);
      case "grammar":
        return renderGrammarFront(card.contentId);
      case "listening":
        return renderListeningFront(card.contentId);
    }
  }

  function renderBack(card: CramCard) {
    switch (card.contentType) {
      case "vocabulary":
        return renderVocabBack(card.contentId);
      case "grammar":
        return renderGrammarBack(card.contentId);
      case "listening":
        return renderListeningBack(card.contentId);
    }
  }

  const totalAvailable = useMemo(
    () =>
      Array.from(selectedModules).reduce(
        (sum, mod) => sum + availableCounts[mod],
        0
      ),
    [selectedModules, availableCounts]
  );

  // ========== SETUP SCREEN ==========
  if (phase === "setup") {

    return (
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-h1">벼락치기</h1>
          <button
            onClick={() => router.push("/")}
            className="text-body-sm font-medium"
            style={{ color: "var(--text-tertiary)" }}
          >
            &times; 취소
          </button>
        </div>

        <p
          className="text-body-sm mb-6"
          style={{ color: "var(--text-secondary)" }}
        >
          SRS 일정에 영향을 주지 않고 카드를 학습합니다. 시험 전 벼락치기에
          좋습니다.
        </p>

        <div
          className="rounded-lg border p-5 space-y-5"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          {/* Module selection */}
          <div>
            <h3 className="text-body-sm font-semibold mb-3">모듈</h3>
            <div className="space-y-2">
              {(["vocabulary", "grammar", "listening"] as ContentType[]).map(
                (mod) => {
                  const checked = selectedModules.has(mod);
                  const badge = moduleBadge[mod];
                  return (
                    <label
                      key={mod}
                      className="flex items-center justify-between p-3 rounded-lg cursor-pointer"
                      style={{
                        backgroundColor: checked
                          ? badge.bg
                          : "var(--bg-tertiary)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleModule(mod)}
                          className="w-4 h-4 rounded"
                          style={{ accentColor: badge.color }}
                        />
                        <span className="font-medium">{badge.label}</span>
                      </div>
                      <span
                        className="text-body-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {availableCounts[mod]}장
                      </span>
                    </label>
                  );
                }
              )}
            </div>
          </div>

          {/* Card count */}
          <div>
            <h3 className="text-body-sm font-semibold mb-3">카드 수</h3>
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--bg-tertiary)" }}>
              {CRAM_COUNT_OPTIONS.map((opt) => {
                const active = cardCount === opt;
                const label = opt === "all" ? "전체" : String(opt);
                return (
                  <button
                    key={label}
                    onClick={() => setCardCount(opt)}
                    className="flex-1 h-9 rounded-md text-body-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? "var(--bg-secondary)" : "transparent",
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter */}
          <div>
            <h3 className="text-body-sm font-semibold mb-3">필터</h3>
            <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--bg-tertiary)" }}>
              {CRAM_FILTER_OPTIONS.map((opt) => {
                const active = filter === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setFilter(opt.value)}
                    className="flex-1 h-9 rounded-md text-body-sm font-medium transition-colors"
                    style={{
                      backgroundColor: active ? "var(--bg-secondary)" : "transparent",
                      color: active ? "var(--text-primary)" : "var(--text-secondary)",
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Start button */}
        <button
          onClick={startCram}
          disabled={totalAvailable === 0}
          className="w-full mt-5 h-12 rounded-lg text-body font-semibold text-white transition-opacity"
          style={{
            backgroundColor: "var(--accent)",
            opacity: totalAvailable === 0 ? 0.5 : 1,
          }}
        >
          {totalAvailable === 0
            ? "사용 가능한 카드 없음"
            : `벼락치기 시작 (${
                cardCount === "all"
                  ? totalAvailable
                  : Math.min(cardCount, totalAvailable)
              }장)`}
        </button>
      </div>
    );
  }

  // ========== RESULTS SCREEN ==========
  if (phase === "results") {
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
      <div className="text-center py-20 max-w-md mx-auto">
        {/* Cram badge */}
        <span
          className="inline-flex items-center h-6 px-2.5 rounded-full text-caption font-semibold mb-3"
          style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
        >
          CRAM
        </span>

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
            <span style={{ color: "var(--text-secondary)" }}>총 복습</span>
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

          {/* SRS note */}
          <p
            className="text-caption pt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            벼락치기 모드 -- SRS에 영향 없음
          </p>
        </div>

        <div className="flex gap-3 justify-center mt-6">
          <button
            onClick={() => {
              setPhase("setup");
              setCurrentIndex(0);
              setShowAnswer(false);
            }}
            className="h-11 px-5 rounded-lg text-body-sm font-semibold border"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-secondary)",
            }}
          >
            다시 벼락치기
          </button>
          <button
            onClick={() => router.push("/")}
            className="h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
            style={{ backgroundColor: "var(--accent)" }}
          >
            대시보드로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ========== SESSION SCREEN ==========
  if (!currentCard) return null;

  const totalCards = queue.length;
  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;
  const badge = moduleBadge[currentCard.contentType];

  return (
    <div className="max-w-md mx-auto">
      {/* Flash overlay for visual feedback */}
      {flashColor && (
        <div
          className="fixed inset-0 pointer-events-none z-50 transition-opacity"
          style={{ backgroundColor: flashColor, opacity: 0.12 }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center h-5 px-2 rounded-full text-caption font-semibold"
            style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
          >
            CRAM
          </span>
          <span
            className="text-body-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            {currentIndex + 1} / {totalCards}
          </span>
        </div>
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
          style={{ width: `${progress}%`, backgroundColor: "var(--accent)" }}
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

      {/* Rating buttons (simplified: Got It / Again) */}
      {showAnswer && currentCard && (
        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => handleRate(false)}
            className="flex items-center justify-center h-14 rounded-lg font-semibold text-body-sm"
            style={{
              backgroundColor: "var(--error-light)",
              color: "var(--error)",
            }}
          >
            다시
          </button>
          <button
            onClick={() => handleRate(true)}
            className="flex items-center justify-center h-14 rounded-lg font-semibold text-body-sm"
            style={{
              backgroundColor: "var(--success-light)",
              color: "var(--success)",
            }}
          >
            맞음
          </button>
        </div>
      )}

      {/* Keyboard hints */}
      <p
        className="text-caption mt-3 text-center hidden sm:block"
        style={{ color: "var(--text-tertiary)" }}
      >
        {showAnswer ? "1 다시  2 맞음" : "Space / Enter로 뒤집기"}
      </p>
    </div>
  );
}
