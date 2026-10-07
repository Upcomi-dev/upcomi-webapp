import { createServer } from "node:http";

const userId = "00000000-0000-4000-8000-000000000001";
const events = [
  { id: 11, nomEvent: "Aventure des Alpes", image: null },
  { id: 22, nomEvent: "Aventure de Bretagne", image: null },
  { id: 33, nomEvent: "Aventure des Pyrénées et des cols jusqu’à la Méditerranée", image: null },
];
let scenario = {};
let requests = [];
let metadata = {};
const user = () => ({ id: userId, aud: "authenticated", role: "authenticated", email: "onboarding@example.test", app_metadata: { provider: "email", providers: ["email"] }, user_metadata: metadata, created_at: "2026-01-01T00:00:00Z" });
const encode = (data) => Buffer.from(JSON.stringify(data)).toString("base64url");
const session = () => ({
  access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600, role: "authenticated" })}.test`,
  refresh_token: "test-refresh-token", token_type: "bearer", expires_in: 3600, user: user(),
});

createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Content-Type", "application/json");
  if (req.method === "OPTIONS") return res.end();
  const url = new URL(req.url, "http://127.0.0.1:4318");
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : null;
  const reply = (data, status = 200) => { res.statusCode = status; res.end(JSON.stringify(data)); };
  if (url.pathname === "/health") return reply({ ok: true });
  if (url.pathname === "/__scenario") {
    scenario = body ?? {}; requests = []; metadata = {};
    return reply({ ok: true });
  }
  if (url.pathname === "/__requests") return reply(requests);
  requests.push({ method: req.method, path: url.pathname, body });
  if (url.pathname === "/auth/v1/signup") {
    metadata = body.data ?? {};
    return reply(session());
  }
  if (url.pathname === "/auth/v1/user") {
    if (body?.data?.onboarding_completed && scenario.completionFailures > 0) {
      scenario.completionFailures--;
      return reply({ msg: "Finalisation indisponible", code: "test_failure" }, 400);
    }
    metadata = { ...metadata, ...body?.data };
    return reply(user());
  }
  if (url.pathname === "/rest/v1/rpc/get_event_story_counts") {
    if (scenario.countFailure) return reply({ message: "Comptage indisponible" }, 400);
    return reply(body.p_event_ids.map((id) => ({ event_id: id, story_count: scenario.counts?.[id] ?? { 11: 4, 22: 1, 33: 2 }[id] ?? 0 })));
  }
  if (url.pathname === "/rest/v1/user_event_stories" && req.method === "POST") {
    if (scenario.storyDelay) await new Promise((resolve) => setTimeout(resolve, scenario.storyDelay));
    if (scenario.storyFailures > 0) {
      scenario.storyFailures--;
      return reply({ message: "Récit indisponible" }, 400);
    }
    return reply(null, 201);
  }
  if (url.pathname === "/rest/v1/user_recommended_events" && req.method === "POST" && scenario.recommendationFailures > 0) {
    scenario.recommendationFailures--;
    return reply({ message: "Recommandations indisponibles" }, 400);
  }
  if (url.pathname === "/rest/v1/events" && url.searchParams.has("nomEvent")) {
    const query = url.searchParams.get("nomEvent").replace(/^ilike\.%|%$/g, "").toLowerCase();
    return reply(events.filter((event) => event.nomEvent.toLowerCase().includes(query)));
  }
  if (req.method !== "GET" && req.method !== "HEAD") return reply(null, 201);
  return reply(req.headers.accept?.includes("vnd.pgrst.object") ? null : []);
}).listen(4318, "127.0.0.1");
