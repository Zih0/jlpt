"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { grammarData } from "@/data/grammar";
import { GrammarPattern } from "@/lib/types";

interface DrillQuestion {
  /** The grammar item being tested */
  item: GrammarPattern;
  /** The example sentence with the pattern blanked out */
  sentence: string;
  /** The original example sentence (for display after answering) */
  originalSentence: string;
  /** Translation of the example */
  translation: string;
  /** Shuffled choices (pattern strings) */
  choices: string[];
  /** Index of the correct answer in choices */
  correctIndex: number;
}

type DrillState = "ready" | "drilling" | "result";

const DRILL_SIZE = 10;
const RE_LEADING_TILDE = /^〜/;
const RE_TRAILING_TILDE = /〜$/;

function buildQuestions(): DrillQuestion[] {
  // Find all grammar items that have similarPatterns referencing valid items
  const idMap = new Map<string, GrammarPattern>();
  for (const g of grammarData) {
    idMap.set(g.id, g);
  }

  // Collect eligible items: must have similarPatterns that resolve to real items + at least one example
  const eligible: { item: GrammarPattern; similars: GrammarPattern[] }[] = [];
  for (const g of grammarData) {
    if (g.similarPatterns.length === 0 || g.examples.length === 0) continue;
    const similars = g.similarPatterns
      .map((id) => idMap.get(id))
      .filter((x): x is GrammarPattern => x !== undefined);
    if (similars.length === 0) continue;
    eligible.push({ item: g, similars });
  }

  if (eligible.length === 0) return [];

  // Shuffle eligible items
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);

  const questions: DrillQuestion[] = [];
  const count = Math.min(DRILL_SIZE, shuffled.length);

  for (let i = 0; i < count; i++) {
    const { item, similars } = shuffled[i];

    // Pick a random example from this item
    const example = item.examples[Math.floor(Math.random() * item.examples.length)];

    // Create the blanked sentence by replacing the pattern
    // Strip the leading/trailing markers from pattern for matching (e.g., "〜ものなら" -> "ものなら")
    const cleanPattern = item.pattern.replace(RE_LEADING_TILDE, "").replace(RE_TRAILING_TILDE, "");
    const sentence = example.japanese.includes(cleanPattern)
      ? example.japanese.replace(cleanPattern, "＿＿＿＿")
      : example.japanese + " (＿＿＿＿)";

    // Build choices: correct + up to 3 similar patterns, shuffled
    const distractors = similars
      .sort(() => Math.random() - 0.5)
      .slice(0, 3)
      .map((s) => s.pattern);
    const allChoices = [item.pattern, ...distractors];

    // Shuffle choices
    const shuffledChoices = [...allChoices].sort(() => Math.random() - 0.5);
    const correctIndex = shuffledChoices.indexOf(item.pattern);

    questions.push({
      item,
      sentence,
      originalSentence: example.japanese,
      translation: example.translation,
      choices: shuffledChoices,
      correctIndex,
    });
  }

  return questions;
}

export default function ConfusionDrillClient() {
  const [state, setState] = useState<DrillState>("ready");
  const [questions, setQuestions] = useState<DrillQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [answeredCorrectly, setAnsweredCorrectly] = useState<boolean[]>([]);

  const currentQuestion = questions[currentIndex] ?? null;
  const hasAnswered = selectedAnswer !== null;
  const isCorrect = hasAnswered && selectedAnswer === currentQuestion?.correctIndex;

  const startDrill = useCallback(() => {
    const q = buildQuestions();
    setQuestions(q);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setScore(0);
    setAnsweredCorrectly([]);
    setState(q.length > 0 ? "drilling" : "ready");
  }, []);

  const handleSelect = useCallback(
    (index: number) => {
      if (hasAnswered || !currentQuestion) return;
      setSelectedAnswer(index);
      const correct = index === currentQuestion.correctIndex;
      if (correct) setScore((s) => s + 1);
      setAnsweredCorrectly((prev) => [...prev, correct]);
    },
    [hasAnswered, currentQuestion]
  );

  const handleNext = useCallback(() => {
    if (currentIndex + 1 >= questions.length) {
      setState("result");
    } else {
      setCurrentIndex((i) => i + 1);
      setSelectedAnswer(null);
    }
  }, [currentIndex, questions.length]);

  // Count eligible items to show on ready screen
  const eligibleCount = useMemo(() => {
    const idMap = new Map<string, GrammarPattern>();
    for (const g of grammarData) idMap.set(g.id, g);
    return grammarData.filter(
      (g) =>
        g.similarPatterns.length > 0 &&
        g.similarPatterns.some((id) => idMap.has(id))
    ).length;
  }, []);

  // Ready state
  if (state === "ready") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/grammar"
            className="inline-flex items-center h-9 px-3 rounded-lg text-body-sm font-medium border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            &larr; 문법
          </Link>
          <h1 className="text-h1">혼동 연습</h1>
        </div>

        <div
          className="p-6 rounded-lg border text-center space-y-4"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-body" style={{ color: "var(--text-primary)" }}>
            유사한 문법 패턴에 대한 지식을 테스트합니다. 빈칸이 있는 문장이
            표시되며 혼동하기 쉬운 선택지 중에서 올바른 문법 패턴을 선택해야
            합니다.
          </p>
          <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            유사한 형태의 패턴 {eligibleCount}개 이용 가능
          </p>
          {eligibleCount === 0 ? (
            <p className="text-body-sm" style={{ color: "var(--error)" }}>
              문법 데이터에서 혼동 쌍을 찾을 수 없습니다.
            </p>
          ) : (
            <button
              onClick={startDrill}
              className="inline-flex items-center h-11 px-6 rounded-lg text-body-sm font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              연습 시작 ({Math.min(DRILL_SIZE, eligibleCount)}문제)
            </button>
          )}
        </div>
      </div>
    );
  }

  // Result state
  if (state === "result") {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Link
            href="/grammar"
            className="inline-flex items-center h-9 px-3 rounded-lg text-body-sm font-medium border"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
              color: "var(--text-secondary)",
            }}
          >
            &larr; 문법
          </Link>
          <h1 className="text-h1">결과</h1>
        </div>

        <div
          className="p-6 rounded-lg border text-center space-y-4"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <p
            className="text-h1"
            style={{
              color: percentage >= 70 ? "var(--success)" : "var(--error)",
            }}
          >
            {score} / {questions.length}
          </p>
          <p className="text-body" style={{ color: "var(--text-secondary)" }}>
            정답률 {percentage}%
          </p>

          {/* Progress bar */}
          <div
            className="w-full h-3 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg-tertiary)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                width: `${percentage}%`,
                backgroundColor:
                  percentage >= 70 ? "var(--success)" : "var(--error)",
              }}
            />
          </div>

          <button
            onClick={startDrill}
            className="inline-flex items-center h-11 px-6 rounded-lg text-body-sm font-semibold text-white"
            style={{ backgroundColor: "var(--primary)" }}
          >
            다시 도전
          </button>
        </div>

        {/* Question summary */}
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div
              key={i}
              className="p-3 rounded-lg border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: answeredCorrectly[i]
                  ? "var(--success)"
                  : "var(--error)",
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="shrink-0 text-body-sm font-semibold"
                  style={{
                    color: answeredCorrectly[i]
                      ? "var(--success)"
                      : "var(--error)",
                  }}
                >
                  {answeredCorrectly[i] ? "O" : "X"}
                </span>
                <div className="min-w-0">
                  <p className="text-body-sm font-jp" lang="ja">
                    {q.originalSentence}
                  </p>
                  <p className="text-caption mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                    {q.item.pattern} &mdash; {q.item.meaning}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Drilling state
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/grammar"
          className="inline-flex items-center h-9 px-3 rounded-lg text-body-sm font-medium border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
            color: "var(--text-secondary)",
          }}
        >
          &larr; 문법
        </Link>
        <p className="text-body-sm font-medium" style={{ color: "var(--text-secondary)" }}>
          {currentIndex + 1} / {questions.length}
        </p>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2 rounded-full overflow-hidden"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${progress}%`,
            backgroundColor: "var(--primary)",
          }}
        />
      </div>

      {/* Question card */}
      <div
        className="p-6 rounded-lg border space-y-4"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-body-sm font-medium"
          style={{ color: "var(--text-tertiary)" }}
        >
          올바른 문법 패턴을 선택하세요:
        </p>

        {/* Sentence with blank */}
        <p className="text-h3 font-jp leading-relaxed" lang="ja">
          {currentQuestion.sentence}
        </p>

        {/* Translation hint */}
        <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          {currentQuestion.translation}
        </p>

        {/* Choices */}
        <div className="space-y-2">
          {currentQuestion.choices.map((choice, i) => {
            let bgColor = "var(--bg-primary)";
            let borderColor = "var(--border)";
            let textColor = "var(--text-primary)";

            if (hasAnswered) {
              if (i === currentQuestion.correctIndex) {
                bgColor = "var(--success-light)";
                borderColor = "var(--success)";
                textColor = "var(--success)";
              } else if (i === selectedAnswer && !isCorrect) {
                bgColor = "var(--error-light)";
                borderColor = "var(--error)";
                textColor = "var(--error)";
              }
            }

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={hasAnswered}
                className="w-full text-left p-4 rounded-lg border font-jp text-body font-medium"
                style={{
                  backgroundColor: bgColor,
                  borderColor: borderColor,
                  color: textColor,
                  cursor: hasAnswered ? "default" : "pointer",
                }}
                lang="ja"
              >
                {choice}
              </button>
            );
          })}
        </div>

        {/* Feedback after answering */}
        {hasAnswered && (
          <div
            className="p-4 rounded-lg"
            style={{
              backgroundColor: isCorrect
                ? "var(--success-light)"
                : "var(--error-light)",
            }}
          >
            <p
              className="text-body-sm font-semibold"
              style={{
                color: isCorrect ? "var(--success)" : "var(--error)",
              }}
            >
              {isCorrect ? "정답!" : "오답"}
            </p>
            <p className="text-body-sm mt-1" style={{ color: "var(--text-primary)" }}>
              <span className="font-jp" lang="ja">
                {currentQuestion.item.pattern}
              </span>{" "}
              &mdash; {currentQuestion.item.meaning}
            </p>
            {currentQuestion.item.notes && (
              <p
                className="text-caption mt-1"
                style={{ color: "var(--text-secondary)" }}
              >
                {currentQuestion.item.notes}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Next button */}
      {hasAnswered && (
        <button
          onClick={handleNext}
          className="w-full h-11 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          {currentIndex + 1 >= questions.length ? "결과 보기" : "다음"}
        </button>
      )}
    </div>
  );
}
