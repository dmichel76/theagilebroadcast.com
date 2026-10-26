#!/usr/bin/env python3
"""Rebuild weekly backlog snapshots from Azure DevOps Analytics, as one CSV for Backlog Currents.

Analytics keeps a daily snapshot of every work item (WorkItemSnapshot), including its backlog order
(BacklogPriority on Scrum, StackRank on Agile and Basic). This script reads one day per week, so past
weeks come back exactly as they were, with no need for weekly exports.

Env:   ADO_ORG, ADO_PROJECT, ADO_PAT (read-only, scope Analytics (read))
Usage: python3 ado_backlog_history.py [--weeks 12] [--weekday mon] [--types "User Story,Bug"] [--area "Project\\Team"] > backlog-history.csv
Output columns: Date,ID,Work Item Type,Title,State,Backlog Priority (one row per item per weekly snapshot).
"""
import argparse, base64, csv, json, os, sys, urllib.error, urllib.parse, urllib.request
from datetime import date, timedelta

DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
DEFAULT_TYPES = "User Story,Product Backlog Item,Requirement,Bug,Issue"


def get(url, pat):
    req = urllib.request.Request(url, headers={
        "Authorization": "Basic " + base64.b64encode((":" + pat).encode()).decode(),
        "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.load(r)


def q(s):
    return "'" + s.replace("'", "''") + "'"


def snapshot_days(weeks, weekday):
    """The last `weeks` dates falling on `weekday`, up to yesterday (today's snapshot may not be written yet)."""
    d = date.today() - timedelta(days=1)
    while d.weekday() != DAYS.index(weekday):
        d -= timedelta(days=1)
    return sorted(d - timedelta(weeks=k) for k in range(weeks))


def fetch(org, proj, pat, flt, select):
    url = (f"https://analytics.dev.azure.com/{urllib.parse.quote(org)}/{urllib.parse.quote(proj)}/_odata/v4.0-preview/WorkItemSnapshot?"
           + urllib.parse.urlencode({"$filter": flt, "$select": select, "$orderby": "DateSK,WorkItemId"}))
    rows = []
    while url:
        page = get(url, pat)
        rows += page["value"]
        url = page.get("@odata.nextLink")
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weeks", type=int, default=12)
    ap.add_argument("--weekday", choices=DAYS, default="mon")
    ap.add_argument("--types", default=DEFAULT_TYPES)
    ap.add_argument("--area", default="")
    a = ap.parse_args()
    org, proj, pat = os.environ["ADO_ORG"], os.environ["ADO_PROJECT"], os.environ["ADO_PAT"]

    days = snapshot_days(max(2, a.weeks), a.weekday)
    flt = "DateSK in (" + ",".join(d.strftime("%Y%m%d") for d in days) + ")"
    if a.types:
        flt += " and WorkItemType in (" + ",".join(q(t.strip()) for t in a.types.split(",") if t.strip()) + ")"
    if a.area:
        flt += " and startswith(Area/AreaPath," + q(a.area) + ")"

    select = "DateSK,WorkItemId,Title,WorkItemType,State,StateCategory,BacklogPriority,StackRank"
    try:
        rows = fetch(org, proj, pat, flt, select)
    except urllib.error.HTTPError as e:
        if e.code != 400:
            raise
        # Older Analytics models may not expose one of the two rank fields: retry with StackRank only.
        rows = fetch(org, proj, pat, flt, select.replace(",BacklogPriority", ""))

    # Keep items that sat in the backlog (state category Proposed) at least once, or that started during the window.
    by_item = {}
    for r in rows:
        by_item.setdefault(r["WorkItemId"], []).append(r)
    keep = {i for i, rs in by_item.items()
            if any(r.get("StateCategory") == "Proposed" for r in rs)
            or any(r.get("StateCategory") in ("InProgress", "Resolved") for r in rs)}
    if not keep:
        sys.exit("No backlog items found. Check the work item types (--types) and area path (--area).")

    out = csv.writer(sys.stdout, lineterminator="\n")
    out.writerow(["Date", "ID", "Work Item Type", "Title", "State", "Backlog Priority"])
    for r in rows:
        if r["WorkItemId"] not in keep:
            continue
        sk = str(r["DateSK"])
        rank = r.get("BacklogPriority")
        if rank is None:
            rank = r.get("StackRank")
        out.writerow([f"{sk[:4]}-{sk[4:6]}-{sk[6:]}", r["WorkItemId"], r.get("WorkItemType") or "",
                      r.get("Title") or "", r.get("State") or "", "" if rank is None else rank])


if __name__ == "__main__":
    main()
