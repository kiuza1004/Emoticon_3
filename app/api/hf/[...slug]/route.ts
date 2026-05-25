import { NextRequest } from "next/server";

const TARGETS: Record<string, string> = {
  liveportrait: "https://klingteam-liveportrait.hf.space",
};

const SAFE_REQ_HEADERS = ["content-type", "accept", "x-gradio-event"];
const STRIP_RES_HEADERS = new Set([
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
]);

async function proxy(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string[] }> },
): Promise<Response> {
  const { slug } = await ctx.params;
  const [space, ...rest] = slug;
  const base = TARGETS[space];
  if (!base) {
    return new Response(`space not allowed: ${space}`, { status: 400 });
  }

  const search = req.nextUrl.search;
  const target = `${base}/${rest.join("/")}${search}`;

  const headers = new Headers();
  for (const k of SAFE_REQ_HEADERS) {
    const v = req.headers.get(k);
    if (v) headers.set(k, v);
  }
  headers.set("user-agent", "Mozilla/5.0 EmoticonStudio/0.1 (server)");
  headers.set("accept-encoding", "identity");

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "follow",
  };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = req.body;
    // undici (Node fetch) requires duplex for streaming bodies
    (init as RequestInit & { duplex?: string }).duplex = "half";
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, init);
  } catch (e) {
    return new Response(
      `proxy fetch failed: ${e instanceof Error ? e.message : String(e)}`,
      { status: 502 },
    );
  }

  const outHeaders = new Headers();
  upstream.headers.forEach((v, k) => {
    if (!STRIP_RES_HEADERS.has(k.toLowerCase())) outHeaders.set(k, v);
  });

  const contentType = upstream.headers.get("content-type") ?? "";
  const proxyOrigin = `${req.nextUrl.origin}/api/hf/${space}`;

  // JSON·텍스트 응답에서 HF 절대 URL → proxy URL로 재작성.
  // Gradio config 안에 root URL이 박혀있어서 클라이언트가 다음 fetch를 HF로 직접 보내면 차단됨.
  if (
    contentType.includes("application/json") ||
    contentType.includes("text/plain")
  ) {
    const text = await upstream.text();
    const replaced = text.split(base).join(proxyOrigin);
    outHeaders.delete("content-length");
    return new Response(replaced, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: outHeaders,
    });
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: outHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
export const PATCH = proxy;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
