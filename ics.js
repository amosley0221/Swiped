// ics.js — Fetch + parse iCalendar (ICS) feeds and expand recurring events
// into concrete occurrences for a date range.
//
// Outlook (and most calendar providers) don't send CORS headers on their
// published .ics URLs, so we route fetches through a public CORS proxy.
// If you'd rather keep the URL private, swap CORS_PROXY for a Supabase
// Edge Function that fetches server-side.
//
// Recurrence support is intentionally limited to what Outlook actually
// emits in practice:
//   FREQ=DAILY | WEEKLY | MONTHLY | YEARLY
//   INTERVAL=N
//   BYDAY=MO,TU,WE,…
//   UNTIL=YYYYMMDDTHHMMSSZ
//   COUNT=N
// Anything fancier (BYMONTHDAY, BYSETPOS, EXDATE, etc.) gets ignored,
// which may produce a few extra/missing occurrences but won't crash.

(function () {
  if (typeof window === 'undefined') return;

  // CORS proxies tried in order — Outlook and Google calendar URLs don't
  // send CORS headers, so the PWA can't fetch them directly. Free proxies
  // periodically rate-limit or 403 individual hosts; falling back through
  // a chain keeps the calendar working when one provider hiccups.
  const CORS_PROXIES = [
    (u) => 'https://corsproxy.io/?' + encodeURIComponent(u),
    (u) => 'https://api.allorigins.win/raw?url=' + encodeURIComponent(u),
    (u) => 'https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(u),
  ];
  const CACHE_PREFIX = 'swiped.ics.cache.';
  const CACHE_TTL_MS = 15 * 60 * 1000;

  async function fetchICS(url) {
    if (!url) throw new Error('No ICS URL');
    const errors = [];
    for (const make of CORS_PROXIES) {
      try {
        const res = await fetch(make(url));
        if (!res.ok) { errors.push(`HTTP ${res.status}`); continue; }
        const text = await res.text();
        // Some proxies hand back HTML error pages with a 200 — sanity-check
        // that we got actual iCalendar content before declaring success.
        if (!/BEGIN:VCALENDAR/i.test(text)) {
          errors.push('non-ICS response');
          continue;
        }
        return text;
      } catch (err) {
        errors.push((err && err.message) || String(err));
      }
    }
    throw new Error(`Calendar provider blocked the proxy (${errors.join(' · ')}). Make sure the URL is the .ics feed link from "Publish a calendar" → ICS.`);
  }

  // RFC 5545 line folding: lines starting with whitespace continue the
  // previous one. Unfold before splitting on \n.
  function unfold(text) {
    return text.replace(/\r?\n[ \t]/g, '');
  }

  function parseICS(text) {
    const lines = unfold(text).split(/\r?\n/);
    const events = [];
    let current = null;
    for (const raw of lines) {
      const line = raw.trim();
      if (line === 'BEGIN:VEVENT') {
        current = {};
      } else if (line === 'END:VEVENT') {
        if (current) events.push(current);
        current = null;
      } else if (current) {
        const colon = line.indexOf(':');
        if (colon < 0) continue;
        let key = line.slice(0, colon);
        const value = line.slice(colon + 1);
        const semi = key.indexOf(';');
        const params = {};
        if (semi >= 0) {
          const paramStr = key.slice(semi + 1);
          key = key.slice(0, semi);
          for (const p of paramStr.split(';')) {
            const eq = p.indexOf('=');
            if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
          }
        }
        current[key.toUpperCase()] = { value: unescapeICS(value), params };
      }
    }
    return events;
  }

  // ICS strings escape commas, semicolons, backslashes, and newlines.
  function unescapeICS(s) {
    if (!s) return s;
    return s
      .replace(/\\n/gi, '\n')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\\\/g, '\\');
  }

  // Parse "20260512T140000Z" / "20260512T140000" / "20260512". TZID-tagged
  // values are treated as local time (best-effort; full TZ support would
  // need the calendar's VTIMEZONE block).
  function parseICSDate(value) {
    if (!value) return null;
    const m = value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z?))?$/);
    if (!m) return null;
    const [, y, mo, d, h = '00', mi = '00', s = '00', utc] = m;
    if (utc === 'Z') {
      return new Date(Date.UTC(+y, +mo - 1, +d, +h, +mi, +s));
    }
    return new Date(+y, +mo - 1, +d, +h, +mi, +s);
  }

  const DOW = { SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6 };

  function parseRRule(value) {
    if (!value) return null;
    const r = {};
    for (const p of value.split(';')) {
      const [k, v] = p.split('=');
      r[k] = v;
    }
    return {
      freq: r.FREQ,
      interval: r.INTERVAL ? parseInt(r.INTERVAL, 10) : 1,
      byday: r.BYDAY ? r.BYDAY.split(',') : null,
      until: r.UNTIL ? parseICSDate(r.UNTIL) : null,
      count: r.COUNT ? parseInt(r.COUNT, 10) : null,
    };
  }

  // Expand a VEVENT into concrete occurrences whose start time falls in
  // [rangeStart, rangeEnd). For non-recurring events, returns 0 or 1.
  function expandEvent(event, rangeStart, rangeEnd) {
    const start = parseICSDate(event.DTSTART && event.DTSTART.value);
    if (!start) return [];
    const end = parseICSDate(event.DTEND && event.DTEND.value) || start;
    const duration = end - start;
    const rrule = parseRRule(event.RRULE && event.RRULE.value);

    if (!rrule || !rrule.freq) {
      if (start >= rangeStart && start < rangeEnd) {
        return [{ start, end }];
      }
      return [];
    }

    const out = [];
    const { freq, interval, byday, until, count } = rrule;
    let cursor = new Date(start);
    let occurrencesFromStart = 0;
    let safety = 0;

    while (safety++ < 5000) {
      if (count != null && occurrencesFromStart >= count) break;
      if (until && cursor > until) break;
      if (cursor >= rangeEnd && !(freq === 'WEEKLY' && byday)) break;

      if (freq === 'WEEKLY' && byday) {
        // Emit one occurrence per BYDAY in the week starting at cursor.
        for (const day of byday) {
          const dow = DOW[day];
          if (dow == null) continue;
          const occ = new Date(cursor);
          // Move cursor to that day-of-week within its week (Sunday-anchored).
          const cursorDow = occ.getDay();
          occ.setDate(occ.getDate() + (dow - cursorDow));
          occ.setHours(start.getHours(), start.getMinutes(), start.getSeconds(), 0);
          // Stay inside the recurrence bounds.
          if (occ < start) continue;
          if (until && occ > until) continue;
          if (occ >= rangeStart && occ < rangeEnd) {
            out.push({ start: occ, end: new Date(occ.getTime() + duration) });
          }
          occurrencesFromStart++;
          if (count != null && occurrencesFromStart >= count) break;
        }
        // Cap once we're past the range.
        if (cursor >= rangeEnd) break;
      } else {
        if (cursor >= rangeStart && cursor < rangeEnd) {
          out.push({ start: new Date(cursor), end: new Date(cursor.getTime() + duration) });
        }
        occurrencesFromStart++;
      }

      // Advance cursor by INTERVAL of FREQ.
      if (freq === 'DAILY') cursor.setDate(cursor.getDate() + interval);
      else if (freq === 'WEEKLY') cursor.setDate(cursor.getDate() + 7 * interval);
      else if (freq === 'MONTHLY') cursor.setMonth(cursor.getMonth() + interval);
      else if (freq === 'YEARLY') cursor.setFullYear(cursor.getFullYear() + interval);
      else break;
    }
    return out;
  }

  function getEventsInRange(icsText, rangeStart, rangeEnd) {
    const events = parseICS(icsText);
    const out = [];
    for (const ev of events) {
      const uid = ev.UID && ev.UID.value;
      const summary = (ev.SUMMARY && ev.SUMMARY.value) || '(No title)';
      const location = (ev.LOCATION && ev.LOCATION.value) || '';
      const description = (ev.DESCRIPTION && ev.DESCRIPTION.value) || '';
      for (const occ of expandEvent(ev, rangeStart, rangeEnd)) {
        out.push({
          uid: `${uid || summary}-${+occ.start}`,
          summary, location, description,
          start: occ.start.toISOString(),
          end: occ.end.toISOString(),
        });
      }
    }
    out.sort((a, b) => a.start.localeCompare(b.start));
    return out;
  }

  // Cached fetch: 15-minute TTL so opening the section doesn't hit the
  // network on every navigation. localStorage keyed by the source URL.
  async function getEvents(url, rangeStart, rangeEnd, { force = false } = {}) {
    if (!url) return [];
    const cacheKey = CACHE_PREFIX + url;
    let text = null;
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
        if (cached && (Date.now() - cached.fetchedAt) < CACHE_TTL_MS) {
          text = cached.text;
        }
      } catch (e) { /* ignore */ }
    }
    if (!text) {
      text = await fetchICS(url);
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ text, fetchedAt: Date.now() }));
      } catch (e) { /* storage may be full — fine, we just refetch */ }
    }
    return getEventsInRange(text, rangeStart, rangeEnd);
  }

  window.SwipedICS = {
    fetchICS, parseICS, getEventsInRange, getEvents,
  };
})();
