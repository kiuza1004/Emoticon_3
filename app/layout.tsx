import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI 이모티콘 PoC",
  description: "사진 한 장으로 만드는 개인화 이모티콘 세트",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <div className="mx-auto max-w-6xl px-6 py-10">
          <header className="mb-10 flex items-center justify-between">
            <h1 className="text-2xl font-bold tracking-tight">
              <span className="text-brand-500">Emoticon</span> Studio · PoC
            </h1>
            <span className="text-xs text-slate-400">Next.js + Replicate</span>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
