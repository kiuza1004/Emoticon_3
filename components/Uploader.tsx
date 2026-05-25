"use client";

import { useRef, useState } from "react";

type Props = {
  onPicked: (dataUrl: string) => void;
};

export function Uploader({ onPicked }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 업로드 가능합니다.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert("10MB 이하의 이미지를 업로드하세요.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onPicked(reader.result as string);
    reader.readAsDataURL(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDrag(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={
        "flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-16 transition " +
        (drag ? "border-brand-500 bg-brand-500/10" : "border-slate-700 hover:border-slate-500 hover:bg-slate-900/40")
      }
    >
      <div className="mb-3 text-4xl">📸</div>
      <p className="text-lg font-medium">사진을 끌어다 놓거나 클릭해 선택하세요</p>
      <p className="mt-1 text-sm text-slate-400">정면을 바라보는 인물 사진이 가장 잘 작동합니다 (최대 10MB)</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}
