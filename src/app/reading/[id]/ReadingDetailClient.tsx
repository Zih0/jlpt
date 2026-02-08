"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { readingData } from "@/data/reading";
import { vocabularyData } from "@/data/vocabulary";
import { VocabularyItem } from "@/lib/types";
import { addSession, updateStreak, saveReadingProgress, getReviewCards, upsertReviewCard } from "@/lib/storage";
import { createReviewCard } from "@/lib/srs";

const ESCAPE_REGEX = /[.*+?^${}()|[\]\\]/g;

export default function ReadingDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const passage = readingData.find((r) => r.id === id);

  const [showQuestions, setShowQuestions] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const [done, setDone] = useState(false);
  const [tooltipWord, setTooltipWordState] = useState<string | null>(null);
  const tooltipWordRef = useRef<string | null>(null);
  const setTooltipWord = useCallback((word: string | null) => {
    tooltipWordRef.current = word;
    setTooltipWordState(word);
  }, []);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [vocabExpanded, setVocabExpanded] = useState(false);
  const [srsAddedIds, setSrsAddedIds] = useState<Set<string>>(() => {
    const cards = getReviewCards();
    return new Set(cards.map((c) => c.contentId));
  });

  // Find vocabulary items that appear in the passage content (3+ char words for highlighting to avoid over-matching)
  const passageVocab = useMemo<VocabularyItem[]>(() => {
    if (!passage) return [];
    return vocabularyData.filter((v) => v.word.length >= 2 && passage.content.includes(v.word));
  }, [passage]);

  // Only highlight 3+ char words to avoid over-matching common 2-char words
  const highlightVocab = useMemo(() => {
    return passageVocab.filter((v) => v.word.length >= 3);
  }, [passageVocab]);

  const handleAddToSRS = useCallback((vocab: VocabularyItem) => {
    const card = createReviewCard("vocabulary", vocab.id);
    upsertReviewCard(card);
    setSrsAddedIds((prev) => new Set(prev).add(vocab.id));
  }, []);

  // Build vocabulary map from passage-relevant words only (not all 1086 vocab)
  const vocabMap = useMemo(() => {
    const map = new Map<string, { reading: string; meaning: string }>();
    passageVocab.forEach((v) => {
      map.set(v.word, { reading: v.reading, meaning: v.meaning });
    });
    return map;
  }, [passageVocab]);

  // Build highlight set from 3+ char words only
  const highlightSet = useMemo(() => new Set(highlightVocab.map((v) => v.word)), [highlightVocab]);

  // Create highlighted passage content
  const highlightedContent = useMemo(() => {
    if (!passage || highlightSet.size === 0) return null;

    // Sort by length (longest first) to match compounds before shorter words
    const vocabWords = Array.from(highlightSet).sort((a, b) => b.length - a.length);

    const pattern = vocabWords.map((word) => word.replace(ESCAPE_REGEX, '\\$&')).join('|');
    const regex = new RegExp(`(${pattern})`, 'g');

    const lines = passage.content.split('\n');
    return lines.map((line, lineIndex) => {
      const parts = line.split(regex);
      return (
        <div key={lineIndex}>
          {parts.map((part, partIndex) => {
            if (highlightSet.has(part)) {
              return (
                <span
                  key={partIndex}
                  className="border-b border-dotted cursor-pointer transition-colors"
                  style={{
                    color: "var(--primary)",
                    borderColor: "var(--primary)"
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (tooltipWordRef.current === part) {
                      setTooltipWord(null);
                      setTooltipPosition(null);
                    } else {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipWord(part);
                      setTooltipPosition({
                        x: rect.left + rect.width / 2,
                        y: rect.bottom,
                      });
                    }
                  }}
                >
                  {part}
                </span>
              );
            }
            return <span key={partIndex}>{part}</span>;
          })}
        </div>
      );
    });
  }, [passage, highlightSet, setTooltipWord]);

  if (!passage) {
    return (
      <div className="text-center py-12">
        <p className="text-h2">지문을 찾을 수 없습니다</p>
        <button
          onClick={() => router.push("/reading")}
          className="mt-4 h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          독해로 돌아가기
        </button>
      </div>
    );
  }

  const question = passage.questions[currentQuestion];

  const handleCheck = () => {
    if (selected === null) return;
    setAnswered(true);
    setResults((prev) => [...prev, selected === question.correctAnswer]);
  };

  const handleNext = () => {
    if (currentQuestion + 1 < passage.questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setSelected(null);
      setAnswered(false);
    } else {
      setDone(true);
      updateStreak();
      const correctCount = results.filter(Boolean).length;
      addSession({
        date: new Date().toISOString().split("T")[0],
        module: "reading",
        cardsReviewed: passage.questions.length,
        cardsCorrect: correctCount,
        newCardsStudied: 0,
      });
      saveReadingProgress({
        passageId: passage.id,
        score: correctCount,
        totalQuestions: passage.questions.length,
        completedAt: new Date().toISOString().split("T")[0],
      });
    }
  };

  if (done) {
    const correctCount = results.filter(Boolean).length;
    const total = passage.questions.length;
    const accuracy = Math.round((correctCount / total) * 100);

    return (
      <div className="max-w-2xl mx-auto py-20 space-y-6">
        <div className="text-center">
          <h1 className="text-h1 mb-4">독해 완료</h1>
          <div
            className="max-w-xs mx-auto p-4 rounded-lg border space-y-2"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>점수</span>
              <span className="font-bold">
                {correctCount} / {total}
              </span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: "var(--text-secondary)" }}>정답률</span>
              <span
                className="font-bold"
                style={{
                  color: accuracy >= 70 ? "var(--success)" : "var(--error)",
                }}
              >
                {accuracy}%
              </span>
            </div>
          </div>
        </div>

        {/* Review These Words */}
        {passageVocab.length > 0 && (
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <h2 className="text-body font-semibold mb-3">
              이 단어들 복습하기 ({passageVocab.length})
            </h2>
            <div className="space-y-2">
              {passageVocab.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between gap-3"
                >
                  <div className="flex items-baseline gap-2 min-w-0">
                    <span className="text-body font-jp font-bold shrink-0" lang="ja">
                      {v.word}
                    </span>
                    <span
                      className="text-body-sm font-jp shrink-0"
                      lang="ja"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {v.reading}
                    </span>
                    <span
                      className="text-body-sm truncate"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {v.meaning}
                    </span>
                  </div>
                  {srsAddedIds.has(v.id) ? (
                    <span
                      className="text-body-sm shrink-0 font-medium"
                      style={{ color: "var(--success)" }}
                    >
                      &#10003; SRS 추가됨
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAddToSRS(v)}
                      className="shrink-0 h-8 px-3 rounded-md text-caption font-semibold border"
                      style={{
                        color: "var(--primary)",
                        borderColor: "var(--primary)",
                        backgroundColor: "transparent",
                      }}
                    >
                      SRS에 추가
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => {
              setShowQuestions(false);
              setCurrentQuestion(0);
              setSelected(null);
              setAnswered(false);
              setResults([]);
              setDone(false);
            }}
            className="h-11 px-5 rounded-lg text-body-sm font-semibold border"
            style={{
              color: "var(--primary)",
              borderColor: "var(--primary)",
              backgroundColor: "transparent",
            }}
          >
            다시 풀기
          </button>
          <button
            onClick={() => router.push("/reading")}
            className="h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            독해로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Back */}
      <button
        onClick={() => router.push("/reading")}
        className="text-body-sm font-medium"
        style={{ color: "var(--primary)" }}
      >
        &larr; 독해
      </button>

      {!showQuestions ? (
        <>
          {/* Key Vocabulary Pre-Study */}
          {passageVocab.length > 0 && (
            <div
              className="rounded-lg border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <button
                onClick={() => setVocabExpanded(!vocabExpanded)}
                className="w-full flex items-center justify-between p-4"
              >
                <span className="text-body font-semibold">
                  핵심 단어 ({passageVocab.length})
                </span>
                <span
                  className="text-body transition-transform"
                  style={{
                    display: "inline-block",
                    transform: vocabExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    color: "var(--text-secondary)",
                  }}
                >
                  &#9660;
                </span>
              </button>
              {vocabExpanded && (
                <div className="px-4 pb-4 space-y-3">
                  {passageVocab.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-baseline gap-3"
                    >
                      <span className="text-h2 font-jp shrink-0" lang="ja">
                        {v.word}
                      </span>
                      <span
                        className="text-body-sm font-jp"
                        lang="ja"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {v.reading}
                      </span>
                      <span
                        className="text-body-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {v.meaning}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Passage */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
            onClick={() => {
              setTooltipWord(null);
              setTooltipPosition(null);
            }}
          >
            <h2 className="text-h2 font-jp mb-4" lang="ja">
              {passage.title}
            </h2>
            <div className="text-jp-passage font-jp whitespace-pre-line" lang="ja">
              {highlightedContent ?? passage.content}
            </div>

            {/* Vocabulary Tooltip (fixed position to avoid scroll offset issues) */}
            {tooltipWord && tooltipPosition && vocabMap.has(tooltipWord) && (
              <div
                className="fixed z-50 p-3 rounded-lg border shadow-lg"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                  top: tooltipPosition.y + 8,
                  left: Math.min(tooltipPosition.x, window.innerWidth - 160),
                  transform: "translateX(-50%)",
                  maxWidth: "280px",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-body-sm font-jp font-bold mb-1" lang="ja">
                  {tooltipWord}
                </div>
                <div
                  className="text-body-sm font-jp mb-1"
                  lang="ja"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {vocabMap.get(tooltipWord)!.reading}
                </div>
                <div className="text-body-sm">
                  {vocabMap.get(tooltipWord)!.meaning}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => setShowQuestions(true)}
            className="w-full h-12 rounded-lg text-body font-semibold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            문제 풀기 ({passage.questions.length})
          </button>
        </>
      ) : (
        <>
          {/* Question */}
          <div
            className="p-4 rounded-lg border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <p className="text-caption mb-3" style={{ color: "var(--text-tertiary)" }}>
              Q{currentQuestion + 1} of {passage.questions.length}
            </p>
            <p className="text-jp-body font-jp mb-4" lang="ja">
              {question.question}
            </p>

            <div className="space-y-2">
              {question.options.map((option, i) => {
                let borderColor = "var(--border)";
                let bgColor = "transparent";

                if (answered) {
                  if (i === question.correctAnswer) {
                    borderColor = "var(--success)";
                    bgColor = "var(--success-light)";
                  } else if (i === selected && i !== question.correctAnswer) {
                    borderColor = "var(--error)";
                    bgColor = "var(--error-light)";
                  }
                } else if (i === selected) {
                  borderColor = "var(--primary)";
                  bgColor = "var(--primary-light)";
                }

                return (
                  <button
                    key={i}
                    onClick={() => !answered && setSelected(i)}
                    disabled={answered}
                    className="w-full text-left p-3 rounded-lg font-jp"
                    lang="ja"
                    style={{
                      border: `2px solid ${borderColor}`,
                      backgroundColor: bgColor,
                    }}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {answered && (
              <div
                className="mt-4 p-3 rounded-lg"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                <p className="text-body-sm font-semibold mb-1">해설</p>
                <p
                  className="text-body-sm font-jp"
                  lang="ja"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {question.explanation}
                </p>
              </div>
            )}
          </div>

          {!answered ? (
            <button
              onClick={handleCheck}
              disabled={selected === null}
              className="w-full h-12 rounded-lg text-body font-semibold text-white"
              style={{
                backgroundColor: "var(--primary)",
                opacity: selected === null ? 0.5 : 1,
              }}
            >
              정답 확인
            </button>
          ) : (
            <button
              onClick={handleNext}
              className="w-full h-12 rounded-lg text-body font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              {currentQuestion + 1 < passage.questions.length
                ? "다음 문제"
                : "완료"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
