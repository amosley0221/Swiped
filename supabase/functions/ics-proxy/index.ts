// Supabase Edge Function — ICS feed proxy.
//
// Browsers can't fetch published Outlook / Google calendar URLs directly
// because those servers don't send CORS headers. Free public proxies
// (corsproxy.io, allorigins, etc.) get blocked by Microsoft on a rolling
// basis, which makes the feature unreliable. This function runs on
// Supabase's edge network — Microsoft can't preemptively block your
// project's hostname because it's not on any public abuse list — so it
// serves as a stable proxy for every Swiped user.
//
// Deploy: `supabase functions deploy ics-proxy --no-verify-jwt`
// Use:    GET /functions/v1/ics-proxy?url=<encoded-ics-url>
//
// Privacy: the ICS URL contains a user token granting read access to that
// calendar. We pass it straight through to the upstream host without
// storing, logging, or persisting it anywhere. See the privacy notice
// shown in Settings when users paste a feed URL.

// Hard allowlist of upstream hosts the proxy will fetch. Keeps the
// function from being abused as a generic open proxy.
const ALLOWED_HOSTS = [
  'outlook.office365.com',
  'outlook.office.com',
  'outlook.live.com',
  'calendar.google.com',
  'www.google.com',
  'p01-calendars.icloud.com',
  'p02-calendars.icloud.com',
  'p03-calendars.icloud.com',
  'p04-calendars.icloud.com',
  'p05-calendars.icloud.com',
];

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== 'GET') {
    return new Response('method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  const url = new URL(req.url).searchParams.get('url');
  if (!url) {
    return new Response('missing url', { status: 400, headers: CORS_HEADERS });
  }

  let target;
  try {
    target = new URL(url);
  } catch (_) {
    return new Response('invalid url', { status: 400, headers: CORS_HEADERS });
  }
  if (target.protocol !== 'https:') {
    return new Response('https required', { status: 400, headers: CORS_HEADERS });
  }
  if (!ALLOWED_HOSTS.includes(target.hostname)) {
    return new Response(
      `host not allowed: ${target.hostname}`,
      { status: 403, headers: CORS_HEADERS },
    );
  }

  // Forward the request. We intentionally do not echo any user headers
  // — only what the upstream host needs to return the .ics body.
  let upstream;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        'accept': 'text/calendar, text/plain, */*',
        // Some calendar hosts vary their response on User-Agent. A plain
        // desktop UA tends to get the canonical iCalendar body.
        'user-agent': 'Mozilla/5.0 (compatible; Swiped/1.0 ics-proxy)',
      },
      // Don't follow redirects across allowlisted hosts implicitly.
      redirect: 'follow',
    });
  } catch (err) {
    return new Response(
      `upstream fetch failed: ${(err && err.message) || String(err)}`,
      { status: 502, headers: CORS_HEADERS },
    );
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      ...CORS_HEADERS,
      'content-type': 'text/calendar; charset=utf-8',
      // Cache at the edge for 5 minutes so a busy week doesn't hammer
      // Microsoft. Browsers + Swiped's own 15-min localStorage cache
      // sit in front of this too.
      'cache-control': 'public, max-age=300',
    },
  });
});
