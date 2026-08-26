// Cloudflare Pages Function
// functions/[[path]].js

const FIREBASE_DB_URL = "https://shortlink-sammi-default-rtdb.asia-southeast1.firebasedatabase.app";

export async function onRequest(context) {
  const { request, next } = context;

  const url = new URL(request.url);
  const path = url.pathname.replace(/^\//, "");

  // Root path ba static file hole normal site load hobe
  if (path === "" || path.includes(".")) {
    return next();
  }

  // User-Agent detect
  const ua = (request.headers.get("user-agent") || "").toLowerCase();

  const isCrawler =
    ua.includes("facebookexternalhit") ||
    ua.includes("facebot") ||
    ua.includes("telegrambot") ||
    ua.includes("twitterbot") ||
    ua.includes("xbot") ||
    ua.includes("linkedinbot") ||
    ua.includes("slackbot") ||
    ua.includes("discordbot") ||
    ua.includes("whatsapp") ||
    ua.includes("skypeuripreview") ||
    ua.includes("google-read-aloud") ||
    ua.includes("applebot");

  // Crawler hole kono preview data dibo na
  if (isCrawler) {
    return new Response("", {
      status: 204,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate"
      }
    });
  }

  try {
    const res = await fetch(`${FIREBASE_DB_URL}/links/${path}.json`);
    const data = await res.json();

    if (data && data.url) {
      // Click count update
      context.waitUntil(
        fetch(`${FIREBASE_DB_URL}/links/${path}/clicks.json`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify((data.clicks || 0) + 1)
        })
      );

      // Normal visitor ke redirect
      return Response.redirect(data.url, 302);
    }
  } catch (err) {
    console.error(err);
  }

  // Code na paile normal page
  return next();
}