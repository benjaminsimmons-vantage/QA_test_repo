---
name: implement
description: "Implement all sub-issues of a parent issue in dependency order on a single branch."
disable-model-invocation: true
---

Implement the work described by the parent issue's sub-issues, in dependency order.

## Scope

This skill is dispatched **once per parent issue**. It handles all sub-issues — do not dispatch it on individual child tickets.

## Process

### 1. Gather sub-issues

Fetch all sub-issues of the parent issue:
```bash
gh api repos/{owner}/{repo}/issues/{parent_number}/sub_issues
```

Read each sub-issue's body. Parse the **"Blocked by"** section to build a dependency graph.

### 2. Topologically sort

Sort the sub-issues so that a ticket is implemented only after all tickets it depends on are complete. Tickets with no blockers come first.

### 3. Create a single branch

Create one branch named `fix/<slug>-<issue-number>` where `<issue-number>` is the **parent** issue number (e.g. `fix/admin-users-tab-access-8`). All commits go on this one branch — do NOT create additional branches.

Apply the `in-progress` label to the **parent** issue. Remove the `ticketed` label if present.

### 4. Implement each sub-issue in order

For each sub-issue in dependency order:

1. Read the sub-issue's acceptance criteria and "What to build" section
2. Implement the changes
3. Run typechecking and relevant tests after each sub-issue's changes
4. Commit with a message referencing the sub-issue: `fix: <description> (#<sub-issue-number>)`
5. Close the sub-issue: `gh issue close <sub-issue-number>`

Use /tdd where possible, at pre-agreed seams.

### 5. Final verification

Run the full test suite once all sub-issues are implemented.

Once done, use /code-review to review the work.

### 6. Open one PR

Open a single pull request from the branch. The PR body should:
- Reference the parent issue: `Closes #<parent-number>`
- List each sub-issue that was implemented
- Summarize the changes

```bash
gh pr create --title "<short description>" --body "Closes #<parent-number>

## Sub-issues resolved
- #<sub-1> — <title>
- #<sub-2> — <title>
..."
```
