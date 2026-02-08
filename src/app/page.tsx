"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  getReviewCards,
  getSettings,
  getTodaySessions,
  getReadingProgress,
  getSessions,
} from "@/lib/storage";
import { getDueCards, getRecentMistakes } from "@/lib/srs";
import {
  ReviewCard,
  getSRSStage,
  UserSettings,
  isStruggling,
} from "@/lib/types";
import { vocabularyData } from "@/data/vocabulary";
import { grammarData } from "@/data/grammar";
import { listeningData } from "@/data/listening";
import { readingData } from "@/data/reading";

function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div>
      <div className="flex justify-between text-body-sm mb-1">
        <span style={{ color: "var(--text-secondary)" }}>{label}</span>
        <span className="font-medium">{Math.round(percent)}%</span>
      </div>
      <div
        className="w-full h-2 rounded-full"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${percent}%`,
            backgroundColor: "var(--primary)",
          }}
        />
      </div>
    </div>
  );
}

function StudyHeatmap() {
  const [activityMap, setActivityMap] = useState<Map<string, number>>(
    new Map()
  );

  useEffect(() => {
    const sessions = getSessions();
    const dateMap = new Map<string, number>();

    sessions.forEach((session) => {
      const count = dateMap.get(session.date) || 0;
      dateMap.set(session.date, count + session.cardsReviewed);
    });

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActivityMap(dateMap);
  }, []);

  // Generate last 28 days (4 weeks) — memoized to avoid new Date() on every render
  const { days, grid } = useMemo(() => {
    const today = new Date();
    const d: { date: string; dayOfWeek: number }[] = [];

    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      const dayOfWeek = date.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
      d.push({ date: dateStr, dayOfWeek });
    }

    // Organize into grid: 7 rows (days of week) × 4 columns (weeks)
    const g: (string | null)[][] = Array.from({ length: 7 }, () =>
      Array(4).fill(null)
    );

    d.forEach((day, idx) => {
      const weekIndex = Math.floor(idx / 7);
      const rowIndex = day.dayOfWeek;
      if (weekIndex < 4 && rowIndex < 7) {
        g[rowIndex][weekIndex] = day.date;
      }
    });

    return { days: d, grid: g };
  }, []);

  const dayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  const getIntensityColor = (cardsReviewed: number): string => {
    if (cardsReviewed === 0) return "var(--bg-tertiary)";
    if (cardsReviewed <= 5) return "var(--primary-light)";
    if (cardsReviewed <= 15) return "var(--primary)";
    return "var(--success)";
  };

  const getIntensityOpacity = (cardsReviewed: number): number => {
    if (cardsReviewed === 0) return 1;
    if (cardsReviewed <= 5) return 1;
    if (cardsReviewed <= 15) return 0.7;
    return 1;
  };

  return (
    <div>
      <h2 className="text-h2 mb-3">학습 활동</h2>
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <div className="flex gap-2">
          {/* Day labels */}
          <div className="flex flex-col gap-1 justify-start pt-0">
            {dayLabels.map((label) => (
              <div
                key={label}
                className="text-body-sm h-7 flex items-center"
                style={{ color: "var(--text-secondary)", width: "32px" }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Heatmap grid */}
          <div className="flex flex-col gap-1">
            {grid.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-1">
                {row.map((dateStr, colIndex) => {
                  const cardsReviewed = dateStr
                    ? activityMap.get(dateStr) || 0
                    : 0;
                  const bgColor = getIntensityColor(cardsReviewed);
                  const opacity = getIntensityOpacity(cardsReviewed);

                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      className="rounded"
                      style={{
                        width: "28px",
                        height: "28px",
                        backgroundColor: bgColor,
                        opacity,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [reviewCards, setReviewCards] = useState<ReviewCard[]>([]);
  const [todayReviewed, setTodayReviewed] = useState(0);
  const [todayNew, setTodayNew] = useState(0);
  const [readingCompleted, setReadingCompleted] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(getSettings());
    setReviewCards(getReviewCards());
    const sessions = getTodaySessions();
    setTodayReviewed(sessions.reduce((sum, s) => sum + s.cardsReviewed, 0));
    setTodayNew(sessions.reduce((sum, s) => sum + s.newCardsStudied, 0));
    const readingProgress = getReadingProgress();
    setReadingCompleted(readingProgress.length);
  }, []);

  const {
    dueVocab,
    dueGrammar,
    dueListening,
    strugglingVocab,
    strugglingGrammar,
    strugglingListening,
    totalStruggling,
    mistakeVocab,
    mistakeGrammar,
    mistakeListening,
    totalMistakes,
    vocabPercent,
    grammarPercent,
    listeningPercent,
    readingPercent,
  } = useMemo(() => {
    const dV = getDueCards(
      reviewCards.filter((c) => c.contentType === "vocabulary")
    );
    const dG = getDueCards(
      reviewCards.filter((c) => c.contentType === "grammar")
    );
    const dL = getDueCards(
      reviewCards.filter((c) => c.contentType === "listening")
    );

    const sV = reviewCards
      .filter((c) => c.contentType === "vocabulary")
      .filter(isStruggling).length;
    const sG = reviewCards
      .filter((c) => c.contentType === "grammar")
      .filter(isStruggling).length;
    const sL = reviewCards
      .filter((c) => c.contentType === "listening")
      .filter(isStruggling).length;

    const recentMistakes = getRecentMistakes(reviewCards);
    const mV = recentMistakes.filter(
      (c) => c.contentType === "vocabulary"
    ).length;
    const mG = recentMistakes.filter((c) => c.contentType === "grammar").length;
    const mL = recentMistakes.filter(
      (c) => c.contentType === "listening"
    ).length;

    const vocabMature = reviewCards
      .filter((c) => c.contentType === "vocabulary")
      .filter((c) => getSRSStage(c) === "mature").length;
    const grammarMature = reviewCards
      .filter((c) => c.contentType === "grammar")
      .filter((c) => getSRSStage(c) === "mature").length;
    const listeningMature = reviewCards
      .filter((c) => c.contentType === "listening")
      .filter((c) => getSRSStage(c) === "mature").length;

    const totalListeningExpressions = listeningData.reduce(
      (sum, v) => sum + v.expressions.length,
      0
    );

    return {
      dueVocab: dV,
      dueGrammar: dG,
      dueListening: dL,
      strugglingVocab: sV,
      strugglingGrammar: sG,
      strugglingListening: sL,
      totalStruggling: sV + sG + sL,
      mistakeVocab: mV,
      mistakeGrammar: mG,
      mistakeListening: mL,
      totalMistakes: mV + mG + mL,
      vocabPercent:
        vocabularyData.length > 0
          ? (vocabMature / vocabularyData.length) * 100
          : 0,
      grammarPercent:
        grammarData.length > 0 ? (grammarMature / grammarData.length) * 100 : 0,
      listeningPercent:
        totalListeningExpressions > 0
          ? (listeningMature / totalListeningExpressions) * 100
          : 0,
      readingPercent:
        readingData.length > 0
          ? (readingCompleted / readingData.length) * 100
          : 0,
    };
  }, [reviewCards, readingCompleted]);

  if (!settings) return null;

  return (
    <div className="space-y-6">
      {/* Streak */}
      <div className="flex items-center justify-between">
        <h1 className="text-h1">대시보드</h1>
        <span
          className="text-body-sm font-bold"
          style={{ color: "var(--accent)" }}
        >
          연속: {settings.streakCount}일
        </span>
      </div>

      {/* Quick Review + Cram */}
      <div className="space-y-2">
        {dueVocab.length + dueGrammar.length + dueListening.length > 0 && (
          <Link
            href="/review"
            className="flex items-center justify-between p-4 rounded-lg text-white font-semibold"
            style={{ backgroundColor: "var(--primary)" }}
          >
            <span>빠른 복습</span>
            <span className="text-body-sm font-normal opacity-90">
              {dueVocab.length + dueGrammar.length + dueListening.length}개 복습
              예정 &rarr;
            </span>
          </Link>
        )}
        <Link
          href="/cram"
          className="flex items-center justify-between p-3 rounded-lg border font-medium text-body-sm"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
            color: "var(--accent)",
          }}
        >
          <span>벼락치기</span>
          <span style={{ color: "var(--text-tertiary)" }}>
            모든 카드 학습 &rarr;
          </span>
        </Link>
      </div>

      {/* Due today */}
      <section>
        <h2 className="text-h2 mb-3">오늘 복습할 것</h2>
        <div className="space-y-2">
          <Link
            href="/vocabulary/review"
            className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <span className="font-medium">단어</span>
            <span
              className="text-body-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {dueVocab.length}개 복습 예정 &rarr;
            </span>
          </Link>
          <Link
            href="/grammar/review"
            className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <span className="font-medium">문법</span>
            <span
              className="text-body-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {dueGrammar.length}개 복습 예정 &rarr;
            </span>
          </Link>
          <Link
            href="/listening/review"
            className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <span className="font-medium">듣기</span>
            <span
              className="text-body-sm"
              style={{ color: "var(--text-secondary)" }}
            >
              {dueListening.length}개 복습 예정 &rarr;
            </span>
          </Link>
        </div>
      </section>

      {/* Needs Attention */}
      {totalStruggling > 0 && (
        <section>
          <h2 className="text-h2 mb-3">주의 필요</h2>
          <div className="space-y-2">
            {strugglingVocab > 0 && (
              <Link
                href="/vocabulary"
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="font-medium">단어</span>
                <span
                  className="text-body-sm font-medium"
                  style={{ color: "var(--error)" }}
                >
                  {strugglingVocab}개 어려운 항목
                </span>
              </Link>
            )}
            {strugglingGrammar > 0 && (
              <Link
                href="/grammar"
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="font-medium">문법</span>
                <span
                  className="text-body-sm font-medium"
                  style={{ color: "var(--error)" }}
                >
                  {strugglingGrammar}개 어려운 항목
                </span>
              </Link>
            )}
            {strugglingListening > 0 && (
              <Link
                href="/listening"
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="font-medium">듣기</span>
                <span
                  className="text-body-sm font-medium"
                  style={{ color: "var(--error)" }}
                >
                  {strugglingListening}개 어려운 항목
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Recent Mistakes */}
      {totalMistakes > 0 && (
        <section>
          <h2 className="text-h2 mb-3">최근 오답</h2>
          <div className="space-y-2">
            {mistakeVocab > 0 && (
              <Link
                href="/vocabulary/review"
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="font-medium">단어</span>
                <span
                  className="text-body-sm font-medium"
                  style={{ color: "var(--warning)" }}
                >
                  {mistakeVocab}개 오답
                </span>
              </Link>
            )}
            {mistakeGrammar > 0 && (
              <Link
                href="/grammar/review"
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="font-medium">문법</span>
                <span
                  className="text-body-sm font-medium"
                  style={{ color: "var(--warning)" }}
                >
                  {mistakeGrammar}개 오답
                </span>
              </Link>
            )}
            {mistakeListening > 0 && (
              <Link
                href="/listening/review"
                className="flex items-center justify-between p-4 rounded-lg border cursor-pointer"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <span className="font-medium">듣기</span>
                <span
                  className="text-body-sm font-medium"
                  style={{ color: "var(--warning)" }}
                >
                  {mistakeListening}개 오답
                </span>
              </Link>
            )}
          </div>
        </section>
      )}

      {/* Mastery */}
      <section>
        <h2 className="text-h2 mb-3">숙달도</h2>
        <div
          className="p-4 rounded-lg border space-y-3"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <ProgressBar percent={vocabPercent} label="단어" />
          <ProgressBar percent={grammarPercent} label="문법" />
          <ProgressBar percent={listeningPercent} label="듣기" />
          <ProgressBar percent={readingPercent} label="독해" />
        </div>
      </section>

      {/* Study Activity */}
      <StudyHeatmap />

      {/* Today stats */}
      <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
        오늘 복습한 카드 {todayReviewed}장
        {todayNew > 0 && ` · 새 카드 ${todayNew}장`}
      </p>
    </div>
  );
}
