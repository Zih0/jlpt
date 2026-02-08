"use client";

import { useEffect, useMemo, useState } from "react";
import { getReviewCards, getSessions } from "@/lib/storage";
import { ReviewCard, StudySession, getSRSStage, SRSStage } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

/** Return the Monday (ISO week start) for a given date string. */
function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay(); // 0=Sun … 6=Sat
  const diff = day === 0 ? 6 : day - 1; // shift so Monday=0
  d.setDate(d.getDate() - diff);
  return d.toISOString().split("T")[0];
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

// ── Section components ───────────────────────────────────────────────

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-h2 mb-3">{title}</h2>
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        {children}
      </div>
    </section>
  );
}

// ── 1. Weekly Accuracy Trend ─────────────────────────────────────────

function WeeklyAccuracy({ sessions }: { sessions: StudySession[] }) {
  const rows = useMemo(() => {
    const today = todayISO();

    // Collect last 4 week-start dates (including current week)
    const weekStarts: string[] = [];
    for (let i = 3; i >= 0; i--) {
      const dayInWeek = addDays(today, -i * 7);
      const ws = weekStart(dayInWeek);
      if (!weekStarts.includes(ws)) weekStarts.push(ws);
    }
    // Deduplicate and keep last 4
    const uniqueWeeks = weekStarts.slice(-4);

    type WeekBucket = { reviewed: number; correct: number };
    const buckets = new Map<string, WeekBucket>();
    uniqueWeeks.forEach((ws) => buckets.set(ws, { reviewed: 0, correct: 0 }));

    sessions.forEach((s) => {
      const ws = weekStart(s.date);
      const bucket = buckets.get(ws);
      if (bucket) {
        bucket.reviewed += s.cardsReviewed;
        bucket.correct += s.cardsCorrect;
      }
    });

    return uniqueWeeks.map((ws) => {
      const b = buckets.get(ws)!;
      const pct = b.reviewed > 0 ? Math.round((b.correct / b.reviewed) * 100) : 0;
      return { weekOf: ws, pct, reviewed: b.reviewed };
    });
  }, [sessions]);

  if (rows.every((r) => r.reviewed === 0)) {
    return (
      <SectionCard title="주간 정답률 추이">
        <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          아직 학습 기록이 없습니다. 복습을 완료하면 추이를 확인할 수 있습니다.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="주간 정답률 추이">
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.weekOf}>
            <div className="flex justify-between text-body-sm mb-1">
              <span style={{ color: "var(--text-secondary)" }}>
                {formatShortDate(r.weekOf)} 주
              </span>
              <span className="font-medium">
                {r.reviewed > 0 ? `${r.pct}%` : "--"}
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${r.pct}%`,
                  backgroundColor: "var(--primary)",
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── 2. Module Performance ────────────────────────────────────────────

const MODULE_LABELS: Record<string, string> = {
  vocabulary: "단어",
  grammar: "문법",
  listening: "듣기",
  reading: "독해",
};

const MODULE_COLORS: Record<string, string> = {
  vocabulary: "var(--primary)",
  grammar: "var(--success)",
  listening: "var(--accent)",
  reading: "var(--warning)",
};

const MODULES = ["vocabulary", "grammar", "listening", "reading"] as const;

function ModulePerformance({ sessions }: { sessions: StudySession[] }) {
  const stats = useMemo(
    () =>
      MODULES.map((mod) => {
        const modSessions = sessions.filter((s) => s.module === mod);
        const reviewed = modSessions.reduce((sum, s) => sum + s.cardsReviewed, 0);
        const correct = modSessions.reduce((sum, s) => sum + s.cardsCorrect, 0);
        const pct = reviewed > 0 ? Math.round((correct / reviewed) * 100) : 0;
        return { module: mod, reviewed, correct, pct };
      }),
    [sessions]
  );

  if (stats.every((s) => s.reviewed === 0)) {
    return (
      <SectionCard title="모듈별 성적">
        <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          아직 학습 데이터가 없습니다.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="모듈별 성적">
      <div className="space-y-3">
        {stats.map((s) => (
          <div key={s.module}>
            <div className="flex justify-between text-body-sm mb-1">
              <span style={{ color: "var(--text-secondary)" }}>
                {MODULE_LABELS[s.module]}
              </span>
              <span className="font-medium">
                {s.reviewed > 0 ? `${s.pct}%` : "--"}
              </span>
            </div>
            <div
              className="w-full h-2 rounded-full"
              style={{ backgroundColor: "var(--bg-tertiary)" }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${s.pct}%`,
                  backgroundColor: MODULE_COLORS[s.module],
                  transition: "width 0.3s ease",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── 3. SRS Stage Distribution ────────────────────────────────────────

const STAGE_LABELS: Record<SRSStage, string> = {
  new: "신규",
  learning: "학습중",
  review: "복습",
  mature: "완료",
};

const STAGE_COLORS: Record<SRSStage, string> = {
  new: "var(--primary)",
  learning: "var(--accent)",
  review: "var(--warning)",
  mature: "var(--success)",
};

const SRS_MODULES = ["vocabulary", "grammar", "listening"] as const;
const SRS_STAGES: SRSStage[] = ["new", "learning", "review", "mature"];

function SRSDistribution({ cards }: { cards: ReviewCard[] }) {
  const data = useMemo(
    () =>
      SRS_MODULES.map((mod) => {
        const modCards = cards.filter((c) => c.contentType === mod);
        const counts: Record<SRSStage, number> = {
          new: 0,
          learning: 0,
          review: 0,
          mature: 0,
        };
        modCards.forEach((c) => {
          counts[getSRSStage(c)]++;
        });
        return { module: mod, counts, total: modCards.length };
      }),
    [cards]
  );

  if (data.every((d) => d.total === 0)) {
    return (
      <SectionCard title="SRS 단계 분포">
        <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          아직 복습 카드가 없습니다.
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="SRS 단계 분포">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {SRS_STAGES.map((stage) => (
          <div key={stage} className="flex items-center gap-1.5">
            <div
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: STAGE_COLORS[stage] }}
            />
            <span className="text-body-sm" style={{ color: "var(--text-secondary)" }}>
              {STAGE_LABELS[stage]}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {data
          .filter((d) => d.total > 0)
          .map((d) => (
            <div key={d.module}>
              <div className="flex justify-between text-body-sm mb-1.5">
                <span className="font-medium">
                  {MODULE_LABELS[d.module]}
                </span>
                <span style={{ color: "var(--text-tertiary)" }}>
                  {d.total}장
                </span>
              </div>
              {/* Stacked bar */}
              <div
                className="w-full h-5 rounded-full flex overflow-hidden"
                style={{ backgroundColor: "var(--bg-tertiary)" }}
              >
                {SRS_STAGES.map((stage) => {
                  const pct =
                    d.total > 0 ? (d.counts[stage] / d.total) * 100 : 0;
                  if (pct === 0) return null;
                  return (
                    <div
                      key={stage}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: STAGE_COLORS[stage],
                        transition: "width 0.3s ease",
                      }}
                    />
                  );
                })}
              </div>
              {/* Counts row */}
              <div className="flex gap-3 mt-1">
                {SRS_STAGES.map((stage) => (
                  <span
                    key={stage}
                    className="text-body-sm"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {STAGE_LABELS[stage]}: {d.counts[stage]}
                  </span>
                ))}
              </div>
            </div>
          ))}
      </div>
    </SectionCard>
  );
}

// ── 4. Study Consistency ─────────────────────────────────────────────

function StudyConsistency({ sessions }: { sessions: StudySession[] }) {
  const { daysStudied, pct } = useMemo(() => {
    const today = todayISO();
    const cutoff = addDays(today, -27); // last 28 days including today

    const uniqueDates = new Set<string>();
    sessions.forEach((s) => {
      if (s.date >= cutoff && s.date <= today) {
        uniqueDates.add(s.date);
      }
    });

    const ds = uniqueDates.size;
    return { daysStudied: ds, pct: Math.round((ds / 28) * 100) };
  }, [sessions]);

  return (
    <SectionCard title="학습 꾸준함">
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-h1 font-bold" style={{ color: "var(--primary)" }}>
          {daysStudied}
        </span>
        <span className="text-body" style={{ color: "var(--text-secondary)" }}>
          / 28일 중 학습
        </span>
        <span className="text-body-sm font-medium" style={{ color: "var(--text-tertiary)" }}>
          ({pct}%)
        </span>
      </div>
      <div
        className="w-full h-3 rounded-full"
        style={{ backgroundColor: "var(--bg-tertiary)" }}
      >
        <div
          className="h-full rounded-full"
          style={{
            width: `${pct}%`,
            backgroundColor:
              pct >= 80
                ? "var(--success)"
                : pct >= 50
                ? "var(--accent)"
                : "var(--error)",
            transition: "width 0.3s ease",
          }}
        />
      </div>
    </SectionCard>
  );
}

// ── 5. Upcoming Due Cards ────────────────────────────────────────────

function UpcomingDue({ cards }: { cards: ReviewCard[] }) {
  const { rows, hasAny } = useMemo(() => {
    const today = todayISO();
    const days: { label: string; dateStr: string }[] = [];
    for (let i = 1; i <= 7; i++) {
      const dateStr = addDays(today, i);
      const label =
        i === 1
          ? "내일"
          : `${i}일 후`;
      days.push({ label, dateStr });
    }

    const r = days.map(({ label, dateStr }) => {
      const count = cards.filter((c) => c.dueDate === dateStr).length;
      return { label, count };
    });

    return { rows: r, hasAny: r.some((row) => row.count > 0) };
  }, [cards]);

  return (
    <SectionCard title="예정된 복습 카드">
      {!hasAny ? (
        <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          향후 7일 이내에 복습할 카드가 없습니다.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div
              key={r.label}
              className="flex items-center justify-between"
            >
              <span
                className="text-body-sm"
                style={{ color: "var(--text-secondary)" }}
              >
                {r.label}
              </span>
              <span
                className="text-body-sm font-medium"
                style={{
                  color: r.count > 0 ? "var(--text-primary)" : "var(--text-tertiary)",
                }}
              >
                {r.count}장
              </span>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

// ── Page ─────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setSessions(getSessions());
    setCards(getReviewCards());
    setLoaded(true);
  }, []);

  if (!loaded) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-h1">학습 분석</h1>
      <WeeklyAccuracy sessions={sessions} />
      <ModulePerformance sessions={sessions} />
      <SRSDistribution cards={cards} />
      <StudyConsistency sessions={sessions} />
      <UpcomingDue cards={cards} />
    </div>
  );
}
