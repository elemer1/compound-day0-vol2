// Basic-Auth gate for the admin area (/admin and /api/admin/*).
// Credentials come from env: ADMIN_USER (optional, default "compound") + ADMIN_PASSWORD.
export async function onRequest(context) {
  const { request, env, next } = context;
  const { pathname } = new URL(request.url);

  const isProtected = pathname === "/admin" || pathname.startsWith("/admin/") ||
                      pathname.startsWith("/api/admin");
  if (!isProtected) return next();

  if (!env.ADMIN_PASSWORD) {
    return new Response("Admin password is not configured (set ADMIN_PASSWORD).", { status: 503 });
  }

  const user = env.ADMIN_USER || "compound";
  const expected = "Basic " + b64(`${user}:${env.ADMIN_PASSWORD}`);
  const got = request.headers.get("Authorization") || "";

  if (got && timingSafeEqual(got, expected)) return next();

  return new Response("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Compound Admin", charset="UTF-8"' },
  });
}

function b64(s) {
  // UTF-8 safe base64 for credentials.
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const x of bytes) bin += String.fromCharCode(x);
  return btoa(bin);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
