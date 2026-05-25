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

**Zero-server design.** No API routes, no env vars, no auth. Every step — model loading, ONNX inference, image compositing, ZIP packaging — happens in the user's browser. Vercel deploys it as a static site.

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

### `lib/canvas.ts` + `lib/presets.ts` — pure data + Canvas

`presets.ts` is data-only: 30 `EXPRESSION_PRESETS` (each defining `filter`, `bgColor`, `overlays[]`, and `bubble`) and 4 `STYLE_PRESETS` (defining `outline`, `outlineColor`, `showBg`, `bubbleStyle`). To add an expression or style, this is the only file to edit — the UI grid auto-expands and `composeEmoticon()` consumes the data generically.

`canvas.ts` renders at fixed 512×512: radial-gradient background → outline (drawn by stamping the silhouette 16 times around a circle with `globalCompositeOperation: "source-in"` recoloring) → subject with CSS `filter` → emoji overlays → speech/cloud bubble. There's no AI in this step — "expressions" are decorations on top of the original face, not face transformations. This is a deliberate tradeoff vs. paid PhotoMaker/local GPU paths.

### Deployment

Pushes to `main` auto-deploy to Vercel. Both build artifacts (`.next/`, `tsconfig.tsbuildinfo`) are gitignored. Stage files explicitly rather than `git add .` — the repo has a non-tracked Korean-named notes folder (`appnote_이모티콘웹앱_*`) at the root that should stay out.
