const FIREBASE_DB_URL =
  "https://shortlink-sammi-default-rtdb.asia-southeast1.firebasedatabase.app";


// ======================================================
// HTML ESCAPE
// ======================================================

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// ======================================================
// META TAG থেকে CONTENT বের করা
// ======================================================

function getMeta(html, type, value) {

  const patterns = [

    // property="og:title" content="..."
    new RegExp(
      `<meta[^>]+${type}=["']${value}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),

    // content="..." property="og:title"
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+${type}=["']${value}["'][^>]*>`,
      "i"
    )

  ];

  for (const regex of patterns) {

    const match = html.match(regex);

    if (match && match[1]) {
      return match[1].trim();
    }

  }

  return null;
}


// ======================================================
// ORIGINAL WEBSITE META DATA
// ======================================================

async function getOriginalMeta(targetUrl) {

  try {

    const response = await fetch(targetUrl, {

      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; FacebookExternalHit/1.1)"
      }

    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();


    // ------------------------------------------
    // TITLE
    // ------------------------------------------

    let title =
      getMeta(html, "property", "og:title");

    if (!title) {
      title =
        getMeta(html, "name", "twitter:title");
    }

    if (!title) {

      const titleMatch =
        html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);

      if (titleMatch) {
        title = titleMatch[1].trim();
      }

    }


    // ------------------------------------------
    // DESCRIPTION
    // ------------------------------------------

    let description =
      getMeta(html, "property", "og:description");

    if (!description) {
      description =
        getMeta(html, "name", "description");
    }

    if (!description) {
      description =
        getMeta(html, "name", "twitter:description");
    }


    // ------------------------------------------
    // IMAGE
    // ------------------------------------------

    let image =
      getMeta(html, "property", "og:image");

    if (!image) {
      image =
        getMeta(html, "name", "twitter:image");
    }


    // ------------------------------------------
    // IMAGE URL ABSOLUTE করা
    // ------------------------------------------

    if (image) {

      try {
        image =
          new URL(image, targetUrl).href;
      } catch (e) {
        image = null;
      }

    }


    // ------------------------------------------
    // SITE NAME
    // ------------------------------------------

    const siteName =
      getMeta(html, "property", "og:site_name");


    return {

      title:
        title || "Online Real Kaj",

      description:
        description || "",

      image:
        image || null,

      siteName:
        siteName || ""

    };


  } catch (error) {

    console.error(
      "Original meta error:",
      error
    );

    return null;

  }

}


// ======================================================
// CRAWLER DETECTION
// ======================================================

function isCrawler(request) {

  const ua =
    (request.headers.get("user-agent") || "")
      .toLowerCase();

  return (

    ua.includes("facebookexternalhit") ||
    ua.includes("facebot") ||
    ua.includes("telegrambot") ||
    ua.includes("twitterbot") ||
    ua.includes("linkedinbot") ||
    ua.includes("slackbot") ||
    ua.includes("discordbot") ||
    ua.includes("whatsapp") ||
    ua.includes("skypeuripreview") ||
    ua.includes("pinterest") ||
    ua.includes("googlebot") ||
    ua.includes("applebot")

  );

}


// ======================================================
// NETLIFY FUNCTION
// ======================================================

export default async (request, context) => {

  const url =
    new URL(request.url);

  const path =
    url.pathname.replace(/^\/+/, "");


  // ----------------------------------------------------
  // ROOT
  // ----------------------------------------------------

  if (!path) {

    return new Response(
      "Online Real Kaj",
      {
        status: 200,
        headers: {
          "Content-Type":
            "text/plain; charset=UTF-8"
        }
      }
    );

  }


  // ----------------------------------------------------
  // STATIC FILE হলে
  // ----------------------------------------------------

  if (path.includes(".")) {

    return new Response(
      "Not Found",
      {
        status: 404
      }
    );

  }


  try {

    // ==================================================
    // FIREBASE থেকে SHORT LINK
    // ==================================================

    const firebaseResponse =
      await fetch(
        `${FIREBASE_DB_URL}/links/${encodeURIComponent(path)}.json`
      );


    if (!firebaseResponse.ok) {

      return new Response(
        "Not Found",
        {
          status: 404
        }
      );

    }


    const data =
      await firebaseResponse.json();


    if (!data || !data.url) {

      return new Response(
        "Short link not found",
        {
          status: 404
        }
      );

    }


    const targetUrl =
      data.url;


    // ==================================================
    // FACEBOOK / TELEGRAM / WHATSAPP CRAWLER
    // ==================================================

    if (isCrawler(request)) {

      const meta =
        await getOriginalMeta(targetUrl);


      const title =
        meta?.title ||
        "Online Real Kaj";


      const description =
        meta?.description ||
        "";


      const image =
        meta?.image ||
        null;


      const siteName =
        meta?.siteName ||
        "Online Real Kaj";


      // ----------------------------------------------
      // IMAGE META
      // ----------------------------------------------

      const imageHTML =
        image
          ? `
<meta property="og:image"
      content="${escapeHTML(image)}">

<meta property="og:image:secure_url"
      content="${escapeHTML(image)}">

<meta name="twitter:image"
      content="${escapeHTML(image)}">

<meta name="twitter:card"
      content="summary_large_image">
`
          : `
<meta name="twitter:card"
      content="summary">
`;


      // ----------------------------------------------
      // PREVIEW HTML
      // ----------------------------------------------

      const html = `
<!DOCTYPE html>

<html lang="bn">

<head>

<meta charset="UTF-8">

<title>${escapeHTML(title)}</title>


<meta
  name="description"
  content="${escapeHTML(description)}"
>


<!-- FACEBOOK -->

<meta
  property="og:type"
  content="website"
>

<meta
  property="og:title"
  content="${escapeHTML(title)}"
>

<meta
  property="og:description"
  content="${escapeHTML(description)}"
>

<meta
  property="og:url"
  content="${escapeHTML(url.href)}"
>

<meta
  property="og:site_name"
  content="${escapeHTML(siteName)}"
>

${imageHTML}


<!-- TWITTER -->

<meta
  name="twitter:title"
  content="${escapeHTML(title)}"
>

<meta
  name="twitter:description"
  content="${escapeHTML(description)}"
>


</head>


<body>

<h1>${escapeHTML(title)}</h1>

<p>${escapeHTML(description)}</p>

</body>

</html>
`;


      return new Response(
        html,
        {

          status: 200,

          headers: {

            "Content-Type":
              "text/html; charset=UTF-8",

            // Facebook যাতে পুরোনো preview ধরে না রাখে
            "Cache-Control":
              "no-cache, no-store, must-revalidate",

            "Pragma":
              "no-cache",

            "Expires":
              "0"

          }

        }
      );

    }


    // ==================================================
    // NORMAL USER
    // ==================================================

    context.waitUntil(

      fetch(
        `${FIREBASE_DB_URL}/links/${encodeURIComponent(path)}/clicks.json`,
        {

          method: "PUT",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(
              (Number(data.clicks) || 0) + 1
            )

        }
      )

    );


    // ==================================================
    // ORIGINAL WEBSITE REDIRECT
    // ==================================================

    return Response.redirect(
      targetUrl,
      302
    );


  } catch (error) {

    console.error(
      "Shortlink error:",
      error
    );


    return new Response(
      "Server Error",
      {
        status: 500
      }
    );

  }

};


// ======================================================
// NETLIFY ROUTING
// ======================================================

export const config = {

  path: "/*",

  // index.html/css/js থাকলে সেগুলো আগে serve করবে
  preferStatic: true

};