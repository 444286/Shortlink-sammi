// Cloudflare Pages Function
// functions/[[path]].js

const FIREBASE_DB_URL =
  "https://shortlink-sammi-default-rtdb.asia-southeast1.firebasedatabase.app";


// ==========================================
// CUSTOM PREVIEW TITLE + DESCRIPTION
// ==========================================

const PREVIEW_TITLE = "টাকার দরজা";

const PREVIEW_DESCRIPTION =
  "🛑ইনভেস্ট ও রেফার ছাড়াই ইনকাম করুন";


// ==========================================
// HTML ESCAPE
// ==========================================

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// ==========================================
// ORIGINAL WEBSITE IMAGE বের করা
// ==========================================

async function getOriginalImage(targetUrl) {
  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
      }
    });

    if (!res.ok) return null;

    const html = await res.text();

    // og:image
    let match = html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
    );

    if (!match) {
      match = html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["'][^>]*>/i
      );
    }

    // twitter:image fallback
    if (!match) {
      match = html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["'][^>]*>/i
      );
    }

    if (!match) {
      match = html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["'][^>]*>/i
      );
    }

    if (!match || !match[1]) return null;

    // Relative image URL হলে absolute করে দেওয়া
    return new URL(match[1], targetUrl).href;

  } catch (err) {
    return null;
  }
}


// ==========================================
// MAIN FUNCTION
// ==========================================

export async function onRequest(context) {

  const { request, next } = context;

  const url = new URL(request.url);

  const path = url.pathname.replace(/^\/+/, "");


  // Root / static file
  if (path === "" || path.includes(".")) {
    return next();
  }


  // ==========================================
  // USER AGENT
  // ==========================================

  const ua =
    (request.headers.get("user-agent") || "").toLowerCase();


  // Telegram / Facebook / WhatsApp ইত্যাদি preview crawler
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


  try {

    // ==========================================
    // FIREBASE থেকে ORIGINAL URL
    // ==========================================

    const res = await fetch(
      `${FIREBASE_DB_URL}/links/${path}.json`
    );

    const data = await res.json();


    if (data && data.url) {

      const targetUrl = data.url;


      // ==========================================
      // CRAWLER হলে CUSTOM PREVIEW
      // ==========================================

      if (isCrawler) {

        // Original website-এর image বের করা
        const originalImage =
          await getOriginalImage(targetUrl);


        const title =
          escapeHTML(PREVIEW_TITLE);

        const description =
          escapeHTML(PREVIEW_DESCRIPTION);


        const imageMeta = originalImage
          ? `
<meta property="og:image" content="${escapeHTML(originalImage)}">
<meta name="twitter:image" content="${escapeHTML(originalImage)}">
`
          : "";


        const previewHTML = `
<!DOCTYPE html>
<html lang="bn">

<head>

<meta charset="UTF-8">

<title>${title}</title>

<meta
  name="description"
  content="${description}"
>

<meta
  property="og:type"
  content="website"
>

<meta
  property="og:title"
  content="${title}"
>

<meta
  property="og:description"
  content="${description}"
>

${imageMeta}

<meta
  property="og:url"
  content="${escapeHTML(url.href)}"
>

<meta
  property="og:site_name"
  content="Online Real Kaj"
>

<meta
  name="twitter:card"
  content="summary_large_image"
>

<meta
  name="twitter:title"
  content="${title}"
>

<meta
  name="twitter:description"
  content="${description}"
>

</head>

<body>

<h1>${title}</h1>

<p>${description}</p>

</body>

</html>
`;


        return new Response(previewHTML, {
          status: 200,
          headers: {
            "Content-Type": "text/html; charset=UTF-8",
            "Cache-Control": "no-store, no-cache, must-revalidate"
          }
        });
      }


      // ==========================================
      // NORMAL USER
      // ==========================================

      context.waitUntil(

        fetch(
          `${FIREBASE_DB_URL}/links/${path}/clicks.json`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify(
              (data.clicks || 0) + 1
            )
          }
        )

      );


      // Original URL-এ redirect
      return Response.redirect(
        targetUrl,
        302
      );
    }

  } catch (err) {

    console.error(err);

  }


  // ==========================================
  // SHORT CODE না পাওয়া গেলে
  // ==========================================

  return next();
}
