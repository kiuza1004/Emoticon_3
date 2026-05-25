"use client";

import { EXPRESSION_PRESETS, STYLE_PRESETS, type ExpressionPreset, type StylePreset } from "./presets";

const CANVAS_SIZE = 512;

export type EmoticonInput = {
  bgRemovedDataUrl: string;
  expressionId: string;
  styleId: string;
  customBubble?: string;
};

export async function composeEmoticon({
  bgRemovedDataUrl,
  expressionId,
  styleId,
  customBubble,
}: EmoticonInput): Promise<string> {
  const expr = EXPRESSION_PRESETS.find((p) => p.id === expressionId);
  const style = STYLE_PRESETS.find((s) => s.id === styleId);
  if (!expr || !style) throw new Error("Unknown preset");

  const img = await loadImage(bgRemovedDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_SIZE;
  canvas.height = CANVAS_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable");

  drawBackground(ctx, expr, style);
  await drawSubject(ctx, img, expr, style);
  drawOverlays(ctx, expr);
  drawBubble(ctx, customBubble ?? expr.bubble, style);

  return canvas.toDataURL("image/png");
}

function drawBackground(ctx: CanvasRenderingContext2D, expr: ExpressionPreset, style: StylePreset) {
  if (!style.showBg || !expr.bgColor) return;
  const grad = ctx.createRadialGradient(
    CANVAS_SIZE / 2,
    CANVAS_SIZE / 2,
    CANVAS_SIZE * 0.1,
    CANVAS_SIZE / 2,
    CANVAS_SIZE / 2,
    CANVAS_SIZE * 0.75,
  );
  grad.addColorStop(0, lighten(expr.bgColor, 12));
  grad.addColorStop(1, expr.bgColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
}

async function drawSubject(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  expr: ExpressionPreset,
  style: StylePreset,
) {
  const targetH = CANVAS_SIZE * 0.82;
  const ratio = img.naturalWidth / img.naturalHeight;
  const drawH = targetH;
  const drawW = targetH * ratio;
  const x = (CANVAS_SIZE - drawW) / 2;
  const y = (CANVAS_SIZE - drawH) / 2 - CANVAS_SIZE * 0.02;

  if (style.outline > 0) {
    drawOutline(ctx, img, x, y, drawW, drawH, style.outline, style.outlineColor);
  }

  ctx.save();
  ctx.filter = expr.filter;
  ctx.drawImage(img, x, y, drawW, drawH);
  ctx.restore();
}

function drawOutline(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  thickness: number,
  color: string,
) {
  const off = document.createElement("canvas");
  off.width = CANVAS_SIZE;
  off.height = CANVAS_SIZE;
  const octx = off.getContext("2d");
  if (!octx) return;

  octx.drawImage(img, x, y, w, h);
  const directions = 16;
  const tint = document.createElement("canvas");
  tint.width = CANVAS_SIZE;
  tint.height = CANVAS_SIZE;
  const tctx = tint.getContext("2d");
  if (!tctx) return;
  tctx.drawImage(off, 0, 0);
  tctx.globalCompositeOperation = "source-in";
  tctx.fillStyle = color;
  tctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

  for (let i = 0; i < directions; i++) {
    const angle = (i / directions) * Math.PI * 2;
    const dx = Math.cos(angle) * thickness;
    const dy = Math.sin(angle) * thickness;
    ctx.drawImage(tint, dx, dy);
  }
}

function drawOverlays(ctx: CanvasRenderingContext2D, expr: ExpressionPreset) {
  for (const o of expr.overlays) {
    const size = CANVAS_SIZE * o.scale;
    ctx.save();
    ctx.translate(CANVAS_SIZE * o.x, CANVAS_SIZE * o.y);
    if (o.rotation) ctx.rotate((o.rotation * Math.PI) / 180);
    ctx.font = `${size}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(o.emoji, 0, 0);
    ctx.restore();
  }
}

function drawBubble(
  ctx: CanvasRenderingContext2D,
  text: string | undefined,
  style: StylePreset,
) {
  if (!text || style.bubbleStyle === "none") return;

  const fontSize = CANVAS_SIZE * 0.075;
  ctx.font = `bold ${fontSize}px "Apple SD Gothic Neo", "Noto Sans KR", "Malgun Gothic", sans-serif`;
  const padX = fontSize * 0.7;
  const padY = fontSize * 0.4;
  const metrics = ctx.measureText(text);
  const bw = metrics.width + padX * 2;
  const bh = fontSize + padY * 2;
  const bx = (CANVAS_SIZE - bw) / 2;
  const by = CANVAS_SIZE * 0.04;

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#0f172a";
  ctx.lineWidth = 4;
  roundedRect(ctx, bx, by, bw, bh, fontSize * 0.6);
  ctx.fill();
  ctx.stroke();

  if (style.bubbleStyle === "speech") {
    ctx.beginPath();
    ctx.moveTo(CANVAS_SIZE / 2 - fontSize * 0.4, by + bh);
    ctx.lineTo(CANVAS_SIZE / 2 + fontSize * 0.4, by + bh);
    ctx.lineTo(CANVAS_SIZE / 2, by + bh + fontSize * 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.fillStyle = "#0f172a";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, CANVAS_SIZE / 2, by + bh / 2);
  ctx.restore();
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function lighten(hex: string, amount: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return hex;
  const r = Math.min(255, parseInt(m[1], 16) + amount);
  const g = Math.min(255, parseInt(m[2], 16) + amount);
  const b = Math.min(255, parseInt(m[3], 16) + amount);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}
