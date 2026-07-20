---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

## Branch and label conventions

1. Create a single branch named `fix/<slug>-<issue-number>` (e.g. `fix/admin-users-tab-access-6`). All commits for this issue go on this one branch — do not create additional branches.
2. Apply the `in-progress` label to the issue when you start work. Remove the `ticketed` label if present.
3. After implementation, open a pull request referencing the issue (`Closes #<number>`).

## Process

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

Commit your work to the branch.
