# Dynamic Workflows v2.0 — Design Spec

**Date:** 2026-06-04
**Status:** Approved
**Scope:** Core runtime scripts, OpenTUI dashboard, agent memory, advanced patterns, performance optimizations

---

## Overview

Upgrade the Dynamic Workflows system with:
1. **Core runtime scripts** (workflow-runtime.js, workflow-generator.js) — missing from repo
2. **OpenTUI dashboard** — native TUI via `/workflow` slash command
3. **Agent memory** — shared context within single workflow run (isolated per run)
4. **Advanced patterns** — conditional branching, loops, sub-workflows, error recovery
5. **Performance optimizations** — agent pooling, caching, parallel verification

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    /workflow SLASH COMMAND                           │
│                    (OpenTUI Dashboard)                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  MONITOR    │  │  INTERACT   │  │   MEMORY    │  │  PATTERNS │ │
│  │  Panel      │  │  Panel      │  │  Panel      │  │  Panel    │ │
│  │             │  │             │  │             │  │           │ │
│  │ • Agents    │  │ • Start     │  │ • Context   │  │ • Branch  │ │
│  │ • Teams     │  │ • Stop      │  │ • Shared    │  │ • Loop    │ │
│  │ • Progress  │  │ • Pause     │  │   State     │  │ • Sub-wf  │ │
│  │ • Events    │  │ • Approve   │  │ • History   │  │ • Recover │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WORKFLOW RUNTIME ENGINE                           │
│  • Agent Pool Manager (16 concurrent, 1000 total)                   │
│  • State Manager (within-workflow memory)                           │
│  • Pattern Engine (branching, loops, sub-workflows)                 │
│  • Performance Layer (pooling, caching, parallel verification)      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
claude-dynamic-workflow-replica/
├── scripts/
│   ├── workflow-runtime.js          # Core runtime engine
│   ├── workflow-generator.js        # Script generation helper
│   └── workflow-tui.js              # OpenTUI dashboard
├── skills/
│   └── workflow-tui/
│       └── SKILL.md                 # Slash command definition
├── docs/
│   ├── DYNAMIC_WORKFLOWS_PROTOCOL.md
│   └── TUI_DASHBOARD.md
└── README.md
```

---

## Component Details

### 1. Core Runtime Scripts

#### workflow-runtime.js

**Purpose:** Execute workflow scripts with agent pool management, state persistence, and event emission.

**Classes:**
- `WorkflowRuntime` — Main entry point, executes workflow scripts
- `WorkflowContext` — API for workflow scripts (spawnAgent, runTeams, verify, etc.)
- `TeamManager` — Manages team assembly and verification loops
- `AgentPool` — Manages concurrent agents (16 max concurrent, 1000 max total)
- `StateManager` — Within-workflow memory (isolated per run)
- `WorkflowEventBus` — Event emission (JSON lines to stdout)

**CLI:**
```bash
node scripts/workflow-runtime.js workflow.js --state state.json --checkpoint ./checkpoints
```

**Exports:**
```javascript
module.exports = {
  WorkflowRuntime,
  WorkflowContext,
  TeamManager,
  AgentPool,
  StateManager,
  WorkflowEventBus
};
```

#### workflow-generator.js

**Purpose:** Generate workflow scripts from task descriptions.

**Patterns:**
- `team-adversarial` — Team-based with adversarial verifiers
- `parallel-fanout` — Parallel agents, merge results
- `sequential` — Sequential pipeline with gates
- `research-build` — Research → Build → Verify
- `audit` — Multi-angle code audit
- `migration` — Parallel migration with rollback

**CLI:**
```bash
node scripts/workflow-generator.js --pattern team-adversarial --task "Build auth" --output workflow.js
```

---

### 2. OpenTUI Dashboard

**Purpose:** Native TUI for monitoring and controlling workflows.

**Technology:** `@opentui/core` with Bun runtime.

**Slash Command:** `/workflow`

**Launch:**
```bash
bun scripts/workflow-tui.js [workflow-script.js] [--state state.json]
```

**Layout:**
```
┌─────────────────────────────────────────────────────────────────────┐
│  DYNAMIC WORKFLOWS v2.0                    [P]ause [S]top [Q]uit   │
├─────────────────────────────────────────────────────────────────────┤
│  WORKFLOW: Build Auth System                    Status: RUNNING     │
│  Pattern: team-adversarial                      Elapsed: 2m 34s    │
├─────────────────────────────────────────────────────────────────────┤
│  TEAMS                          │  AGENTS                         │
│  ┌───────────────────────────── │ ────────────────────────────────┐│
│  │ ● team-auth (CONVERGED)     │ │ ⚡ backend-builder   COMPLETE ││
│  │   ├─ worker-a    ✅         │ │ ⚡ frontend-builder  RUNNING  ││
│  │   ├─ worker-b    ✅         │ │ 🔍 auth-verifier    RUNNING  ││
│  │   └─ verifier-1  ✅         │ │ 🔍 security-scan    PENDING  ││
│  │                              │ │                               ││
│  │ ○ team-api (RUNNING)        │ │                               ││
│  │   ├─ worker-c    🔄         │ │                               ││
│  │   └─ verifier-2  ⏳         │ │                               ││
│  └───────────────────────────── │ ────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  SHARED MEMORY                                                      │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │ auth_tokens: { jwt_secret: "***", expiry: "24h" }              ││
│  │ api_endpoints: ["/login", "/register", "/refresh"]             ││
│  │ test_results: { passed: 12, failed: 0 }                       ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  EVENTS                          │  CONTROLS                       │
│  ┌───────────────────────────── │ ────────────────────────────────┐│
│  │ 12:34:05 worker-a COMPLETE  │ │ [A]pprove  [R]eject  [P]ause ││
│  │ 12:34:02 team-auth ASSEMBLE │ │ [N]ext team  [E]vents log    ││
│  │ 12:33:58 workflow START     │ │                               ││
│  └───────────────────────────── │ ────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

**Keyboard Shortcuts:**
- `A` — Approve current verification
- `R` — Reject current verification
- `P` — Pause/Resume workflow
- `S` — Stop workflow
- `N` — Skip to next team
- `E` — Toggle events log
- `Q` — Quit (with confirmation)
- `Tab` — Switch between panels
- `↑/↓` — Navigate lists

**Panels:**
1. **Monitor Panel** — Real-time agent/team status, progress bars
2. **Interact Panel** — Start/stop/pause, approve/reject verifications
3. **Memory Panel** — View shared state within workflow
4. **Patterns Panel** — Active pattern info, branching/loop status

---

### 3. Agent Memory (Within-Workflow)

**Scope:** Shared context within a single workflow run. Fresh for each new workflow.

**API:**
```javascript
// In WorkflowContext
ctx.setMemory(key, value)    // Set shared state
ctx.getMemory(key)           // Read shared state
ctx.getMemoryKeys()          // List all keys
ctx.deleteMemory(key)        // Delete key
ctx.clearMemory()            // Clear all memory
```

**Isolation:**
- Memory is scoped to the workflow run
- Different workflow runs have completely isolated memory
- Memory persists across checkpoints within a run
- Memory is lost when workflow completes or is stopped

**Example:**
```javascript
module.exports = async function workflow(ctx) {
  // Set shared config
  ctx.setMemory('auth_config', { secret: '...', expiry: '24h' });
  
  // Spawn agent that reads shared state
  const result = await ctx.spawnAgent('builder', {
    task: 'Build auth middleware',
    // Agent can call ctx.getMemory('auth_config')
  });
  
  // Memory persists across checkpoints
  ctx.checkpoint();
  
  // All agents in this workflow share the same memory
  // But a different workflow run would have its own isolated memory
};
```

---

### 4. Advanced Patterns

#### Conditional Branching

```javascript
module.exports = async function workflow(ctx) {
  const research = await ctx.spawnAgent('explorer', { task: 'Research...' });
  
  // Branch based on agent result
  if (research.score < 0.8) {
    // Spawn fixer agent
    await ctx.spawnAgent('builder', { task: 'Fix issues found...' });
  } else {
    // Proceed with implementation
    await ctx.spawnAgent('builder', { task: 'Implement...' });
  }
};
```

#### Loops

```javascript
module.exports = async function workflow(ctx) {
  let iteration = 0;
  const maxIterations = 5;
  
  while (iteration < maxIterations) {
    const result = await ctx.spawnAgent('builder', { task: 'Refine...' });
    
    if (result.quality >= 0.9) {
      break; // Exit loop when quality threshold met
    }
    
    iteration++;
    ctx.setMemory('iteration', iteration);
    ctx.checkpoint();
  }
};
```

#### Sub-Workflows

```javascript
module.exports = async function workflow(ctx) {
  // Run audit as sub-workflow
  const auditResult = await ctx.runSubWorkflow('audit-workflow.js', {
    task: 'Audit auth system',
    scope: 'full'
  });
  
  // Use results in main workflow
  if (auditResult.issues.length > 0) {
    await ctx.spawnAgent('builder', { task: 'Fix audit issues...' });
  }
};
```

#### Error Recovery

```javascript
module.exports = async function workflow(ctx) {
  try {
    const result = await ctx.spawnAgent('builder', { task: 'Risky operation...' });
  } catch (error) {
    // Fallback strategy
    ctx.setMemory('error', error.message);
    await ctx.spawnAgent('builder', { task: 'Safe fallback...' });
  }
  
  // Circuit breaker pattern
  const failures = ctx.getMemory('failure_count') || 0;
  if (failures >= 3) {
    ctx.setMemory('circuit_breaker', 'open');
    return { status: 'circuit_breaker_open', failures };
  }
};
```

---

### 5. Performance Optimizations

#### Agent Pooling

```javascript
// Agents are reused from pool when possible
const pool = new AgentPool({
  maxConcurrent: 16,
  maxTotal: 1000,
  timeout: 300000, // 5 minutes
  reuse: true      // Reuse completed agents
});
```

#### Result Caching

```javascript
// Cache expensive operations
const cachedResult = await ctx.cached('expensive-op', async () => {
  return await expensiveOperation();
});
// Subsequent calls return cached result
```

#### Parallel Verification

```javascript
// Verify multiple results in parallel
const results = await ctx.spawnAgents([
  { type: 'builder', task: 'Task A' },
  { type: 'builder', task: 'Task B' },
  { type: 'builder', task: 'Task C' }
]);

// All verifications run in parallel
const verifications = await ctx.verifyAll(results, { scope: 'full' });
```

---

## TUI Dashboard Integration

### Skill Definition

**File:** `skills/workflow-tui/SKILL.md`

```markdown
# Workflow TUI Dashboard

Launch interactive TUI dashboard for monitoring and controlling workflows.

## Usage

/workflow [workflow-script.js] [--state state.json]

## Features

- Real-time monitoring of agents and teams
- Interactive controls (start/stop/pause, approve/reject)
- Shared memory visualization
- Pattern status display
- Event log with filtering
```

### Launch Command

```bash
# From repo root
bun scripts/workflow-tui.js workflow.js --state state.json

# Or via slash command in OpenCode
/workflow workflow.js --state state.json
```

---

## Implementation Order

1. **Core runtime scripts** (workflow-runtime.js, workflow-generator.js)
2. **Agent memory** (within-workflow shared state)
3. **Advanced patterns** (branching, loops, sub-workflows, error recovery)
4. **Performance optimizations** (pooling, caching, parallel verification)
5. **OpenTUI dashboard** (workflow-tui.js + skill definition)
6. **Documentation** (TUI_DASHBOARD.md, updated README)

---

## Success Criteria

- [ ] Core runtime scripts execute workflow scripts correctly
- [ ] Agent pool manages 16 concurrent agents with 1000 total limit
- [ ] State persistence and checkpointing works across interruptions
- [ ] Agent memory is isolated per workflow run
- [ ] Conditional branching executes correct paths
- [ ] Loops terminate on condition or max iterations
- [ ] Sub-workflows execute and return results
- [ ] Error recovery handles failures gracefully
- [ ] Agent pooling reuses completed agents
- [ ] Result caching avoids redundant computations
- [ ] Parallel verification runs multiple verifications concurrently
- [ ] OpenTUI dashboard displays real-time status
- [ ] Interactive controls (approve/reject/pause) work in TUI
- [ ] `/workflow` slash command launches dashboard
- [ ] All patterns (team-adversarial, parallel-fanout, etc.) work

---

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| OpenTUI requires Bun | Document Bun installation, provide fallback CLI mode |
| TUI complexity | Start with basic monitor, add interactive features incrementally |
| Memory leaks in long runs | Implement memory size limits, periodic cleanup |
| Pattern complexity | Keep patterns simple, provide clear examples |
| Performance overhead | Profile and optimize hot paths, use worker threads |

---

## Open Questions

None — design approved by user.
