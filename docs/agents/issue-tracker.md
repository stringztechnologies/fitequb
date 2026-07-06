# Issue Tracker: GitHub

Issues and PRDs for this repo live as GitHub Issues in `stringztechnologies/fitequb`. Use the `gh` CLI for issue operations.

## Conventions

- Create an issue: `gh issue create --title "..." --body "..."`
- Read an issue: `gh issue view <number> --comments`
- List issues: `gh issue list --state open --json number,title,body,labels,comments`
- Comment on an issue: `gh issue comment <number> --body "..."`
- Apply or remove labels: `gh issue edit <number> --add-label "..."` or `--remove-label "..."`
- Close an issue: `gh issue close <number> --comment "..."`

Infer the repo from `git remote -v`; `gh` does this automatically when run inside this clone.

## Pull Requests As A Triage Surface

PRs as a request surface: no.

Do not pull external PRs into the `/triage` queue. Treat GitHub Issues as the request surface for Matt Pocock skills.

## When A Skill Says "Publish To The Issue Tracker"

Create a GitHub Issue.

## When A Skill Says "Fetch The Relevant Ticket"

Run `gh issue view <number> --comments`.

## Wayfinding Operations

Used by `/wayfinder`. The map is a single issue with child issues as tickets.

- Map: a single issue labelled `wayfinder:map`, holding the notes, decisions so far, and fog body.
- Child ticket: an issue linked to the map as a GitHub sub-issue where available. Where sub-issues are unavailable, add the child to a task list in the map body and put `Part of #<map>` at the top of the child body.
- Blocking: use GitHub native issue dependencies where available. Where dependencies are unavailable, fall back to a `Blocked by: #<n>, #<n>` line at the top of the child body.
- Frontier query: list the map's open children, drop blocked or assigned issues, and take the first remaining item in map order.
- Claim: assign the issue to the driving dev.
- Resolve: comment with the answer, close the issue, then append a context pointer to the map's decisions.
