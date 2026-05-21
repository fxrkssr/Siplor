// Cloudflare Worker — วางใน Workers & Pages > Create Worker > Edit Code

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXibI1qS2QH4CVabKbT3_jk_YEg8llP2xV9s_jGW2NYED6OpESBDM4gCoPB7w18JJa/exec";

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

    const res  = await fetch(upstream, { redirect: "follow" });
    const text = await res.text();

    return new Response(text, {
      headers: {
        ...CORS,
        "Cache-Control": "no-store",
      },
    });
  },
};

function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}
