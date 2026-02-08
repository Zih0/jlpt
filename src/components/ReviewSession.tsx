"use client";

import { useState, useEffect, useCallback, ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getReviewCards,
  getSettings,
  upsertReviewCard,
  addSession,
  updateStreak,
} from "@/lib/storage";
import {
  reviewCard,
  createReviewCard,
  getDueCards,
  getNextInterval,
} from "@/lib/srs";
import { ReviewCard, SRSRating } from "@/lib/types";

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

interface ReviewSessionProps {
  contentType: "vocabulary" | "grammar" | "listening";
  contentData: { id: string }[];
  dailyNewKey: "dailyNewVocab" | "dailyNewGrammar" | "dailyNewListening";
  backUrl: string;
  backLabel: string;
  renderFront: (contentId: string) => ReactNode;
  renderBack: (contentId: string) => ReactNode;
  onShowAnswer?: (contentId: string) => void;
  crossModuleDue?: { label: string; href: string; count: number }[];
  /** Set of valid content IDs to filter out orphaned review cards */
  validContentIds?: Set<string>;
}

export default function ReviewSession({
  contentType,
  contentData,
  dailyNewKey,
  backUrl,
  backLabel,
  renderFront,
  renderBack,
  onShowAnswer,
  crossModuleDue,
  validContentIds,
}: ReviewSessionProps) {
  const router = useRouter();
  const [queue, setQueue] = useState<ReviewCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [totalCards, setTotalCards] = useState(0);
  const [reviewed, setReviewed] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [newCards, setNewCards] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const settings = getSettings();
    const allCards = getReviewCards();
    const typeCards = allCards.filter((c) => c.contentType === contentType);

    // Filter out orphaned cards whose content no longer exists
    const contentIdSet = validContentIds ?? new Set(contentData.map((d) => d.id));
    const validTypeCards = typeCards.filter((c) => contentIdSet.has(c.contentId));

    const due = getDueCards(validTypeCards);

    const existingIds = new Set(validTypeCards.map((c) => c.contentId));
    const newItems = contentData
      .filter((item) => !existingIds.has(item.id))
      .slice(0, settings[dailyNewKey]);
    const newReviewCards = newItems.map((item) =>
      createReviewCard(contentType, item.id)
    );
    newReviewCards.forEach((c) => upsertReviewCard(c));

    const combined = [...due, ...newReviewCards];
    setQueue(combined);
    setTotalCards(combined.length);
  }, [contentType, contentData, dailyNewKey, validContentIds]);

  const currentCard = queue[currentIndex];

  const revealAnswer = useCallback(() => {
    setShowAnswer(true);
    if (currentCard && onShowAnswer) {
      onShowAnswer(currentCard.contentId);
    }
  }, [currentCard, onShowAnswer]);

  const handleRate = useCallback(
    (rating: SRSRating) => {
      if (!currentCard) return;
      const updated = reviewCard(currentCard, rating);
      upsertReviewCard(updated);
      setReviewed((r) => r + 1);
      if (rating > 0) setCorrect((c) => c + 1);
      if (currentCard.totalReviews === 0) setNewCards((n) => n + 1);

      if (currentIndex + 1 < queue.length) {
        setCurrentIndex((i) => i + 1);
        setShowAnswer(false);
      } else {
        setDone(true);
        updateStreak();
        addSession({
          date: new Date().toISOString().split("T")[0],
          module: contentType,
          cardsReviewed: reviewed + 1,
          cardsCorrect: correct + (rating > 0 ? 1 : 0),
          newCardsStudied: newCards + (currentCard.totalReviews === 0 ? 1 : 0),
        });
      }
    },
    [
      currentCard,
      currentIndex,
      queue.length,
      reviewed,
      correct,
      newCards,
      contentType,
    ]
  );

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (done) return;
      if (!showAnswer && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        revealAnswer();
        return;
      }
      if (showAnswer) {
        if (e.key === "1") handleRate(0);
        if (e.key === "2") handleRate(3);
        if (e.key === "3") handleRate(4);
        if (e.key === "4") handleRate(5);
      }
      if (e.key === "Escape") router.push(backUrl);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [showAnswer, done, handleRate, revealAnswer, router, backUrl]);

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
          onClick={() => router.push(backUrl)}
          className="h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {backLabel}(으)로 돌아가기
        </button>
      </div>
    );
  }

  if (done) {
    const accuracy = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;
    return (
      <div className="text-center py-20">
        <h1 className="text-h1 mb-4">세션 완료</h1>
        <div
          className="max-w-xs mx-auto p-4 rounded-lg border space-y-2"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>복습 완료</span>
            <span className="font-bold">{reviewed}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>정답률</span>
            <span className="font-bold" style={{ color: "var(--success)" }}>
              {accuracy}%
            </span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: "var(--text-secondary)" }}>신규</span>
            <span className="font-bold">{newCards}</span>
          </div>
        </div>
        <button
          onClick={() => router.push(backUrl)}
          className="mt-6 h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {backLabel}(으)로 돌아가기
        </button>
        {crossModuleDue && crossModuleDue.filter((m) => m.count > 0).length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-caption" style={{ color: "var(--text-secondary)" }}>
              계속 학습하기
            </p>
            {crossModuleDue
              .filter((m) => m.count > 0)
              .map((m) => (
                <Link
                  key={m.href}
                  href={m.href}
                  className="inline-flex items-center justify-center h-9 px-4 rounded-lg text-body-sm font-medium border mx-1"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-secondary)",
                  }}
                >
                  {m.label} ({m.count}개 남음)
                </Link>
              ))}
          </div>
        )}
      </div>
    );
  }

  const progress = totalCards > 0 ? ((currentIndex + 1) / totalCards) * 100 : 0;

  return (
    <div className="max-w-md mx-auto">
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-body-sm"
          style={{ color: "var(--text-secondary)" }}
        >
          복습 {currentIndex + 1} / {totalCards}
          {reviewed > 0 && (
            <span
              style={{
                color:
                  Math.round((correct / reviewed) * 100) >= 70
                    ? "var(--success)"
                    : "var(--error)",
              }}
            >
              {" "}
              &middot; {Math.round((correct / reviewed) * 100)}%
            </span>
          )}
        </span>
        <button
          onClick={() => router.push(backUrl)}
          className="text-body-sm font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          &times; 나가기
        </button>
      </div>

      <div
        className="w-full h-2 rounded-full mb-8"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full"
          style={{ width: `${progress}%`, backgroundColor: "var(--primary)" }}
        />
      </div>

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
            onClick={revealAnswer}
            role="button"
            tabIndex={0}
            aria-label="Tap to show answer"
          >
            {renderFront(currentCard.contentId)}
            <p
              className="text-body-sm mt-6"
              style={{ color: "var(--text-tertiary)" }}
            >
              탭하여 답 확인
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            {renderBack(currentCard.contentId)}
          </div>
        )}
      </div>

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
