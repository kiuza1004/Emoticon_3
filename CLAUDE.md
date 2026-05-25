# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev           # Next.js dev (Turbopack) at http://localhost:3000
npm run build         # Production build — runs strict tsc
npm run lint
npx tsc --noEmit      # Strict type check (Vercel uses this; Turbopack dev does NOT)
```

There are no tests. There is no backend, so no DB/migrations/env to manage.

### Critical CI quirk

`next dev` (Turbopack) compiles successfully even with TS errors that **fail Vercel's production build**. Before pushing changes that touch types — especially anything around `@huggingface/transformers` configs — run `npx tsc --noEmit` first. A real past failure: `PretrainedConfig` requires fields like `max_position_embeddings` and `normalized_config`, but the runtime accepts partial configs. The fix is `as never` on the partial config object (see `lib/bgRemove.ts`).

## Architecture

**Mostly client.** Model loading, ONNX inference, image compositing, ZIP packaging all run in the browser. The only server-side surface is a thin Node-runtime HTTP proxy under `/api/hf/[...slug]` that forwards `@gradio/client` calls to Hugging Face Spaces — needed because HF responds with `403 Forbidden embedding` to direct browser calls (see "AI proxy" below). No DB, no auth, no env vars.

### The pipeline (one-way state machine)

`Uploader` → `removeBackground()` → `composeEmoticon()` per-preset → `<img>` gallery → JSZip.

State lives in `components/EmoticonStudio.tsx` as a `step: 0|1|2|3` cursor. Background removal kicks off automatically on upload; compositing kicks off automatically when `styleId` changes (see the `useEffect` watching `styleId`). All other state changes are explicit clicks.

### `lib/bgRemove.ts` — the only fragile part

This file wraps Transformers.js v3 and is the most error-prone surface in the repo. Three non-obvious things:

1. **`briaai/RMBG-1.4` is a custom architecture** — the standard `pipeline("image-segmentation", ...)` rejects it with `Unsupported model type "SegformerForSemanticSegmentation"`. We use the lower-level `AutoModel.from_pretrained(..., { config: { model_type: "custom" } as never })` + `AutoProcessor` pattern from HF's own RMBG demo. Don't refactor back to `pipeline()`.

2. **Mobile WebGPU is a trap.** `navigator.gpu` is present on Android Chrome but its WebGPU implementation can't compile this model's compute pipeline, so loading succeeds and **inference** throws `OrtRun() ... /stage2/Add ... Failed to create a WebGPU compute pipeline`. Two-layer defense:
   - Mobile UA detection picks WASM upfront in `detectDevice()`.
   - On desktop, if inference still throws something matching `/webgpu|wgpu|ortrun|compute pipeline|external instance|stage2/i`, the cached pipeline is dropped, `preferredDevice` is locked to `"wasm"`, and the call retries transparently.

3. **Pipeline is module-cached** in `loadedPromise`. First call downloads ~45MB; subsequent calls reuse the same model object. The fallback path explicitly resets `loadedPromise = null` to force reload on the new device.

### `lib/aiTransform.ts` + `lib/cache.ts` + `app/api/hf/[...slug]/route.ts` — opt-in face transformation

Optional second pass that runs **before** `composeEmoticon()`. When the user clicks the "AI" badge on a preset card, `transformFace(bgRemoved, preset.aiParams)` calls the public `KlingTeam/LivePortrait` Space's `/gpu_wrapped_execute_image` endpoint via `@gradio/client`. The Space returns a pixel-edited face which becomes the new `subject` passed to `composeEmoticon()` — Canvas decoration is unchanged.

Six non-obvious things:

1. **Only two sliders are actually exposed.** Despite the LivePortrait UI showing smile/wink/eyebrow/eyeball/head-pose sliders, the public `/gpu_wrapped_execute_image` endpoint only takes four positional params: `param_0` = target eyes-open ratio (`0` ≈ closed · `0.34` ≈ neutral · `0.7+` ≈ wide), `param_1` = target lip-open ratio (`0` ≈ closed · `0.5+` ≈ wide open), `param_2` = source image, `param_3` = do crop bool. The richer sliders are bound to unnamed `gr.Slider.change` events that `@gradio/client` cannot call. `AiParams` is therefore `{ eyesOpenRatio?, lipOpenRatio? }` — don't reintroduce smile/wink/eyebrow fields. Run `/test-ai` → "CORS 진단" to re-confirm the signature if anything looks off.

2. **All HF traffic goes through `/api/hf/[...slug]`.** Direct browser calls to `*.hf.space` return `403 Forbidden embedding` (HF policy block, not CORS). The Node-runtime proxy (a) drops `Referer`/`Sec-Fetch-*` and forces a server `User-Agent`, and (b) **rewrites absolute HF URLs to proxy URLs inside JSON bodies** so `@gradio/client`'s subsequent `/info` / SSE / upload calls also go through the proxy instead of bouncing back to `*.hf.space`. Don't add a Next.js `rewrites:` entry — `rewrites` pass client headers through and get re-blocked.

3. **`transformFace()` returns `null` on failure, never throws.** Callers (the regenerate loop in `EmoticonStudio.tsx`) fall back to the bg-removed original on null. Cold-start, queue wait, CORS, Space removal must all degrade gracefully.

4. **HF 토큰이 필수.** The `KlingTeam/LivePortrait` Space requests a 240s GPU duration per call, which exceeds the ZeroGPU anonymous limit and returns `'The requested GPU duration (240s) is larger than the maximum allowed'`. The user must paste a read-scope HF token in the UI; the token is kept in `localStorage` only, sent as `Authorization: Bearer ...` (in `Client.connect({ token })`), and forwarded by the proxy via the `authorization` entry in `SAFE_REQ_HEADERS`. Don't reintroduce anonymous calls — they fail instantly.

5. **External Space dependency.** `KlingTeam/LivePortrait` is third-party and can be removed, rate-limited, or change its API at any time. Cold-start is 60–90s. The proxy only needs to forward; it does no caching.

6. **Result cache.** Outputs are cached in IndexedDB keyed by `${sha256(source).slice(0,16)}:${expressionId}:${CACHE_VERSION}` (`lib/cache.ts`); bump `CACHE_VERSION` in `EmoticonStudio.tsx` whenever `AiParams` defaults change.

`/test-ai` (`app/test-ai/page.tsx`) is the standalone CORS/end-to-end probe with raw fetch, server-side fetch (`/api/probe`), Gradio connect, and `view_api()` signature dump — keep it lean and stable; it's the first place to debug Space issues.

### `lib/canvas.ts` + `lib/presets.ts` — pure data + Canvas

`presets.ts` is data-only: 30 `EXPRESSION_PRESETS` (each defining `filter`, `bgColor`, `overlays[]`, `bubble`, and optionally `aiParams` for the AI transform pass) and 4 `STYLE_PRESETS` (defining `outline`, `outlineColor`, `showBg`, `bubbleStyle`). To add an expression or style, this is the only file to edit — the UI grid auto-expands and `composeEmoticon()` consumes the data generically. Add `aiParams` only when the preset's intent maps cleanly to LivePortrait sliders; presets without it show a disabled AI badge.

`canvas.ts` renders at fixed 512×512: radial-gradient background → outline (drawn by stamping the silhouette 16 times around a circle with `globalCompositeOperation: "source-in"` recoloring) → subject with CSS `filter` → emoji overlays → speech/cloud bubble. There's no AI in this step — "expressions" are decorations on top of the original face, not face transformations. This is documented in the README as a deliberate tradeoff vs. paid PhotoMaker/local GPU paths.

### Deployment

Pushes to `main` auto-deploy to Vercel. Build artifacts (`.next/`, `tsconfig.tsbuildinfo`) are gitignored. Stage files explicitly rather than `git add .` — the repo has a non-tracked Korean-named notes folder (`appnote_이모티콘웹앱_*`) at the root that should stay out. The HF proxy uses `runtime = "nodejs"` (not Edge), required by `req.body` streaming with `duplex: "half"`.
