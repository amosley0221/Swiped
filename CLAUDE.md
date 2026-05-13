# CLAUDE.md

Snapshot of what's been built in Swiped, the architecture, and where to look
when changing things. Last updated alongside the Supabase ICS proxy.

## What Swiped is

A single-page PWA productivity / planner app. The UI is a half-circular dial
("wheel") at the bottom of the screen — drag the dial to rotate between
sections, drag a section icon up to open its detail view. Everything is
client-side React + JSX, compiled in the browser via babel-standalone (no
build step). Data persists to `localStorage`; signed-in users also sync to
Supabase Postgres so the same data shows up on every device.

Hosted as a Render static site. Two HTML shells:
- `Swiped.html` (production app, served at `/app`)
- `Swiped Canvas.html` (design / iteration sandbox, `/canvas`)

## Sections that exist

Built-in templates in `sections.jsx`, all available from Settings → Add
section:

- **Home** — welcome screen + cross-section "what needs attention" feed
  (work meetings today, school assignments this week, budget items due
  ≤3 days, open person reminders)
- **Work** — weekly view: tasks, log, note, calendar events from an ICS
  feed. Past meetings drop to Recent so the open count stays honest.
- **Budget** — collapsible sections: Year overview / Accounts (cash +
  credit cards) / Income / Bills / Subscriptions / Notes. Bills + subs +
  credit card payments auto-advance their due dates; credit cards
  surface used / available + utilization bar.
- **School** — semester picker, classes spreadsheet, weekly view with
  ICS calendar integration, live GPA + credits, progressive cumulative
  GPA.
- **Health** — manual daily steps + sleep entry with a date picker for
  backfilling missed days, 7-day line + bar charts, user-defined
  custom metrics (water / weight / runs / etc.) stored under
  `__metrics`.
- **Travel** — trips with destination, depart/return dates,
  confirmations, packing checklist.
- **Workouts** — chronological session log: type, date, minutes, notes.
- **Meals & Groceries** — weekly meal plan (Mon–Sun × breakfast /
  lunch / dinner) + running grocery list with quantities.
- **People** — per-person contact card with phones / emails / socials /
  birthday / reminders. Wheel icon is the person's first name.
- **Notes**, **Goals**, **Habits**, **Tasks**, **Reading** — generic
  weekly task / log / note pattern.

Each section's `contentKey` controls which template + detail editor it
gets. `iconKey` chooses an SVG from the `Icon` map in `sections.jsx`.

## Files & responsibilities

```
Swiped.html             entry HTML, script loading order, cache-bust query
index.html              redirects to /app
sw.js                   service worker: no-cache passthrough, no-store for app scripts
render.yaml             Render static-site config + no-cache HTTP headers
manifest.json           PWA install metadata + icons

app.jsx                 root component. Wheel + LiquidReveal + DetailView composition,
                        all section state (school, weekly, people, home, budget,
                        health, travel, workouts, meals, ICS events, liquid).
wheel-v2.jsx            half-circle dial with rotating icons + horizontal drag.
                        Pointer-down chooses rotate vs. liquid-open based on first move.
liquid.jsx              sheetPath() — bezier bell that follows the finger.
                        Used as clip-path for the DetailView reveal.
detail.jsx              every section's detail editor lives here:
                        WeeklyView, SchoolClasses, PersonDetails, HomeDetails,
                        BudgetDetails, HealthDetails, TravelDetails,
                        WorkoutsDetails, MealsDetails. CollapsibleSection
                        wrapper + SectionTitle helpers.
settings.jsx            Settings sheet. SyncSection (Supabase email+password),
                        BackupSection (JSON export/import), CustomProxySection,
                        PrivacySection, section list with rename/reorder/icon
                        picker, ICS URL input per weekly section.
sections.jsx            SECTION_LIB seeds, Icon map, ICON_KEYS, GPA helpers,
                        week-key utilities (Monday-anchored), income
                        normalization, nextRenewal() auto-advance helper.
sync.js                 Supabase Auth + Postgres sync layer.
                        signInPassword / signUpPassword / signOut /
                        sendPasswordReset. Debounced 600ms writes. Listens
                        for realtime row updates and republishes to local
                        state via swiped-state-external custom events.
ics-v2.js               iCalendar fetch + parse. Proxy chain (Supabase Edge
                        Function first, then public fallbacks, then user
                        custom proxy). Stub-size rejection + per-source cache.
tweaks-panel.jsx        Dev-only tweak overlay (rarely surfaced in prod).

supabase/functions/ics-proxy/index.ts
                        Edge Function that fetches Outlook / Google / iCloud
                        calendar URLs server-side and returns them with CORS
                        headers so the PWA can call them. Allowlists upstream
                        hosts. Deployed to the project at
                        vzvhokeusirmfdphibny.supabase.co.
```

## Data model

Everything keyed by section.id so multiple instances of the same section
type (two jobs, two people) get independent stores. localStorage keys:

| Key | Shape | Notes |
| --- | --- | --- |
| `swiped.sections` | `[{ id, name, iconKey, contentKey, iconData? }]` | wheel order, names, icons |
| `swiped.school.semesters` | `[{ id, name, isFuture, classes: [{ id, name, credits, grade }] }]` | newest-first |
| `swiped.school.activeSemesterId` | string | which semester is being viewed |
| `swiped.weekly` | `{ [sectionId]: { [weekKey]: { tasks, log, note } } }` | per-section weekly data, Mon-anchored week keys |
| `swiped.weeklyActive` | `{ [sectionId]: weekKey }` | currently-viewed week per section |
| `swiped.people` | `{ [sectionId]: { phones, emails, socials, birthday, notes, reminders } }` | |
| `swiped.home` | `{ phones, emails, socials, birthday, notes }` | user's own contact card |
| `swiped.budget` | `{ accounts, income, bills, subscriptions, notes }` | accounts include `kind: 'cash'/'credit'` |
| `swiped.health` | `{ [sectionId]: { 'YYYY-MM-DD': { steps, sleepMinutes, custom }, __metrics: [{id, name, unit}] } }` | |
| `swiped.travel` | `{ [sectionId]: { trips: [...] } }` | |
| `swiped.workouts` | `{ [sectionId]: { sessions: [...] } }` | |
| `swiped.meals` | `{ [sectionId]: { week: { mon..sun: {breakfast,lunch,dinner} }, grocery: [...] } }` | |
| `swiped.collapse.<id>` | `'0' / '1'` | per-block collapsed state |
| `swiped.ics.cache.<url>` | `{ v, text, sourceProxy, fetchedAt }` | 15-min ICS cache, version-gated |
| `swiped.customCorsProxy` | string | optional user-provided CORS proxy URL |

Cloud sync mirror in Supabase `user_data` table (a single row per user, JSON
payload). RLS policies should restrict each row to its owner.

## The wheel-lift / detail-reveal gesture

The drag is the **elastic-bell sheet** animation from `liquid.jsx`. Brief
panel + wheel stay put; a dark sheet rises from below with its peak following
the finger:

1. `wheel-v2.jsx` pointer-down records start, watches the first move:
   - dx-dominant → rotate the dial
   - dy upward → call `onLiquidStart({startX, startY})` and exit
2. `app.jsx` `onLiquidStart` adds window pointer listeners. Each move sets
   `liquid.progress` (= dy/H) and `liquid.finger = {x,y}`. `animateSheet`
   tweens both progress and finger.y to the snapped target on release.
3. `liquid.jsx` `sheetPath()` returns an SVG path that's a closed bezier
   bell: anchors at the screen-bottom edges, peak at the finger. The path
   is used as a `clip-path` on both the dark backdrop (`LiquidReveal`) and
   the DetailView wrapper, so they reveal along the same curve.
4. On settle (commit), `progress = 1` flattens the bell to the full screen
   and `setDetailOpen(true)` lets the view's content interact normally.
5. Close drag is the inverse: `progress = 1` initially, dragging down
   lowers it back to 0 with the same sheet path.

(There's a long history of iterating on this — wheel-translation, slime
tongue, per-icon springs, etc. — but the elastic-bell behavior is what
finally stuck.)

## ICS calendar integration

`ics-v2.js` fetches Outlook / Google / iCloud published calendar URLs and
parses them in-browser. Browsers can't fetch those URLs directly (no CORS
headers), so each request goes through a proxy. The proxy chain in order:

1. **Supabase Edge Function** (`/functions/v1/ics-proxy?url=...`) — our
   own server-side proxy. This is the primary route; Microsoft can't
   blanket-block it because no one else uses our specific hostname. The
   function code is in `supabase/functions/ics-proxy/index.ts` and is
   deployed via the Supabase dashboard's Edge Functions editor.
2. Direct fetch (works for Google Calendar which sends permissive CORS).
3. corsproxy.io / allorigins / codetabs / thingproxy / corsproxy.org —
   public fallbacks; useful when the Supabase function is rate-limited
   or down.
4. User-provided custom proxy from `swiped.customCorsProxy` (Settings →
   Custom CORS proxy). For users who want full control.

Responses smaller than `MIN_ICS_BYTES = 200` are rejected as stubs; cache
entries are tagged with `CACHE_VERSION` so older formats auto-evict.

The ICS allowlist on the Supabase function restricts hostnames to known
calendar providers — keeps the function from being abused as a generic
open proxy.

## Auth + sync

`sync.js` initializes a Supabase client (hardcoded project URL +
publishable key) and exposes:

- `signInPassword(email, password)` / `signUpPassword(...)` — email +
  password auth.
- `sendPasswordReset(email)` — Supabase emails a recovery link.
- `signOut()`
- Auth listener that pushes the user's `user_data` row into localStorage
  on login, and a debounced write that pushes local changes back up.

Backup section (`settings.jsx → BackupSection`) is an alternative for
users who want to archive their data themselves: exports every `swiped.*`
localStorage key as one JSON file, and can re-import it (wipes existing
swiped keys first, then writes the new ones, then reloads). Doesn't touch
the cloud.

## Notable UX details

- **Cache-busting**: every JSX file in `Swiped.html` has a `?v=YYYYMMDDx`
  query string. Bump it on every deploy so iOS PWAs pick up fresh code;
  iOS Safari ignores `no-cache` HTTP headers for installed PWAs and
  there's no way to force a refresh without changing the URL.
- **Multi-section types**: when a user adds a second instance of a
  section type (two jobs, two schools, two persons), it gets its own
  storage under `section.id`, so the data is independent.
- **Snap behavior**: wheel rotation snaps to the nearest section on
  release; no velocity projection (overshooting on a flick felt wrong).
- **Drag-to-scrub section dots**: the dots strip above the wheel is
  tappable + scrubbable so users with many sections don't have to drag
  the wheel through every position.
- **Section picker overlay**: at 7+ sections, a grid icon next to the
  dots strip opens a centered grid of all sections; tap one to jump.

## Privacy

Settings → Privacy & data describes:
- localStorage + Supabase sync are the only places Swiped data lives.
- ICS URLs are read tokens; we proxy through the Supabase function
  without logging or persisting the URL.
- Backup is client-side; nothing leaves the device on export/import.

## Things to know if you're picking up this project

- No build step — edit files, deploy, done. Babel-standalone compiles
  JSX in the browser at load time.
- Cache busting matters a lot for iOS PWAs. When in doubt, bump the
  version query string.
- Edge cases (especially ICS) get tested against real Outlook + Google
  feeds. The proxy chain order matters.
- Layout assumes a phone-sized viewport but does scale up for Fold cover
  + unfolded screens via `stageScale` (see `app.jsx`).
- iOS PWAs aggressively cache; sometimes the only way to push an update
  is to rename a file (we did this once with `ics.js → ics-v2.js` and
  `wheel.jsx → wheel-v2.jsx`).
