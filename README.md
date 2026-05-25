# Emoticon Studio · PoC (100% 무료, 완전 클라이언트)

사진 한 장으로 만드는 이모티콘 세트. **API 키 불필요, 비용 0원, 서버 호출 없음.**

## 동작 방식

```
사진 업로드
   ↓
[브라우저] Transformers.js + RMBG-1.4 → 배경 제거
   ↓
[브라우저] Canvas 합성 → 표정별 이모지/필터/말풍선 오버레이
   ↓
ZIP 다운로드
```

- **배경 제거**: `@huggingface/transformers` v3로 RMBG-1.4 ONNX 모델을 브라우저에서 실행 (WebGPU 우선, WASM fallback)
- **표정 생성**: AI 얼굴 변형 대신 **Canvas 데코레이션** (이모지, 색 필터, 말풍선)
- 모든 처리가 사용자 PC에서 발생 → 프라이버시 보장, 비용 0

## 실행

```bash
npm install
npm run dev
```
http://localhost:3000 — **환경변수 설정 불필요**.

첫 실행 시:
- 모델 자동 다운로드 ~30MB (브라우저 캐시, 두 번째부터 즉시)
- WebGPU 지원 브라우저(Chrome/Edge 113+, Safari 18+): 배경 제거 1~3초
- WASM fallback: 5~15초

## 12종 표정 × 4종 스타일

| 표정 | 효과 |
|------|------|
| 환호/폭소/사랑/굿굿 | 밝은 톤 + 축하 이모지 |
| 오열/졸림 | 블루 톤 + 눈물/💤 |
| 분노/멘붕 | 레드 톤 + 💢/⚡ |
| 윙크/놀람/고민/시큰둥 | 표정별 액센트 |

스타일: **스티커**(흰 외곽선) · **투명**(배경 없음) · **굵은선**(검정 외곽선) · **심플**(말풍선 없음)

## 한계

- AI가 **얼굴 표정을 실제로 바꾸지 않음** — 원본 표정 그대로, 주변 데코로 감정 표현
- 진정한 표정 생성을 원하면 Replicate PhotoMaker ($0.02/장) 또는 로컬 GPU + ComfyUI 필요
- 첫 모델 로딩 시 ~30MB 다운로드 (이후 캐시)

## 디렉토리

```
app/page.tsx · layout.tsx · globals.css
components/
  EmoticonStudio.tsx     # 메인 워크플로우 (전부 클라이언트)
  Uploader.tsx · Stepper.tsx
lib/
  bgRemove.ts            # Transformers.js + RMBG-1.4
  canvas.ts              # 표정 합성 (filter + emoji overlay + 말풍선)
  presets.ts             # 12종 표정 + 4종 스타일 데이터
```
