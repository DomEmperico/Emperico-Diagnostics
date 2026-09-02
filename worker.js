/* Emperico Partner Diagnostics — Worker
   Routes:
     GET  /                    -> minimal private-site placeholder
     GET  /admin                -> serves admin.html (auth enforced via API calls, not this route)
     POST /api/admin-login       -> { password } -> sets a session cookie if correct
     GET  /api/admin-links       -> [requires session] list of all bespoke links + results
     POST /api/create-link       -> [requires session] { name, email, tool, edition } -> creates a token, returns the URL
     GET  /r/:token               -> respondent's bespoke link. Serves the right tool file if pending,
                                     a "link used" page if completed, a "not found" page if invalid.
     POST /api/submit-results    -> respondent's tool page posts here on completion (no-cors, fire-and-forget)
     (anything under /tools/...)-> blocked (404) — only ever served internally via /r/:token
     everything else            -> static assets (style.css, favicon, etc if any)

   Requires:
     - a KV namespace bound as env.LINKS
     - a secret env.Admin
*/

const TOOL_FILES = {
  "partner-track:A": "/tools/partner-track-a.html",
  "partner-track:B": "/tools/partner-track-b.html",
  "practising-partner:A": "/tools/practising-partner-a.html",
  "practising-partner:B": "/tools/practising-partner-b.html",
  "firm-leader:A": "/tools/firm-leader-a.html",
  "firm-leader:B": "/tools/firm-leader-b.html"
};

const SESSION_COOKIE = "es_session";
const SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Never allow the raw tool files to be fetched directly.
    if (path.startsWith("/tools/")) {
      return new Response("Not found", { status: 404 });
    }

    if (path === "/api/admin-login" && request.method === "POST") {
      return handleAdminLogin(request, env);
    }

    if (path === "/api/admin-links" && request.method === "GET") {
      if (!(await isAuthed(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
      return handleAdminLinks(env);
    }

    if (path === "/api/create-link" && request.method === "POST") {
      if (!(await isAuthed(request, env))) return json({ ok: false, error: "Unauthorized" }, 401);
      return handleCreateLink(request, env, url);
    }

    if (path === "/api/submit-results" && request.method === "POST") {
      return handleSubmitResults(request, env);
    }

    if (path.startsWith("/r/") && request.method === "GET") {
      const token = path.slice(3).trim();
      return handleRespondentLink(token, env, request);
    }

    if (path === "/admin") {
      return env.ASSETS.fetch(new Request(new URL("/admin.html", url), request));
    }

    return env.ASSETS.fetch(request);
  }
};

// ---------- admin auth ----------

async function handleAdminLogin(request, env) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: "Bad request" }, 400); }
  if (!body || body.password !== env.ADMIN_PASSWORD) {
    return json({ ok: false, error: "Incorrect password" }, 401);
  }
  const sessionId = crypto.randomUUID();
  await env.LINKS.put("session:" + sessionId, "1", { expirationTtl: SESSION_TTL_SECONDS });
  const headers = new Headers({ "Content-Type": "application/json" });
  headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${sessionId}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_TTL_SECONDS}`
  );
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
}

async function isAuthed(request, env) {
  const cookie = request.headers.get("Cookie") || "";
  const match = cookie.match(new RegExp(SESSION_COOKIE + "=([^;]+)"));
  if (!match) return false;
  const val = await env.LINKS.get("session:" + match[1]);
  return !!val;
}

// ---------- admin: create + list links ----------

async function handleCreateLink(request, env, url) {
  let body;
  try { body = await request.json(); } catch (e) { return json({ ok: false, error: "Bad request" }, 400); }
  const { name, email, tool, edition } = body || {};

  if (!name || !email || !tool || !edition) {
    return json({ ok: false, error: "name, email, tool and edition are all required." }, 400);
  }
  const key = tool + ":" + edition;
  if (!TOOL_FILES[key]) {
    return json({ ok: false, error: "Unknown tool/edition combination." }, 400);
  }

  const token = crypto.randomUUID().replace(/-/g, "");
  const record = {
    token,
    name: String(name).trim(),
    email: String(email).trim(),
    tool,
    edition,
    status: "pending",
    createdAt: new Date().toISOString(),
    completedAt: null,
    results: null
  };
  await env.LINKS.put("link:" + token, JSON.stringify(record));

  const link = new URL("/r/" + token, url.origin).toString();
  return json({ ok: true, url: link, token });
}

async function handleAdminLinks(env) {
  const list = await env.LINKS.list({ prefix: "link:" });
  const records = await Promise.all(
    list.keys.map(async (k) => {
      const raw = await env.LINKS.get(k.name);
      try { return JSON.parse(raw); } catch (e) { return null; }
    })
  );
  const clean = records.filter(Boolean).sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  return json({ ok: true, links: clean });
}

// ---------- respondent-facing ----------

async function handleRespondentLink(token, env, request) {
  if (!token) return notFoundPage();
  const raw = await env.LINKS.get("link:" + token);
  if (!raw) return notFoundPage();

  let record;
  try { record = JSON.parse(raw); } catch (e) { return notFoundPage(); }

  if (record.status === "completed") {
    return usedPage(record);
  }

  const key = record.tool + ":" + record.edition;
  const filePath = TOOL_FILES[key];
  if (!filePath) return notFoundPage();

  const assetUrl = new URL(filePath, request.url);
  const assetResp = await env.ASSETS.fetch(new Request(assetUrl, request));
  if (!assetResp.ok) return notFoundPage();

  let html = await assetResp.text();
  const inject =
    `<script>window.EMPERICO_TOKEN=${JSON.stringify(token)};window.EMPERICO_NAME=${JSON.stringify(record.name || "")};</script>\n</head>`;
  html = html.replace("</head>", inject);

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=UTF-8" }
  });
}

async function handleSubmitResults(request, env) {
  // Fire-and-forget from the respondent's browser (mode: no-cors), so this
  // never needs to return anything meaningful to the client.
  try {
    const body = await request.json();
    const token = body && body.token;
    if (!token) return json({ ok: false }, 200);

    const raw = await env.LINKS.get("link:" + token);
    if (!raw) return json({ ok: false }, 200);

    const record = JSON.parse(raw);
    if (record.status === "completed") return json({ ok: true }, 200);

    record.status = "completed";
    record.completedAt = new Date().toISOString();
    const { token: _t, ...rest } = body;
    record.results = rest;
    await env.LINKS.put("link:" + token, JSON.stringify(record));
    return json({ ok: true }, 200);
  } catch (e) {
    return json({ ok: false }, 200);
  }
}

// ---------- small helpers ----------

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

function notFoundPage() {
  return new Response(privatePageHtml("This link isn't valid", "Double check the link, or get in touch with whoever sent it to you."), {
    status: 404,
    headers: { "Content-Type": "text/html; charset=UTF-8" }
  });
}

function usedPage(record) {
  const when = record.completedAt ? new Date(record.completedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : "";
  return new Response(
    privatePageHtml("This link has already been used", `This self-assessment was completed${when ? " on " + when : ""}. If you need another copy, get in touch with whoever sent you the link.`),
    { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } }
  );
}

function privatePageHtml(title, body) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} - Emperico</title>
<style>
  body{margin:0;background:#f3efe6;color:#152238;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
    display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;}
  .card{max-width:440px;text-align:center;}
  h1{font-family:Georgia,serif;font-size:26px;margin:0 0 14px;}
  p{color:#5b6478;line-height:1.5;}
</style></head>
<body><div class="card"><h1>${title}</h1><p>${body}</p></div></body></html>`;
}
