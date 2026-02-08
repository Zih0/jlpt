"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { vocabularyData } from "@/data/vocabulary";
import { grammarData } from "@/data/grammar";
import { getReviewCards } from "@/lib/storage";
import { ReviewCard, getSRSStage, SRSStage, stageBadgeStyle, stageLabel } from "@/lib/types";
import { useTTS } from "@/hooks/useTTS";

export default function VocabDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const item = vocabularyData.find((v) => v.id === id);
  const [reviewCard, setReviewCard] = useState<ReviewCard | null>(null);
  const { speak, supported } = useTTS();

  useEffect(() => {
    const cards = getReviewCards();
    const card = cards.find(
      (c) => c.contentType === "vocabulary" && c.contentId === id
    );
    if (card) setReviewCard(card);
  }, [id]);

  if (!item) {
    return (
      <div className="text-center py-12">
        <p className="text-h2">단어를 찾을 수 없습니다</p>
        <button
          onClick={() => router.push("/vocabulary")}
          className="mt-4 h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          단어로 돌아가기
        </button>
      </div>
    );
  }

  const stage: SRSStage = reviewCard ? getSRSStage(reviewCard) : "new";
  const badge = stageBadgeStyle[stage];

  // Related vocabulary: same category, excluding self, limit 5
  const related = useMemo(
    () => vocabularyData
      .filter((v) => v.category === item.category && v.id !== item.id)
      .slice(0, 5),
    [item]
  );

  // Related grammar: patterns whose examples contain this word
  const relatedGrammar = useMemo(
    () => grammarData
      .filter((g) =>
        g.examples.some((ex) => ex.japanese.includes(item.word))
      )
      .slice(0, 5),
    [item]
  );

  // Format next review date
  const nextReviewLabel = useMemo(() => {
    if (!reviewCard) return "아직 학습하지 않음";
    if (!reviewCard.dueDate) return "예정 없음";
    const due = new Date(reviewCard.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    const diffDays = Math.round(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (diffDays < 0) return "기한 초과";
    if (diffDays === 0) return "오늘";
    if (diffDays === 1) return "내일";
    return `${diffDays}일 후`;
  }, [reviewCard]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => router.push("/vocabulary")}
        className="text-body-sm font-medium"
        style={{ color: "var(--primary)" }}
      >
        &larr; 단어
      </button>

      {/* Header */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-kanji font-jp" lang="ja" style={{ fontSize: "36px" }}>
                {item.word}
              </p>
              {supported && (
                <button
                  onClick={() => speak(item.word)}
                  className="text-body shrink-0"
                  style={{ color: "var(--text-secondary)" }}
                  aria-label={`Play pronunciation of ${item.word}`}
                >
                  &#x1f50a;
                </button>
              )}
            </div>
            <p
              className="text-reading font-jp mt-1"
              lang="ja"
              style={{ color: "var(--text-secondary)" }}
            >
              {item.reading}
            </p>
            <p className="text-h3 mt-2">{item.meaning}</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span
              className="inline-flex items-center h-7 px-2.5 rounded text-caption font-medium"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {stageLabel[stage]}
            </span>
            <span
              className="inline-flex items-center h-7 px-2.5 rounded text-caption font-medium"
              style={{
                backgroundColor: "var(--bg-tertiary)",
                color: "var(--text-secondary)",
              }}
            >
              {item.partOfSpeech}
            </span>
          </div>
        </div>
      </div>

      {/* Kanji Breakdown */}
      {item.kanjiBreakdown.length > 0 && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="text-h3 mb-3">한자 분석</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {item.kanjiBreakdown.map((k) => (
              <Link
                key={k.char}
                href="/kanji"
                className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                <span
                  className="text-kanji font-jp"
                  lang="ja"
                  style={{ fontSize: "28px" }}
                >
                  {k.char}
                </span>
                <span
                  className="text-body-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {k.gloss}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Example Sentence */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <h2 className="text-h3 mb-3">예문</h2>
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: "var(--bg-tertiary)" }}
        >
          <div className="flex items-start gap-2">
            <p className="text-jp-body font-jp leading-relaxed" lang="ja">
              {item.exampleSentence}
            </p>
            {supported && (
              <button
                onClick={() => speak(item.exampleSentence)}
                className="text-body-sm shrink-0 mt-0.5"
                style={{ color: "var(--text-secondary)" }}
                aria-label="Play example sentence"
              >
                &#x1f50a;
              </button>
            )}
          </div>
          <p
            className="text-body-sm font-jp mt-1.5"
            lang="ja"
            style={{ color: "var(--text-tertiary)" }}
          >
            {item.exampleSentenceReading}
          </p>
          <p
            className="text-body font-medium mt-1.5"
            style={{ color: "var(--text-secondary)" }}
          >
            {item.exampleSentenceMeaning}
          </p>
        </div>
      </div>

      {/* SRS Status */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <h2 className="text-h3 mb-3">SRS 상태</h2>
        <div className="grid grid-cols-2 gap-3">
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <p
              className="text-caption font-semibold mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              단계
            </p>
            <span
              className="inline-flex items-center h-7 px-2.5 rounded text-caption font-medium"
              style={{ backgroundColor: badge.bg, color: badge.color }}
            >
              {stageLabel[stage]}
            </span>
          </div>
          <div
            className="p-3 rounded-lg"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <p
              className="text-caption font-semibold mb-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              다음 복습
            </p>
            <p className="text-body-sm font-medium">{nextReviewLabel}</p>
          </div>
          {reviewCard && (
            <>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                <p
                  className="text-caption font-semibold mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  간격
                </p>
                <p className="text-body-sm font-medium">
                  {reviewCard.interval}일
                </p>
              </div>
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                <p
                  className="text-caption font-semibold mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  정답률
                </p>
                <p className="text-body-sm font-medium">
                  {reviewCard.totalReviews > 0
                    ? `${Math.round((reviewCard.totalCorrect / reviewCard.totalReviews) * 100)}%`
                    : "N/A"}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <h2 className="text-h3 mb-2">카테고리</h2>
        <span
          className="inline-flex items-center h-7 px-2.5 rounded text-caption font-medium capitalize"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            color: "var(--text-secondary)",
          }}
        >
          {item.category}
        </span>
      </div>

      {/* Related Grammar */}
      {relatedGrammar.length > 0 && (
        <div>
          <h2 className="text-h3 mb-3">관련 문법</h2>
          <div className="space-y-2">
            {relatedGrammar.map((g) => (
              <Link
                key={g.id}
                href={`/grammar/${g.id}`}
                className="block p-3 rounded-lg border transition-colors"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <p className="text-body font-semibold font-jp" lang="ja">
                  {g.pattern}
                </p>
                <p
                  className="text-body-sm mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {g.meaning}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Related Vocabulary */}
      {related.length > 0 && (
        <div>
          <h2 className="text-h3 mb-3">관련 단어</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {related.map((rv) => (
              <Link
                key={rv.id}
                href={`/vocabulary/${rv.id}`}
                className="p-3 rounded-lg border transition-colors hover:border-opacity-60"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <p className="text-body font-semibold font-jp mb-1" lang="ja">
                  {rv.word}
                </p>
                <p
                  className="text-body-sm font-jp"
                  lang="ja"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {rv.reading}
                </p>
                <p
                  className="text-body-sm mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {rv.meaning}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
