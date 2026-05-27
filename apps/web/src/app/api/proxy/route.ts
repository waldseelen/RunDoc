import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for Render static output files.
 * Avoids browser CORS restrictions when fetching cross-origin files.
 * Usage: GET /api/proxy?url=https://rundoc-worker.onrender.com/outputs/...
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // Only allow proxying requests to the configured worker's domain
  const allowedOrigin = process.env.NEXT_PUBLIC_WORKER_API_URL || "http://localhost:8000";
  try {
    const allowedUrl = new URL(allowedOrigin);
    const targetUrl = new URL(url);
    if (allowedUrl.hostname !== targetUrl.hostname) {
      return NextResponse.json({ error: "Forbidden: URL not allowed" }, { status: 403 });
    }
  } catch (err) {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url, { cache: "no-store" });

    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${upstream.status}` },
        { status: upstream.status }
      );
    }

    const contentType = upstream.headers.get("content-type") || "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[proxy] fetch failed:", err);
    return NextResponse.json({ error: "Failed to fetch resource" }, { status: 502 });
  }
}
