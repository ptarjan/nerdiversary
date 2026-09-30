#!/usr/bin/env python3
"""Wake #nerdiversary when Google finally recrawls the landing pages.

The 2026-09-02 answer-first title rewrite cannot be judged until Googlebot has
actually fetched the new <title>. A date-based reminder fired on 2026-09-11 and
was useless: lastCrawlTime was still 08-28..08-30, so there was nothing to read.
This watcher gates on the payload instead -- it stays silent until a crawl
newer than the rewrite lands, then wakes the channel once and disarms itself.
"""
import datetime as dt
import json
import os
import pathlib
import subprocess
import sys

from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY = "/data/home/.config/ga4/cryptic-teacher.json"
SITE = "sc-domain:paultarjan.com"
BASE = "https://paultarjan.com/nerdiversary/"
# Commit 82331e5, to the second. A crawl at or before this saw the OLD titles,
# and rounding it down to midnight counts two same-day crawls that did not.
REWRITE = dt.datetime(2026, 9, 2, 6, 22, 49, tzinfo=dt.timezone.utc)
# The room is a NAME, handed over by tools/plugin-run.py and resolved to an id
# there. A Discord id in a script survives a rename and sends the findings to
# a room nobody reads.
ROOM = os.environ["HOUSEHOLD_ROOM"]
WAKE = "/data/checkout/tools/wake.sh"
STATE = pathlib.Path("/data/home/.config/nerd-recrawl-watch/state.json")

PAGES = ["10000-days.html", "1000-weeks.html", "million-minutes.html",
         "billion-seconds.html", "mars-year.html", "20000-days.html",
         "1000-days.html", "half-birthday.html", "saturn-return.html",
         "2-billion-seconds.html", "how-many-days-old.html"]
# CTR needs clicks, and all of them land on these two -- everything else is a
# handful of impressions a week. A recrawl of the quiet pages moves no number,
# so waking on one produces the same empty readout the date-based reminder did.
MEASURABLE = {"1000-weeks.html", "million-minutes.html"}


def main() -> int:
    state = json.loads(STATE.read_text()) if STATE.exists() else {}
    if state.get("fired"):
        return 0

    creds = service_account.Credentials.from_service_account_file(
        KEY, scopes=["https://www.googleapis.com/auth/webmasters.readonly"])
    svc = build("searchconsole", "v1", credentials=creds,
                cache_discovery=False)

    fresh = []
    for page in PAGES:
        r = svc.urlInspection().index().inspect(body={
            "inspectionUrl": BASE + page, "siteUrl": SITE}).execute()
        crawled = r["inspectionResult"]["indexStatusResult"].get("lastCrawlTime")
        if not crawled:
            continue
        when = dt.datetime.fromisoformat(crawled.replace("Z", "+00:00"))
        if when > REWRITE:
            fresh.append((page, when.date().isoformat()))

    STATE.parent.mkdir(parents=True, exist_ok=True)
    names = {p for p, _ in fresh}
    if not (MEASURABLE <= names or len(fresh) >= 6):
        fresh = []
    if not fresh:
        STATE.write_text(json.dumps({
            "fired": False, "checked": dt.date.today().isoformat(),
            "recrawled": sorted(names)}))
        return 0

    listing = ", ".join(f"{p} ({d})" for p, d in fresh)
    subprocess.run([WAKE, "-c", ROOM, (
        f"Googlebot has recrawled {len(fresh)} of {len(PAGES)} nerdiversary "
        f"landing pages since the 2026-09-02 answer-first title rewrite: "
        f"{listing}. The new titles are finally in the index, so the CTR "
        f"question is answerable for the first time. Pull GSC per "
        f"gsc-api-access.md and compare "
        f"the post-recrawl window against the pre-rewrite baseline, EXCLUDING "
        f"10000-days.html -- its August traffic was new-page trial sampling, "
        f"not ranking, and including it makes every comparison meaningless "
        f"(see nerdiversary-seo.md). Say plainly whether CTR moved, stayed "
        f"flat, or fell. This watcher has now disarmed itself; delete "
        f"{STATE} to re-arm it.")], check=False)
    STATE.write_text(json.dumps({"fired": True,
                                 "fired_on": dt.date.today().isoformat(),
                                 "pages": dict(fresh)}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
