// Cloudflare Worker — วางใน Workers & Pages > Create Worker > Edit Code

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbz4AQYwgqOaOoyEJpmE5RMAk01GKt9adJhst2MdX8GZvEw7cQ5DR3r4gV9_DokJbwAN/exec";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    const url = new URL(request.url);
    const date  = url.searchParams.get("date");
    const month = url.searchParams.get("month");

    const upstream = month
      ? `${APPS_SCRIPT_URL}?month=${month}`
      : `${APPS_SCRIPT_URL}?date=${date || todayBKK()}`;

    const cacheKey = new Request(upstream);
    const cache = caches.default;

    let cached = await cache.match(cacheKey);
    if (cached) {
      const body = await cached.text();
      return new Response(body, { headers: CORS });
    }

    const res = await fetch(upstream, { redirect: "follow" });
    const text = await res.text();

    const fresh = new Response(text, {
      headers: {
        ...CORS,
        "Cache-Control": "public, max-age=60",
      },
    });

    await cache.put(cacheKey, fresh.clone());
    return fresh;
  },
};

function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}
