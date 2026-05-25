"use client";

type Loaded = {
  model: unknown;
  processor: unknown;
  RawImage: typeof import("@huggingface/transformers").RawImage;
  device: "webgpu" | "wasm";
};

let loadedPromise: Promise<Loaded> | null = null;
let preferredDevice: "webgpu" | "wasm" | null = null;

function detectDevice(): "webgpu" | "wasm" {
  if (preferredDevice) return preferredDevice;
  if (typeof navigator === "undefined") return "wasm";

  const ua = navigator.userAgent || "";
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  if (isMobile) return "wasm";

  return "gpu" in navigator ? "webgpu" : "wasm";
}

async function loadModel(onProgress?: BgRemoveProgress): Promise<Loaded> {
  if (loadedPromise) return loadedPromise;

  const device = detectDevice();

  loadedPromise = (async () => {
    const { AutoModel, AutoProcessor, RawImage, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;

    onProgress?.(`모델 로딩 중 (${device.toUpperCase()})... 첫 실행은 ~45MB 다운로드`);
    const modelId = "briaai/RMBG-1.4";

    const model = await AutoModel.from_pretrained(modelId, {
      device,
      config: { model_type: "custom" } as never,
      progress_callback: (p: { status?: string; progress?: number; file?: string }) => {
        if (p.status === "progress" && p.progress != null && p.file) {
          onProgress?.(`${p.file} ${Math.round(p.progress)}%`);
        }
      },
    });

    const processor = await AutoProcessor.from_pretrained(modelId, {
      config: {
        do_normalize: true,
        do_pad: false,
        do_rescale: true,
        do_resize: true,
        image_mean: [0.5, 0.5, 0.5],
        feature_extractor_type: "ImageFeatureExtractor",
        image_std: [1, 1, 1],
        resample: 2,
        rescale_factor: 0.00392156862745098,
        size: { width: 1024, height: 1024 },
      } as never,
    });

    return { model, processor, RawImage, device };
  })();

  return loadedPromise;
}

export function getBgRemoveDevice(): "webgpu" | "wasm" | null {
  return preferredDevice;
}

export type BgRemoveProgress = (msg: string) => void;

export async function removeBackground(
  imageDataUrl: string,
  onProgress?: BgRemoveProgress,
): Promise<string> {
  try {
    return await runOnce(imageDataUrl, onProgress);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const loaded = await loadedPromise?.catch(() => null);
    const looksWebGPU =
      /webgpu|wgpu|ortrun|compute pipeline|external instance|stage2/i.test(msg);

    if (looksWebGPU && loaded?.device === "webgpu") {
      onProgress?.("WebGPU 실패 → WASM으로 자동 재시도 중...");
      loadedPromise = null;
      preferredDevice = "wasm";
      return await runOnce(imageDataUrl, onProgress);
    }
    throw err;
  }
}

async function runOnce(
  imageDataUrl: string,
  onProgress?: BgRemoveProgress,
): Promise<string> {
  const { model, processor, RawImage } = await loadModel(onProgress);

  onProgress?.("이미지 전처리...");
  const image = await RawImage.fromURL(imageDataUrl);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { pixel_values } = await (processor as any)(image);

  onProgress?.("배경 분리 추론 중...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { output } = await (model as any)({ input: pixel_values });

  onProgress?.("알파 마스크 합성...");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maskTensor = (output as any).mul(255).to("uint8");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maskImg: any = await (RawImage as any).fromTensor(maskTensor[0]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mask = await maskImg.resize(image.width, image.height);

  return composite(imageDataUrl, mask, image.width, image.height);
}

async function composite(
  imageDataUrl: string,
  mask: { data: Uint8Array | Uint8ClampedArray; channels: number },
  width: number,
  height: number,
): Promise<string> {
  const img = await loadImageEl(imageDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D 컨텍스트 없음");

  ctx.drawImage(img, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  const stride = mask.channels ?? 1;
  const px = width * height;
  for (let i = 0; i < px; i++) {
    imageData.data[i * 4 + 3] = mask.data[i * stride];
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas.toDataURL("image/png");
}

function loadImageEl(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
