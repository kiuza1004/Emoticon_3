"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { Stepper } from "./Stepper";
import { Uploader } from "./Uploader";
import { EXPRESSION_PRESETS, STYLE_PRESETS, type StyleId } from "@/lib/presets";
import { removeBackground } from "@/lib/bgRemove";
import { composeEmoticon } from "@/lib/canvas";
import { transformFace } from "@/lib/aiTransform";
import { getCached, setCached, hashSource } from "@/lib/cache";

const CACHE_VERSION = "v2";

type EmoticonResult = { id: string; label: string; emoji: string; url: string };

export function EmoticonStudio() {
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0);
  const [original, setOriginal] = useState<string | null>(null);
  const [bgRemoved, setBgRemoved] = useState<string | null>(null);
  const [removingBg, setRemovingBg] = useState(false);
  const [bgStatus, setBgStatus] = useState<string>("");

  const [styleId, setStyleId] = useState<StyleId>("sticker");
  const [selected, setSelected] = useState<Set<string>>(
    new Set(EXPRESSION_PRESETS.map((p) => p.id)),
  );
  const [aiEnabled, setAiEnabled] = useState<Set<string>>(new Set());
  const [hfToken, setHfToken] = useState<string>("");
  const [customBubble, setCustomBubble] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [results, setResults] = useState<EmoticonResult[]>([]);

  useEffect(() => {
    const stored = typeof window !== "undefined"
      ? window.localStorage.getItem("hf_token")
      : null;
    if (stored) setHfToken(stored);
  }, []);

  function saveHfToken(value: string) {
    setHfToken(value);
    if (typeof window === "undefined") return;
    if (value) window.localStorage.setItem("hf_token", value);
    else window.localStorage.removeItem("hf_token");
  }

  const aiCapableIds = useMemo(
    () => EXPRESSION_PRESETS.filter((p) => p.aiParams).map((p) => p.id),
    [],
  );

  const canGenerate = bgRemoved && selected.size > 0 && !generating;
  const selectedCount = selected.size;

  useEffect(() => {
    if (bgRemoved && selected.size > 0 && !generating) {
      void regenerate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleId]);

  const handleUploaded = (dataUrl: string) => {
    setOriginal(dataUrl);
    setResults([]);
    setStep(1);
    void runRemoveBg(dataUrl);
  };

  async function runRemoveBg(imageDataUrl: string) {
    setRemovingBg(true);
    setBgRemoved(null);
    setBgStatus("초기화 중...");
    try {
      const out = await removeBackground(imageDataUrl, setBgStatus);
      setBgRemoved(out);
      setBgStatus("");
      setStep(2);
    } catch (err) {
      alert("배경 제거 실패: " + (err as Error).message);
      setBgStatus("");
    } finally {
      setRemovingBg(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAi(id: string) {
    setAiEnabled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function setAllAi(on: boolean) {
    setAiEnabled(on ? new Set(aiCapableIds) : new Set());
  }

  async function regenerate() {
    if (!bgRemoved) return;
    setGenerating(true);
    setResults([]);
    const ids = [...selected];
    const aiIds = ids.filter((id) => aiEnabled.has(id));
    const total = ids.length;
    setProgress(
      aiIds.length > 0
        ? `AI 0/${aiIds.length} · 합성 0/${total}`
        : `${total}개 이모티콘 합성 중...`,
    );

    let sourceHash = "";
    if (aiIds.length > 0) {
      try {
        sourceHash = await hashSource(bgRemoved);
      } catch {
        // 캐시 비활성화로 진행
      }
    }

    try {
      const out: EmoticonResult[] = [];
      let aiDone = 0;
      let composeDone = 0;
      for (const id of ids) {
        const preset = EXPRESSION_PRESETS.find((p) => p.id === id);
        if (!preset) continue;

        let subject = bgRemoved;
        if (aiEnabled.has(id) && preset.aiParams) {
          const cacheKey = sourceHash
            ? `${sourceHash}:${id}:${CACHE_VERSION}`
            : "";
          let transformed: string | null = null;
          if (cacheKey) transformed = await getCached(cacheKey);
          if (transformed) {
            setProgress(
              `AI ${aiDone + 1}/${aiIds.length} (캐시) · 합성 ${composeDone}/${total}`,
            );
          } else {
            transformed = await transformFace(bgRemoved, preset.aiParams, {
              hfToken: hfToken || undefined,
              onProgress: (msg) =>
                setProgress(
                  `AI ${aiDone + 1}/${aiIds.length} ${msg} · 합성 ${composeDone}/${total}`,
                ),
            });
            if (transformed && cacheKey) {
              await setCached(cacheKey, transformed);
            }
          }
          if (transformed) subject = transformed;
          aiDone++;
        }

        const url = await composeEmoticon({
          bgRemovedDataUrl: subject,
          expressionId: id,
          styleId,
          customBubble: customBubble.trim() || undefined,
        });
        composeDone++;
        setProgress(
          aiIds.length > 0
            ? `AI ${aiDone}/${aiIds.length} · 합성 ${composeDone}/${total}`
            : `합성 ${composeDone}/${total}`,
        );
        out.push({ id, label: preset.label, emoji: preset.emoji, url });
        setResults([...out]);
      }
      setStep(3);
    } catch (err) {
      alert("합성 실패: " + (err as Error).message);
    } finally {
      setGenerating(false);
      setProgress("");
    }
  }

  async function downloadAll() {
    if (results.length === 0) return;
    const zip = new JSZip();
    await Promise.all(
      results.map(async (r, i) => {
        const blob = await fetch(r.url).then((res) => res.blob());
        zip.file(`${String(i + 1).padStart(2, "0")}_${r.id}.png`, blob);
      }),
    );
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `emoticons-${Date.now()}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function reset() {
    setStep(0);
    setOriginal(null);
    setBgRemoved(null);
    setResults([]);
    setCustomBubble("");
  }

  const previewSrc = useMemo(() => bgRemoved ?? original, [bgRemoved, original]);

  return (
    <div className="space-y-8">
      <Stepper active={step} />

      {step === 0 && <Uploader onPicked={handleUploaded} />}

      {step >= 1 && (
        <section className="grid gap-6 md:grid-cols-[280px_1fr]">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">미리보기</h2>
            <div className="checker aspect-square overflow-hidden rounded-2xl">
              {previewSrc ? (
                <img src={previewSrc} alt="preview" className="h-full w-full object-contain" />
              ) : (
                <div className="grid h-full place-items-center text-slate-500">no image</div>
              )}
            </div>
            {removingBg && (
              <p className="text-sm text-amber-400">⏳ {bgStatus || "배경 제거 중..."}</p>
            )}
            {bgRemoved && !removingBg && (
              <p className="text-sm text-emerald-400">✓ 배경 제거 완료</p>
            )}
            <button
              onClick={reset}
              className="w-full rounded-lg border border-slate-700 px-3 py-2 text-sm hover:bg-slate-800"
            >
              다른 사진 선택
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                스타일
              </h2>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {STYLE_PRESETS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    className={
                      "rounded-xl border px-3 py-3 text-sm transition " +
                      (styleId === s.id
                        ? "border-brand-500 bg-brand-500/20 text-white"
                        : "border-slate-700 text-slate-300 hover:border-slate-500")
                    }
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                  표정 선택{" "}
                  <span className="ml-1 text-xs normal-case text-slate-500">
                    ({selectedCount}/{EXPRESSION_PRESETS.length})
                  </span>
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500">
                    AI {aiEnabled.size}/{aiCapableIds.length}
                  </span>
                  <button
                    onClick={() => setAllAi(true)}
                    className="rounded-md border border-violet-500/60 px-2 py-1 text-violet-300 hover:bg-violet-500/20"
                  >
                    전체 AI ON
                  </button>
                  <button
                    onClick={() => setAllAi(false)}
                    className="rounded-md border border-slate-700 px-2 py-1 text-slate-400 hover:bg-slate-800"
                  >
                    OFF
                  </button>
                </div>
              </div>
              {aiEnabled.size > 0 && (
                <div className="mb-3 rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-xs">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-violet-200">HF 토큰</span>
                    <a
                      href="https://huggingface.co/settings/tokens"
                      target="_blank"
                      rel="noreferrer"
                      className="text-violet-300 underline hover:text-violet-200"
                    >
                      발급 페이지 열기 ↗
                    </a>
                  </div>
                  <p className="mb-2 text-slate-400">
                    LivePortrait Space는 무료 호출이 정책으로 차단됩니다. HF 계정에서{" "}
                    <code className="rounded bg-slate-800 px-1">Read</code> 권한 토큰을 발급해 아래에 붙여넣으세요.
                    토큰은 이 브라우저 localStorage 에만 저장되며 서버로 전송되지 않습니다.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="password"
                      value={hfToken}
                      onChange={(e) => saveHfToken(e.target.value.trim())}
                      placeholder="hf_..."
                      className="flex-1 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 font-mono text-slate-200 outline-none focus:border-violet-400"
                    />
                    {hfToken && (
                      <button
                        onClick={() => saveHfToken("")}
                        className="rounded-md border border-slate-700 px-2 py-1 text-slate-400 hover:bg-slate-800"
                      >
                        지우기
                      </button>
                    )}
                  </div>
                  {!hfToken && (
                    <p className="mt-1 text-amber-300">
                      ⚠ 토큰 없이는 AI 변환이 호출 즉시 실패합니다.
                    </p>
                  )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {EXPRESSION_PRESETS.map((p) => {
                  const on = selected.has(p.id);
                  const aiCapable = !!p.aiParams;
                  const aiOn = aiEnabled.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={
                        "relative rounded-xl border px-2 py-3 text-center text-sm transition " +
                        (on
                          ? "border-brand-500 bg-brand-500/20"
                          : "border-slate-700 text-slate-400 hover:border-slate-500")
                      }
                    >
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (aiCapable) toggleAi(p.id);
                        }}
                        onKeyDown={(e) => {
                          if ((e.key === "Enter" || e.key === " ") && aiCapable) {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleAi(p.id);
                          }
                        }}
                        title={
                          aiCapable
                            ? aiOn
                              ? "AI 변형: ON"
                              : "AI 변형: OFF (클릭해서 켜기)"
                            : "이 표정은 AI 변형 미지원"
                        }
                        className={
                          "absolute right-1 top-1 inline-flex h-5 items-center rounded-md px-1 text-[10px] font-bold transition " +
                          (aiCapable
                            ? aiOn
                              ? "bg-violet-500 text-white"
                              : "border border-slate-600 text-slate-400 hover:border-violet-400 hover:text-violet-300"
                            : "border border-slate-800 text-slate-700")
                        }
                      >
                        AI
                      </span>
                      <div className="text-2xl">{p.emoji}</div>
                      <div className="mt-1 text-xs">{p.label}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                말풍선 텍스트 (선택)
                <span className="ml-2 text-xs text-slate-500">비워두면 표정별 기본 문구 사용</span>
              </label>
              <input
                value={customBubble}
                onChange={(e) => setCustomBubble(e.target.value)}
                placeholder="예: 오빠 뭐해?"
                maxLength={20}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-brand-500"
              />
            </div>

            <button
              onClick={regenerate}
              disabled={!canGenerate}
              className="w-full rounded-xl bg-brand-500 px-6 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-500 disabled:shadow-none"
            >
              {generating ? "합성 중..." : `${selectedCount}개 이모티콘 생성하기`}
            </button>
            {progress && <p className="text-center text-sm text-slate-400">{progress}</p>}
          </div>
        </section>
      )}

      {results.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">생성 결과 ({results.length}개)</h2>
            <button
              onClick={downloadAll}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-600"
            >
              ZIP으로 전체 다운로드
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {results.map((r) => (
              <a
                key={r.id}
                href={r.url}
                download={`${r.id}.png`}
                className="group flex flex-col items-center gap-2 rounded-xl border border-slate-700 p-2 hover:border-brand-500"
              >
                <div className="checker aspect-square w-full overflow-hidden rounded-lg">
                  <img src={r.url} alt={r.label} className="h-full w-full object-contain" />
                </div>
                <div className="text-sm">
                  <span className="mr-1">{r.emoji}</span>
                  {r.label}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
