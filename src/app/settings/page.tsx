"use client";

import { useState, useEffect } from "react";
import {
  getSettings,
  saveSettings,
  resetAllData,
  exportAllData,
  validateExportData,
  importAllData,
} from "@/lib/storage";
import { UserSettings } from "@/lib/types";

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImport, setPendingImport] = useState<string | null>(null);
  const [dataMessage, setDataMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    setSettings(getSettings());
  }, []);

  if (!settings) return null;

  const update = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
  };

  const handleReset = () => {
    resetAllData();
    setSettings(getSettings());
    setShowResetConfirm(false);
  };

  const handleExport = () => {
    const data = exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const today = new Date().toISOString().split("T")[0];
    const a = document.createElement("a");
    a.href = url;
    a.download = `jlpt-n1-backup-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setDataMessage({ type: "success", text: "데이터를 내보냈습니다." });
  };

  const handleImportClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setPendingImport(reader.result as string);
        setShowImportConfirm(true);
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleImportConfirm = () => {
    if (!pendingImport) return;
    try {
      const parsed = JSON.parse(pendingImport);
      if (!validateExportData(parsed)) {
        setDataMessage({ type: "error", text: "유효하지 않은 백업 파일 형식입니다." });
        setShowImportConfirm(false);
        setPendingImport(null);
        return;
      }
      importAllData(parsed);
      setShowImportConfirm(false);
      setPendingImport(null);
      window.location.reload();
    } catch {
      setDataMessage({ type: "error", text: "백업 파일을 읽는 데 실패했습니다." });
      setShowImportConfirm(false);
      setPendingImport(null);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-h1">설정</h1>

      {/* Daily New Cards */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <h2 className="text-h3 mb-4">일일 새 카드 수</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span>단어</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  update("dailyNewVocab", Math.max(5, settings.dailyNewVocab - 5))
                }
                className="w-9 h-9 rounded-lg border flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                -
              </button>
              <span className="w-8 text-center font-bold">
                {settings.dailyNewVocab}
              </span>
              <button
                onClick={() =>
                  update("dailyNewVocab", Math.min(50, settings.dailyNewVocab + 5))
                }
                className="w-9 h-9 rounded-lg border flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                +
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>문법</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  update(
                    "dailyNewGrammar",
                    Math.max(1, settings.dailyNewGrammar - 1)
                  )
                }
                className="w-9 h-9 rounded-lg border flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                -
              </button>
              <span className="w-8 text-center font-bold">
                {settings.dailyNewGrammar}
              </span>
              <button
                onClick={() =>
                  update(
                    "dailyNewGrammar",
                    Math.min(20, settings.dailyNewGrammar + 1)
                  )
                }
                className="w-9 h-9 rounded-lg border flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                +
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span>듣기</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  update(
                    "dailyNewListening",
                    Math.max(1, settings.dailyNewListening - 1)
                  )
                }
                className="w-9 h-9 rounded-lg border flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                -
              </button>
              <span className="w-8 text-center font-bold">
                {settings.dailyNewListening}
              </span>
              <button
                onClick={() =>
                  update(
                    "dailyNewListening",
                    Math.min(15, settings.dailyNewListening + 1)
                  )
                }
                className="w-9 h-9 rounded-lg border flex items-center justify-center font-semibold"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Audio */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <h2 className="text-h3 mb-4">오디오</h2>
        <div className="flex items-center justify-between">
          <div>
            <span>발음 자동 재생</span>
            <p
              className="text-caption mt-0.5"
              style={{ color: "var(--text-tertiary)" }}
            >
              카드 답 표시 시 오디오 재생
            </p>
          </div>
          <button
            onClick={() => update("autoPlayAudio", !settings.autoPlayAudio)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{
              backgroundColor: settings.autoPlayAudio
                ? "var(--primary)"
                : "var(--border)",
            }}
            role="switch"
            aria-checked={settings.autoPlayAudio}
            aria-label="Auto-play pronunciation"
          >
            <span
              className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform"
              style={{
                transform: settings.autoPlayAudio
                  ? "translateX(20px)"
                  : "translateX(0)",
              }}
            />
          </button>
        </div>
      </div>

      {/* Export / Import */}
      <div
        className="p-4 rounded-lg border"
        style={{
          backgroundColor: "var(--bg-secondary)",
          borderColor: "var(--border)",
        }}
      >
        <h2 className="text-h3 mb-4">데이터 백업</h2>
        {showImportConfirm ? (
          <div
            className="p-4 rounded-lg"
            style={{ backgroundColor: "var(--error-light)" }}
          >
            <p
              className="text-body-sm font-semibold mb-3"
              style={{ color: "var(--error)" }}
            >
              현재 데이터가 모두 대체됩니다. 계속하시겠습니까?
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleImportConfirm}
                className="flex-1 h-11 rounded-lg text-body-sm font-semibold text-white"
                style={{ backgroundColor: "var(--error)" }}
              >
                네, 가져오기
              </button>
              <button
                onClick={() => {
                  setShowImportConfirm(false);
                  setPendingImport(null);
                }}
                className="flex-1 h-11 rounded-lg text-body-sm font-semibold border"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                취소
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex-1 h-11 rounded-lg text-body-sm font-semibold border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              데이터 내보내기
            </button>
            <button
              onClick={handleImportClick}
              className="flex-1 h-11 rounded-lg text-body-sm font-semibold border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              데이터 가져오기
            </button>
          </div>
        )}
        {dataMessage && (
          <p
            className="text-body-sm mt-3 font-medium"
            style={{
              color:
                dataMessage.type === "success"
                  ? "var(--success)"
                  : "var(--error)",
            }}
          >
            {dataMessage.text}
          </p>
        )}
      </div>

      {/* Reset */}
      {!showResetConfirm ? (
        <button
          onClick={() => setShowResetConfirm(true)}
          className="w-full h-11 rounded-lg text-body-sm font-semibold text-white"
          style={{ backgroundColor: "var(--error)" }}
        >
          모든 데이터 초기화
        </button>
      ) : (
        <div
          className="p-4 rounded-lg"
          style={{ backgroundColor: "var(--error-light)" }}
        >
          <p
            className="text-body-sm font-semibold mb-3"
            style={{ color: "var(--error)" }}
          >
            모든 진행 상황이 삭제됩니다. 계속하시겠습니까?
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleReset}
              className="flex-1 h-11 rounded-lg text-body-sm font-semibold text-white"
              style={{ backgroundColor: "var(--error)" }}
            >
              네, 초기화
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="flex-1 h-11 rounded-lg text-body-sm font-semibold border"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
