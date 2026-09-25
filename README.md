# Nerdiversary

<p align="center">
  <img src="assets/logo.svg" alt="Nerdiversary logo" width="200">
</p>

Live at **https://paultarjan.com/nerdiversary/**

Enter one or more birthdays and get the dates of nerdy milestones: 1 billion
seconds old, a year on Mars, 2^30 seconds, Fibonacci numbers of days, Pi Day and
so on. The results page shows a countdown and timeline, and can export or
subscribe to a calendar, send push notifications, and share a milestone as a
link with its own preview card.

The site is static HTML and ES modules with no build step. A Cloudflare Worker
serves the parts that need a server: the calendar feed, share-link previews and
push notifications.

## Layout

| Path | What it is |
| --- | --- |
| `index.html`, `js/main.js` | Birthday form. Submits to `results.html?family=...`. |
| `results.html`, `js/results.js` | Countdown, timeline, filters, calendar/share/notify buttons. |
| `js/milestones.js` | Milestone definitions and constants (planets, sequences, holidays). |
| `js/calculator.js` | Turns a birth date into dated events. Shared with the worker. |
| `js/nerdiversary.js` | Site-side wrapper around the calculator (relative times, date formatting). |
| `js/shared.js` | Code used by both the site and the worker: `family` param parsing, iCal generation, `WORKER_URL`, `SITE_URL`. |
| `js/storage.js` | Saves the family to localStorage and IndexedDB (iOS evicts localStorage for PWAs), so a reopened app goes straight to results. |
| `js/notifications.js` | In-page notifications and the Web Push subscription to the worker. |
| `sw.js` | Service worker: network-first cache for offline use, shows push notifications. |
| `*.html` other than index/results | SEO landing pages, generated. See below. |
| `scripts/` | Generators for landing pages, `sitemap.xml`, `robots.txt` and OG cards. |
| `worker/` | Cloudflare Worker, its D1 schema and `wrangler.toml`. |
| `android/` | Trusted Web Activity wrapper for Android. |
| `test/` | Unit tests (`nerdiversary.test.js`) and Playwright tests (`e2e/`). |

The `family` URL parameter carries all state:
`Name|YYYY-MM-DD[|HH:MM][|Area/City]`, people separated by commas, parsed by
`parseFamilyParam` in `js/shared.js`. The site and the worker use the same
parser and the same calculator, so the page, the calendar feed and the push
notifications always agree on dates.

## Run locally

```bash
npm install     # also runs `playwright install --with-deps chromium`
npm run serve   # http://localhost:8080
```

Use the server rather than opening `index.html` from disk: browsers block ES
module imports from `file://`. `serve.json` keeps URLs as written
(`results.html`, not `/results`).

The local site talks to the deployed worker: `WORKER_URL` in `js/shared.js` is
hard-coded. To run the worker itself, use `npx wrangler dev` in `worker/`
(wrangler is not a dev dependency) and point `WORKER_URL` at it while testing.

## Test

```bash
npm run lint        # eslint over js/ worker/ test/ scripts/
npm run typecheck   # tsc checkJs over the files listed in jsconfig.json
npm test            # unit tests, plain Node, a few seconds
npm run test:e2e    # Playwright, Chromium; starts `npx serve` on :8080 itself
npm run test:all    # both
```

`test/nerdiversary.test.js` covers the milestone maths, the worker's exported
functions (`buildFamilyEvents`, `generateMilestoneOffsets`, `buildSharePage`),
backtests of the cron's minute matching (every offset for one birth time, a
1-in-100 sample of offsets across several birth times, and Earth birthdays),
and checks that the generated landing pages match their data. Some worker tests read
`worker.js` as text to check it imports the shared code instead of copying it.

The e2e tests fail on any uncaught exception or `console.error` in the page.

## Landing pages and OG cards

Landing pages (`billion-seconds.html`, `mars-year.html`, ...) are generated from
`scripts/landing-pages-data.js`, which holds each page's slug, title, copy and
date table. The copy rules (title and description length limits) are at the top
of that file and enforced by the unit tests.

```bash
npm run generate:landing   # writes <slug>.html for each page, sitemap.xml, robots.txt
npm run generate:og        # renders assets/og/*.jpg (1200x630) with Playwright
```

OG cards are one per milestone category plus `default.jpg`, and one
`lp-<slug>.jpg` per landing page. Both generators' output is committed, so the
deploy needs no build step. Re-run them after editing the data file; the unit
tests fail if a landing page's title or heading no longer matches its data.

A landing page's form either sends the date to `results.html` or, for pages
with `live` set, computes the answer on the page.

## Cloudflare Worker

`worker/worker.js` runs as `nerdiversary-calendar` on workers.dev and imports
`js/calculator.js` and `js/shared.js` directly.

| Route | Purpose |
| --- | --- |
| `GET /?family=...` | iCal feed for the family: events from 30 days ago to 2 years ahead. `&format=json` returns the events as JSON. The subscribe dialog links to it as `webcal://`, through Google Calendar's `cid=` and through Outlook's `addfromweb`. |
| `GET /share?t=&d=&i=&c=&n=&f=` | HTML with per-milestone OG tags for link-preview bots; people are redirected to the results page. The share buttons on the results page use these URLs. |
| `GET /push/vapid-public-key` | VAPID public key for the browser's push subscription. |
| `POST /push/subscribe` | Stores the subscription, family (max 20 people, birth times in UTC), lead times and IANA time zone in D1. Re-subscribing replaces the family. |
| `POST /push/unsubscribe` | Deletes the subscription. |
| `GET /push/notification-log` | Recent sent pushes. Needs `Authorization: Bearer <ADMIN_TOKEN>`. |

### Push notifications

The cron trigger runs every minute (`handleScheduled`):

1. On the first cron run in a worker instance it computes every fixed-offset milestone (seconds, days,
   planetary years, ...) for a reference birth date, rounded to the minute
   (`generateMilestoneOffsets`).
2. Each minute it reads all active family members from D1 once and, for each
   lead time (at the event, 1 hour before, 1 day before), checks whether
   `now + lead - birth` equals one of those offsets.
3. Earth birthdays fire at the birth time (UTC); nerdy holidays fire at midnight
   in the subscriber's time zone. Both are calendar dates, not fixed offsets,
   and are handled in `handleCalendarEvents`.
4. Pushes are encrypted and VAPID-signed in the worker with Web Crypto. A 404
   or 410 from the push service sets `deleted_at` on the subscription.
5. Sent pushes go into `notification_log`; rows older than 90 days are deleted
   at 00:00 UTC.

The tables are in `worker/schema.sql`. The one-time setup (D1 database, schema,
VAPID keys, secrets) is in the comments of `worker/wrangler.toml`. Schema
changes are not applied by the deploy: run the `ALTER TABLE` against the live
database with `wrangler d1 execute nerdiversary-db --remote`.

## Deploy

All three workflows are in `.github/workflows/`.

- `ci.yml`: every push and PR runs lint, typecheck and `npm run test:all`.
- `deploy.yml`: every push to `main` copies the static files (all `*.html`,
  `css/`, `js/`, `assets/`, `sw.js`, manifest, sitemap, robots) into `dist/`
  and publishes them to GitHub Pages, served at `paultarjan.com/nerdiversary/`.
  It also writes a `404.html` that redirects to `/nerdiversary/`.
  A new top-level file must be added to the `cp` list there or it won't ship.
- `deploy-worker.yml`: a push to `main` that touches `worker/`, `js/` or
  `test/` runs the unit tests, then `wrangler deploy` from `worker/`. Needs the
  `CLOUDFLARE_API_TOKEN` repo secret.

## Android app

`android/` wraps the site as a Trusted Web Activity built with
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap). Only
`twa-manifest.json` and `assetlinks.json` are committed; the generated Gradle
project, build output and signing keystore (`nerdiversary.keystore`) are
gitignored and exist only on the machine that builds releases.

```bash
cd android
npx @bubblewrap/cli update   # regenerate the project after editing twa-manifest.json
npx @bubblewrap/cli build    # signed .apk and .aab
```

Raise `appVersionCode` in `twa-manifest.json` for every release.
`assetlinks.json` is a copy of the file that must be served at
`https://paultarjan.com/.well-known/assetlinks.json`; it lives on the
paultarjan.com root site, not in this repo's deploy. Its fingerprint must match
the signing key, or the app opens with a browser URL bar.

## License

MIT
