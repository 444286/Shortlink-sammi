// Cloudflare Pages Function - ei file shob path (/abc123) catch kore
// Firebase Realtime Database theke long URL khuje ber kore redirect kore dey

const FIREBASE_DB_URL = "https://YOUR-PROJECT-ID-default-rtdb.firebaseio.com";

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\//, ""); // leading slash bad dilam

  // Root path (/) othoba static asset hole normal page dekhabe
  if (path === "" || path.includes(".")) {
    return next();
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/links/${path}.json`);
    const data = await res.json();

    if (data && data.url) {
      // Click count barano (fire and forget, redirect e delay hobe na)
      context.waitUntil(
        fetch(`${FIREBASE_DB_URL}/links/${path}/clicks.json`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify((data.clicks || 0) + 1)
        })
      );

      return Response.redirect(data.url, 302);
    }
  } catch (err) {
    // Firebase fetch fail hole niche fallback e jabe
  }

  // Code na paile normal static site dekhabe (404 ba index.html)
  return next();
}