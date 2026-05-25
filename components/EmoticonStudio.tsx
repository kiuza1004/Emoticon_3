"use client";

import { useEffect, useMemo, useState } from "react";
import JSZip from "jszip";
import { Stepper } from "./Stepper";
import { Uploader } from "./Uploader";
import { EXPRESSION_PRESETS, STYLE_PRESETS, type StyleId } from "@/lib/presets";
import { removeBackground } from "@/lib/bgRemove";
import { composeEmoticon } from "@/lib/canvas";

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
  const [customBubble, setCustomBubble] = useState("");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [results, setResults] = useState<EmoticonResult[]>([]);

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

  async function regenerate() {
    if (!bgRemoved) return;
    setGenerating(true);
    setResults([]);
    const ids = [...selected];
    const total = ids.length;
    setProgress(`${total}개 이모티콘 합성 중...`);

    try {
      const out: EmoticonResult[] = [];
      let composeDone = 0;
      for (const id of ids) {
        const preset = EXPRESSION_PRESETS.find((p) => p.id === id);
        if (!preset) continue;

        const url = await composeEmoticon({
          bgRemovedDataUrl: bgRemoved,
          expressionId: id,
          styleId,
          customBubble: customBubble.trim() || undefined,
        });
        composeDone++;
        setProgress(`합성 ${composeDone}/${total}`);
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
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-400">
                표정 선택{" "}
                <span className="ml-1 text-xs normal-case text-slate-500">
                  ({selectedCount}/{EXPRESSION_PRESETS.length})
                </span>
              </h2>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                {EXPRESSION_PRESETS.map((p) => {
                  const on = selected.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => toggle(p.id)}
                      className={
                        "rounded-xl border px-2 py-3 text-center text-sm transition " +
                        (on
                          ? "border-brand-500 bg-brand-500/20"
                          : "border-slate-700 text-slate-400 hover:border-slate-500")
                      }
                    >
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
