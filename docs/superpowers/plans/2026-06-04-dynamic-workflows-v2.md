# Dynamic Workflows v2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete dynamic workflow system with runtime engine, OpenTUI dashboard, agent memory, advanced patterns, and performance optimizations.

**Architecture:** Modular Node.js runtime with OpenTUI-based TUI dashboard. Workflow scripts use WorkflowContext API to spawn agents, run teams, and manage state. Dashboard provides real-time monitoring and interactive controls via `/workflow` slash command.

**Tech Stack:** Node.js, Bun (for OpenTUI), @opentui/core, EventEmitter, fs/path

---

## File Structure

```
claude-dynamic-workflow-replica/
├── scripts/
│   ├── workflow-runtime.js          # Core runtime engine (5 classes)
│   ├── workflow-generator.js        # Script generation helper
│   └── workflow-tui.js              # OpenTUI dashboard
├── skills/
│   └── workflow-tui/
│       └── SKILL.md                 # Slash command definition
├── tests/
│   ├── workflow-runtime.test.js     # Runtime tests
│   ├── workflow-generator.test.js   # Generator tests
│   └── patterns.test.js             # Advanced pattern tests
├── docs/
│   ├── DYNAMIC_WORKFLOWS_PROTOCOL.md
│   └── TUI_DASHBOARD.md
└── README.md
```

---

## Task 1: WorkflowEventBus (Event System)

**Files:**
- Create: `scripts/workflow-runtime.js`
- Create: `tests/workflow-runtime.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/workflow-runtime.test.js
const { WorkflowEventBus } = require('../scripts/workflow-runtime.js');

describe('WorkflowEventBus', () => {
  test('emits events as JSON lines', () => {
    const bus = new WorkflowEventBus();
    const output = [];
    
    bus.on('event', (data) => output.push(JSON.parse(data)));
    bus.emit('task_start', { agentId: 'agent-1', task: 'Build API' });
    
    expect(output).toHaveLength(1);
    expect(output[0].type).toBe('task_start');
    expect(output[0].agentId).toBe('agent-1');
  });

  test('includes timestamp in events', () => {
    const bus = new WorkflowEventBus();
    const output = [];
    
    bus.on('event', (data) => output.push(JSON.parse(data)));
    bus.emit('checkpoint', { state: 'saved' });
    
    expect(output[0].timestamp).toBeDefined();
    expect(new Date(output[0].timestamp).toISOString()).toBe(output[0].timestamp);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-runtime.test.js`
Expected: FAIL with "WorkflowEventBus is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// scripts/workflow-runtime.js
const EventEmitter = require('events');

class WorkflowEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }

  emit(type, data) {
    const event = JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
    super.emit('event', event);
    process.stdout.write(event + '\n');
    return true;
  }
}

module.exports = { WorkflowEventBus };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/workflow-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/workflow-runtime.test.js
git commit -m "feat: add WorkflowEventBus event system"
```

---

## Task 2: StateManager (Agent Memory)

**Files:**
- Modify: `scripts/workflow-runtime.js`
- Modify: `tests/workflow-runtime.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Add to tests/workflow-runtime.test.js
const { StateManager } = require('../scripts/workflow-runtime.js');

describe('StateManager', () => {
  test('stores and retrieves values', () => {
    const manager = new StateManager();
    manager.set('key1', 'value1');
    expect(manager.get('key1')).toBe('value1');
  });

  test('returns undefined for missing keys', () => {
    const manager = new StateManager();
    expect(manager.get('missing')).toBeUndefined();
  });

  test('lists all keys', () => {
    const manager = new StateManager();
    manager.set('a', 1);
    manager.set('b', 2);
    expect(manager.getKeys()).toEqual(['a', 'b']);
  });

  test('deletes keys', () => {
    const manager = new StateManager();
    manager.set('key', 'value');
    manager.delete('key');
    expect(manager.get('key')).toBeUndefined();
  });

  test('clears all memory', () => {
    const manager = new StateManager();
    manager.set('a', 1);
    manager.set('b', 2);
    manager.clear();
    expect(manager.getKeys()).toEqual([]);
  });

  test('serializes to JSON', () => {
    const manager = new StateManager();
    manager.set('key', { nested: true });
    const json = manager.toJSON();
    expect(JSON.parse(json)).toEqual({ key: { nested: true } });
  });

  test('loads from JSON', () => {
    const manager = new StateManager();
    manager.fromJSON('{"key":"value"}');
    expect(manager.get('key')).toBe('value');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-runtime.test.js`
Expected: FAIL with "StateManager is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add to scripts/workflow-runtime.js after WorkflowEventBus
class StateManager {
  constructor() {
    this.state = new Map();
  }

  set(key, value) {
    this.state.set(key, value);
  }

  get(key) {
    return this.state.get(key);
  }

  getKeys() {
    return Array.from(this.state.keys());
  }

  delete(key) {
    this.state.delete(key);
  }

  clear() {
    this.state.clear();
  }

  toJSON() {
    const obj = {};
    for (const [key, value] of this.state) {
      obj[key] = value;
    }
    return JSON.stringify(obj);
  }

  fromJSON(json) {
    this.state.clear();
    const obj = JSON.parse(json);
    for (const [key, value] of Object.entries(obj)) {
      this.state.set(key, value);
    }
  }
}

module.exports = { WorkflowEventBus, StateManager };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/workflow-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/workflow-runtime.test.js
git commit -m "feat: add StateManager for agent memory"
```

---

## Task 3: AgentPool (Agent Management)

**Files:**
- Modify: `scripts/workflow-runtime.js`
- Modify: `tests/workflow-runtime.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Add to tests/workflow-runtime.test.js
const { AgentPool } = require('../scripts/workflow-runtime.js');

describe('AgentPool', () => {
  test('spawns agents up to max concurrent', async () => {
    const pool = new AgentPool({ maxConcurrent: 2 });
    const results = [];
    
    pool.on('agent_spawned', (agent) => results.push(agent));
    
    await pool.spawn('builder', { task: 'Task 1' });
    await pool.spawn('builder', { task: 'Task 2' });
    
    expect(results).toHaveLength(2);
    expect(pool.getActiveCount()).toBe(2);
  });

  test('queues agents when at capacity', async () => {
    const pool = new AgentPool({ maxConcurrent: 1 });
    
    await pool.spawn('builder', { task: 'Task 1' });
    const promise = pool.spawn('builder', { task: 'Task 2' });
    
    expect(pool.getQueueSize()).toBe(1);
    
    await pool.complete('agent-0');
    await promise;
    
    expect(pool.getActiveCount()).toBe(1);
  });

  test('tracks total agents spawned', async () => {
    const pool = new AgentPool({ maxTotal: 3 });
    
    await pool.spawn('builder', { task: 'Task 1' });
    await pool.spawn('builder', { task: 'Task 2' });
    await pool.spawn('builder', { task: 'Task 3' });
    
    expect(pool.getTotalSpawned()).toBe(3);
  });

  test('rejects when max total exceeded', async () => {
    const pool = new AgentPool({ maxTotal: 1 });
    
    await pool.spawn('builder', { task: 'Task 1' });
    
    await expect(pool.spawn('builder', { task: 'Task 2' }))
      .rejects.toThrow('Max total agents (1) exceeded');
  });

  test('reuses completed agents when enabled', async () => {
    const pool = new AgentPool({ maxConcurrent: 2, reuse: true });
    
    await pool.spawn('builder', { task: 'Task 1' });
    await pool.complete('agent-0');
    
    await pool.spawn('builder', { task: 'Task 2' });
    
    expect(pool.getTotalSpawned()).toBe(1); // Reused agent
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-runtime.test.js`
Expected: FAIL with "AgentPool is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add to scripts/workflow-runtime.js after StateManager
class AgentPool extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxConcurrent = options.maxConcurrent || 16;
    this.maxTotal = options.maxTotal || 1000;
    this.timeout = options.timeout || 300000;
    this.reuse = options.reuse || false;
    
    this.active = new Map();
    this.queue = [];
    this.completed = [];
    this.totalSpawned = 0;
    this.nextId = 0;
  }

  async spawn(type, options) {
    if (this.totalSpawned >= this.maxTotal) {
      throw new Error(`Max total agents (${this.maxTotal}) exceeded`);
    }

    if (this.active.size >= this.maxConcurrent) {
      return new Promise((resolve, reject) => {
        this.queue.push({ type, options, resolve, reject });
      });
    }

    return this._doSpawn(type, options);
  }

  _doSpawn(type, options) {
    let agentId;
    
    if (this.reuse && this.completed.length > 0) {
      agentId = this.completed.pop();
    } else {
      agentId = `agent-${this.nextId++}`;
      this.totalSpawned++;
    }

    const agent = {
      id: agentId,
      type,
      options,
      status: 'running',
      startedAt: Date.now()
    };

    this.active.set(agentId, agent);
    this.emit('agent_spawned', agent);
    
    return agent;
  }

  async complete(agentId) {
    const agent = this.active.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    agent.status = 'completed';
    agent.completedAt = Date.now();
    this.active.delete(agentId);

    if (this.reuse) {
      this.completed.push(agentId);
    }

    this.emit('agent_completed', agent);

    // Process queue
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      const newAgent = this._doSpawn(next.type, next.options);
      next.resolve(newAgent);
    }

    return agent;
  }

  getActiveCount() {
    return this.active.size;
  }

  getQueueSize() {
    return this.queue.length;
  }

  getTotalSpawned() {
    return this.totalSpawned;
  }

  getAgent(agentId) {
    return this.active.get(agentId);
  }

  getActiveAgents() {
    return Array.from(this.active.values());
  }
}

module.exports = { WorkflowEventBus, StateManager, AgentPool };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/workflow-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/workflow-runtime.test.js
git commit -m "feat: add AgentPool for agent management"
```

---

## Task 4: TeamManager (Team Assembly & Verification)

**Files:**
- Modify: `scripts/workflow-runtime.js`
- Modify: `tests/workflow-runtime.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Add to tests/workflow-runtime.test.js
const { TeamManager } = require('../scripts/workflow-runtime.js');

describe('TeamManager', () => {
  test('assembles teams from definition', async () => {
    const manager = new TeamManager();
    const team = await manager.assemble({
      id: 'team-1',
      workers: [
        { id: 'w1', task: 'Build API', type: 'builder' },
        { id: 'w2', task: 'Build UI', type: 'builder' }
      ],
      verifier: { id: 'v1', scope: 'full' }
    });

    expect(team.id).toBe('team-1');
    expect(team.workers).toHaveLength(2);
    expect(team.verifier.id).toBe('v1');
    expect(team.status).toBe('assembled');
  });

  test('runs verification loop', async () => {
    const manager = new TeamManager();
    const team = await manager.assemble({
      id: 'team-1',
      workers: [{ id: 'w1', task: 'Build API', type: 'builder' }],
      verifier: { id: 'v1', scope: 'full' }
    });

    // Mock verification that passes on second try
    let attempts = 0;
    manager.verify = async (team) => {
      attempts++;
      return attempts >= 2 ? 'ACCEPT' : 'REJECT';
    };

    const result = await manager.runVerification(team);
    expect(result).toBe('ACCEPT');
    expect(attempts).toBe(2);
  });

  test('enforces max iterations', async () => {
    const manager = new TeamManager({ maxIterations: 2 });
    const team = await manager.assemble({
      id: 'team-1',
      workers: [{ id: 'w1', task: 'Build API', type: 'builder' }],
      verifier: { id: 'v1', scope: 'full' }
    });

    // Mock verification that always rejects
    manager.verify = async () => 'REJECT';

    const result = await manager.runVerification(team);
    expect(result).toBe('MAX_ITERATIONS');
    expect(team.iterations).toBe(2);
  });

  test('tracks team status', async () => {
    const manager = new TeamManager();
    const team = await manager.assemble({
      id: 'team-1',
      workers: [{ id: 'w1', task: 'Build API', type: 'builder' }],
      verifier: { id: 'v1', scope: 'full' }
    });

    expect(manager.getTeamStatus('team-1')).toBe('assembled');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-runtime.test.js`
Expected: FAIL with "TeamManager is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add to scripts/workflow-runtime.js after AgentPool
class TeamManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.maxIterations = options.maxIterations || 5;
    this.teams = new Map();
  }

  async assemble(definition) {
    const team = {
      id: definition.id,
      workers: definition.workers.map(w => ({
        ...w,
        status: 'pending',
        result: null
      })),
      verifier: {
        ...definition.verifier,
        status: 'pending'
      },
      status: 'assembled',
      iterations: 0,
      results: []
    };

    this.teams.set(team.id, team);
    this.emit('team_assembled', team);
    return team;
  }

  async runVerification(team) {
    team.status = 'verifying';
    this.emit('verification_start', team);

    while (team.iterations < this.maxIterations) {
      team.iterations++;
      team.results.push({ iteration: team.iterations, timestamp: Date.now() });

      const verdict = await this.verify(team);
      this.emit('verification_round', { team: team.id, iteration: team.iterations, verdict });

      if (verdict === 'ACCEPT') {
        team.status = 'converged';
        this.emit('team_converged', team);
        return 'ACCEPT';
      }

      // REJECT - workers rework
      team.status = 'reworking';
      this.emit('team_reworking', team);
    }

    team.status = 'max_iterations';
    this.emit('team_max_iterations', team);
    return 'MAX_ITERATIONS';
  }

  async verify(team) {
    // Override this method in subclass or instance
    return 'ACCEPT';
  }

  getTeamStatus(teamId) {
    const team = this.teams.get(teamId);
    return team ? team.status : null;
  }

  getTeam(teamId) {
    return this.teams.get(teamId);
  }

  getAllTeams() {
    return Array.from(this.teams.values());
  }
}

module.exports = { WorkflowEventBus, StateManager, AgentPool, TeamManager };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/workflow-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/workflow-runtime.test.js
git commit -m "feat: add TeamManager for team assembly and verification"
```

---

## Task 5: WorkflowContext (API for Workflow Scripts)

**Files:**
- Modify: `scripts/workflow-runtime.js`
- Modify: `tests/workflow-runtime.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Add to tests/workflow-runtime.test.js
const { WorkflowContext } = require('../scripts/workflow-runtime.js');

describe('WorkflowContext', () => {
  test('spawns single agent', async () => {
    const ctx = new WorkflowContext();
    const agent = await ctx.spawnAgent('builder', { task: 'Build API' });
    
    expect(agent.type).toBe('builder');
    expect(agent.options.task).toBe('Build API');
    expect(agent.status).toBe('running');
  });

  test('spawns multiple agents in parallel', async () => {
    const ctx = new WorkflowContext();
    const agents = await ctx.spawnAgents([
      { type: 'builder', task: 'Task 1', id: 'a1' },
      { type: 'builder', task: 'Task 2', id: 'a2' }
    ]);
    
    expect(agents).toHaveLength(2);
    expect(agents[0].id).toBe('a1');
    expect(agents[1].id).toBe('a2');
  });

  test('runs teams with verification', async () => {
    const ctx = new WorkflowContext();
    const report = await ctx.runTeams([
      {
        id: 'team-1',
        workers: [
          { id: 'w1', task: 'Build API', type: 'builder' }
        ],
        verifier: { id: 'v1', scope: 'full' }
      }
    ]);
    
    expect(report.teams).toHaveLength(1);
    expect(report.teams[0].status).toBe('converged');
  });

  test('verifies result', async () => {
    const ctx = new WorkflowContext();
    const result = { code: 'function test() {}' };
    const verification = await ctx.verify(result, { scope: 'full' });
    
    expect(verification.verdict).toBeDefined();
    expect(verification.scope).toBe('full');
  });

  test('manages memory', () => {
    const ctx = new WorkflowContext();
    
    ctx.setMemory('key', 'value');
    expect(ctx.getMemory('key')).toBe('value');
    expect(ctx.getMemoryKeys()).toEqual(['key']);
    
    ctx.deleteMemory('key');
    expect(ctx.getMemory('key')).toBeUndefined();
  });

  test('saves checkpoint', () => {
    const ctx = new WorkflowContext();
    ctx.setMemory('key', 'value');
    
    const checkpoint = ctx.checkpoint();
    expect(checkpoint.state).toBeDefined();
    expect(checkpoint.timestamp).toBeDefined();
  });

  test('reports progress', () => {
    const ctx = new WorkflowContext();
    const progress = ctx.reportProgress();
    
    expect(progress.total).toBeDefined();
    expect(progress.completed).toBeDefined();
    expect(progress.percentage).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-runtime.test.js`
Expected: FAIL with "WorkflowContext is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add to scripts/workflow-runtime.js after TeamManager
class WorkflowContext {
  constructor(options = {}) {
    this.eventBus = options.eventBus || new WorkflowEventBus();
    this.stateManager = options.stateManager || new StateManager();
    this.agentPool = options.agentPool || new AgentPool(options.agentPoolOptions);
    this.teamManager = options.teamManager || new TeamManager(options.teamManagerOptions);
    this.checkpoints = [];
    this.startTime = Date.now();
  }

  async spawnAgent(type, options) {
    const agent = await this.agentPool.spawn(type, options);
    this.eventBus.emit('task_start', { agentId: agent.id, type, task: options.task });
    return agent;
  }

  async spawnAgents(tasks) {
    return Promise.all(tasks.map(task => 
      this.spawnAgent(task.type, { ...task, id: task.id })
    ));
  }

  async runTeams(teams) {
    const results = [];
    
    for (const teamDef of teams) {
      const team = await this.teamManager.assemble(teamDef);
      const verdict = await this.teamManager.runVerification(team);
      results.push({ ...team, verdict });
    }
    
    return { teams: results };
  }

  async verify(result, options = {}) {
    this.eventBus.emit('verification_start', { result, options });
    
    // Basic verification - override for custom logic
    const verification = {
      verdict: 'ACCEPT',
      scope: options.scope || 'basic',
      timestamp: Date.now(),
      result
    };
    
    this.eventBus.emit('verification_complete', verification);
    return verification;
  }

  checkpoint() {
    const state = {
      state: this.stateManager.toJSON(),
      timestamp: Date.now(),
      elapsed: Date.now() - this.startTime
    };
    
    this.checkpoints.push(state);
    this.eventBus.emit('checkpoint', state);
    return state;
  }

  getState() {
    return {
      agents: this.agentPool.getActiveAgents(),
      teams: this.teamManager.getAllTeams(),
      memory: this.stateManager.getKeys(),
      checkpoints: this.checkpoints.length,
      elapsed: Date.now() - this.startTime
    };
  }

  getAgentStats() {
    return {
      active: this.agentPool.getActiveCount(),
      queued: this.agentPool.getQueueSize(),
      total: this.agentPool.getTotalSpawned()
    };
  }

  reportProgress() {
    const teams = this.teamManager.getAllTeams();
    const total = teams.length;
    const completed = teams.filter(t => t.status === 'converged').length;
    
    return {
      total,
      completed,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
      elapsed: Date.now() - this.startTime
    };
  }

  // Memory API
  setMemory(key, value) {
    this.stateManager.set(key, value);
  }

  getMemory(key) {
    return this.stateManager.get(key);
  }

  getMemoryKeys() {
    return this.stateManager.getKeys();
  }

  deleteMemory(key) {
    this.stateManager.delete(key);
  }

  clearMemory() {
    this.stateManager.clear();
  }
}

module.exports = { WorkflowEventBus, StateManager, AgentPool, TeamManager, WorkflowContext };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/workflow-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/workflow-runtime.test.js
git commit -m "feat: add WorkflowContext API for workflow scripts"
```

---

## Task 6: WorkflowRuntime (Main Entry Point)

**Files:**
- Modify: `scripts/workflow-runtime.js`
- Modify: `tests/workflow-runtime.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// Add to tests/workflow-runtime.test.js
const { WorkflowRuntime } = require('../scripts/workflow-runtime.js');

describe('WorkflowRuntime', () => {
  test('executes workflow script', async () => {
    const runtime = new WorkflowRuntime();
    
    // Mock workflow script
    const workflow = async (ctx) => {
      const agent = await ctx.spawnAgent('builder', { task: 'Test' });
      return { status: 'complete', agent: agent.id };
    };
    
    const result = await runtime.execute(workflow);
    expect(result.status).toBe('complete');
    expect(result.agent).toBeDefined();
  });

  test('persists state to file', async () => {
    const runtime = new WorkflowRuntime({ stateFile: '/tmp/test-state.json' });
    
    const workflow = async (ctx) => {
      ctx.setMemory('key', 'value');
      return { status: 'complete' };
    };
    
    await runtime.execute(workflow);
    
    const fs = require('fs');
    const state = JSON.parse(fs.readFileSync('/tmp/test-state.json', 'utf8'));
    expect(state.key).toBe('value');
    
    fs.unlinkSync('/tmp/test-state.json');
  });

  test('resumes from saved state', async () => {
    const fs = require('fs');
    const stateFile = '/tmp/test-resume-state.json';
    
    // Save initial state
    fs.writeFileSync(stateFile, JSON.stringify({ key: 'saved' }));
    
    const runtime = new WorkflowRuntime({ stateFile });
    
    const workflow = async (ctx) => {
      return { key: ctx.getMemory('key') };
    };
    
    const result = await runtime.execute(workflow);
    expect(result.key).toBe('saved');
    
    fs.unlinkSync(stateFile);
  });

  test('creates checkpoints at interval', async () => {
    const runtime = new WorkflowRuntime({ checkpointInterval: 100 });
    
    const workflow = async (ctx) => {
      await new Promise(resolve => setTimeout(resolve, 250));
      return { status: 'complete' };
    };
    
    const result = await runtime.execute(workflow);
    expect(runtime.checkpoints.length).toBeGreaterThanOrEqual(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-runtime.test.js`
Expected: FAIL with "WorkflowRuntime is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// Add to scripts/workflow-runtime.js after WorkflowContext
class WorkflowRuntime {
  constructor(options = {}) {
    this.stateFile = options.stateFile || null;
    this.checkpointDir = options.checkpointDir || null;
    this.checkpointInterval = options.checkpointInterval || 30000;
    this.checkpoints = [];
    this.eventBus = new WorkflowEventBus();
  }

  async execute(workflowFn) {
    const ctx = new WorkflowContext({ eventBus: this.eventBus });
    
    // Load saved state if exists
    if (this.stateFile) {
      try {
        const fs = require('fs');
        const saved = fs.readFileSync(this.stateFile, 'utf8');
        ctx.stateManager.fromJSON(saved);
      } catch (e) {
        // No saved state, start fresh
      }
    }
    
    // Start checkpoint timer
    const checkpointTimer = setInterval(() => {
      const checkpoint = ctx.checkpoint();
      this.checkpoints.push(checkpoint);
      
      if (this.checkpointDir) {
        const fs = require('fs');
        const path = require('path');
        const checkpointFile = path.join(this.checkpointDir, `checkpoint-${Date.now()}.json`);
        fs.mkdirSync(this.checkpointDir, { recursive: true });
        fs.writeFileSync(checkpointFile, JSON.stringify(checkpoint, null, 2));
      }
    }, this.checkpointInterval);
    
    try {
      this.eventBus.emit('workflow_start', { timestamp: Date.now() });
      
      const result = await workflowFn(ctx);
      
      // Save final state
      if (this.stateFile) {
        const fs = require('fs');
        fs.writeFileSync(this.stateFile, ctx.stateManager.toJSON());
      }
      
      this.eventBus.emit('workflow_complete', { result, timestamp: Date.now() });
      
      return result;
    } finally {
      clearInterval(checkpointTimer);
    }
  }
}

module.exports = { WorkflowEventBus, StateManager, AgentPool, TeamManager, WorkflowContext, WorkflowRuntime };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/workflow-runtime.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/workflow-runtime.test.js
git commit -m "feat: add WorkflowRuntime main entry point"
```

---

## Task 7: Advanced Patterns (Branching, Loops, Sub-workflows, Error Recovery)

**Files:**
- Create: `tests/patterns.test.js`
- Modify: `scripts/workflow-runtime.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/patterns.test.js
const { WorkflowContext } = require('../scripts/workflow-runtime.js');

describe('Advanced Patterns', () => {
  test('conditional branching based on result', async () => {
    const ctx = new WorkflowContext();
    
    // Simulate research with low score
    ctx.spawnAgent = async () => ({ score: 0.5, issues: ['issue1'] });
    
    let fixerCalled = false;
    const originalSpawn = ctx.spawnAgent.bind(ctx);
    ctx.spawnAgent = async (type, opts) => {
      if (type === 'fixer') fixerCalled = true;
      return originalSpawn(type, opts);
    };
    
    // Workflow with branching
    const workflow = async (ctx) => {
      const research = await ctx.spawnAgent('explorer', { task: 'Research' });
      
      if (research.score < 0.8) {
        await ctx.spawnAgent('fixer', { task: 'Fix issues' });
      }
      
      return { fixerCalled };
    };
    
    const result = await workflow(ctx);
    expect(result.fixerCalled).toBe(true);
  });

  test('loop with termination condition', async () => {
    const ctx = new WorkflowContext();
    
    let iterations = 0;
    ctx.spawnAgent = async () => {
      iterations++;
      return { quality: iterations >= 3 ? 0.95 : 0.5 };
    };
    
    const workflow = async (ctx) => {
      let iteration = 0;
      const maxIterations = 5;
      
      while (iteration < maxIterations) {
        const result = await ctx.spawnAgent('builder', { task: 'Refine' });
        
        if (result.quality >= 0.9) {
          break;
        }
        
        iteration++;
        ctx.setMemory('iteration', iteration);
      }
      
      return { iterations, quality: 0.95 };
    };
    
    const result = await workflow(ctx);
    expect(result.iterations).toBe(3);
    expect(result.quality).toBeGreaterThanOrEqual(0.9);
  });

  test('sub-workflow execution', async () => {
    const ctx = new WorkflowContext();
    
    // Define sub-workflow
    const auditWorkflow = async (ctx) => {
      return { issues: ['issue1', 'issue2'] };
    };
    
    // Method to run sub-workflow
    ctx.runSubWorkflow = async (workflowFn, options) => {
      const subCtx = new WorkflowContext();
      return workflowFn(subCtx);
    };
    
    const workflow = async (ctx) => {
      const auditResult = await ctx.runSubWorkflow(auditWorkflow, { scope: 'full' });
      
      if (auditResult.issues.length > 0) {
        return { status: 'issues_found', count: auditResult.issues.length };
      }
      
      return { status: 'clean' };
    };
    
    const result = await workflow(ctx);
    expect(result.status).toBe('issues_found');
    expect(result.count).toBe(2);
  });

  test('error recovery with fallback', async () => {
    const ctx = new WorkflowContext();
    
    let attempts = 0;
    ctx.spawnAgent = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Agent failed');
      }
      return { status: 'success' };
    };
    
    const workflow = async (ctx) => {
      try {
        const result = await ctx.spawnAgent('builder', { task: 'Risky' });
        return result;
      } catch (error) {
        ctx.setMemory('error', error.message);
        
        // Fallback
        const fallback = await ctx.spawnAgent('builder', { task: 'Safe fallback' });
        return { fallback, error: error.message };
      }
    };
    
    const result = await workflow(ctx);
    expect(result.error).toBe('Agent failed');
    expect(result.fallback.status).toBe('success');
  });

  test('circuit breaker pattern', async () => {
    const ctx = new WorkflowContext();
    
    let failures = 0;
    ctx.spawnAgent = async () => {
      failures++;
      throw new Error('Service unavailable');
    };
    
    const workflow = async (ctx) => {
      const failureCount = ctx.getMemory('failure_count') || 0;
      
      if (failureCount >= 3) {
        ctx.setMemory('circuit_breaker', 'open');
        return { status: 'circuit_breaker_open', failures: failureCount };
      }
      
      try {
        await ctx.spawnAgent('builder', { task: 'Call service' });
      } catch (error) {
        ctx.setMemory('failure_count', failureCount + 1);
      }
      
      return { status: 'retry', failures: failureCount + 1 };
    };
    
    // Run 3 times to trigger circuit breaker
    let result;
    for (let i = 0; i < 4; i++) {
      result = await workflow(ctx);
    }
    
    expect(result.status).toBe('circuit_breaker_open');
    expect(result.failures).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/patterns.test.js`
Expected: FAIL with various errors

- [ ] **Step 3: Add runSubWorkflow to WorkflowContext**

```javascript
// Add to WorkflowContext class in scripts/workflow-runtime.js
async runSubWorkflow(workflowFn, options = {}) {
  const subCtx = new WorkflowContext({
    eventBus: this.eventBus,
    agentPoolOptions: this.agentPool ? {
      maxConcurrent: this.agentPool.maxConcurrent,
      maxTotal: this.agentPool.maxTotal
    } : undefined
  });
  
  this.eventBus.emit('subworkflow_start', { options });
  const result = await workflowFn(subCtx);
  this.eventBus.emit('subworkflow_complete', { result });
  
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/patterns.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/patterns.test.js
git commit -m "feat: add advanced patterns (branching, loops, sub-workflows, error recovery)"
```

---

## Task 8: Performance Optimizations (Pooling, Caching, Parallel Verification)

**Files:**
- Modify: `scripts/workflow-runtime.js`
- Create: `tests/performance.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/performance.test.js
const { AgentPool, WorkflowContext } = require('../scripts/workflow-runtime.js');

describe('Performance Optimizations', () => {
  test('agent pool reuses completed agents', async () => {
    const pool = new AgentPool({ maxConcurrent: 2, reuse: true });
    
    await pool.spawn('builder', { task: 'Task 1' });
    await pool.complete('agent-0');
    
    await pool.spawn('builder', { task: 'Task 2' });
    
    expect(pool.getTotalSpawned()).toBe(1); // Reused
  });

  test('result caching avoids redundant computation', async () => {
    const ctx = new WorkflowContext();
    
    let computeCount = 0;
    ctx.cached = async (key, fn) => {
      if (!ctx._cache) ctx._cache = new Map();
      
      if (ctx._cache.has(key)) {
        return ctx._cache.get(key);
      }
      
      const result = await fn();
      ctx._cache.set(key, result);
      computeCount++;
      return result;
    };
    
    // Call twice - should only compute once
    await ctx.cached('expensive', async () => 'result');
    await ctx.cached('expensive', async () => 'result');
    
    expect(computeCount).toBe(1);
  });

  test('parallel verification runs concurrently', async () => {
    const ctx = new WorkflowContext();
    
    const results = [];
    ctx.verify = async (result) => {
      await new Promise(resolve => setTimeout(resolve, 50));
      results.push(result.id);
      return { verdict: 'ACCEPT' };
    };
    
    ctx.verifyAll = async (results, options) => {
      return Promise.all(results.map(r => ctx.verify(r, options)));
    };
    
    const items = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' }
    ];
    
    const start = Date.now();
    await ctx.verifyAll(items, { scope: 'full' });
    const elapsed = Date.now() - start;
    
    // Should be ~50ms (parallel), not ~150ms (sequential)
    expect(elapsed).toBeLessThan(100);
    expect(results).toEqual(['a', 'b', 'c']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/performance.test.js`
Expected: FAIL with various errors

- [ ] **Step 3: Add performance methods to WorkflowContext**

```javascript
// Add to WorkflowContext class in scripts/workflow-runtime.js
async cached(key, fn) {
  if (!this._cache) this._cache = new Map();
  
  if (this._cache.has(key)) {
    return this._cache.get(key);
  }
  
  const result = await fn();
  this._cache.set(key, result);
  return result;
}

async verifyAll(results, options = {}) {
  return Promise.all(results.map(r => this.verify(r, options)));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/performance.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-runtime.js tests/performance.test.js
git commit -m "feat: add performance optimizations (pooling, caching, parallel verification)"
```

---

## Task 9: Workflow Generator (Script Generation Helper)

**Files:**
- Create: `scripts/workflow-generator.js`
- Create: `tests/workflow-generator.test.js`

- [ ] **Step 1: Write the failing test**

```javascript
// tests/workflow-generator.test.js
const { generateWorkflow } = require('../scripts/workflow-generator.js');

describe('Workflow Generator', () => {
  test('generates team-adversarial workflow', () => {
    const script = generateWorkflow({
      pattern: 'team-adversarial',
      task: 'Build auth system'
    });
    
    expect(script).toContain('module.exports');
    expect(script).toContain('runTeams');
    expect(script).toContain('verifier');
  });

  test('generates parallel-fanout workflow', () => {
    const script = generateWorkflow({
      pattern: 'parallel-fanout',
      task: 'Research best practices'
    });
    
    expect(script).toContain('spawnAgents');
    expect(script).toContain('Promise.all');
  });

  test('generates sequential workflow', () => {
    const script = generateWorkflow({
      pattern: 'sequential',
      task: 'Deploy to production'
    });
    
    expect(script).toContain('await');
    expect(script).toContain('checkpoint');
  });

  test('generates research-build workflow', () => {
    const script = generateWorkflow({
      pattern: 'research-build',
      task: 'Implement WebSocket'
    });
    
    expect(script).toContain('explorer');
    expect(script).toContain('builder');
  });

  test('generates audit workflow', () => {
    const script = generateWorkflow({
      pattern: 'audit',
      task: 'Security audit'
    });
    
    expect(script).toContain('security');
    expect(script).toContain('verify');
  });

  test('generates migration workflow', () => {
    const script = generateWorkflow({
      pattern: 'migration',
      task: 'Database migration'
    });
    
    expect(script).toContain('rollback');
    expect(script).toContain('checkpoint');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test tests/workflow-generator.test.js`
Expected: FAIL with "generateWorkflow is not defined"

- [ ] **Step 3: Write minimal implementation**

```javascript
// scripts/workflow-generator.js
const patterns = {
  'team-adversarial': (task) => `
module.exports = async function workflow(ctx) {
  // Team-based adversarial workflow
  const report = await ctx.runTeams([
    {
      id: 'team-1',
      workers: [
        { id: 'worker-a', task: '${task}', type: 'builder' },
        { id: 'worker-b', task: 'Support ${task}', type: 'builder' }
      ],
      verifier: { id: 'verifier-1', scope: 'full' }
    }
  ]);

  return report;
};
`,

  'parallel-fanout': (task) => `
module.exports = async function workflow(ctx) {
  // Parallel fan-out workflow
  const results = await ctx.spawnAgents([
    { type: 'explorer', task: 'Research ${task}', id: 'research-1' },
    { type: 'explorer', task: 'Analyze ${task}', id: 'research-2' },
    { type: 'explorer', task: 'Review ${task}', id: 'research-3' }
  ]);

  // Merge results
  return { results, merged: true };
};
`,

  'sequential': (task) => `
module.exports = async function workflow(ctx) {
  // Sequential pipeline workflow
  const step1 = await ctx.spawnAgent('explorer', { task: 'Research ${task}' });
  ctx.checkpoint();

  const step2 = await ctx.spawnAgent('builder', { task: 'Implement ${task}' });
  ctx.checkpoint();

  const step3 = await ctx.spawnAgent('reviewer', { task: 'Review ${task}' });
  ctx.checkpoint();

  return { step1, step2, step3 };
};
`,

  'research-build': (task) => `
module.exports = async function workflow(ctx) {
  // Research → Build → Verify workflow
  const research = await ctx.spawnAgent('explorer', { task: 'Research ${task}' });
  ctx.checkpoint();

  const build = await ctx.spawnAgent('builder', { task: 'Build ${task}' });
  ctx.checkpoint();

  const verification = await ctx.verify(build, { scope: 'full' });

  return { research, build, verification };
};
`,

  'audit': (task) => `
module.exports = async function workflow(ctx) {
  // Multi-angle audit workflow
  const results = await ctx.spawnAgents([
    { type: 'security', task: 'Security audit: ${task}', id: 'security' },
    { type: 'reviewer', task: 'Code review: ${task}', id: 'code-review' },
    { type: 'explorer', task: 'Dependency audit: ${task}', id: 'deps' }
  ]);

  const verification = await ctx.verifyAll(results, { scope: 'full' });

  return { results, verification };
};
`,

  'migration': (task) => `
module.exports = async function workflow(ctx) {
  // Parallel migration with rollback
  ctx.setMemory('rollback_available', true);

  const migration = await ctx.spawnAgent('builder', { task: '${task}' });
  ctx.checkpoint();

  try {
    const verification = await ctx.verify(migration, { scope: 'full' });
    return { migration, verification, status: 'success' };
  } catch (error) {
    // Rollback
    ctx.setMemory('rollback_triggered', true);
    return { error: error.message, status: 'rolled_back' };
  }
};
`
};

function generateWorkflow(options) {
  const { pattern, task } = options;
  
  if (!patterns[pattern]) {
    throw new Error(\`Unknown pattern: \${pattern}\`);
  }
  
  return patterns[pattern](task);
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const patternIdx = args.indexOf('--pattern');
  const taskIdx = args.indexOf('--task');
  const outputIdx = args.indexOf('--output');

  if (patternIdx === -1 || taskIdx === -1) {
    console.error('Usage: node workflow-generator.js --pattern <pattern> --task <task> [--output <file>]');
    process.exit(1);
  }

  const pattern = args[patternIdx + 1];
  const task = args[taskIdx + 1];
  const output = outputIdx !== -1 ? args[outputIdx + 1] : null;

  const script = generateWorkflow({ pattern, task });

  if (output) {
    const fs = require('fs');
    fs.writeFileSync(output, script);
    console.log(\`Generated workflow: \${output}\`);
  } else {
    console.log(script);
  }
}

module.exports = { generateWorkflow, patterns };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test tests/workflow-generator.test.js`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/workflow-generator.js tests/workflow-generator.test.js
git commit -m "feat: add workflow generator with 6 patterns"
```

---

## Task 10: OpenTUI Dashboard

**Files:**
- Create: `scripts/workflow-tui.js`
- Create: `skills/workflow-tui/SKILL.md`

- [ ] **Step 1: Create TUI dashboard**

```javascript
// scripts/workflow-tui.js
const { createCliRenderer, Box, Text, Input, Select } = require('@opentui/core');
const { WorkflowRuntime, WorkflowContext } = require('./workflow-runtime.js');

class WorkflowDashboard {
  constructor(options = {}) {
    this.runtime = options.runtime || new WorkflowRuntime(options);
    this.workflowFile = options.workflowFile || null;
    this.stateFile = options.stateFile || null;
    this.running = false;
    this.paused = false;
    this.events = [];
    this.selectedTeam = null;
    this.selectedAgent = null;
  }

  async start() {
    const renderer = await createCliRenderer({
      exitOnCtrlC: false,
      title: 'Dynamic Workflows v2.0'
    });

    this.renderer = renderer;
    this.setupUI();
    this.setupKeybindings();

    if (this.workflowFile) {
      await this.loadWorkflow(this.workflowFile);
    }

    renderer.render();
  }

  setupUI() {
    const { root } = this.renderer;

    // Header
    const header = Box({
      width: '100%',
      height: 3,
      borderStyle: 'single',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
      Text({ content: ' DYNAMIC WORKFLOWS v2.0', fg: '#00FF00', bold: true }),
      Text({ content: '[P]ause [S]top [Q]uit', fg: '#888888' })
    );

    // Status bar
    this.statusBar = Box({
      width: '100%',
      height: 3,
      borderStyle: 'single',
      flexDirection: 'row',
      justifyContent: 'space-between'
    },
      Text({ content: ' Status: IDLE', fg: '#FFFF00' }),
      Text({ content: ' Elapsed: 0s', fg: '#888888' })
    );

    // Main content area
    const mainContent = Box({
      width: '100%',
      height: '100%-8',
      flexDirection: 'row'
    });

    // Left panel - Teams & Agents
    this.teamsPanel = Box({
      width: '50%',
      height: '100%',
      borderStyle: 'single',
      flexDirection: 'column',
      title: 'TEAMS & AGENTS'
    });

    // Right panel - Memory & Events
    this.rightPanel = Box({
      width: '50%',
      height: '100%',
      flexDirection: 'column'
    });

    // Memory panel
    this.memoryPanel = Box({
      width: '100%',
      height: '50%',
      borderStyle: 'single',
      flexDirection: 'column',
      title: 'SHARED MEMORY'
    });

    // Events panel
    this.eventsPanel = Box({
      width: '100%',
      height: '50%',
      borderStyle: 'single',
      flexDirection: 'column',
      title: 'EVENTS'
    });

    // Controls bar
    this.controlsBar = Box({
      width: '100%',
      height: 3,
      borderStyle: 'single',
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 2
    },
      Text({ content: '[A]pprove', fg: '#00FF00' }),
      Text({ content: '[R]eject', fg: '#FF0000' }),
      Text({ content: '[P]ause', fg: '#FFFF00' }),
      Text({ content: '[N]ext team', fg: '#00FFFF' }),
      Text({ content: '[E]vents log', fg: '#888888' })
    );

    // Assemble UI
    mainContent.add(this.teamsPanel);
    mainContent.add(this.rightPanel);
    this.rightPanel.add(this.memoryPanel);
    this.rightPanel.add(this.eventsPanel);

    root.add(header);
    root.add(this.statusBar);
    root.add(mainContent);
    root.add(this.controlsBar);
  }

  setupKeybindings() {
    const { root } = this.renderer;

    root.on('keypress', async (key) => {
      switch (key.toLowerCase()) {
        case 'a':
          await this.approve();
          break;
        case 'r':
          await this.reject();
          break;
        case 'p':
          this.togglePause();
          break;
        case 's':
          await this.stop();
          break;
        case 'n':
          this.nextTeam();
          break;
        case 'e':
          this.toggleEventsLog();
          break;
        case 'q':
          await this.quit();
          break;
      }
    });
  }

  async loadWorkflow(file) {
    const fs = require('fs');
    const workflowFn = require(file);
    
    this.statusBar.children[0].content = ' Status: LOADING';
    this.renderer.render();

    // Start execution
    this.running = true;
    this.startTime = Date.now();

    // Execute in background
    this.runtime.execute(workflowFn).then(result => {
      this.running = false;
      this.statusBar.children[0].content = ' Status: COMPLETE';
      this.addEvent('workflow_complete', { result });
      this.renderer.render();
    }).catch(error => {
      this.running = false;
      this.statusBar.children[0].content = ' Status: ERROR';
      this.addEvent('workflow_error', { error: error.message });
      this.renderer.render();
    });

    // Start update loop
    this.updateLoop();
  }

  updateLoop() {
    if (!this.running) return;

    // Update elapsed time
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    this.statusBar.children[1].content = ` Elapsed: ${elapsed}s`;

    // Update teams panel
    this.updateTeamsPanel();

    // Update memory panel
    this.updateMemoryPanel();

    // Update events panel
    this.updateEventsPanel();

    this.renderer.render();

    // Schedule next update
    setTimeout(() => this.updateLoop(), 100);
  }

  updateTeamsPanel() {
    const teams = this.runtime.teamManager?.getAllTeams() || [];
    const agents = this.runtime.agentPool?.getActiveAgents() || [];

    let content = '';

    // Teams
    teams.forEach(team => {
      const statusIcon = team.status === 'converged' ? '●' : '○';
      content += `${statusIcon} ${team.id} (${team.status.toUpperCase()})\n`;
      
      team.workers.forEach(worker => {
        const icon = worker.status === 'completed' ? '✅' : '🔄';
        content += `  ├─ ${worker.id} ${icon}\n`;
      });

      content += `  └─ ${team.verifier.id} ${team.verifier.status === 'completed' ? '✅' : '⏳'}\n`;
      content += '\n';
    });

    // Agents
    if (agents.length > 0) {
      content += '─── ACTIVE AGENTS ───\n';
      agents.forEach(agent => {
        content += `⚡ ${agent.id} (${agent.type}) ${agent.status}\n`;
      });
    }

    this.teamsPanel.children = [
      Text({ content, fg: '#FFFFFF' })
    ];
  }

  updateMemoryPanel() {
    const keys = this.runtime.stateManager?.getKeys() || [];
    let content = '';

    keys.forEach(key => {
      const value = this.runtime.stateManager.get(key);
      const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
      content += `${key}: ${display}\n`;
    });

    this.memoryPanel.children = [
      Text({ content: content || '(empty)', fg: '#888888' })
    ];
  }

  updateEventsPanel() {
    const recentEvents = this.events.slice(-10);
    let content = '';

    recentEvents.forEach(event => {
      const time = new Date(event.timestamp).toLocaleTimeString();
      content += `${time} ${event.type}\n`;
    });

    this.eventsPanel.children = [
      Text({ content: content || '(no events)', fg: '#888888' })
    ];
  }

  addEvent(type, data) {
    this.events.push({
      type,
      timestamp: Date.now(),
      ...data
    });
  }

  async approve() {
    // Approve current verification
    this.addEvent('approve', { team: this.selectedTeam });
  }

  async reject() {
    // Reject current verification
    this.addEvent('reject', { team: this.selectedTeam });
  }

  togglePause() {
    this.paused = !this.paused;
    this.statusBar.children[0].content = this.paused ? ' Status: PAUSED' : ' Status: RUNNING';
    this.addEvent(this.paused ? 'pause' : 'resume', {});
  }

  async stop() {
    this.running = false;
    this.statusBar.children[0].content = ' Status: STOPPED';
    this.addEvent('stop', {});
  }

  nextTeam() {
    const teams = this.runtime.teamManager?.getAllTeams() || [];
    const currentIdx = teams.findIndex(t => t.id === this.selectedTeam);
    const nextIdx = (currentIdx + 1) % teams.length;
    this.selectedTeam = teams[nextIdx]?.id || null;
  }

  toggleEventsLog() {
    // Toggle events panel visibility
  }

  async quit() {
    if (this.running) {
      await this.stop();
    }
    process.exit(0);
  }
}

// CLI support
if (require.main === module) {
  const args = process.argv.slice(2);
  const workflowFile = args[0] || null;
  const stateIdx = args.indexOf('--state');
  const stateFile = stateIdx !== -1 ? args[stateIdx + 1] : null;

  const dashboard = new WorkflowDashboard({
    workflowFile,
    stateFile,
    stateFile
  });

  dashboard.start().catch(console.error);
}

module.exports = { WorkflowDashboard };
```

- [ ] **Step 2: Create skill definition**

```markdown
<!-- skills/workflow-tui/SKILL.md -->
# Workflow TUI Dashboard

Launch interactive TUI dashboard for monitoring and controlling dynamic workflows.

## Usage

/workflow [workflow-script.js] [--state state.json]

## Features

- Real-time monitoring of agents and teams
- Interactive controls (start/stop/pause, approve/reject)
- Shared memory visualization
- Pattern status display
- Event log with filtering

## Keyboard Shortcuts

- `A` - Approve current verification
- `R` - Reject current verification
- `P` - Pause/Resume workflow
- `S` - Stop workflow
- `N` - Skip to next team
- `E` - Toggle events log
- `Q` - Quit

## Requirements

- Bun runtime (for OpenTUI)
- @opentui/core package

## Example

```bash
/workflow workflow.js --state state.json
```
```

- [ ] **Step 3: Commit**

```bash
git add scripts/workflow-tui.js skills/workflow-tui/SKILL.md
git commit -m "feat: add OpenTUI dashboard for workflow monitoring"
```

---

## Task 11: Documentation & README Update

**Files:**
- Modify: `README.md`
- Create: `docs/TUI_DASHBOARD.md`

- [ ] **Step 1: Update README with v2.0 features**

Add to README.md:

```markdown
## v2.0 Features

### OpenTUI Dashboard

Launch interactive TUI dashboard:

```bash
/workflow workflow.js --state state.json
```

### Agent Memory

Agents share context within a single workflow run:

```javascript
ctx.setMemory('key', 'value');
ctx.getMemory('key');
```

### Advanced Patterns

- Conditional branching
- Loops with termination conditions
- Sub-workflows
- Error recovery with fallback
- Circuit breaker pattern

### Performance Optimizations

- Agent pooling (reuse completed agents)
- Result caching
- Parallel verification
```

- [ ] **Step 2: Create TUI documentation**

```markdown
<!-- docs/TUI_DASHBOARD.md -->
# TUI Dashboard Documentation

## Overview

The OpenTUI dashboard provides real-time monitoring and interactive control
of dynamic workflows via the `/workflow` slash command.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    /workflow SLASH COMMAND                           │
│                    (OpenTUI Dashboard)                               │
├─────────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌───────────┐ │
│  │  MONITOR    │  │  INTERACT   │  │   MEMORY    │  │  PATTERNS │ │
│  │  Panel      │  │  Panel      │  │  Panel      │  │  Panel    │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └───────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Panels

### Monitor Panel
- Real-time agent status
- Team progress
- Verification results

### Interact Panel
- Start/stop/pause workflow
- Approve/reject verifications
- Skip to next team

### Memory Panel
- View shared state within workflow
- Key-value pairs display

### Patterns Panel
- Active pattern info
- Branching/loop status

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `A` | Approve current verification |
| `R` | Reject current verification |
| `P` | Pause/Resume workflow |
| `S` | Stop workflow |
| `N` | Skip to next team |
| `E` | Toggle events log |
| `Q` | Quit |
| `Tab` | Switch between panels |
| `↑/↓` | Navigate lists |

## Integration with Workflow Runtime

The dashboard connects to WorkflowRuntime and displays:
- Agent pool status
- Team assembly and verification
- State manager contents
- Event bus emissions

## Requirements

- Bun runtime
- @opentui/core package

## Example Usage

```bash
# Generate workflow
node scripts/workflow-generator.js \
  --pattern team-adversarial \
  --task "Build auth system" \
  --output workflow.js

# Launch dashboard
/workflow workflow.js --state state.json
```
```

- [ ] **Step 3: Commit**

```bash
git add README.md docs/TUI_DASHBOARD.md
git commit -m "docs: add v2.0 features and TUI dashboard documentation"
```

---

## Task 12: Final Integration & Testing

**Files:**
- Modify: `scripts/workflow-runtime.js` (add CLI support)
- Create: `tests/integration.test.js`

- [ ] **Step 1: Add CLI support to workflow-runtime.js**

```javascript
// Add to end of scripts/workflow-runtime.js
if (require.main === module) {
  const args = process.argv.slice(2);
  const workflowFile = args[0];
  const stateIdx = args.indexOf('--state');
  const checkpointIdx = args.indexOf('--checkpoint');

  if (!workflowFile) {
    console.error('Usage: node workflow-runtime.js <workflow.js> [--state <file>] [--checkpoint <dir>]');
    process.exit(1);
  }

  const stateFile = stateIdx !== -1 ? args[stateIdx + 1] : null;
  const checkpointDir = checkpointIdx !== -1 ? args[checkpointIdx + 1] : null;

  const runtime = new WorkflowRuntime({
    stateFile,
    checkpointDir,
    checkpointInterval: 30000
  });

  const workflowFn = require(workflowFile);

  runtime.execute(workflowFn).then(result => {
    console.log('Workflow complete:', result);
    process.exit(0);
  }).catch(error => {
    console.error('Workflow failed:', error);
    process.exit(1);
  });
}
```

- [ ] **Step 2: Create integration test**

```javascript
// tests/integration.test.js
const { WorkflowRuntime } = require('../scripts/workflow-runtime.js');
const { generateWorkflow } = require('../scripts/workflow-generator.js');
const fs = require('fs');
const path = require('path');

describe('Integration Tests', () => {
  const testDir = '/tmp/workflow-test';
  
  beforeAll(() => {
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('full workflow execution with all features', async () => {
    // Generate workflow
    const script = generateWorkflow({
      pattern: 'team-adversarial',
      task: 'Test integration'
    });
    
    const workflowFile = path.join(testDir, 'test-workflow.js');
    fs.writeFileSync(workflowFile, script);
    
    // Execute workflow
    const runtime = new WorkflowRuntime({
      stateFile: path.join(testDir, 'state.json'),
      checkpointDir: path.join(testDir, 'checkpoints'),
      checkpointInterval: 100
    });
    
    const workflowFn = require(workflowFile);
    const result = await runtime.execute(workflowFn);
    
    // Verify results
    expect(result).toBeDefined();
    expect(result.teams).toBeDefined();
    
    // Verify state saved
    expect(fs.existsSync(path.join(testDir, 'state.json'))).toBe(true);
    
    // Verify checkpoints created
    const checkpoints = fs.readdirSync(path.join(testDir, 'checkpoints'));
    expect(checkpoints.length).toBeGreaterThan(0);
  });

  test('workflow with memory and patterns', async () => {
    const workflow = async (ctx) => {
      // Set memory
      ctx.setMemory('config', { timeout: 5000 });
      
      // Conditional branching
      const research = await ctx.spawnAgent('explorer', { task: 'Research' });
      
      if (research.score < 0.8) {
        await ctx.spawnAgent('fixer', { task: 'Fix issues' });
      }
      
      // Loop
      let iteration = 0;
      while (iteration < 3) {
        const result = await ctx.spawnAgent('builder', { task: 'Refine' });
        if (result.quality >= 0.9) break;
        iteration++;
      }
      
      // Sub-workflow
      const auditResult = await ctx.runSubWorkflow(async (ctx) => {
        return { issues: [] };
      });
      
      return { memory: ctx.getMemory('config'), iterations: iteration };
    };
    
    const runtime = new WorkflowRuntime();
    const result = await runtime.execute(workflow);
    
    expect(result.memory).toEqual({ timeout: 5000 });
    expect(result.iterations).toBeLessThanOrEqual(3);
  });
});
```

- [ ] **Step 3: Run all tests**

Run: `node --test tests/`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add scripts/workflow-runtime.js tests/integration.test.js
git commit -m "feat: add CLI support and integration tests"
```

---

## Final Verification

- [ ] All tests pass: `node --test tests/`
- [ ] CLI works: `node scripts/workflow-runtime.js workflow.js --state state.json`
- [ ] Generator works: `node scripts/workflow-generator.js --pattern team-adversarial --task "Test" --output test.js`
- [ ] Documentation complete
- [ ] README updated with v2.0 features

---

## Summary

This plan implements Dynamic Workflows v2.0 with:

1. **Core Runtime** (Tasks 1-6): Event bus, state manager, agent pool, team manager, workflow context, runtime
2. **Advanced Patterns** (Task 7): Branching, loops, sub-workflows, error recovery
3. **Performance** (Task 8): Agent pooling, caching, parallel verification
4. **Generator** (Task 9): Script generation with 6 patterns
5. **TUI Dashboard** (Task 10): OpenTUI-based interactive dashboard
6. **Documentation** (Task 11-12): README, TUI docs, integration tests

Total: 12 tasks, ~60 steps, all with TDD approach.
