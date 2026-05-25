import { NextResponse } from "next/server";

const ALLOWED = new Set([
  "https://klingteam-liveportrait.hf.space/config",
]);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  if (!url || !ALLOWED.has(url)) {
    return NextResponse.json({ error: "url not allowed", url }, { status: 400 });
  }

  const t0 = Date.now();
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "user-agent": "Mozilla/5.0 EmoticonStudio/0.1 (server)",
        accept: "application/json,*/*;q=0.8",
      },
    });
    const text = await r.text();
    return NextResponse.json({
      ok: r.ok,
      status: r.status,
      durationMs: Date.now() - t0,
      bodyPreview: text.slice(0, 200),
      contentType: r.headers.get("content-type"),
    });
  } catch (e) {
    return NextResponse.json({
      ok: false,
      status: 0,
      error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
      durationMs: Date.now() - t0,
    });
  }
}
