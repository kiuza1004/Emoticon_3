"use client";

import type { AiParams } from "./presets";

export type TransformProgress = (msg: string) => void;

const PROXY_PATH = "/api/hf/liveportrait";
const ENDPOINT = "/gpu_wrapped_execute_image";
const TIMEOUT_MS = 90_000;

// LivePortrait `/gpu_wrapped_execute_image` (image retargeting):
//   param_0: float  target eyes-open ratio
//   param_1: float  target lip-open ratio
//   param_2: image  source portrait
//   param_3: bool   do crop
// 사용자 슬라이더는 두 개뿐이라 smile/wink/eyebrow/eyeball 같은
// 추가 슬라이더는 이 endpoint에서 지원되지 않음.
const DEFAULTS: Required<AiParams> = {
  eyesOpenRatio: 0.34,
  lipOpenRatio: 0,
};

function spaceUrl(): string {
  if (typeof window === "undefined") return PROXY_PATH;
  return `${window.location.origin}${PROXY_PATH}`;
}

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl);
  return res.blob();
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`${label} timeout ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const o = e as any;
    if (typeof o.message === "string" && o.message) return o.message;
    if (typeof o.error === "string" && o.error) return o.error;
    if (typeof o.detail === "string" && o.detail) return o.detail;
    try {
      return JSON.stringify(o);
    } catch {
      return String(o);
    }
  }
  return String(e);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function extractImageUrl(result: any): Promise<string | null> {
  const data = result?.data;
  const candidates = Array.isArray(data) ? data : [data];
  for (const c of candidates) {
    const url: string | undefined =
      c?.url ?? c?.path ?? (typeof c === "string" ? c : undefined);
    if (url && typeof url === "string") return url;
  }
  return null;
}

async function urlToDataUrl(url: string): Promise<string | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  return blobToDataUrl(await res.blob());
}

export async function transformFace(
  sourceDataUrl: string,
  aiParams: AiParams,
  onProgress?: TransformProgress,
): Promise<string | null> {
  let sourceBlob: Blob;
  try {
    sourceBlob = await dataUrlToBlob(sourceDataUrl);
  } catch (e) {
    onProgress?.(`소스 변환 실패: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }

  try {
    const { Client } = await import("@gradio/client");
    onProgress?.("LivePortrait 연결 중...");
    const client = await withTimeout(
      Client.connect(spaceUrl()),
      TIMEOUT_MS,
      "connect",
    );

    onProgress?.("AI 얼굴 변형 추론 중...");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = await withTimeout(
      client.predict(ENDPOINT, {
        param_0: aiParams.eyesOpenRatio ?? DEFAULTS.eyesOpenRatio,
        param_1: aiParams.lipOpenRatio ?? DEFAULTS.lipOpenRatio,
        param_2: sourceBlob,
        param_3: true,
      }),
      TIMEOUT_MS,
      "predict",
    );

    if (typeof window !== "undefined") {
      // 응답 형식 디버깅 — DevTools 에서 window.__lpLast 로 확인 가능
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__lpLast = result;
    }

    const outUrl = await extractImageUrl(result);
    if (!outUrl) {
      onProgress?.(
        `LivePortrait: 응답 추출 실패. raw=${JSON.stringify(result).slice(0, 200)}`,
      );
      return null;
    }
    return urlToDataUrl(outUrl);
  } catch (e) {
    if (typeof window !== "undefined") {
      // eslint-disable-next-line no-console
      console.error("[LivePortrait predict error]", e);
    }
    onProgress?.(`LivePortrait 실패: ${errMsg(e)}`);
    return null;
  }
}
