---
name: implement
description: "Implement all sub-issues of a parent issue in dependency order on a single branch."
disable-model-invocation: true
---

Implement the work described by the parent issue's sub-issues, in dependency order.

## Scope

This skill is dispatched **once per parent issue**. It handles all sub-issues — do not dispatch it on individual child tickets.

## Strict compliance rules

These rules are non-negotiable. Violating any of them means the implementation is wrong, even if tests pass.

1. **The sub-issue is the spec.** Implement exactly what the sub-issue's "What to build" section says. Do not substitute alternative approaches, workarounds, or "cleaner" solutions. If the sub-issue says "fix seed data," fix the seed data — do not make comparisons case-insensitive instead. If the sub-issue says "normalize on write," add normalization at the write path — do not add normalization at the read path.
2. **Every acceptance criterion must be satisfied literally.** Before closing a sub-issue, check each acceptance criterion line by line. If it says "seed script uses lowercase role strings," the seed script must contain lowercase role strings. A passing test is not sufficient — the actual code must match what the criterion describes.
3. **"What to build" names specific files and layers.** If a sub-issue says to change the backend, change the backend. If it says to change the seed data, change the seed data. If it says to add integration tests, add integration tests (not unit tests, not frontend tests). Do not shift work from one layer to another.
4. **Do not close a sub-issue until every acceptance criterion is met in the code.** Re-read each criterion and verify the diff satisfies it before running `gh issue close`.

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

1. Read the sub-issue's "What to build" and acceptance criteria **carefully** — these are your requirements, not suggestions
2. Implement the changes described, in the files and layers specified
3. Before committing, re-read every acceptance criterion and verify your diff satisfies each one literally
4. Run typechecking and relevant tests after each sub-issue's changes
5. Commit with a message referencing the sub-issue: `fix: <description> (#<sub-issue-number>)`
6. Close the sub-issue: `gh issue close <sub-issue-number>`

Use /tdd where possible, at pre-agreed seams.

### 5. Final verification — test suite

Run the full test suite once all sub-issues are implemented.

### 6. Final verification — end-to-end with Playwright

**This step is mandatory.** After all code changes are complete, verify the fix works end-to-end using the Playwright MCP browser tools. The app is running at `http://localhost:3000` (frontend) and `http://localhost:8000` (backend).

For each user-facing acceptance criterion in the sub-issues:

1. Use `browser_navigate` to open the app
2. Login with the appropriate test user (check seed data for credentials)
3. Navigate to the affected pages and interact with the UI
4. Verify the expected behavior — check that pages load correctly, buttons work, access controls are enforced, error states are gone
5. Take a `browser_screenshot` as evidence

**If any verification fails:** this means your implementation is incomplete. Diagnose the root cause (it is likely in a layer you did not change but should have), fix the code, re-run tests, and re-verify with Playwright. Do NOT proceed to opening the PR until all acceptance criteria pass in the browser.

Common verification patterns:
- **Access control bugs**: Login as the relevant role, navigate to the protected page, confirm it renders (not "Access Denied"). Then test the API directly with `curl` to confirm the backend also returns 200, not 403.
- **UI visibility bugs**: Login as different roles, confirm elements show/hide correctly
- **Data bugs**: Submit forms, verify the data appears correctly in the UI
- **API bugs**: Check that the frontend displays data from the API without errors

### 7. Open one PR

Open a single pull request from the branch. The PR body should:
- Reference the parent issue: `Closes #<parent-number>`
- List each sub-issue that was implemented
- Summarize the changes
- Note that Playwright verification passed

```bash
gh pr create --title "<short description>" --body "Closes #<parent-number>

## Sub-issues resolved
- #<sub-1> — <title>
- #<sub-2> — <title>

## Verification
All acceptance criteria verified end-to-end via Playwright.
..."
```
