"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { grammarData } from "@/data/grammar";

export default function GrammarDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const pattern = grammarData.find((g) => g.id === id);

  if (!pattern) {
    return (
      <div className="text-center py-12">
        <p className="text-h2">패턴을 찾을 수 없습니다</p>
        <button
          onClick={() => router.push("/grammar")}
          className="mt-4 h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          문법으로 돌아가기
        </button>
      </div>
    );
  }

  const similarPatterns = pattern.similarPatterns
    .map((sid) => grammarData.find((g) => g.id === sid))
    .filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <button
        onClick={() => router.push("/grammar")}
        className="text-body-sm font-medium"
        style={{ color: "var(--primary)" }}
      >
        &larr; 문법
      </button>

      {/* Header */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <p className="text-kanji font-jp" lang="ja">
          {pattern.pattern}
        </p>
        <p className="text-h3 mt-2">{pattern.meaning}</p>
        <div
          className="mt-3 p-4 rounded-lg border-l-[3px]"
          style={{
            backgroundColor: "var(--bg-tertiary)",
            borderLeftColor: "var(--primary)",
          }}
        >
          <p className="text-caption font-semibold mb-1.5" style={{ color: "var(--text-tertiary)" }}>
            接続 (Formation)
          </p>
          <p className="text-body font-jp" lang="ja">
            {pattern.formation}
          </p>
        </div>
      </div>

      {/* Examples */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <h2 className="text-h3 mb-4">예문</h2>
        <div className="space-y-3">
          {pattern.examples.map((ex, i) => (
            <div
              key={i}
              className="p-4 rounded-lg"
              style={{
                backgroundColor: "var(--bg-tertiary)",
              }}
            >
              <div className="flex items-start gap-2">
                <span className="text-caption font-semibold" style={{ color: "var(--text-tertiary)" }}>
                  {["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨", "⑩"][i] || `${i + 1}.`}
                </span>
                <div className="flex-1 space-y-1.5">
                  <p className="text-jp-body font-jp leading-relaxed" lang="ja">
                    {ex.japanese}
                  </p>
                  <p
                    className="text-body-sm font-jp"
                    lang="ja"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {ex.reading}
                  </p>
                  <p className="text-body font-medium" style={{ color: "var(--text-secondary)" }}>
                    {ex.translation}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Similar */}
      {similarPatterns.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-h3">유사 패턴</h2>
            <Link
              href={`/grammar/compare#${[pattern.id, ...pattern.similarPatterns].slice(0, 3).join(",")}`}
              className="inline-flex items-center h-9 px-4 rounded-lg text-body-sm font-medium border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
                color: "var(--primary)",
              }}
            >
              비교
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {similarPatterns.map((sp) =>
              sp ? (
                <Link
                  key={sp.id}
                  href={`/grammar/${sp.id}`}
                  className="p-3 rounded-lg border transition-colors hover:border-opacity-60"
                  style={{
                    backgroundColor: "var(--bg-secondary)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p className="text-body font-semibold font-jp mb-1" lang="ja">
                    {sp.pattern}
                  </p>
                  <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
                    {sp.meaning}
                  </p>
                </Link>
              ) : null
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {pattern.notes && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="text-h3 mb-2">학습 포인트</h2>
          <p className="text-body leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {pattern.notes}
          </p>
        </div>
      )}

      {/* Writing Prompt */}
      {pattern.writingPrompt && (
        <div
          className="p-4 rounded-lg border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <h2 className="text-h3 mb-2">작문 연습</h2>
          <p className="text-body leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {pattern.writingPrompt}
          </p>
        </div>
      )}
    </div>
  );
}
