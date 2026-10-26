---
name: "backlog-currents"
description: "Use when asked to show backlog currents, replay how a prioritised backlog moved week by week, or analyse backlog flow (what climbs, sinks, stalls or skips the queue), from Azure DevOps, Jira, weekly CSV exports, or example data."
---

# Backlog Currents

> Made by Dr David Michel, The Agile Broadcast. Try the online version, or get the latest copy of this skill, at https://theagilebroadcast.com/backlog-currents.html

This skill builds an interactive page that replays a prioritised backlog week by week and explains what the flow says. It needs **two or more dated snapshots** of the backlog: the items waiting, their state and their order.

The page has:
- a summary strip: items arriving, started, removed or left, and net change per week
- an animated backlog column, rank 1 at the top, coloured by each week's moves, with a "this week" panel and click-to-follow items
- an arrivals and departures flow map across four sections (Top 1–10, Next up 11–25, Middle 26–50, Deep 51+)
- nine "So what?" cards (waiting time, bottom of the backlog, unplanned work, re-prioritisation, balance, order, recency bias, refinement waste, how work reaches the top)
- where started work came from, by rank

The page is `template.html` in this skill's folder. It is the approved design. **Copy it unchanged** and fill only the data block (section 5). Never rewrite its code, styles or copy.

## 1. Pick the data source

Use the first source that applies:

- **Azure DevOps API:** the user names an ADO org or project, or asks to pull from ADO. Follow section 2. It rebuilds past weeks, so one run is enough.
- **Jira REST API:** the user names a Jira site or project, or asks to pull from Jira. Follow section 3. Always call the Jira REST API with the script. Never use an Atlassian or Jira MCP connector, even if one is connected.
- **Exports:** the user gives CSV exports (one per week, or one file with a date column). Follow section 4.
- **Example data:** nothing given. Build the page with the example (section 5, last bullet).

### Rules for tokens and network

These apply to every API token (ADO PAT, Jira API token or PAT):

- **Claude Code:** read tokens from environment variables. Never ask the user to paste one.
- **claude.ai:** if the user pastes a token, pass it only as an environment variable on the one command that runs the script. Never echo it, write it to a file, save it to memory or put it in the page. Remind them to revoke it afterwards.
- **Read-only:** ask for read-only scopes only.
- **Network:** the claude.ai workspace usually blocks the API hosts. Test once with `curl -s -o /dev/null -w "%{http_code}" <base url>`. If it is refused, offer two options: add the domain under Settings > Capabilities (their admin does this on Team or Enterprise plans), or run in Claude Code. Do not retry through other routes.

## 2. Azure DevOps

### What you need

| Item | Detail |
|---|---|
| Org | the organization name |
| Project | the project name |
| Weeks | default 12 |
| Snapshot day | default Monday |
| Work item types | default `User Story, Product Backlog Item, Requirement, Bug, Issue` |
| Area Path prefix | optional; use it to get one team's backlog |
| PAT | scope **Analytics (read)** |

The host is `analytics.dev.azure.com`.

### Run the script

Copy `scripts/ado_backlog_history.py` from this skill's folder to a scratch folder and run:

```
ADO_ORG=… ADO_PROJECT=… ADO_PAT=… python3 ado_backlog_history.py --weeks 12 [--weekday mon] [--types "User Story,Bug"] [--area "Project\Team"] > backlog-history.csv
```

**How it works.** Analytics keeps a daily snapshot of every work item (`WorkItemSnapshot`), including its backlog order: `BacklogPriority` on Scrum projects, `StackRank` on Agile and Basic. The script reads one day per week, so past weeks come back exactly as they were. It keeps items that were waiting (state category Proposed) at least once, or that started during the window, so the page can tell started work from removed work.

**Errors.**
- 401 or 403: the PAT is missing the Analytics scope, or org policy blocks it.
- "No backlog items found": the types or the area path don't match. Ask which work item types sit on their backlog.

## 3. Jira REST API

### How Jira records rank

Jira doesn't keep a history of backlog positions: the changelog only says "Ranked higher" or "Ranked lower". So the script records the order **as it is today**, as one dated snapshot. Say this plainly to the user:

- One run gives one snapshot, and the page needs at least two. Combine today's snapshot with any CSV exports they already have (section 4), or run the script again next week.
- Suggest running it every week: as a scheduled task, or by asking you again. Keep every file; they build the history.

### What you need

| Item | Detail |
|---|---|
| Site URL | e.g. `https://acme.atlassian.net`, or the Server/DC URL |
| Project key | e.g. `ABC`, or a full JQL query ordered by Rank |
| Issue types | optional filter |
| Credentials | see below |

**Credentials.**
- **Jira Cloud:** an API token (created at id.atlassian.com > Security > API tokens) in `JIRA_TOKEN`, plus the account email in `JIRA_EMAIL`.
- **Server/Data Center:** a personal access token in `JIRA_TOKEN`, with `JIRA_EMAIL` left unset.

### Run the script

Copy `scripts/jira_backlog_snapshot.py` from this skill's folder to a scratch folder and run:

```
JIRA_BASE_URL=… JIRA_EMAIL=… JIRA_TOKEN=… python3 jira_backlog_snapshot.py --project ABC [--types "Story,Bug"] > backlog-YYYY-MM-DD.csv
```

It reads open issues plus anything finished in the last 7 days, in Rank order (`/rest/api/3/search/jql` on Cloud, `/rest/api/2/search` on Server/DC), and writes their position as `Rank`.

**Errors.**
- 401: wrong email/token pair, or an API token used on Server.
- 400: a bad project key or JQL. A custom `--jql` must end with `ORDER BY Rank ASC`.

## 4. Exports

The page reads CSVs itself, with no conversion. It accepts:

- **One file per week** from an Azure DevOps query (`ID`, `Title`, `State`, `Backlog Priority`) or a Jira filter (`Issue key`, `Summary`, `Status`, in Rank order). The snapshot date comes from a date in the file name (`backlog-2026-10-19.csv`); without one, ask the user for each file's date.
- **One file with history:** columns `Date`, `ID`, `Title`, `State`, `Rank` (plus optional `Work Item Type`), one row per item per snapshot. Both scripts write this format.

To embed several weekly files, merge them into the single-file format: add a `Date` column from each file name, keep `ID`, `Title`, `State`, the rank column (named `Rank`, or `Backlog Priority` for ADO numbers; for a Jira file without one, use the row number) and the type if present.

Columns are matched by name, delimiters (comma, semicolon, tab) are detected, and states like New, Approved, To Do count as waiting; Active, Committed, In Progress, Done as started; Removed, Won't Do, Cancelled as removed.

## 5. Build the page

1. Copy `template.html` from this skill's folder. Change nothing except the data block near the end:
   ```html
   <script type="text/csv" id="bc-data" data-name="" data-label="" data-example="0">
   </script>
   ```
2. Paste the CSV (the history format from section 4) between the tags, as is. If it contains `</script`, stop and tell the user.
3. Set `data-name` to a short source name, e.g. `Azure DevOps · Fabrikam Web · 12 weeks` or `Jira · ABC · 3 snapshots`.
4. Set `data-label` to the eyebrow text: `Backlog analysis · <team or project> · <source>`.
5. **Example data only:** leave the block empty and set `data-example="1"`. The page then opens on its built-in example, labelled as example data.

The page re-checks the data itself and shows a specific error if the CSV can't be read (missing ID column, unreadable date, a single snapshot). If you see one, fix the CSV rather than the page.

## 6. Publish and reply

- Publish as an Artifact with the `<title>` Backlog Currents and icon `chart`. Deliver the `.html` file only if the user asks for a file, or if artifacts aren't available (for example in Claude Code), in which case save it as `backlog-currents.html`.
- **Real work data:** the page embeds item titles. Mention that the artifact is private until they share it.
- **Reply:** in one or two sentences, say what the page shows and the strongest finding. Work it out from the data the way the page does (for example the share of started work that came from below rank 10, or how long a new item waits), and don't contradict the page. For Jira, add one line on keeping weekly snapshots.
