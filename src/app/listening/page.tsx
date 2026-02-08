"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from "react";
import Link from "next/link";
import { listeningData } from "@/data/listening";
import { ListeningVideo, ReviewCard, getSRSStage, isStruggling } from "@/lib/types";
import { getReviewCards, upsertReviewCard } from "@/lib/storage";
import { getDueCards, createReviewCard } from "@/lib/srs";

const TABS = [
  { key: "subtitles" as const, label: "字幕" },
  { key: "expressions" as const, label: "表現" },
  { key: "favorites" as const, label: "★" },
] as const;

interface VideoSRSInfo {
  inSRS: number;
  mature: number;
  struggling: number;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ListeningPage() {
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [iframeSrc, setIframeSrc] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"subtitles" | "expressions" | "favorites">("subtitles");
  const [, startTransition] = useTransition();
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [dueCount, setDueCount] = useState(0);
  const [videoSRS, setVideoSRS] = useState<Record<string, VideoSRSInfo>>({});
  const [srsAddedIds, setSrsAddedIds] = useState<Set<string>>(new Set());

  const selectedVideo = useMemo(
    () => listeningData.find((v) => v.id === selectedVideoId),
    [selectedVideoId]
  );

  useEffect(() => {
    const cards = getReviewCards().filter((c) => c.contentType === "listening");
    setDueCount(getDueCards(cards).length);
    setSrsAddedIds(new Set(cards.map((c) => c.contentId)));

    // Build per-video SRS info
    const cardMap = new Map<string, ReviewCard>();
    for (const c of cards) cardMap.set(c.contentId, c);

    const info: Record<string, VideoSRSInfo> = {};
    for (const video of listeningData) {
      let inSRS = 0;
      let mature = 0;
      let struggling = 0;
      for (let i = 0; i < video.expressions.length; i++) {
        const card = cardMap.get(`${video.id}-${i}`);
        if (card) {
          inSRS++;
          if (getSRSStage(card) === "mature") mature++;
          if (isStruggling(card)) struggling++;
        }
      }
      info[video.id] = { inSRS, mature, struggling };
    }
    setVideoSRS(info);
  }, []);

  const handleAddToSRS = useCallback((videoId: string, exprIndex: number) => {
    const contentId = `${videoId}-${exprIndex}`;
    const card = createReviewCard("listening", contentId);
    upsertReviewCard(card);
    setSrsAddedIds((prev) => new Set(prev).add(contentId));
  }, []);

  useEffect(() => {
    if (!selectedVideoId) return;
    try {
      const stored = localStorage.getItem(`listening-fav-${selectedVideoId}`);
      if (stored) {
        setFavorites(new Set(JSON.parse(stored) as number[]));
      } else {
        setFavorites(new Set());
      }
    } catch {
      setFavorites(new Set());
    }
  }, [selectedVideoId]);

  function toggleFavorite(startTime: number) {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(startTime)) {
        next.delete(startTime);
      } else {
        next.add(startTime);
      }
      if (selectedVideoId) {
        localStorage.setItem(
          `listening-fav-${selectedVideoId}`,
          JSON.stringify([...next])
        );
      }
      return next;
    });
  }

  function selectVideo(video: ListeningVideo) {
    setSelectedVideoId(video.id);
    setIframeSrc(
      `https://www.youtube.com/embed/${video.videoId}?enablejsapi=1`
    );
  }

  function seekTo(video: ListeningVideo, seconds: number) {
    setIframeSrc(
      `https://www.youtube.com/embed/${video.videoId}?start=${Math.floor(seconds)}&autoplay=1&enablejsapi=1`
    );
  }

  if (listeningData.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-h1">듣기 연습</h1>
        <div
          className="p-6 rounded-lg border text-center"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <p className="text-body" style={{ color: "var(--text-secondary)" }}>
            듣기 콘텐츠가 아직 없습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-h1">듣기 연습</h1>
        <Link
          href="/listening/review"
          className="inline-flex items-center h-11 px-5 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--primary)" }}
        >
          복습{dueCount > 0 ? ` (${dueCount})` : ""}
        </Link>
      </div>

      {/* Video card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {listeningData.map((video) => (
          <button
            key={video.id}
            onClick={() => selectVideo(video)}
            className="p-4 rounded-lg border text-left"
            style={{
              backgroundColor:
                selectedVideoId === video.id
                  ? "var(--primary-light)"
                  : "var(--bg-secondary)",
              borderColor:
                selectedVideoId === video.id
                  ? "var(--primary)"
                  : "var(--border)",
            }}
          >
            <p className="text-h3 font-jp" lang="ja">
              {video.title}
            </p>
            <p
              className="text-caption mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {video.channelTitle} &middot; {video.expressions.length}개 표현
            </p>
            {videoSRS[video.id] && videoSRS[video.id].inSRS > 0 && (
              <p
                className="text-caption mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {videoSRS[video.id].mature}/{video.expressions.length} 숙달
                {videoSRS[video.id].struggling > 0 && (
                  <span style={{ color: "var(--warning)", marginLeft: "6px" }}>
                    {videoSRS[video.id].struggling}개 어려운 항목
                  </span>
                )}
              </p>
            )}
          </button>
        ))}
      </div>

      {/* Selected video detail — side-by-side on lg */}
      {selectedVideo && (
        <div className="lg:flex lg:gap-6 lg:items-start space-y-4 lg:space-y-0">
          {/* Left: Sticky video */}
          <div className="lg:w-1/2 lg:sticky lg:top-[72px] lg:self-start space-y-3">
            <div
              className="rounded-lg border overflow-hidden"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={iframeSrc}
                  title={selectedVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
            <div className="px-1">
              <p className="text-h3 font-jp" lang="ja">
                {selectedVideo.title}
              </p>
              <p
                className="text-body-sm mt-0.5"
                style={{ color: "var(--text-tertiary)" }}
              >
                {selectedVideo.channelTitle} &middot;{" "}
                {selectedVideo.expressions.length}개 표현
              </p>
            </div>
          </div>

          {/* Right: Tabbed panel */}
          <div className="lg:w-1/2 space-y-3">
            {/* Tab bar */}
            <div
              className="flex border-b"
              style={{ borderColor: "var(--border)" }}
            >
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => startTransition(() => setActiveTab(tab.key))}
                  className="px-4 py-2 text-body-sm font-medium border-b-2"
                  style={{
                    borderColor:
                      activeTab === tab.key
                        ? "var(--primary)"
                        : "transparent",
                    color:
                      activeTab === tab.key
                        ? "var(--primary)"
                        : "var(--text-secondary)",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 字幕 tab */}
            {activeTab === "subtitles" && (
              <div className="space-y-1">
                {selectedVideo.subtitles?.map((sub, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg"
                    style={{ backgroundColor: "var(--bg-secondary)" }}
                  >
                    <button
                      onClick={() => seekTo(selectedVideo, sub.startTime)}
                      className="shrink-0 text-body-sm font-mono font-medium"
                      style={{ color: "var(--primary)" }}
                    >
                      {formatTime(sub.startTime)}
                    </button>
                    <p className="flex-1 text-body font-jp" lang="ja">
                      {sub.text}
                    </p>
                    <button
                      onClick={() => toggleFavorite(sub.startTime)}
                      className="shrink-0 text-body cursor-pointer"
                      style={{
                        color: favorites.has(sub.startTime)
                          ? "var(--primary)"
                          : "var(--text-tertiary)",
                      }}
                    >
                      ★
                    </button>
                  </div>
                ))}
                {(!selectedVideo.subtitles || selectedVideo.subtitles.length === 0) && (
                  <p
                    className="text-body-sm text-center py-8"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    字幕がありません
                  </p>
                )}
              </div>
            )}

            {/* 表現 tab */}
            {activeTab === "expressions" && (
              <div className="space-y-3">
                {selectedVideo.expressions.map((expr, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: "var(--bg-secondary)",
                      borderColor: "var(--border)",
                    }}
                  >
                    {/* Expression header */}
                    <div className="flex items-start gap-3 mb-3">
                      <button
                        onClick={() => seekTo(selectedVideo, expr.startTime)}
                        className="shrink-0 text-body-sm font-mono font-medium mt-0.5"
                        style={{ color: "var(--primary)" }}
                      >
                        {formatTime(expr.startTime)}
                      </button>
                      <div>
                        <p className="text-h3 font-jp" lang="ja">
                          {expr.expression}
                        </p>
                        <p
                          className="text-body-sm"
                          style={{ color: "var(--text-tertiary)" }}
                        >
                          {expr.expressionReading}
                        </p>
                        <p
                          className="text-body-sm font-medium"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          {expr.meaning}
                        </p>
                      </div>
                    </div>

                    {/* Example sentence */}
                    <div
                      className="p-3 rounded-lg mb-3"
                      style={{ backgroundColor: "var(--bg-primary)" }}
                    >
                      <p className="text-body font-jp" lang="ja">
                        {expr.example}
                      </p>
                      <p
                        className="text-body-sm mt-1"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {expr.exampleReading}
                      </p>
                      <p
                        className="text-body-sm mt-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {expr.exampleTranslation}
                      </p>
                    </div>

                    {/* Vocabulary */}
                    {expr.vocabulary.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {expr.vocabulary.map((v, vIdx) => (
                          <span
                            key={vIdx}
                            className="inline-flex items-center h-7 px-2.5 rounded text-caption font-medium"
                            style={{
                              backgroundColor: "var(--primary-light)",
                              color: "var(--primary)",
                            }}
                          >
                            <span className="font-jp" lang="ja">
                              {v.word}
                            </span>
                            <span
                              className="mx-1"
                              style={{ color: "var(--text-tertiary)" }}
                            >
                              {v.reading}
                            </span>
                            <span>{v.meaning}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* SRS add button */}
                    <div className="mt-3 flex justify-end">
                      {srsAddedIds.has(`${selectedVideo.id}-${idx}`) ? (
                        <span
                          className="text-body-sm font-medium"
                          style={{ color: "var(--success)" }}
                        >
                          &#10003; SRS 추가됨
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAddToSRS(selectedVideo.id, idx)}
                          className="h-8 px-3 rounded-md text-caption font-semibold border"
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
                  </div>
                ))}
              </div>
            )}

            {/* ★ tab */}
            {activeTab === "favorites" && (
              <div className="space-y-1">
                {selectedVideo.subtitles
                  ?.filter((sub) => favorites.has(sub.startTime))
                  .map((sub, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg"
                      style={{ backgroundColor: "var(--bg-secondary)" }}
                    >
                      <button
                        onClick={() => seekTo(selectedVideo, sub.startTime)}
                        className="shrink-0 text-body-sm font-mono font-medium"
                        style={{ color: "var(--primary)" }}
                      >
                        {formatTime(sub.startTime)}
                      </button>
                      <p className="flex-1 text-body font-jp" lang="ja">
                        {sub.text}
                      </p>
                      <button
                        onClick={() => toggleFavorite(sub.startTime)}
                        className="shrink-0 text-body cursor-pointer"
                        style={{ color: "var(--primary)" }}
                      >
                        ★
                      </button>
                    </div>
                  ))}
                {(!selectedVideo.subtitles ||
                  selectedVideo.subtitles.filter((sub) => favorites.has(sub.startTime)).length === 0) && (
                  <p
                    className="text-body-sm text-center py-8"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    お気に入りがありません
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
