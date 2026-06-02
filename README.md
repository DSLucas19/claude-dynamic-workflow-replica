# Claude Dynamic Workflow Replica

A replica of Claude Opus 4.8's dynamic workflow architecture — team-based adversarial convergence with parallel workers and dedicated verifiers.

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

## Key Concepts

### Team-Based Architecture
- Each team = multiple workers + 1 dedicated verifier
- Sweet spot between 1 global verifier bottleneck and per-agent verifiers
- Teams iterate independently in parallel — no team blocks another

### Adversarial Verification
- Verifiers actively try to **REFUTE** and **BREAK** work, not just passively check
- Assumes every edge case will blow up in production
- Treats "it works on my machine" as a lie
- Finds problems in solutions, then finds problems in the fixes

### Per-Team Convergence
- Each team iterates until their verifier ACCEPTS
- Loop cap: 5 iterations per team, then force-accept with WARNING
- Unresolved issues are flagged for manual review

### Cross-Worker Consistency
- Verifier checks interfaces, data contracts, and conflicts between workers
- Catches integration issues before they reach production

## Files

- **`skills/auto-verify-loop/SKILL.md`** — Core skill file with team-based adversarial convergence architecture
- **`docs/AUTO_VERIFY_PROTOCOL.md`** — Full protocol documentation for adversarial convergence

## Usage

### Trigger

```
/auto-verify <task description>
```

### Example

```
/auto-verify Build a user authentication system with JWT tokens, 
             rate limiting, and comprehensive test coverage
```

### What Happens

1. **Orchestrator** decomposes task into logical teams
2. **Teams** are dispatched in parallel with dedicated verifiers
3. **Workers** implement their assigned scope
4. **Verifiers** actively try to BREAK and REFUTE the work
5. **Teams** iterate until convergence (verifier ACCEPTS)
6. **Orchestrator** synthesizes final report

## When to Use

- Multiple independent tasks that benefit from parallel execution
- Quality matters more than speed
- Tasks have clear acceptance criteria
- Complex tasks that need multiple agents working different aspects

## When NOT to Use

- Single trivial task (use DIRECT mode)
- Exploratory work with no clear target
- User wants quick draft, not production code
- Tasks with heavy interdependencies (can't parallelize)

## Integration

This skill integrates with:

- **OpenCode** — Primary platform for skill execution
- **Claude Code** — Compatible via skill system
- **Gemini CLI** — Compatible via skill activation

## Inspired By

- Claude Opus 4.8's dynamic workflow architecture
- Adversarial verification patterns
- Team-based parallel execution models

## License

MIT
