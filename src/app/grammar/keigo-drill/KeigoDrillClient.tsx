"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { keigoData, KeigoEntry } from "@/data/keigo";

type KeigoType = "sonkeigo" | "kenjogo";

interface DrillQuestion {
  entry: KeigoEntry;
  type: KeigoType;
  choices: string[];
  correctIndex: number;
}

type DrillState = "ready" | "drilling" | "result";

const DRILL_SIZE = 10;

function buildQuestions(): DrillQuestion[] {
  // Filter out entries that have both sonkeigo and kenjogo
  const eligibleSonkeigo = keigoData.filter((e) => e.sonkeigo !== "—");
  const eligibleKenjogo = keigoData.filter((e) => e.kenjogo !== "—");

  const questions: DrillQuestion[] = [];

  // Shuffle and pick questions
  const allEligible: Array<{ entry: KeigoEntry; type: KeigoType }> = [
    ...eligibleSonkeigo.map((e) => ({ entry: e, type: "sonkeigo" as KeigoType })),
    ...eligibleKenjogo.map((e) => ({ entry: e, type: "kenjogo" as KeigoType })),
  ];

  const shuffled = [...allEligible].sort(() => Math.random() - 0.5);
  const count = Math.min(DRILL_SIZE, shuffled.length);

  for (let i = 0; i < count; i++) {
    const { entry, type } = shuffled[i];

    // Get correct answer
    const correctAnswer = type === "sonkeigo" ? entry.sonkeigo : entry.kenjogo;

    // Build distractors: get wrong answers from other entries
    const distractors: string[] = [];
    const otherEntries = keigoData.filter((e) => e.id !== entry.id);

    for (const other of otherEntries.sort(() => Math.random() - 0.5)) {
      if (distractors.length >= 3) break;

      if (type === "sonkeigo" && other.sonkeigo !== "—" && other.sonkeigo !== correctAnswer) {
        distractors.push(other.sonkeigo);
      } else if (type === "kenjogo" && other.kenjogo !== "—" && other.kenjogo !== correctAnswer) {
        distractors.push(other.kenjogo);
      }
    }

    // If not enough distractors, pad with other forms from same entry
    if (distractors.length < 3) {
      if (type === "sonkeigo" && entry.kenjogo !== "—") {
        distractors.push(entry.kenjogo);
      } else if (type === "kenjogo" && entry.sonkeigo !== "—") {
        distractors.push(entry.sonkeigo);
      }
    }

    // Build choices and shuffle
    const allChoices = [correctAnswer, ...distractors.slice(0, 3)];
    const shuffledChoices = [...allChoices].sort(() => Math.random() - 0.5);
    const correctIndex = shuffledChoices.indexOf(correctAnswer);

    questions.push({
      entry,
      type,
      choices: shuffledChoices,
      correctIndex,
    });
  }

  return questions;
}

export default function KeigoDrillClient() {
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

  // Ready state
  if (state === "ready") {
    const eligibleCount = keigoData.filter(
      (e) => e.sonkeigo !== "—" || e.kenjogo !== "—"
    ).length;

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
          <h1 className="text-h1">경어 연습</h1>
        </div>

        <div
          className="p-6 rounded-lg border text-center space-y-4"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-body" style={{ color: "var(--text-primary)" }}>
            일본어 경어(尊敬語・謙譲語)를 연습합니다. 보통형 동사가 주어지면
            올바른 경어 형태를 선택하세요.
          </p>
          <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
            {eligibleCount}개의 경어 항목 이용 가능
          </p>
          {eligibleCount === 0 ? (
            <p className="text-body-sm" style={{ color: "var(--error)" }}>
              경어 데이터를 찾을 수 없습니다.
            </p>
          ) : (
            <button
              onClick={startDrill}
              className="inline-flex items-center h-11 px-6 rounded-lg text-body-sm font-semibold text-white"
              style={{ backgroundColor: "var(--primary)" }}
            >
              연습 시작 ({Math.min(DRILL_SIZE, eligibleCount * 2)}문제)
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
          {questions.map((q, i) => {
            const correctAnswer = q.type === "sonkeigo" ? q.entry.sonkeigo : q.entry.kenjogo;
            const exampleSentence = q.type === "sonkeigo" ? q.entry.exampleSonkei : q.entry.exampleKenjo;
            return (
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
                      {q.entry.plain} ({q.entry.meaning}) → {correctAnswer}
                    </p>
                    <p className="text-caption mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                      {q.type === "sonkeigo" ? "尊敬語" : "謙譲語"}
                    </p>
                    {exampleSentence !== "—" && (
                      <p className="text-caption mt-1 font-jp" lang="ja" style={{ color: "var(--text-secondary)" }}>
                        {exampleSentence}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Drilling state
  if (!currentQuestion) return null;

  const progress = ((currentIndex + 1) / questions.length) * 100;
  const correctAnswer =
    currentQuestion.type === "sonkeigo"
      ? currentQuestion.entry.sonkeigo
      : currentQuestion.entry.kenjogo;
  const exampleSentence =
    currentQuestion.type === "sonkeigo"
      ? currentQuestion.entry.exampleSonkei
      : currentQuestion.entry.exampleKenjo;

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
          {currentQuestion.type === "sonkeigo" ? "尊敬語" : "謙譲語"}로 바꾸세요:
        </p>

        {/* Plain form verb */}
        <div className="text-center py-4">
          <p className="text-h2 font-jp" lang="ja">
            {currentQuestion.entry.plain}
          </p>
          <p className="text-body mt-2" style={{ color: "var(--text-secondary)" }}>
            {currentQuestion.entry.plainReading}
          </p>
          <p className="text-body-sm mt-1" style={{ color: "var(--text-tertiary)" }}>
            {currentQuestion.entry.meaning}
          </p>
        </div>

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
              정답: <span className="font-jp" lang="ja">{correctAnswer}</span>
            </p>
            {exampleSentence !== "—" && (
              <p
                className="text-body-sm mt-2 font-jp"
                lang="ja"
                style={{ color: "var(--text-secondary)" }}
              >
                {exampleSentence}
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
