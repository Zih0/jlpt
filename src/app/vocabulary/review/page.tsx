"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { vocabularyData } from "@/data/vocabulary";
import ReviewSession from "@/components/ReviewSession";
import { useTTS } from "@/hooks/useTTS";
import { getSettings, getReviewCards } from "@/lib/storage";
import { getDueCards } from "@/lib/srs";

const findItem = (id: string) => vocabularyData.find((v) => v.id === id);

export default function VocabularyReviewPage() {
  const { speak, supported } = useTTS();
  const [crossDue, setCrossDue] = useState<{ label: string; href: string; count: number }[]>([]);

  useEffect(() => {
    const allCards = getReviewCards();
    const dueGrammar = getDueCards(allCards.filter((c) => c.contentType === "grammar"));
    const dueListening = getDueCards(allCards.filter((c) => c.contentType === "listening"));
    setCrossDue([
      { label: "문법", href: "/grammar/review", count: dueGrammar.length },
      { label: "듣기", href: "/listening/review", count: dueListening.length },
    ]);
  }, []);

  const handleShowAnswer = useCallback(
    (contentId: string) => {
      const settings = getSettings();
      if (!settings.autoPlayAudio) return;
      const item = findItem(contentId);
      if (item) speak(item.word);
    },
    [speak]
  );

  const renderFront = useCallback((contentId: string) => {
    const item = findItem(contentId);
    if (!item) return null;
    return (
      <p className="text-kanji font-jp" lang="ja">
        {item.word}
      </p>
    );
  }, []);

  const renderBack = useCallback((contentId: string) => {
    const item = findItem(contentId);
    if (!item) return null;
    return (
      <>
        <div className="flex items-center gap-2">
          <p className="text-kanji font-jp" lang="ja" style={{ fontSize: "28px" }}>
            {item.word}
          </p>
          {supported && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                speak(item.word);
              }}
              className="text-body-sm shrink-0"
              style={{ color: "var(--text-secondary)" }}
              aria-label={`Play pronunciation of ${item.word}`}
            >
              &#x1f50a;
            </button>
          )}
        </div>
        <p className="text-reading font-jp mt-1" lang="ja" style={{ color: "var(--text-secondary)" }}>
          {item.reading}
        </p>
        <p className="text-h3 mt-3">{item.meaning}</p>
        {item.kanjiBreakdown.length > 0 && (
          <div className="mt-3 space-y-1 text-body-sm" style={{ color: "var(--text-tertiary)" }}>
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
        <div
          className="mt-4 pt-4 border-t"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-2">
            <p className="text-jp-body font-jp" lang="ja">
              {item.exampleSentence}
            </p>
            {supported && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speak(item.exampleSentence);
                }}
                className="text-body-sm shrink-0"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Play example sentence"
              >
                &#x1f50a;
              </button>
            )}
          </div>
          <p className="text-body-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            {item.exampleSentenceMeaning}
          </p>
        </div>
      </>
    );
  }, [supported, speak]);

  return (
    <ReviewSession
      contentType="vocabulary"
      contentData={vocabularyData}
      dailyNewKey="dailyNewVocab"
      backUrl="/vocabulary"
      backLabel="단어"
      onShowAnswer={handleShowAnswer}
      crossModuleDue={crossDue}
      renderFront={renderFront}
      renderBack={renderBack}
    />
  );
}
