"use client";

const STEPS = ["사진 업로드", "배경 제거", "스타일·표정", "결과"];

export function Stepper({ active }: { active: 0 | 1 | 2 | 3 }) {
  return (
    <ol className="flex items-center gap-3 text-xs">
      {STEPS.map((label, i) => {
        const state = i < active ? "done" : i === active ? "active" : "todo";
        return (
          <li key={label} className="flex items-center gap-2">
            <span
              className={
                "flex h-6 w-6 items-center justify-center rounded-full font-semibold " +
                (state === "active"
                  ? "bg-brand-500 text-white"
                  : state === "done"
                    ? "bg-emerald-500 text-white"
                    : "bg-slate-700 text-slate-400")
              }
            >
              {i + 1}
            </span>
            <span className={state === "todo" ? "text-slate-500" : "text-slate-100"}>{label}</span>
            {i < STEPS.length - 1 && <span className="ml-2 h-px w-6 bg-slate-700" />}
          </li>
        );
      })}
    </ol>
  );
}
