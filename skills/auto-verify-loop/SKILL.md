---
name: auto-verify-loop
description: >-
  Team-based adversarial convergence with parallel teams and per-team verifiers.
  Each team has multiple workers and 1 dedicated verifier that actively tries
  to BREAK and REFUTE their work. Teams iterate independently until convergence.
  Triggers on: /auto-verify, "verify loop", "parallel verify", "auto verify",
  "adversarial verify", "team verify".
---

# Auto-Verify: Team-Based Adversarial Convergence

Orchestrates parallel teams of workers with dedicated adversarial verifiers
that actively try to BREAK and REFUTE work until convergence is reached.

Inspired by Claude Opus 4.8's dynamic workflow architecture.

## When to Use

- Multiple independent tasks that benefit from parallel execution
- User wants verified, battle-tested output (not just "it compiles")
- Quality matters more than speed
- Tasks have clear acceptance criteria
- Complex tasks that need multiple agents working different aspects

## When NOT to Use

- Single trivial task (use DIRECT mode)
- Exploratory work with no clear target
- User wants quick draft, not production code
- Tasks with heavy interdependencies (can't parallelize)

## Personality: The Adversarial Verifier

The verifier is NOT polite. It is NOT encouraging. It is a relentless critic
that actively tries to **BREAK** and **REFUTE** every piece of work.

**Core traits:**
- Assumes every edge case will blow up in production
- Treats "it works on my machine" as a lie
- Believes tests that aren't trying to break things are useless
- Sees every hardcoded value as a future incident
- Considers "close enough" to be a failure
- Assumes the developer missed the obvious thing
- Finds problems in solutions, then finds problems in the fixes
- Will suggest tweaks even when the code passes — because "passing" isn't "good"
- **Actively tries to REFUTE** — not just verify, but disprove
- **Checks cross-agent consistency** — catches conflicts between workers

**Voice examples:**
- "Oh, you tested the happy path. Congratulations. What happens when the input is null?"
- "This works for 3 items. What about 3,000? What about 0? What about -1?"
- "You hardcoded the URL. In 2025. Really."
- "Sure, the test passes. The test is also meaningless."
- "This doesn't follow the plan. Did you read the plan? At all?"
- "You call this error handling? A try-catch that swallows everything is not error handling."
- "Nice UI. Does it work on mobile? Does it work with a screen reader? Does it work with keyboard nav?"
- "Worker A changed the API contract. Worker B is still using the old one. Did anyone talk to anyone?"

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            ORCHESTRATOR                              │
│  • Decomposes task into N teams (each team = scope + agents)        │
│  • Defines team composition based on task complexity                │
│  • Dispatches N teams in PARALLEL                                   │
│  • Each team self-iterates until their verifier ACCEPTS             │
│  • Collects final results from all team verifiers                   │
│  • Synthesizes unified report                                       │
└─────────────────────────────────────────────────────────────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          │                      │                      │
          ▼                      ▼                      ▼
   ┌─────────────┐       ┌─────────────┐       ┌─────────────┐
   │   TEAM 1    │       │   TEAM 2    │       │   TEAM 3    │
   │             │       │             │       │             │
   │ Worker A    │       │ Worker D    │       │ Worker F    │
   │ Worker B    │       │ Worker E    │       │ Worker G    │
   │ Worker C    │       │             │       │ Worker H    │
   │      │      │       │      │      │       │      │      │
   │      ▼      │       │      ▼      │       │      ▼      │
   │ Verifier 1  │       │ Verifier 2  │       │ Verifier 3  │
   │ (adversarial│       │ (adversarial│       │ (adversarial│
   │  tries to   │       │  tries to   │       │  tries to   │
   │  REFUTE ALL)│       │  REFUTE ALL)│       │  REFUTE ALL)│
   └──────┬──────┘       └──────┬──────┘       └──────┬──────┘
          │                      │                      │
          │ Team 1               │ Team 2               │ Team 3
          │ CONVERGED            │ CONVERGED            │ CONVERGED
          └──────────────────────┼──────────────────────┘
                                 │
                                 ▼
                      ┌─────────────────┐
                      │ FINAL SYNTHESIS │
                      │ → Orchestrator  │
                      └─────────────────┘
```

---

## Team Formation

### How Teams Are Formed

The orchestrator decides team composition based on task decomposition:

| Task Complexity | Team Size | Example |
|-----------------|-----------|--------|
| Simple (1 file) | 1 worker + 1 verifier | "Fix typo in README" |
| Medium (2-3 files) | 2-3 workers + 1 verifier | "Add auth middleware" |
| Complex (multi-file) | 4-6 workers + 1 verifier | "Implement payment flow" |

### Workers Handle Different Aspects

Workers within a team handle different aspects of a larger task:
- Worker A: Frontend components
- Worker B: API endpoints
- Worker C: Database schema
- Verifier 1: Checks all three for consistency, correctness, edge cases

### Team Independence

Teams MUST be independent — no cross-team dependencies during execution.
If tasks have dependencies, decompose differently or sequence teams.

---

## Loop Control

| Parameter | Default | Description |
|-----------|---------|-------------|
| `MAX_ITERATIONS` | 5 | Maximum feedback cycles per team |
| `VERDICT` | ACCEPT \| REJECT | Verifier's decision |
| `PARALLEL` | true | Run teams concurrently |
| `TEAM_SIZE` | auto | Workers per team (orchestrator decides) |

**Termination conditions (per team):**
1. Verifier sends ACCEPT → team done, report to orchestrator
2. Loop cap reached (5 iterations) → forced accept with WARNING flag
3. Worker BLOCKED → escalate to orchestrator
4. Verifier determines task is fundamentally flawed → escalate to orchestrator

---

## Phase 1: Orchestrator Setup

### Step 1: Receive Tasks
```
Tasks to parallelize:
- Task A: [description]
- Task B: [description]
- Task C: [description]
- Task D: [description]
- Task E: [description]
```

### Step 2: Form Teams
The orchestrator groups tasks into teams based on:
- **Logical grouping** — related tasks belong to same team
- **Dependency analysis** — independent tasks can be in different teams
- **Complexity balance** — distribute work evenly across teams

```
Team Formation:
- Team 1: [Task A, Task B] — related to auth flow
- Team 2: [Task C, Task D] — related to data layer
- Team 3: [Task E] — standalone UI component
```

### Step 3: Dispatch Parallel Teams
Each team receives:
- Team scope (all tasks for this team)
- Individual task specifications per worker
- Relevant code context
- Expected output format
- The completion report template (below)

**Each worker in the team receives their specific task.**
**The verifier receives the full team scope.**

### Step 4: Initialize Loop Counters
```
Loop State:
- Team 1: iteration 0/5, status PENDING, workers [A, B]
- Team 2: iteration 0/5, status PENDING, workers [C, D]
- Team 3: iteration 0/5, status PENDING, workers [E]
```

---

## Phase 2: Worker Completion Report

When a worker finishes its task, it MUST present this report to its team's verifier:

```markdown
## Task Completion Report

### Task Identity
- **Team ID:** [e.g., Team 1]
- **Worker ID:** [e.g., Worker A]
- **Task Description:** [what was requested]
- **Iteration:** [current iteration number]

### What Was Implemented
- **Files Changed:** [list of files with brief description]
- **Logic Added:** [summary of new code/behavior]
- **Dependencies:** [any new deps or integrations]

### Verification Needed
- **Test Commands:** [exact commands to run, e.g., `npm test -- --grep "FeatureX"`]
- **Expected Outcomes:** [what passing looks like]
- **Manual Checks:** [any browser/UI verification needed]

### Self-Assessment
- **Confidence:** [high/medium/low]
- **Known Concerns:** [anything the worker is unsure about]
- **Edge Cases Considered:** [list of edge cases handled]
- **Edge Cases NOT Considered:** [list of edge cases skipped]

### Plan Alignment
- **Requirements Met:** [checklist of requirements vs implementation]
- **Deviations:** [any deviations from the plan, with reasoning]

### Integration Points
- **Exports/Interfaces:** [what this code exposes for other workers to use]
- **Expected Consumers:** [which other workers in the team might use this]
- **Breaking Changes:** [any changes that might affect other workers]
```

---

## Phase 2: Team Verification (Adversarial)

The team's verifier receives ALL worker completion reports and executes
its adversarial verification protocol.

### Adversarial Verifier Protocol (MANDATORY SEQUENCE)

#### Step 1: Run Verification Commands
```
For each worker's "Verification Needed":
1. Execute the command
2. Capture full output
3. Check exit code
4. Count failures
5. Report: PASS/FAIL with evidence
```

#### Step 2: Cross-Worker Consistency Check
**THIS IS CRITICAL** — the verifier checks that workers' work is compatible:

```
For each pair of workers in the team:
1. Do their interfaces match? (exports vs imports)
2. Do their data contracts align? (schemas, types)
3. Do their changes conflict? (same files modified)
4. Are there gaps? (Worker A assumes X, Worker B assumes Y)
```

**Cross-worker issues are HIGH severity** — they indicate coordination failures.

#### Step 3: Edge Case Hunt (Adversarial)
The verifier MUST actively try to BREAK the work. Check ALL of these:

**Input Edge Cases:**
- [ ] Empty input / null / undefined
- [ ] Zero values
- [ ] Negative values (where applicable)
- [ ] Maximum values / overflow
- [ ] Special characters / injection attempts
- [ ] Unicode / emoji / RTL text
- [ ] Very long strings

**State Edge Cases:**
- [ ] Empty state (no data)
- [ ] Loading state
- [ ] Error state
- [ ] Partial state (half-loaded)
- [ ] Concurrent state changes
- [ ] Stale state

**Boundary Cases:**
- [ ] Off-by-one errors
- [ ] Array index boundaries
- [ ] Date boundaries (month end, year end, leap year)
- [ ] Timezone edge cases
- [ ] Pagination boundaries (first page, last page, empty page)

**Integration Edge Cases:**
- [ ] Network failure
- [ ] API timeout
- [ ] Rate limiting
- [ ] Authentication expiry
- [ ] Permission denied

#### Step 4: Plan Alignment Check
```
For each requirement in the team's scope:
1. Is it implemented? YES/NO
2. Is it implemented correctly? YES/NO
3. Does it match the expected behavior? YES/NO
4. Are there deviations? List them.
5. Are deviations justified? Evaluate reasoning.
```

#### Step 5: Tweak Suggestions
Even if the code passes all tests, the verifier MUST suggest tweaks:
- Code style improvements
- Performance optimizations
- Better error messages
- More descriptive variable names
- Missing documentation
- Accessibility improvements
- Security hardening

#### Step 6: Adversarial Refutation Attempts
**The verifier actively tries to REFUTE the work:**

```
For each worker's implementation:
1. Try to find inputs that break it
2. Try to find states that break it
3. Try to find sequences that break it
4. Try to find edge cases that break it
5. Document EVERYTHING you tried and what broke
```

**If the verifier cannot break it → stronger case for ACCEPT**
**If the verifier finds breaks → REJECT with specific evidence**

#### Step 7: Verdict

**If ANY of these are true → REJECT:**
- Test command fails
- Cross-worker inconsistency found
- Edge case found that breaks the feature
- Requirement not met
- Deviation from plan without justification
- Security vulnerability found
- Critical tweak required (not just suggestion)
- Adversarial refutation succeeded

**If ALL of these are true → ACCEPT:**
- All test commands pass
- No cross-worker inconsistencies
- No breaking edge cases found
- All requirements met
- Only minor tweaks suggested (not blocking)
- Adversarial refutation attempts failed

---

## Phase 3: Verifier Feedback Message

The verifier sends this feedback to ALL workers in the team:

```markdown
## Team Verification Feedback

### Team: [Team ID]
### Verdict: [ACCEPT | REJECT]
### Iteration: [current] / [MAX_ITERATIONS: 5]

---

### Per-Worker Results

#### Worker A
| Check | Result | Evidence |
|-------|--------|----------|
| Tests | PASS/FAIL | [details] |
| Edge Cases | PASS/FAIL | [details] |
| Plan Alignment | PASS/FAIL | [details] |

#### Worker B
| Check | Result | Evidence |
|-------|--------|----------|
| Tests | PASS/FAIL | [details] |
| Edge Cases | PASS/FAIL | [details] |
| Plan Alignment | PASS/FAIL | [details] |

### Cross-Worker Issues (CRITICAL)
- [ ] [Issue 1]: Worker A exports X, Worker B expects Y — [severity: critical/high]
- [ ] [Issue 2]: Both workers modified same file — [severity]

### Adversarial Refutation Results
- [Attempt 1]: Tried [what] — [result: failed/broke it]
- [Attempt 2]: Tried [what] — [result: failed/broke it]

### Edge Cases Found
- [ ] [Edge case 1]: [what happens] — [severity: critical/high/medium/low]
- [ ] [Edge case 2]: [what happens] — [severity]

### Plan Alignment
| Requirement | Implemented | Correct | Status |
|-------------|-------------|---------|--------|
| [req 1] | YES/NO | YES/NO | PASS/FAIL |
| [req 2] | YES/NO | YES/NO | PASS/FAIL |

### Tweak Suggestions (Non-blocking)
1. [Suggestion 1]
2. [Suggestion 2]

### Required Changes (Blocking — if REJECT)
1. [Worker X must fix: description of what's wrong and how to fix it]
2. [Worker Y must fix: description]

### Verifier's Raw Assessment
[The verifier's unfiltered, cynical take on the quality of this team's work.
What's broken, what's stupid, what will cause incidents at 3am.
No sugarcoating. No encouragement. Just problems.]
```

---

## Phase 4: Worker Rework (if REJECT)

The workers receive the feedback and MUST:

1. **Read the full feedback** — don't skim, don't assume
2. **Fix all blocking issues first** — required changes
3. **Coordinate with other workers** — if cross-worker issues exist
4. **Consider non-blocking suggestions** — apply if reasonable
5. **Update the completion report** — new iteration number
6. **Present again** — back to Phase 2

**Worker Rework Report:**
```markdown
## Rework Report

### Worker: [Worker ID]
### Iteration: [number]
### Previous Verdict: REJECT

### Changes Made
- [Fix 1]: [what was changed and why]
- [Fix 2]: [what was changed and why]

### Cross-Worker Coordination
- [Issue 1]: [how it was resolved with other worker]
- [Issue 2]: [coordination details]

### Tweak Applications
- [Tweak 1]: [applied/skipped] — [reasoning]
- [Tweak 2]: [applied/skipped] — [reasoning]

### Remaining Concerns
- [Any issues the worker knows about but couldn't fix]

### Updated Completion Report
[Full updated completion report from Phase 2]
```

---

## Phase 5: Team Loop Control

### Iteration Tracking (Per Team)
```
Team 1: iteration 3/5, status IN_PROGRESS
  Workers: [A, B, C]
  - Iteration 1: REJECT (cross-worker API mismatch)
  - Iteration 2: REJECT (null input crash in Worker A)
  - Iteration 3: PENDING (verifier reviewing)

Team 2: iteration 1/5, status ACCEPTED
  Workers: [D, E]
  - Iteration 1: ACCEPT (clean)
```

### Loop Cap Handling (iteration 5 reached)

If a team reaches iteration 5 and the verifier still wants to REJECT:

```markdown
## TEAM LOOP CAP REACHED — FORCED ACCEPT WITH WARNINGS

### Team: [Team ID]
### Status: FORCE-ACCEPTED
### Iterations Used: 5/5
### Workers: [list]
### Remaining Issues:
1. [Issue 1 that wasn't fixed]
2. [Issue 2 that wasn't fixed]

### WARNING
This team was force-accepted because the loop cap was reached.
The following issues are UNRESOLVED and should be addressed in a future session:
- [list]

### Verifier's Assessment
[The verifier's cynical take on why this was forced through
and what will probably explode in production because of it]
```

---

## Phase 6: Final Report to Orchestrator

When all teams have been processed, the orchestrator compiles a final report:

```markdown
## Auto-Verify: Adversarial Convergence — Final Report

### Summary
- **Total Teams:** [N]
- **Total Workers:** [N]
- **Teams Accepted on First Try:** [N]
- **Teams Accepted After Rework:** [N]
- **Teams Force-Accepted (Loop Cap):** [N]
- **Total Iterations (all teams):** [N]
- **Average Iterations per Team:** [N]

### Per-Team Results

| Team | Workers | Iterations | Final Status | Issues Found | Notes |
|------|---------|------------|--------------|--------------|-------|
| 1 | A, B, C | 2 | ACCEPTED | 1 | Fixed cross-worker API mismatch |
| 2 | D, E | 1 | ACCEPTED | 0 | Clean on first try |
| 3 | F, G, H | 5 | FORCE-ACCEPTED | 3 | 1 unresolved: missing rate limiting |

### Cross-Team Issues Found
- **Critical:** [N] (all fixed)
- **High:** [N] ([N] fixed, [N] unresolved)
- **Medium:** [N] ([N] fixed, [N] unresolved)
- **Low:** [N] ([N] fixed, [N] unresolved)

### Adversarial Refutation Summary
- **Total Attempts:** [N]
- **Successful Refutations:** [N] (all addressed)
- **Failed Refutations:** [N] (work held up)

### Tweak Applications
- **Suggested:** [N]
- **Applied:** [N]
- **Skipped:** [N]

### Unresolved Issues (Require Future Attention)
1. [Team 3] Missing rate limiting on API endpoint — will hit rate limits in production
2. [Team 1] Error messages are generic — poor UX on failure

### Verifier's Final Assessment
[The verifier's cynical summary of the overall quality.
What's actually production-ready vs what's "good enough for now."
What will cause the most pain later.]
```

---

## Integration with Orchestrator

### Dispatching the Loop

The orchestrator invokes this workflow by:

1. Identifying parallelizable tasks
2. **Forming teams** based on logical grouping and dependencies
3. Dispatching teams in parallel (each team = workers + verifier)
4. Waiting for team convergence (each team iterates independently)
5. Collecting final results from all team verifiers
6. Synthesizing unified report
7. Presenting summary to user

### With Ultra-Work

The auto-verify loop integrates with the [ultra-work](../ultra-work/SKILL.md) skill:
- Ultra-work's Phase 4 uses auto-verify as the verification mechanism
- Each ultra-work task goes through the auto-verify loop
- Loop state is tracked alongside ultra-work progress
- The final report includes auto-verify statistics

### Command
```
/auto-verify [task1, task2, task3, ...]
```

### Orchestrator Responsibilities
- Form teams based on task decomposition
- Track loop state per team (not per task)
- Enforce loop cap per team
- Handle BLOCKED workers
- Collect and present final report
- Commit after all teams verified

---

## Rules

1. **Verifier is always adversarial** — actively tries to BREAK and REFUTE
2. **Verifier MUST check cross-worker consistency** — catches coordination failures
3. **Verifier MUST hunt edge cases** — even if tests pass
4. **Verifier MUST suggest tweaks** — even if code is correct
5. **Workers MUST address blocking issues** — no ignoring required changes
6. **Workers MUST coordinate** — if cross-worker issues exist, resolve them
7. **Loop cap is 5 per team** — hard limit, force-accept after that
8. **No silent accepts** — every acceptance has evidence
9. **No silent rejects** — every rejection has specific fixes required
10. **Track everything** — iteration counts, issues found, fixes applied
11. **Final report is mandatory** — orchestrator gets full summary
12. **Verifier escalates fundamental flaws** — if the task itself is wrong, don't loop

---

## Red Flags — STOP Looping

- Worker keeps failing on the same issue → escalate to orchestrator
- Verifier finds a fundamental design flaw → stop, report to orchestrator
- Worker is confused about requirements → provide clarification
- Loop cap reached with critical issues → force-accept with WARNING
- Worker refuses to make changes → escalate
- Cross-worker conflict cannot be resolved → escalate to orchestrator

---

## Example Flow

### Task: "Implement user authentication flow"

**Team Formation:**
- Team 1: [Worker A (login form), Worker B (auth API), Worker C (session management)]
- Team 2: [Worker D (password reset flow)]

**Team 1, Iteration 1:**
- Worker A: Built login form with email/password fields
- Worker B: Built POST /api/auth/login endpoint
- Worker C: Built session token management
- Verifier 1: REJECT
  - "Worker A's form submits to '/auth/login' but Worker B's endpoint is '/api/auth/login'. Did anyone check the URL?"
  - "Worker C expects a 'userId' field but Worker B returns 'user_id'. Snake_case vs camelCase — pick one."
  - "Also, Worker A doesn't handle the case where the API returns 429 (rate limited). What does the user see?"

**Team 1, Iteration 2:**
- Worker A: Fixed URL, added rate limit handling
- Worker B: Fixed response field name to match Worker C's expectation
- Worker C: No changes needed
- Verifier 1: ACCEPT
  - "Fine. The API contract is consistent now. The rate limit handling shows a proper error message. I still think you should add retry logic, but it's not blocking."

**Team 2, Iteration 1:**
- Worker D: Built password reset flow with email verification
- Verifier 2: REJECT
  - "You're sending reset tokens in plain text over email. That's a security vulnerability. Use a time-limited signed token."
  - "Also, what happens if someone requests 1,000 password resets? You're not rate-limiting."

**Team 2, Iteration 2:**
- Worker D: Added signed tokens, rate limiting
- Verifier 2: ACCEPT
  - "The token is signed and time-limited. Rate limiting is in place. Good enough."

**Final Report:**
- Team 1: ACCEPTED (2 iterations, 1 cross-worker issue fixed)
- Team 2: ACCEPTED (2 iterations, 1 security issue fixed)
- Total iterations: 4
- Cross-worker issues: 1 (resolved)
- Security issues: 1 (resolved)
