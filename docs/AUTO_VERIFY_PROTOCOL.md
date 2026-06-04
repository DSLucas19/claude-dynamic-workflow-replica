# Auto-Verify: Team-Based Adversarial Convergence Protocol

## Overview

The auto-verify loop is a team-based adversarial convergence pattern inspired
by Claude Opus 4.8's dynamic workflow architecture. Tasks are decomposed into
teams, each with multiple workers and 1 dedicated verifier. Teams run in
parallel, and each verifier actively tries to BREAK and REFUTE their team's
work until convergence is reached.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                            ORCHESTRATOR                              │
│  • Decomposes task into N teams (each team = scope + agents)        │
│  • Forms teams based on logical grouping and dependencies           │
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

## Message Formats

### Worker → Verifier: Completion Report

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
- **Test Commands:** [exact commands to run]
- **Expected Outcomes:** [what passing looks like]
- **Manual Checks:** [any browser/UI verification needed]

### Self-Assessment
- **Confidence:** [high/medium/low]
- **Known Concerns:** [anything the worker is unsure about]
- **Edge Cases Considered:** [list of edge cases handled]
- **Edge Cases NOT Considered:** [list of edge cases skipped]

### Plan Alignment
- **Requirements Met:** [checklist]
- **Deviations:** [any deviations from the plan]

### Integration Points
- **Exports/Interfaces:** [what this code exposes for other workers to use]
- **Expected Consumers:** [which other workers in the team might use this]
- **Breaking Changes:** [any changes that might affect other workers]
```

### Verifier → Workers: Team Feedback

```markdown
## Team Verification Feedback

### Team: [Team ID]
### Verdict: [ACCEPT | REJECT]
### Iteration: [current] / [MAX: 5]

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
- [Issue]: [description] — [severity]

### Adversarial Refutation Results
- [Attempt]: [what was tried] — [result: failed/broke it]

### Edge Cases Found
- [Edge case]: [what happens] — [severity]

### Plan Alignment
| Requirement | Implemented | Correct | Status |
|-------------|-------------|---------|--------|

### Required Changes (if REJECT)
1. [Worker X must fix]: [description]

### Tweak Suggestions
1. [Suggestion]

### Verifier's Raw Assessment
[Cynical, unfiltered take]
```

### Worker → Verifier: Rework Report

```markdown
## Rework Report

### Worker: [Worker ID]
### Iteration: [number]
### Previous Verdict: REJECT

### Changes Made
- [Fix]: [what changed]

### Cross-Worker Coordination
- [Issue]: [how it was resolved with other worker]

### Tweak Applications
- [Tweak]: [applied/skipped] — [reasoning]

### Updated Completion Report
[Full updated report]
```

---

## Adversarial Verifier Protocol

The verifier MUST execute this sequence on every iteration:

### Step 1: Run Verification Commands
```
For each worker's "Verification Needed":
1. Execute the command
2. Capture full output
3. Check exit code
4. Count failures
5. Report: PASS/FAIL with evidence
```

### Step 2: Cross-Worker Consistency Check
**THIS IS CRITICAL** — the verifier checks that workers' work is compatible:

```
For each pair of workers in the team:
1. Do their interfaces match? (exports vs imports)
2. Do their data contracts align? (schemas, types)
3. Do their changes conflict? (same files modified)
4. Are there gaps? (Worker A assumes X, Worker B assumes Y)
```

**Cross-worker issues are HIGH severity** — they indicate coordination failures.

### Step 3: Edge Case Hunt (Adversarial)

**Input Edge Cases:**
- [ ] Empty input / null / undefined
- [ ] Zero values
- [ ] Negative values
- [ ] Maximum values / overflow
- [ ] Special characters / injection
- [ ] Unicode / emoji / RTL
- [ ] Very long strings

**State Edge Cases:**
- [ ] Empty state (no data)
- [ ] Loading state
- [ ] Error state
- [ ] Partial state (half-loaded)
- [ ] Concurrent changes
- [ ] Stale state

**Boundary Cases:**
- [ ] Off-by-one
- [ ] Array index boundaries
- [ ] Date boundaries
- [ ] Timezone edge cases
- [ ] Pagination boundaries

**Integration Edge Cases:**
- [ ] Network failure
- [ ] API timeout
- [ ] Rate limiting
- [ ] Auth expiry
- [ ] Permission denied

### Step 4: Plan Alignment Check
```
For each requirement in the team's scope:
1. Is it implemented? YES/NO
2. Is it implemented correctly? YES/NO
3. Does it match the expected behavior? YES/NO
4. Are there deviations? List them.
5. Are deviations justified? Evaluate reasoning.
```

### Step 5: Tweak Suggestions
Even if the code passes all tests, the verifier MUST suggest tweaks:
- Code style improvements
- Performance optimizations
- Better error messages
- More descriptive variable names
- Missing documentation
- Accessibility improvements
- Security hardening

### Step 6: Adversarial Refutation Attempts
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

### Step 7: Verdict

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

## Loop State Machine (Per Team)

```
                    ┌──────────────┐
                    │   PENDING    │
                    └──────┬───────┘
                           │ workers start
                           ▼
                    ┌──────────────┐
                    │ IN_PROGRESS  │◄─────────────┐
                    └──────┬───────┘              │
                           │ workers present      │
                           ▼                      │
                    ┌──────────────┐              │
                    │   REVIEWING  │              │
                    └──────┬───────┘              │
                           │                      │
              ┌────────────┴────────────┐         │
              │                         │         │
              ▼                         ▼         │
       ┌─────────────┐          ┌─────────────┐   │
       │   ACCEPTED   │          │   REJECTED   │───┘
       └─────────────┘          └──────┬──────┘
                                       │
                                       │ iteration < 5?
                                       ▼
                                ┌─────────────┐
                                │ REWORKING    │
                                └──────┬──────┘
                                       │
                                       └──► IN_PROGRESS

       If iteration == 5 on REJECT:
       ┌─────────────────────┐
       │  FORCE-ACCEPTED     │
       │  (with warnings)    │
       └─────────────────────┘
```

---

## Loop Cap Handling (Per Team)

When a team's iteration count reaches 5:

1. Verifier compiles list of UNRESOLVED issues
2. Verifier writes WARNING-level assessment
3. Team's work is FORCE-ACCEPTED with warnings
4. Unresolved issues are flagged for future sessions
5. Orchestrator is notified of force-accept

The force-accept report MUST include:
- All unresolved issues
- Risk assessment (what will break in production)
- Recommended priority for future fixes

---

## Final Report to Orchestrator

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

## Verifier Personality Guidelines

### DO:
- Assume everything is broken
- Test the worst-case scenario
- Find the edge case that will cause a 3am incident
- Question every design decision
- Suggest improvements even when code passes
- Be brutally honest about quality
- Treat "it works" as "it works until it doesn't"
- **Actively try to REFUTE** — not just verify, but disprove
- **Check cross-worker consistency** — catch coordination failures

### DON'T:
- Be polite or encouraging
- Accept "close enough"
- Skip edge cases because "unlikely"
- Trust the worker's self-assessment
- Sugarcoat problems
- Accept tests that don't actually verify behavior
- Let style issues slide just because the code works
- Ignore cross-worker conflicts

### Voice Examples:
- "You tested the happy path. What happens when the input is null?"
- "This works for 3 items. What about 3,000? What about 0?"
- "You hardcoded the URL. In 2025. Really."
- "The test passes. The test is also meaningless."
- "This doesn't follow the plan. Did you read the plan?"
- "A try-catch that swallows everything is not error handling."
- "Nice UI. Does it work on mobile? With a screen reader? With keyboard nav?"
- "Worker A changed the API contract. Worker B is still using the old one. Did anyone talk to anyone?"

---

## Integration Points

### With Orchestrator
- Orchestrator forms teams based on task decomposition
- Orchestrator dispatches teams in parallel
- Orchestrator handles re-dispatch on REJECT (per team)
- Orchestrator enforces loop cap (per team)
- Orchestrator collects final report from all team verifiers

### With Ultra-Work
- Auto-verify can be used as the verification phase within ultra-work
- Each ultra-work task can go through the auto-verify loop
- Loop state is tracked alongside ultra-work progress

### With Verification-Before-Completion
- Auto-verify subsumes verification-before-completion
- The verifier's adversarial refutation is more thorough than standard verification
- The feedback loop ensures issues are actually fixed

---


### With Dynamic Workflows
- Auto-verify integrates with the Dynamic Workflow Runtime for JavaScript-orchestrated execution
- Workflow scripts can be generated from task descriptions using the workflow generator
- State persistence enables resumable verification loops across sessions
- Automatic checkpointing saves progress every 30 seconds
- Agent pool management supports up to 16 concurrent agents and 1000 total agents
- Event monitoring provides real-time progress via JSON line events
- WorkflowContext API provides `spawnAgent`, `spawnAgents`, `runTeams`, `verify`, `checkpoint` methods
- Available patterns: `team-adversarial`, `parallel-fanout`, `sequential`, `research-build`, `audit`, `migration`

#### Example: Dynamic Workflow with Auto-Verify

```bash
# Generate team-based adversarial workflow
node scripts/workflow-generator.js \
  --pattern team-adversarial \
  --task "Build user auth with JWT" \
  --output workflow.js

# Execute with state persistence
node scripts/workflow-runtime.js workflow.js \
  --state state.json \
  --checkpoint ./checkpoints

# Monitor progress
node scripts/workflow-runtime.js workflow.js 2>/dev/null | while read -r line; do
  type=$(echo "$line" | jq -r '.type')
  case "$type" in
    task_start) echo "Agent started: $(echo "$line" | jq -r '.agentId')" ;;
    task_complete) echo "Agent completed: $(echo "$line" | jq -r '.agentId')" ;;
    verification_round) echo "Verification: $(echo "$line" | jq -r '.verdict')" ;;
    checkpoint) echo "Checkpoint saved" ;;
  esac
done
```

#### Example: Workflow Script with Auto-Verify

```javascript
module.exports = async function workflow(ctx) {
  // Research phase
  const research = await ctx.spawnAgent('explorer', {
    task: 'Research codebase for auth patterns...'
  });
  ctx.checkpoint();

  // Implementation phase with teams
  const report = await ctx.runTeams([
    {
      id: 'auth-team',
      workers: [
        { id: 'backend', task: 'JWT middleware', type: 'builder' },
        { id: 'frontend', task: 'Login component', type: 'builder' }
      ],
      verifier: { id: 'auth-verifier', scope: 'full' }
    }
  ]);

  // Final verification
  const verification = await ctx.verify(report, { scope: 'full' });
  ctx.checkpoint();

  return { research, implementation: report, verification };
};
```

---

## Failure Modes

### Worker Stuck
- If worker fails to present completion report after dispatch → re-dispatch with reminder
- If worker presents same work without changes → escalate to orchestrator

### Verifier Stuck
- If verifier rejects with same issues repeatedly → check if issues are actually fixable
- If verifier and workers disagree → escalate to orchestrator for decision

### Loop Cap Reached
- Force-accept with warnings
- Flag unresolved issues for future sessions
- Do NOT silently accept — always document what's broken

### Fundamental Design Flaw
- If verifier identifies that the task itself is wrong → STOP loop
- Report to orchestrator: "This task needs to be redesigned, not reworked"
- Do not waste iterations on a fundamentally broken approach

### Cross-Worker Conflict
- If workers cannot resolve interface/contract conflicts → escalate to orchestrator
- If workers have fundamentally different assumptions → stop, clarify requirements