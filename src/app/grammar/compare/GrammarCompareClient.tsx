"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { grammarData } from "@/data/grammar";
import { GrammarPattern } from "@/lib/types";

export default function GrammarCompareClient() {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchText, setSearchText] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Read IDs from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    if (hash) {
      const ids = hash
        .split(",")
        .filter((id) => grammarData.some((g) => g.id === id))
        .slice(0, 3);
      if (ids.length > 0) setSelectedIds(ids);
    }
  }, []);

  // Update URL hash when selection changes
  useEffect(() => {
    if (selectedIds.length > 0) {
      window.location.hash = selectedIds.join(",");
    } else {
      // Remove hash without scrolling
      history.replaceState(null, "", window.location.pathname);
    }
  }, [selectedIds]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = searchText.toLowerCase();
    return grammarData.filter(
      (g) =>
        !selectedIds.includes(g.id) &&
        (g.pattern.includes(q) ||
          g.meaning.toLowerCase().includes(q) ||
          g.id.includes(q))
    );
  }, [searchText, selectedIds]);

  const addPattern = useCallback((id: string) => {
    setSelectedIds((prev) => {
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
    setSearchText("");
    setDropdownOpen(false);
  }, []);

  const removePattern = useCallback((id: string) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
  }, []);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
    setSearchText("");
  }, []);

  const selectedPatterns = useMemo<GrammarPattern[]>(
    () => selectedIds
      .map((id) => grammarData.find((g) => g.id === id))
      .filter((g): g is GrammarPattern => g !== undefined),
    [selectedIds]
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.push("/grammar")}
        className="text-body-sm font-medium"
        style={{ color: "var(--primary)" }}
      >
        &larr; 문법
      </button>

      <h1 className="text-h1">패턴 비교</h1>

      {/* Selector */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <p
          className="text-body-sm font-medium mb-2"
          style={{ color: "var(--text-secondary)" }}
        >
          비교할 패턴 2~3개를 선택하세요
        </p>

        {/* Selected chips */}
        {selectedIds.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {selectedPatterns.map((g) => (
              <span
                key={g.id}
                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-body-sm font-medium"
                style={{
                  backgroundColor: "var(--primary-light)",
                  color: "var(--primary)",
                }}
              >
                <span className="font-jp" lang="ja">
                  {g.pattern}
                </span>
                <button
                  onClick={() => removePattern(g.id)}
                  className="ml-1 text-body font-bold leading-none"
                  style={{ color: "var(--primary)" }}
                  aria-label={`Remove ${g.pattern}`}
                >
                  x
                </button>
              </span>
            ))}
            <button
              onClick={clearAll}
              className="h-8 px-3 rounded-lg text-body-sm font-medium border"
              style={{
                borderColor: "var(--border)",
                color: "var(--text-tertiary)",
              }}
            >
              전체 삭제
            </button>
          </div>
        )}

        {/* Search dropdown */}
        {selectedIds.length < 3 && (
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              placeholder="추가할 패턴 검색..."
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              className="w-full h-11 rounded-lg border px-4 text-body-sm"
              style={{
                backgroundColor: "var(--bg-primary)",
                borderColor: "var(--border)",
                color: "var(--text-primary)",
              }}
            />
            {dropdownOpen && filteredOptions.length > 0 && (
              <div
                className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border shadow-lg"
                style={{
                  backgroundColor: "var(--bg-primary)",
                  borderColor: "var(--border)",
                }}
              >
                {filteredOptions.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => addPattern(g.id)}
                    className="w-full text-left px-4 py-2.5 text-body-sm transition-colors"
                    style={{
                      color: "var(--text-primary)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "var(--bg-secondary)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <span className="font-jp font-semibold" lang="ja">
                      {g.pattern}
                    </span>
                    <span
                      className="ml-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      {g.meaning}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Comparison cards */}
      {selectedPatterns.length >= 2 && (
        <div className="space-y-4">
          <h2 className="text-h3">비교</h2>
          {selectedPatterns.map((g) => (
            <div
              key={g.id}
              className="p-4 rounded-lg border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              {/* Pattern header */}
              <div className="flex items-start justify-between gap-2">
                <p className="text-kanji font-jp" lang="ja">
                  {g.pattern}
                </p>
                <button
                  onClick={() => removePattern(g.id)}
                  className="shrink-0 h-8 px-3 rounded-lg text-caption font-medium border"
                  style={{
                    borderColor: "var(--border)",
                    color: "var(--text-tertiary)",
                  }}
                >
                  삭제
                </button>
              </div>

              {/* Meaning */}
              <div className="mt-3">
                <p
                  className="text-caption font-semibold mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  의미
                </p>
                <p className="text-body">{g.meaning}</p>
              </div>

              {/* Formation */}
              <div
                className="mt-3 p-3 rounded-lg border-l-[3px]"
                style={{
                  backgroundColor: "var(--bg-tertiary)",
                  borderLeftColor: "var(--primary)",
                }}
              >
                <p
                  className="text-caption font-semibold mb-1"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  접속
                </p>
                <p className="text-body font-jp" lang="ja">
                  {g.formation}
                </p>
              </div>

              {/* Example */}
              {g.examples.length > 0 && (
                <div className="mt-3">
                  <p
                    className="text-caption font-semibold mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    예문
                  </p>
                  <div
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: "var(--bg-tertiary)" }}
                  >
                    <p className="text-body font-jp" lang="ja">
                      {g.examples[0].japanese}
                    </p>
                    <p
                      className="text-body-sm mt-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {g.examples[0].translation}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {g.notes && (
                <div className="mt-3">
                  <p
                    className="text-caption font-semibold mb-1"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    메모
                  </p>
                  <p
                    className="text-body-sm leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {g.notes}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {selectedPatterns.length < 2 && (
        <div
          className="text-center py-8 rounded-lg border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-body" style={{ color: "var(--text-tertiary)" }}>
            {selectedPatterns.length === 0
              ? "비교할 패턴을 최소 2개 선택하세요"
              : "비교를 시작하려면 1개 더 선택하세요"}
          </p>
        </div>
      )}
    </div>
  );
}
