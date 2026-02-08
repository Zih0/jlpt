"use client";

import { useState, useMemo, useEffect, useDeferredValue, useRef, useCallback } from "react";
import { vocabularyData } from "@/data/vocabulary";

interface KanjiEntry {
  char: string;
  gloss: string;
  words: { id: string; word: string; reading: string; meaning: string }[];
}

function buildKanjiMap(): KanjiEntry[] {
  const map = new Map<string, KanjiEntry>();

  for (const item of vocabularyData) {
    for (const kb of item.kanjiBreakdown) {
      const existing = map.get(kb.char);
      if (existing) {
        // Avoid duplicate words (same kanji can appear in kanjiBreakdown of same word)
        if (!existing.words.some((w) => w.id === item.id)) {
          existing.words.push({
            id: item.id,
            word: item.word,
            reading: item.reading,
            meaning: item.meaning,
          });
        }
      } else {
        map.set(kb.char, {
          char: kb.char,
          gloss: kb.gloss,
          words: [
            {
              id: item.id,
              word: item.word,
              reading: item.reading,
              meaning: item.meaning,
            },
          ],
        });
      }
    }
  }

  // Sort by number of words (most used kanji first)
  return Array.from(map.values()).sort((a, b) => b.words.length - a.words.length);
}

const PER_PAGE = 60;

export default function KanjiPage() {
  const allKanji = useMemo(() => buildKanjiMap(), []);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedChar, setSelectedChar] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!deferredSearch) return allKanji;
    const q = deferredSearch.toLowerCase();
    return allKanji.filter(
      (k) => k.char.includes(q) || k.gloss.toLowerCase().includes(q)
    );
  }, [deferredSearch, allKanji]);

  // Reset to page 0 when search changes
  useEffect(() => { setPage(0); }, [deferredSearch]);

  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  const selectedKanji = useMemo(() => {
    if (!selectedChar) return null;
    return allKanji.find((k) => k.char === selectedChar) ?? null;
  }, [selectedChar, allKanji]);

  const detailRef = useRef<HTMLDivElement>(null);

  const handleSelect = useCallback((char: string) => {
    setSelectedChar((prev) => {
      const next = prev === char ? null : char;
      if (next) {
        // Scroll to detail panel after render
        requestAnimationFrame(() => {
          detailRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
        });
      }
      return next;
    });
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-h1">한자</h1>

      {/* Search */}
      <input
        type="text"
        placeholder="한자 또는 뜻으로 검색..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full h-11 rounded-lg border px-4 text-body-sm"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      />

      {/* Count + Pagination top */}
      <div className="flex items-center justify-between">
        <p className="text-body-sm" style={{ color: "var(--text-tertiary)" }}>
          {vocabularyData.length}개 단어에서 {filtered.length}개 한자
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="h-8 w-8 rounded-md flex items-center justify-center text-body-sm font-medium disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
              aria-label="이전 페이지"
            >
              &#8249;
            </button>
            <span className="text-body-sm px-2" style={{ color: "var(--text-secondary)" }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="h-8 w-8 rounded-md flex items-center justify-center text-body-sm font-medium disabled:opacity-30"
              style={{ color: "var(--text-secondary)" }}
              aria-label="다음 페이지"
            >
              &#8250;
            </button>
          </div>
        )}
      </div>

      {/* Two-column layout: Grid + Detail side panel */}
      <div className={selectedKanji ? "flex flex-col lg:flex-row lg:gap-5 lg:items-start" : ""}>
        {/* Left: Grid + Pagination (on mobile: order-2 when detail is shown) */}
        <div className={selectedKanji ? "order-2 lg:order-1 lg:flex-1 lg:min-w-0" : ""}>
          <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
            {paged.map((k) => {
              const isSelected = selectedChar === k.char;
              return (
                <button
                  key={k.char}
                  onClick={() => handleSelect(k.char)}
                  className="flex flex-col items-center justify-center rounded-lg border aspect-square p-1 transition-colors"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--primary-light)"
                      : "var(--bg-secondary)",
                    borderColor: isSelected
                      ? "var(--primary)"
                      : "var(--border)",
                  }}
                >
                  <span
                    className="font-jp font-bold leading-none"
                    lang="ja"
                    style={{
                      fontSize: "24px",
                      color: isSelected
                        ? "var(--primary)"
                        : "var(--text-primary)",
                    }}
                  >
                    {k.char}
                  </span>
                  <span
                    className="text-center leading-tight mt-0.5 block truncate w-full px-0.5"
                    style={{
                      fontSize: "10px",
                      color: "var(--text-tertiary)",
                    }}
                  >
                    {k.gloss}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 pt-3">
              <button
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="h-8 w-8 rounded-md flex items-center justify-center text-body-sm font-medium disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
                aria-label="첫 페이지"
              >
                &#171;
              </button>
              <button
                onClick={() => setPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="h-8 w-8 rounded-md flex items-center justify-center text-body-sm font-medium disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
                aria-label="이전 페이지"
              >
                &#8249;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i)
                .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
                .map((i, arrIdx, arr) => (
                  <span key={i} className="flex items-center">
                    {arrIdx > 0 && arr[arrIdx - 1] !== i - 1 && (
                      <span className="px-1 text-body-sm" style={{ color: "var(--text-tertiary)" }}>…</span>
                    )}
                    <button
                      onClick={() => setPage(i)}
                      className="h-8 min-w-[2rem] rounded-md flex items-center justify-center text-body-sm font-medium"
                      style={{
                        backgroundColor: i === page ? "var(--primary)" : "transparent",
                        color: i === page ? "white" : "var(--text-secondary)",
                      }}
                    >
                      {i + 1}
                    </button>
                  </span>
                ))}
              <button
                onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 rounded-md flex items-center justify-center text-body-sm font-medium disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
                aria-label="다음 페이지"
              >
                &#8250;
              </button>
              <button
                onClick={() => setPage(totalPages - 1)}
                disabled={page >= totalPages - 1}
                className="h-8 w-8 rounded-md flex items-center justify-center text-body-sm font-medium disabled:opacity-30"
                style={{ color: "var(--text-secondary)" }}
                aria-label="마지막 페이지"
              >
                &#187;
              </button>
            </div>
          )}
        </div>

        {/* Right: Detail side panel (lg: sticky sidebar, mobile: above grid via order-1) */}
        {selectedKanji && (
          <div
            ref={detailRef}
            className="rounded-lg border p-4 space-y-3 order-1 lg:order-2 mb-4 lg:mb-0 lg:w-80 lg:shrink-0 lg:sticky lg:top-[72px] lg:self-start"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--primary)",
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="font-jp font-bold"
                  lang="ja"
                  style={{ fontSize: "40px", color: "var(--primary)" }}
                >
                  {selectedKanji.char}
                </span>
                <div>
                  <p className="text-body font-medium">
                    {selectedKanji.gloss}
                  </p>
                  <p
                    className="text-body-sm"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    {selectedKanji.words.length}개 단어에서 사용
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedChar(null)}
                className="h-8 w-8 rounded-lg flex items-center justify-center"
                style={{ color: "var(--text-tertiary)" }}
                aria-label="Close"
              >
                &#10005;
              </button>
            </div>

            {/* Scrollable word list — constrained height on both mobile and desktop */}
            <div className="space-y-2 overflow-y-auto" style={{ maxHeight: "min(50vh, calc(100vh - 220px))" }}>
              {selectedKanji.words.map((w) => (
                <div
                  key={w.id}
                  className="rounded-lg border p-3"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border)",
                  }}
                >
                  <p className="font-jp font-semibold" lang="ja">
                    {w.word}
                  </p>
                  <p
                    className="text-body-sm font-jp"
                    lang="ja"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {w.reading}
                  </p>
                  <p
                    className="text-body-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {w.meaning}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
