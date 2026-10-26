#!/usr/bin/env python3
"""Take today's ranked backlog snapshot from Jira, as one dated CSV for Backlog Currents.

Jira doesn't keep a history of backlog positions (the changelog only says "Ranked higher" or "Ranked lower"),
so each run records the order as it is now. Run it once a week and keep the files: two or more dated
snapshots make a history the page can replay.

Env:   JIRA_BASE_URL, JIRA_TOKEN, and JIRA_EMAIL on Jira Cloud (leave JIRA_EMAIL unset for a Server/Data Center PAT)
Usage: python3 jira_backlog_snapshot.py --project ABC [--types "Story,Bug"] [--jql "..."] > backlog-YYYY-MM-DD.csv
Output columns: Date,ID,Work Item Type,Title,State,Rank (Rank = position in Jira's rank order, 1 = top).
"""
import argparse, base64, csv, json, os, sys, urllib.parse, urllib.request
from datetime import date

BASE = os.environ["JIRA_BASE_URL"].rstrip("/")
TOKEN = os.environ["JIRA_TOKEN"]
EMAIL = os.environ.get("JIRA_EMAIL")
CLOUD = bool(EMAIL)
AUTH = ("Basic " + base64.b64encode(f"{EMAIL}:{TOKEN}".encode()).decode()) if CLOUD else ("Bearer " + TOKEN)


def get(path, params):
    url = BASE + path + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Authorization": AUTH, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def search(jql):
    fields = "summary,status,issuetype"
    issues = []
    if CLOUD:
        token = None
        while True:
            params = {"jql": jql, "fields": fields, "maxResults": 100}
            if token:
                params["nextPageToken"] = token
            page = get("/rest/api/3/search/jql", params)
            issues += page.get("issues", [])
            token = page.get("nextPageToken")
            if not token or page.get("isLast"):
                return issues
    start = 0
    while True:
        page = get("/rest/api/2/search", {"jql": jql, "fields": fields, "maxResults": 100, "startAt": start})
        issues += page.get("issues", [])
        start += len(page.get("issues", []))
        if not page.get("issues") or start >= page.get("total", 0):
            return issues


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default="")
    ap.add_argument("--types", default="")
    ap.add_argument("--jql", default="", help="replaces the default query; must end with ORDER BY Rank ASC")
    a = ap.parse_args()
    if a.jql:
        jql = a.jql
    else:
        if not a.project:
            sys.exit("Give --project KEY, or a full --jql query ordered by Rank.")
        # Open work, plus anything finished in the last 7 days, so the page can tell started work from removed work.
        jql = f'project = "{a.project}" AND (statusCategory != Done OR statusCategoryChangedDate >= -7d)'
        if a.types:
            jql += " AND issuetype in (" + ",".join(f'"{t.strip()}"' for t in a.types.split(",") if t.strip()) + ")"
        jql += " ORDER BY Rank ASC"

    today = date.today().isoformat()
    out = csv.writer(sys.stdout, lineterminator="\n")
    out.writerow(["Date", "ID", "Work Item Type", "Title", "State", "Rank"])
    for pos, it in enumerate(search(jql), start=1):
        f = it.get("fields", {})
        out.writerow([today, it["key"], (f.get("issuetype") or {}).get("name", ""), f.get("summary") or "",
                      (f.get("status") or {}).get("name", ""), pos])


if __name__ == "__main__":
    main()
