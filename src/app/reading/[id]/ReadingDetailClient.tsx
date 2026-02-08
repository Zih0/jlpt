"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
  const aiDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aiDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (aiDropdownRef.current && !aiDropdownRef.current.contains(e.target as Node)) {
        setAiDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [aiDropdownOpen]);

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
      {/* Back + AI dropdown */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => router.push("/reading")}
          className="text-body-sm font-medium"
          style={{ color: "var(--primary)" }}
        >
          &larr; 독해
        </button>

        <div className="relative" ref={aiDropdownRef}>
          <button
            onClick={() => setAiDropdownOpen(!aiDropdownOpen)}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-body-sm font-medium"
            style={{
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
              backgroundColor: "var(--bg-secondary)",
            }}
          >
            AI 해설
            <span
              className="transition-transform"
              style={{
                display: "inline-block",
                transform: aiDropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
                fontSize: "10px",
              }}
            >
              &#9660;
            </span>
          </button>
          {aiDropdownOpen && (
            <div
              className="absolute right-0 mt-1 w-52 rounded-lg border shadow-lg z-50 py-1"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border)",
              }}
            >
              <a
                href={`https://chatgpt.com/?prompt=${encodeURIComponent(`Read ${typeof window !== "undefined" ? window.location.href : ""}, JLPT 학습을 위한 해설`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-2.5 text-body-sm hover:opacity-70"
                style={{ color: "var(--text-primary)" }}
                onClick={() => setAiDropdownOpen(false)}
              >
                <span className="flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.676l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08L8.704 5.46a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" fill="currentColor"/>
                  </svg>
                  Open in ChatGPT
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-tertiary)" }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
              <a
                href={`https://claude.ai/new?q=${encodeURIComponent(`Read ${typeof window !== "undefined" ? window.location.href : ""}, JLPT 학습을 위한 해설`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-2.5 text-body-sm hover:opacity-70"
                style={{ color: "var(--text-primary)" }}
                onClick={() => setAiDropdownOpen(false)}
              >
                <span className="flex items-center gap-2.5">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M4.709 15.955l4.72-10.478a.862.862 0 0 1 1.575 0l4.72 10.478M16.29 15.955l-1.677-3.723M7.71 15.955l1.677-3.723m4.226 0H9.387m10.478-3.464L16.4 15.955m-2.932-7.187h.532m-4.2 7.187h8.065" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Open in Claude
                </span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--text-tertiary)" }}>
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3"/>
                </svg>
              </a>
            </div>
          )}
        </div>
      </div>

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
            {tooltipWord && tooltipPosition && vocabMap.has(tooltipWord) && (() => {
              const entry = vocabMap.get(tooltipWord);
              if (!entry) return null;
              return (
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
                    {entry.reading}
                  </div>
                  <div className="text-body-sm">
                    {entry.meaning}
                  </div>
                </div>
              );
            })()}
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
