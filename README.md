# Claude Dynamic Workflow Replica

A replica of Claude's Dynamic Workflows architecture — JavaScript-orchestrated parallel subagents with adversarial verification, state management, and checkpointing.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW SCRIPT (workflow.js)                 │
│  • Declarative: defines WHAT to do, not HOW to orchestrate          │
│  • Uses WorkflowContext API for agent spawning and verification      │
│  • Supports async/await for parallel execution                       │
│  • Automatic checkpointing and state persistence                    │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        WORKFLOW RUNTIME ENGINE                       │
│  • Executes workflow scripts in isolated environment                │
│  • Manages agent pool (up to 16 concurrent, 1000 total)             │
│  • Handles team assembly and verification loops                     │
│  • Automatic checkpointing every 30 seconds                         │
│  • State persistence for resumability                               │
│  • Event emission (JSON lines to stdout)                            │
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

### Dynamic Workflow Scripts
- **JavaScript scripts** define workflow logic declaratively
- **WorkflowContext API** provides agent spawning, verification, and state management
- **Async/await** enables natural parallel execution patterns
- **Automatic checkpointing** enables resumability within same session

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

### State Management & Checkpointing
- Automatic checkpoints every 30 seconds
- State persisted to JSON file for resumability
- Resume workflows from last checkpoint
- Agent pool statistics tracked

### Agent Pool Management
- Up to **16 concurrent agents** running simultaneously
- Up to **1000 total agents** per workflow execution
- 5-minute timeout per agent
- Queue management with automatic slot allocation

## Quick Start

### Generate a Workflow

```bash
# Generate a team-based adversarial workflow
node scripts/workflow-generator.js \
  --pattern team-adversarial \
  --task "Build user auth with JWT, rate limiting, and tests" \
  --output workflow.js

# List available patterns
node scripts/workflow-generator.js --list
```

### Execute a Workflow

```bash
# Run with state persistence and checkpointing
node scripts/workflow-runtime.js workflow.js \
  --state state.json \
  --checkpoint ./checkpoints

# Resume from saved state
node scripts/workflow-runtime.js workflow.js --state state.json
```

### Monitor Progress

```bash
# Pipe events to monitor
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

## Workflow Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| `team-adversarial` | Team-based with adversarial verifiers | Quality-critical features |
| `parallel-fanout` | Parallel agents, merge results | Research, data gathering |
| `sequential` | Sequential pipeline with gates | Dependent tasks, migrations |
| `research-build` | Research → Build → Verify | New features, unfamiliar code |
| `audit` | Multi-angle code audit | Code reviews, pre-deployment |
| `migration` | Parallel migration with rollback | Database migrations, refactors |

## WorkflowContext API

```javascript
module.exports = async function workflow(ctx) {
  // Spawn single agent
  const result = await ctx.spawnAgent('builder', { task: '...' });

  // Spawn multiple agents in parallel
  const results = await ctx.spawnAgents([
    { type: 'explorer', task: 'Research...', id: 'research' },
    { type: 'builder', task: 'Build...', id: 'build' }
  ]);

  // Run teams with adversarial verification
  const report = await ctx.runTeams([
    {
      id: 'team-1',
      workers: [
        { id: 'worker-a', task: 'API', type: 'builder' },
        { id: 'worker-b', task: 'UI', type: 'builder' }
      ],
      verifier: { id: 'verifier-1', scope: 'full' }
    }
  ]);

  // Verify a result
  const verification = await ctx.verify(result, { scope: 'full' });

  // Save checkpoint
  ctx.checkpoint();

  // Get state
  const state = ctx.getState();

  // Report progress
  ctx.reportProgress();

  return report;
};
```

## Files

| File | Purpose |
|------|---------|
| `scripts/workflow-runtime.js` | JavaScript execution engine |
| `scripts/workflow-generator.js` | Script generation from patterns |
| `skills/auto-verify-loop/SKILL.md` | Core skill with adversarial convergence |
| `docs/AUTO_VERIFY_PROTOCOL.md` | Full adversarial verification protocol |
| `docs/DYNAMIC_WORKFLOWS_PROTOCOL.md` | Dynamic workflows protocol reference |

## When to Use

- Multiple independent tasks that benefit from parallel execution
- Quality matters more than speed
- Tasks have clear acceptance criteria
- Complex tasks that need multiple agents working different aspects
- Need state persistence and resumability
- Want automatic checkpointing

## When NOT to Use

- Single trivial task (use DIRECT mode)
- Exploratory work with no clear target
- User wants quick draft, not production code
- Tasks with heavy interdependencies (can't parallelize)

## Integration

This skill integrates with:

- **OpenCode** — Primary platform for skill execution
- **Claude Code** — Compatible via skill system
-
