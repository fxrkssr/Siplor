// Cloudflare Worker — วางใน Workers & Pages > Create Worker > Edit Code

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxXibI1qS2QH4CVabKbT3_jk_YEg8llP2xV9s_jGW2NYED6OpESBDM4gCoPB7w18JJa/exec";

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json; charset=utf-8",
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method === "POST") {
      let body;
      try {
        body = JSON.parse(await request.text());
      } catch {
        return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: CORS });
      }

      const users = JSON.parse(env.USERS_JSON || "{}");
      const user  = users[body.token];

      // login: ตรวจรหัส คืนชื่อ user (สำหรับ audit)
      if (body.action === "auth") {
        if (!user) return new Response(JSON.stringify({ error: "รหัสไม่ถูกต้อง" }), { status: 401, headers: CORS });
        return new Response(JSON.stringify({ ok: true, user }), { headers: { ...CORS, "Cache-Control": "no-store" } });
      }

      // write actions: ต้องมี token ที่ถูกต้อง
      if (!user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: CORS });

      // ฉีด shared secret ให้ Apps Script, ตัด token ทิ้งไม่ส่งต่อ
      const { token, ...rest } = body;
      const forwardBody = JSON.stringify({ ...rest, secret: env.SHARED_SECRET || "" });

      const res = await fetch(APPS_SCRIPT_URL, {
        method:   "POST",
        headers:  { "Content-Type": "application/json" },
        body:     forwardBody,
        redirect: "follow",
      });
      const text = await res.text();
      return new Response(text, { headers: { ...CORS, "Cache-Control": "no-store" } });
    }

    // GET
    const url       = new URL(request.url);
    const date      = url.searchParams.get("date");
    const month     = url.searchParams.get("month");
    const all       = url.searchParams.get("all");
    const cancelled = url.searchParams.get("cancelled");
    const customers = url.searchParams.get("customers"); // ← NEW

    let upstream;

    if (customers) {
      // ── NEW: ดึง customer list ──
      upstream = `${APPS_SCRIPT_URL}?customers=1`;
    } else if (cancelled) {
      upstream = month
        ? `${APPS_SCRIPT_URL}?cancelled=1&month=${month}`
        : `${APPS_SCRIPT_URL}?cancelled=1`;
    } else if (all) {
      upstream = `${APPS_SCRIPT_URL}?all=1`;
    } else if (month) {
      upstream = `${APPS_SCRIPT_URL}?month=${month}`;
    } else {
      upstream = `${APPS_SCRIPT_URL}?date=${date || todayBKK()}`;
    }

    const res  = await fetch(upstream, { redirect: "follow" });
    const text = await res.text();

    return new Response(text, {
      headers: { ...CORS, "Cache-Control": "no-store" },
    });
  },
};

function todayBKK() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Bangkok" });
}