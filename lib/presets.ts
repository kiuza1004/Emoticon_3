export type Overlay = {
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation?: number;
};

// LivePortrait `/gpu_wrapped_execute_image` 는 두 슬라이더만 받는다:
// 눈 벌림 비율(0 ≈ 감김 · 0.4 ≈ 보통 · 0.7+ ≈ 부릅) · 입 벌림 비율(0 ≈ 다묾 · 0.5+ ≈ 크게 벌림).
// 그 외 smile/eyebrow/wink/eyeball/head-pose 는 이 endpoint 에서 노출되지 않음.
export type AiParams = {
  eyesOpenRatio?: number;
  lipOpenRatio?: number;
};

export type ExpressionPreset = {
  id: string;
  label: string;
  emoji: string;
  filter: string;
  bgColor?: string;
  overlays: Overlay[];
  bubble?: string;
  aiParams?: AiParams;
};

export const EXPRESSION_PRESETS: ExpressionPreset[] = [
  {
    id: "joy",
    label: "환호",
    emoji: "🎉",
    filter: "brightness(1.08) saturate(1.25)",
    bgColor: "#fde68a",
    overlays: [
      { emoji: "🎉", x: 0.12, y: 0.18, scale: 0.22, rotation: -15 },
      { emoji: "🎊", x: 0.88, y: 0.18, scale: 0.22, rotation: 18 },
      { emoji: "✨", x: 0.5, y: 0.08, scale: 0.16 },
    ],
    bubble: "와아아!",
    aiParams: { eyesOpenRatio: 0.45, lipOpenRatio: 0.35 },
  },
  {
    id: "laugh",
    label: "폭소",
    emoji: "😂",
    filter: "brightness(1.05) saturate(1.15)",
    bgColor: "#fef3c7",
    overlays: [
      { emoji: "😂", x: 0.85, y: 0.85, scale: 0.28 },
      { emoji: "💦", x: 0.18, y: 0.3, scale: 0.14 },
    ],
    bubble: "ㅋㅋㅋㅋㅋ",
    aiParams: { eyesOpenRatio: 0.18, lipOpenRatio: 0.6 },
  },
  {
    id: "cry",
    label: "오열",
    emoji: "😭",
    filter: "brightness(0.95) saturate(0.85) hue-rotate(-10deg)",
    bgColor: "#bfdbfe",
    overlays: [
      { emoji: "💧", x: 0.25, y: 0.55, scale: 0.16 },
      { emoji: "💧", x: 0.78, y: 0.58, scale: 0.18 },
      { emoji: "😭", x: 0.85, y: 0.85, scale: 0.26 },
    ],
    bubble: "흑흑...",
    aiParams: { eyesOpenRatio: 0.1, lipOpenRatio: 0.25 },
  },
  {
    id: "angry",
    label: "분노",
    emoji: "😡",
    filter: "saturate(1.4) hue-rotate(-5deg) contrast(1.05)",
    bgColor: "#fecaca",
    overlays: [
      { emoji: "💢", x: 0.15, y: 0.15, scale: 0.22 },
      { emoji: "💢", x: 0.85, y: 0.18, scale: 0.2 },
      { emoji: "🔥", x: 0.5, y: 0.92, scale: 0.18 },
    ],
    bubble: "으아악!",
    aiParams: { eyesOpenRatio: 0.6, lipOpenRatio: 0 },
  },
  {
    id: "wink",
    label: "윙크",
    emoji: "😉",
    filter: "brightness(1.05) saturate(1.1)",
    bgColor: "#fbcfe8",
    overlays: [
      { emoji: "😉", x: 0.85, y: 0.85, scale: 0.22 },
      { emoji: "⭐", x: 0.15, y: 0.18, scale: 0.16 },
    ],
    bubble: "찡긋~",
  },
  {
    id: "surprise",
    label: "놀람",
    emoji: "😲",
    filter: "brightness(1.05) contrast(1.1)",
    bgColor: "#ddd6fe",
    overlays: [
      { emoji: "❗", x: 0.15, y: 0.18, scale: 0.22 },
      { emoji: "❗", x: 0.85, y: 0.18, scale: 0.22 },
      { emoji: "😲", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "헐!?",
    aiParams: { eyesOpenRatio: 0.7, lipOpenRatio: 0.45 },
  },
  {
    id: "love",
    label: "사랑",
    emoji: "😍",
    filter: "brightness(1.05) saturate(1.2) hue-rotate(5deg)",
    bgColor: "#fbcfe8",
    overlays: [
      { emoji: "💕", x: 0.15, y: 0.2, scale: 0.2 },
      { emoji: "💖", x: 0.85, y: 0.22, scale: 0.22, rotation: 15 },
      { emoji: "💗", x: 0.5, y: 0.08, scale: 0.16 },
      { emoji: "😍", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "사랑해♡",
  },
  {
    id: "meh",
    label: "시큰둥",
    emoji: "😒",
    filter: "saturate(0.7) brightness(0.95)",
    bgColor: "#d1d5db",
    overlays: [
      { emoji: "😒", x: 0.85, y: 0.85, scale: 0.22 },
      { emoji: "💤", x: 0.18, y: 0.2, scale: 0.16 },
    ],
    bubble: "...",
  },
  {
    id: "thinking",
    label: "고민",
    emoji: "🤔",
    filter: "saturate(0.95)",
    bgColor: "#fef9c3",
    overlays: [
      { emoji: "❓", x: 0.15, y: 0.18, scale: 0.2 },
      { emoji: "❔", x: 0.85, y: 0.22, scale: 0.18 },
      { emoji: "🤔", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "음...",
  },
  {
    id: "thumbs",
    label: "굿굿",
    emoji: "👍",
    filter: "brightness(1.05) saturate(1.15)",
    bgColor: "#bbf7d0",
    overlays: [
      { emoji: "👍", x: 0.15, y: 0.85, scale: 0.26 },
      { emoji: "✨", x: 0.85, y: 0.18, scale: 0.18 },
      { emoji: "✅", x: 0.85, y: 0.85, scale: 0.2 },
    ],
    bubble: "굿굿!",
  },
  {
    id: "sleepy",
    label: "졸림",
    emoji: "😴",
    filter: "brightness(0.92) saturate(0.85)",
    bgColor: "#c7d2fe",
    overlays: [
      { emoji: "💤", x: 0.85, y: 0.2, scale: 0.24, rotation: -10 },
      { emoji: "🌙", x: 0.15, y: 0.18, scale: 0.2 },
      { emoji: "😴", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "쿨쿨...",
    aiParams: { eyesOpenRatio: 0.05, lipOpenRatio: 0 },
  },
  {
    id: "panic",
    label: "멘붕",
    emoji: "😱",
    filter: "saturate(1.2) contrast(1.05) hue-rotate(-8deg)",
    bgColor: "#fda4af",
    overlays: [
      { emoji: "😱", x: 0.85, y: 0.85, scale: 0.26 },
      { emoji: "💦", x: 0.18, y: 0.28, scale: 0.18 },
      { emoji: "⚡", x: 0.82, y: 0.2, scale: 0.2 },
    ],
    bubble: "으아아악!",
    aiParams: { eyesOpenRatio: 0.65, lipOpenRatio: 0.4 },
  },
  {
    id: "proud",
    label: "뿌듯",
    emoji: "🏆",
    filter: "brightness(1.08) saturate(1.2)",
    bgColor: "#fcd34d",
    overlays: [
      { emoji: "🏆", x: 0.15, y: 0.85, scale: 0.24 },
      { emoji: "👑", x: 0.5, y: 0.08, scale: 0.18 },
      { emoji: "✨", x: 0.85, y: 0.2, scale: 0.16 },
    ],
    bubble: "짜잔!",
  },
  {
    id: "cute",
    label: "귀여움",
    emoji: "🥰",
    filter: "brightness(1.05) saturate(1.1) hue-rotate(5deg)",
    bgColor: "#fbcfe8",
    overlays: [
      { emoji: "🌸", x: 0.15, y: 0.18, scale: 0.2 },
      { emoji: "🥰", x: 0.85, y: 0.85, scale: 0.22 },
      { emoji: "✨", x: 0.85, y: 0.18, scale: 0.16 },
    ],
    bubble: "헤헤",
  },
  {
    id: "shy",
    label: "수줍",
    emoji: "😳",
    filter: "brightness(1.05) saturate(1.05) hue-rotate(8deg)",
    bgColor: "#fecdd3",
    overlays: [
      { emoji: "🌸", x: 0.18, y: 0.55, scale: 0.16 },
      { emoji: "🌸", x: 0.82, y: 0.55, scale: 0.16 },
      { emoji: "😳", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "부끄...",
  },
  {
    id: "embarrassed",
    label: "당황",
    emoji: "😅",
    filter: "saturate(1.05)",
    bgColor: "#fed7aa",
    overlays: [
      { emoji: "💦", x: 0.18, y: 0.22, scale: 0.22, rotation: -10 },
      { emoji: "❓", x: 0.85, y: 0.2, scale: 0.2 },
      { emoji: "😅", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "어어...",
  },
  {
    id: "cool",
    label: "쿨함",
    emoji: "😎",
    filter: "contrast(1.1) saturate(1.15) hue-rotate(-5deg)",
    bgColor: "#93c5fd",
    overlays: [
      { emoji: "😎", x: 0.85, y: 0.85, scale: 0.26 },
      { emoji: "🔥", x: 0.15, y: 0.85, scale: 0.22 },
      { emoji: "⚡", x: 0.85, y: 0.18, scale: 0.2 },
    ],
    bubble: "쿨~",
  },
  {
    id: "celebration",
    label: "축하",
    emoji: "🥳",
    filter: "brightness(1.1) saturate(1.3)",
    bgColor: "#fde68a",
    overlays: [
      { emoji: "🥳", x: 0.85, y: 0.85, scale: 0.24 },
      { emoji: "🎂", x: 0.15, y: 0.85, scale: 0.22 },
      { emoji: "🎈", x: 0.15, y: 0.15, scale: 0.2, rotation: -10 },
      { emoji: "🎁", x: 0.85, y: 0.18, scale: 0.18 },
    ],
    bubble: "축하해!",
  },
  {
    id: "fighting",
    label: "파이팅",
    emoji: "💪",
    filter: "brightness(1.05) saturate(1.25) contrast(1.05)",
    bgColor: "#fca5a5",
    overlays: [
      { emoji: "💪", x: 0.15, y: 0.85, scale: 0.26 },
      { emoji: "🔥", x: 0.85, y: 0.85, scale: 0.24 },
      { emoji: "⚡", x: 0.5, y: 0.08, scale: 0.2 },
    ],
    bubble: "파이팅!",
  },
  {
    id: "ok_sign",
    label: "오케이",
    emoji: "👌",
    filter: "brightness(1.05) saturate(1.15)",
    bgColor: "#86efac",
    overlays: [
      { emoji: "👌", x: 0.15, y: 0.85, scale: 0.28 },
      { emoji: "✅", x: 0.85, y: 0.85, scale: 0.22 },
      { emoji: "✨", x: 0.85, y: 0.18, scale: 0.16 },
    ],
    bubble: "오케이!",
  },
  {
    id: "mischief",
    label: "메롱",
    emoji: "😝",
    filter: "brightness(1.05) saturate(1.25)",
    bgColor: "#f9a8d4",
    overlays: [
      { emoji: "😝", x: 0.85, y: 0.85, scale: 0.24 },
      { emoji: "🤪", x: 0.15, y: 0.18, scale: 0.22 },
      { emoji: "✨", x: 0.85, y: 0.2, scale: 0.16 },
    ],
    bubble: "메~롱!",
    aiParams: { eyesOpenRatio: 0.25, lipOpenRatio: 0.5 },
  },
  {
    id: "evil_smile",
    label: "음흉",
    emoji: "😏",
    filter: "contrast(1.1) saturate(0.85) brightness(0.92)",
    bgColor: "#9ca3af",
    overlays: [
      { emoji: "😈", x: 0.15, y: 0.18, scale: 0.22 },
      { emoji: "🔥", x: 0.85, y: 0.85, scale: 0.22 },
      { emoji: "😏", x: 0.85, y: 0.18, scale: 0.2 },
    ],
    bubble: "흐흐...",
  },
  {
    id: "hungry",
    label: "배고픔",
    emoji: "🤤",
    filter: "brightness(1.05) saturate(1.2)",
    bgColor: "#fed7aa",
    overlays: [
      { emoji: "🍔", x: 0.15, y: 0.18, scale: 0.22 },
      { emoji: "🍜", x: 0.85, y: 0.2, scale: 0.22 },
      { emoji: "🤤", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "배고파...",
    aiParams: { eyesOpenRatio: 0.34, lipOpenRatio: 0.2 },
  },
  {
    id: "pleading",
    label: "간절",
    emoji: "🥺",
    filter: "brightness(1.02) saturate(1.05)",
    bgColor: "#fce7f3",
    overlays: [
      { emoji: "🙏", x: 0.5, y: 0.92, scale: 0.22 },
      { emoji: "💧", x: 0.3, y: 0.5, scale: 0.12 },
      { emoji: "💧", x: 0.7, y: 0.52, scale: 0.12 },
      { emoji: "✨", x: 0.85, y: 0.18, scale: 0.16 },
    ],
    bubble: "제발...",
  },
  {
    id: "determined",
    label: "각오",
    emoji: "🔥",
    filter: "contrast(1.15) saturate(1.3) hue-rotate(-5deg)",
    bgColor: "#f87171",
    overlays: [
      { emoji: "🔥", x: 0.15, y: 0.85, scale: 0.26 },
      { emoji: "🔥", x: 0.85, y: 0.85, scale: 0.26 },
      { emoji: "⚡", x: 0.5, y: 0.08, scale: 0.22 },
    ],
    bubble: "가자!",
    aiParams: { eyesOpenRatio: 0.55, lipOpenRatio: 0 },
  },
  {
    id: "exhausted",
    label: "지침",
    emoji: "😩",
    filter: "saturate(0.7) brightness(0.92)",
    bgColor: "#d4d4d8",
    overlays: [
      { emoji: "😩", x: 0.85, y: 0.85, scale: 0.24 },
      { emoji: "💦", x: 0.18, y: 0.22, scale: 0.2, rotation: -8 },
      { emoji: "💤", x: 0.5, y: 0.08, scale: 0.18 },
    ],
    bubble: "힘들어...",
    aiParams: { eyesOpenRatio: 0.12, lipOpenRatio: 0.1 },
  },
  {
    id: "sick",
    label: "아픔",
    emoji: "🤒",
    filter: "saturate(0.8) hue-rotate(40deg) brightness(0.95)",
    bgColor: "#a7f3d0",
    overlays: [
      { emoji: "🤒", x: 0.85, y: 0.85, scale: 0.24 },
      { emoji: "💊", x: 0.15, y: 0.85, scale: 0.2 },
      { emoji: "🌡️", x: 0.85, y: 0.18, scale: 0.22 },
    ],
    bubble: "아파...",
  },
  {
    id: "bored",
    label: "지루",
    emoji: "😑",
    filter: "saturate(0.6) brightness(0.95)",
    bgColor: "#d1d5db",
    overlays: [
      { emoji: "😑", x: 0.85, y: 0.85, scale: 0.22 },
      { emoji: "💤", x: 0.15, y: 0.18, scale: 0.2 },
      { emoji: "❓", x: 0.85, y: 0.2, scale: 0.18 },
    ],
    bubble: "지루해...",
    aiParams: { eyesOpenRatio: 0.18, lipOpenRatio: 0 },
  },
  {
    id: "nervous",
    label: "긴장",
    emoji: "😰",
    filter: "brightness(0.98) saturate(0.9) hue-rotate(-15deg)",
    bgColor: "#bae6fd",
    overlays: [
      { emoji: "💦", x: 0.18, y: 0.28, scale: 0.2 },
      { emoji: "💦", x: 0.82, y: 0.28, scale: 0.18 },
      { emoji: "😰", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "어떡해...",
  },
  {
    id: "speechless",
    label: "할말없",
    emoji: "😶",
    filter: "saturate(0.55) brightness(0.97)",
    bgColor: "#e5e7eb",
    overlays: [
      { emoji: "💭", x: 0.15, y: 0.18, scale: 0.22 },
      { emoji: "😶", x: 0.85, y: 0.85, scale: 0.22 },
    ],
    bubble: "...",
    aiParams: { eyesOpenRatio: 0.2, lipOpenRatio: 0 },
  },
];

export type StylePreset = {
  id: string;
  label: string;
  outline: number;
  outlineColor: string;
  showBg: boolean;
  bubbleStyle: "speech" | "cloud" | "none";
};

export const STYLE_PRESETS: StylePreset[] = [
  { id: "sticker", label: "스티커", outline: 8, outlineColor: "#ffffff", showBg: true, bubbleStyle: "speech" },
  { id: "clean", label: "투명", outline: 0, outlineColor: "#ffffff", showBg: false, bubbleStyle: "speech" },
  { id: "bold", label: "굵은선", outline: 14, outlineColor: "#000000", showBg: true, bubbleStyle: "cloud" },
  { id: "minimal", label: "심플", outline: 4, outlineColor: "#ffffff", showBg: false, bubbleStyle: "none" },
];

export type StyleId = (typeof STYLE_PRESETS)[number]["id"];
