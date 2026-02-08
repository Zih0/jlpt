"use client";

import { useCallback, useState, useEffect } from "react";
import { grammarData } from "@/data/grammar";
import ReviewSession from "@/components/ReviewSession";
import { useTTS } from "@/hooks/useTTS";
import { getSettings, getReviewCards } from "@/lib/storage";
import { getDueCards } from "@/lib/srs";

function findItem(id: string) {
  return grammarData.find((g) => g.id === id);
}

export default function GrammarReviewPage() {
  const { speak, supported } = useTTS();
  const [crossDue, setCrossDue] = useState<{ label: string; href: string; count: number }[]>([]);

  useEffect(() => {
    const allCards = getReviewCards();
    const dueVocab = getDueCards(allCards.filter((c) => c.contentType === "vocabulary"));
    const dueListening = getDueCards(allCards.filter((c) => c.contentType === "listening"));
    setCrossDue([
      { label: "단어", href: "/vocabulary/review", count: dueVocab.length },
      { label: "듣기", href: "/listening/review", count: dueListening.length },
    ]);
  }, []);

  const handleShowAnswer = useCallback(
    (contentId: string) => {
      const settings = getSettings();
      if (!settings.autoPlayAudio) return;
      const item = findItem(contentId);
      if (item && item.examples.length > 0) {
        speak(item.examples[0].japanese);
      }
    },
    [speak]
  );

  const renderFront = useCallback((contentId: string) => {
    const item = findItem(contentId);
    if (!item) return null;
    return (
      <p className="text-h2 font-jp text-center" lang="ja">
        {item.pattern}
      </p>
    );
  }, []);

  const renderBack = useCallback((contentId: string) => {
    const item = findItem(contentId);
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
        <div
          className="mt-4 pt-4 border-t space-y-2"
          style={{ borderColor: "var(--border)" }}
        >
          {item.examples.slice(0, 2).map((ex, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <p className="text-body-sm font-jp" lang="ja">
                  {ex.japanese}
                </p>
                {supported && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(ex.japanese);
                    }}
                    className="text-body-sm shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                    aria-label="Play example sentence"
                  >
                    &#x1f50a;
                  </button>
                )}
              </div>
              <p className="text-caption" style={{ color: "var(--text-tertiary)" }}>
                {ex.translation}
              </p>
            </div>
          ))}
        </div>
      </>
    );
  }, [supported, speak]);

  const renderReverseFront = useCallback((contentId: string) => {
    const item = findItem(contentId);
    if (!item) return null;
    return (
      <p className="text-h2 text-center">
        {item.meaning}
      </p>
    );
  }, []);

  const renderReverseBack = useCallback((contentId: string) => {
    const item = findItem(contentId);
    if (!item) return null;
    return (
      <>
        <p className="text-body mb-3">{item.meaning}</p>
        <p className="text-h3 font-jp" lang="ja">
          {item.pattern}
        </p>
        <div
          className="mt-3 p-2 rounded-lg"
          style={{ backgroundColor: "var(--bg-tertiary)" }}
        >
          <p className="text-body-sm">{item.formation}</p>
        </div>
        <div
          className="mt-4 pt-4 border-t space-y-2"
          style={{ borderColor: "var(--border)" }}
        >
          {item.examples.slice(0, 2).map((ex, i) => (
            <div key={i}>
              <div className="flex items-center gap-2">
                <p className="text-body-sm font-jp" lang="ja">
                  {ex.japanese}
                </p>
                {supported && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(ex.japanese);
                    }}
                    className="text-body-sm shrink-0"
                    style={{ color: "var(--text-secondary)" }}
                    aria-label="Play example sentence"
                  >
                    &#x1f50a;
                  </button>
                )}
              </div>
              <p className="text-caption" style={{ color: "var(--text-tertiary)" }}>
                {ex.translation}
              </p>
            </div>
          ))}
        </div>
      </>
    );
  }, [supported, speak]);

  return (
    <ReviewSession
      contentType="grammar"
      contentData={grammarData}
      dailyNewKey="dailyNewGrammar"
      backUrl="/grammar"
      backLabel="문법"
      onShowAnswer={handleShowAnswer}
      crossModuleDue={crossDue}
      renderFront={renderFront}
      renderBack={renderBack}
      renderReverseFront={renderReverseFront}
      renderReverseBack={renderReverseBack}
    />
  );
}
