"use client";

import { useEffect, useState } from "react";
import { EXPRESSION_PRESETS } from "@/lib/presets";
import { transformFace } from "@/lib/aiTransform";

export default function TestAiPage() {
  const [src, setSrc] = useState<string | null>(null);
  const [out, setOut] = useState<string | null>(null);
  const [expressionId, setExpressionId] = useState("joy");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [hfToken, setHfToken] = useState<string>("");

  useEffect(() => {
    const stored =
      typeof window !== "undefined"
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

  const aiPresets = EXPRESSION_PRESETS.filter((p) => p.aiParams);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      setSrc(r.result as string);
      setOut(null);
      setLog([]);
    };
    r.readAsDataURL(f);
  }

  function pushLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }

  async function run() {
    if (!src || busy) return;
    const preset = EXPRESSION_PRESETS.find((p) => p.id === expressionId);
    if (!preset?.aiParams) {
      pushLog("선택된 표정에 aiParams가 없음");
      return;
    }
    setBusy(true);
    setOut(null);
    pushLog(`전송: ${preset.label} ${JSON.stringify(preset.aiParams)}`);
    const t0 = performance.now();
    try {
      const result = await transformFace(src, preset.aiParams, {
        hfToken: hfToken || undefined,
        onProgress: pushLog,
      });
      const dt = ((performance.now() - t0) / 1000).toFixed(1);
      if (result) {
        setOut(result);
        pushLog(`완료 (${dt}s)`);
      } else {
        pushLog(`실패: 모든 Space가 null 반환 (${dt}s)`);
      }
    } catch (e) {
      pushLog(`예외: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
    }
  }

  async function probeRaw(url: string, slice = 160) {
    pushLog(`▶ raw GET ${url}`);
    try {
      const r = await fetch(url, { method: "GET" });
      const text = await r.text();
      pushLog(`  status=${r.status} type=${r.type}`);
      pushLog(`  CORS-Allow-Origin=${r.headers.get("access-control-allow-origin") ?? "(none)"}`);
      pushLog(`  body[0..${slice}]=${text.slice(0, slice)}`);
    } catch (e) {
      const err = e as Error;
      pushLog(`  FETCH ERROR: ${err.name}: ${err.message}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cause = (err as any).cause;
      if (cause) pushLog(`  cause: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  async function dumpSignature(endpoint: string) {
    pushLog(`▶ Signature dump: ${endpoint}`);
    try {
      const { Client } = await import("@gradio/client");
      const client = await Client.connect(endpoint);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info: any = await (client as any).view_api?.();
      if (!info) {
        pushLog("  view_api() 없음");
        return;
      }
      const named = info.named_endpoints ?? {};
      for (const [name, spec] of Object.entries(named)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const params = ((spec as any).parameters ?? []) as Array<{
          label?: string;
          parameter_name?: string;
          type?: string | { type?: string };
          python_type?: { type?: string };
          parameter_default?: unknown;
          component?: string;
        }>;
        pushLog(`  ${name}  (${params.length} params)`);
        params.forEach((p, i) => {
          const pt =
            typeof p.python_type === "object" && p.python_type?.type
              ? p.python_type.type
              : typeof p.type === "object" && p.type?.type
                ? p.type.type
                : String(p.type ?? "?");
          const def =
            p.parameter_default === undefined
              ? ""
              : ` =${JSON.stringify(p.parameter_default)}`;
          pushLog(
            `    [${i}] ${p.parameter_name ?? "?"} <${pt}> "${p.label ?? ""}"${def}`,
          );
        });
      }
    } catch (e) {
      pushLog(`  DUMP ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function probeGradio(endpoint: string) {
    pushLog(`▶ @gradio/client connect ${endpoint}`);
    try {
      const { Client } = await import("@gradio/client");
      const t0 = performance.now();
      const client = await Client.connect(endpoint);
      pushLog(`  connected in ${((performance.now() - t0) / 1000).toFixed(2)}s`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const info: any = await (client as any).view_api?.();
      const endpoints = info?.named_endpoints
        ? Object.keys(info.named_endpoints).slice(0, 20)
        : [];
      pushLog(`  named_endpoints=${JSON.stringify(endpoints)}`);
    } catch (e) {
      const err = e as Error;
      pushLog(`  CONNECT ERROR: ${err.name}: ${err.message}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const cause = (err as any).cause;
      if (cause) pushLog(`  cause: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }

  async function probeServer(url: string) {
    pushLog(`▶ server-side GET ${url}`);
    try {
      const r = await fetch(`/api/probe?url=${encodeURIComponent(url)}`);
      const json = await r.json();
      pushLog(
        `  status=${json.status} (${json.durationMs}ms) ct=${json.contentType ?? "-"} preview=${
          json.bodyPreview ?? json.error ?? ""
        }`,
      );
    } catch (e) {
      pushLog(`  PROBE ERROR: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  async function diagnose() {
    if (busy) return;
    setBusy(true);
    pushLog("=== CORS/네트워크 진단 시작 ===");
    pushLog(`UA: ${navigator.userAgent}`);
    pushLog(`Origin: ${window.location.origin}`);
    pushLog("-- 클라이언트 → API proxy(헤더 정제 + URL 재작성) → HF --");
    await probeRaw(`${window.location.origin}/api/hf/liveportrait/config`);
    await probeRaw(`${window.location.origin}/api/hf/liveportrait/info`);
    pushLog("-- @gradio/client connect (via API proxy) --");
    await probeGradio(`${window.location.origin}/api/hf/liveportrait`);
    pushLog("-- endpoint 시그니처 dump --");
    await dumpSignature(`${window.location.origin}/api/hf/liveportrait`);
    pushLog("=== 진단 종료 ===");
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-bold">AI 변형 CORS 테스트</h1>
      <p className="text-sm text-neutral-500">
        브라우저에서 HF Space(KwaiVGI/LivePortrait)를 직접 호출합니다. DevTools Network/Console을 함께 확인하세요.
      </p>

      <div className="rounded-lg border border-violet-500/40 bg-violet-500/10 p-3 text-sm">
        <div className="mb-1 flex items-center justify-between">
          <span className="font-semibold">HF 토큰</span>
          <a
            href="https://huggingface.co/settings/tokens"
            target="_blank"
            rel="noreferrer"
            className="text-xs underline"
          >
            발급 페이지 ↗
          </a>
        </div>
        <input
          type="password"
          value={hfToken}
          onChange={(e) => saveHfToken(e.target.value.trim())}
          placeholder="hf_..."
          className="w-full rounded border border-neutral-300 px-2 py-1 font-mono text-xs"
        />
        <p className="mt-1 text-xs text-neutral-500">
          localStorage 에만 저장. Authorization 헤더로 프록시를 거쳐 HF Space 까지 전달됩니다.
        </p>
      </div>

      <div className="space-y-2">
        <input type="file" accept="image/*" onChange={onFile} />
        <div className="flex items-center gap-2">
          <label>표정:</label>
          <select
            value={expressionId}
            onChange={(e) => setExpressionId(e.target.value)}
            className="border rounded px-2 py-1"
          >
            {aiPresets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} ({p.emoji})
              </option>
            ))}
          </select>
          <button
            onClick={run}
            disabled={!src || busy}
            className="px-4 py-2 bg-black text-white rounded disabled:opacity-40"
          >
            {busy ? "실행 중..." : "변환 시도"}
          </button>
          <button
            onClick={diagnose}
            disabled={busy}
            className="px-4 py-2 bg-violet-600 text-white rounded disabled:opacity-40"
          >
            CORS 진단
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="text-sm font-medium mb-1">원본</div>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt="src" className="w-full border rounded" />
          ) : (
            <div className="aspect-square border rounded grid place-items-center text-neutral-400">
              파일 선택
            </div>
          )}
        </div>
        <div>
          <div className="text-sm font-medium mb-1">결과</div>
          {out ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={out} alt="out" className="w-full border rounded" />
          ) : (
            <div className="aspect-square border rounded grid place-items-center text-neutral-400">
              {busy ? "..." : "대기"}
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium mb-1">로그</div>
        <pre className="text-xs bg-neutral-900 text-emerald-200 border border-neutral-700 p-3 rounded max-h-80 overflow-auto whitespace-pre-wrap font-mono">
          {log.length ? log.join("\n") : "(empty)"}
        </pre>
      </div>
    </main>
  );
}
