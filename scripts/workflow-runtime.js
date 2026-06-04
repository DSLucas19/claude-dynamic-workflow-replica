const EventEmitter = require('events');

const MAX_CONCURRENT_AGENTS = 16;
const MAX_TOTAL_AGENTS = 1000;
const AGENT_TIMEOUT_MS = 300000;
const MAX_ITERATIONS_PER_TEAM = 5;

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
    super.emit(type, data);
    process.stdout.write(event + '\n');
    return true;
  }
}

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

class AgentPool {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || MAX_CONCURRENT_AGENTS;
    this.maxTotal = options.maxTotal || MAX_TOTAL_AGENTS;
    this.agents = new Map();
    this.counter = 0;
  }

  createAgent(type, options = {}) {
    if (this.agents.size >= this.maxTotal) {
      throw new Error(`Agent limit reached: ${this.maxTotal}`);
    }

    const activeCount = Array.from(this.agents.values())
      .filter(a => a.status === 'running').length;
    
    if (activeCount >= this.maxConcurrent) {
      throw new Error(`Concurrent agent limit reached: ${this.maxConcurrent}`);
    }

    this.counter++;
    const id = options.id || `agent-${this.counter}-${type}`;

    const agent = {
      id,
      type,
      status: 'running',
      createdAt: Date.now(),
      result: null,
      error: null
    };

    this.agents.set(id, agent);
    return agent;
  }

  getAgent(id) {
    return this.agents.get(id);
  }

  completeAgent(id, result) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    agent.status = 'completed';
    agent.result = result;
    agent.completedAt = Date.now();
    return agent;
  }

  failAgent(id, error) {
    const agent = this.agents.get(id);
    if (!agent) throw new Error(`Agent not found: ${id}`);
    agent.status = 'failed';
    agent.error = error.message;
    agent.completedAt = Date.now();
    return agent;
  }

  getActiveAgents() {
    return Array.from(this.agents.values())
      .filter(a => a.status === 'running');
  }

  getCompletedAgents() {
    return Array.from(this.agents.values())
      .filter(a => a.status === 'completed');
  }

  getAllAgents() {
    return Array.from(this.agents.values());
  }

  count() {
    return this.agents.size;
  }

  clear() {
    this.agents.clear();
    this.counter = 0;
  }
}

class TeamManager {
  constructor(agentPool, options = {}) {
    this.agentPool = agentPool;
    this.maxIterations = options.maxIterations || MAX_ITERATIONS_PER_TEAM;
    this.teams = new Map();
  }

  assembleTeam(config) {
    const team = {
      id: config.id,
      workers: config.workers.map(w => ({
        ...w,
        status: 'pending',
        result: null
      })),
      verifier: {
        ...config.verifier,
        status: 'pending',
        result: null
      },
      status: 'assembled',
      iterations: 0
    };

    this.teams.set(team.id, team);
    return team;
  }

  async runTeam(team, options = {}) {
    const executeAgent = options.executeAgent;
    const verify = options.verify || this._defaultVerify.bind(this);

    team.status = 'running';

    for (let i = 0; i < this.maxIterations; i++) {
      team.iterations = i + 1;

      // Execute workers
      for (const worker of team.workers) {
        worker.status = 'running';
        try {
          worker.result = await executeAgent(worker);
          worker.status = 'completed';
        } catch (err) {
          worker.status = 'failed';
          worker.error = err.message;
          team.status = 'failed';
          return team;
        }
      }

      // Run verifier
      team.verifier.status = 'running';
      const verification = await verify(team);

      if (verification.status === 'pass' || verification.status === 'approved') {
        team.verifier.status = 'completed';
        team.verifier.result = verification;
        team.status = 'converged';
        return team;
      }

      team.verifier.status = 'pending';
      // Loop continues for rework
    }

    team.status = 'max_iterations';
    return team;
  }

  async runTeams(teams, options = {}) {
    const results = [];
    for (const team of teams) {
      const result = await this.runTeam(team, options);
      results.push(result);
    }
    return results;
  }

  async _defaultVerify(team) {
    const allCompleted = team.workers.every(w => w.status === 'completed');
    return { status: allCompleted ? 'pass' : 'needs_rework' };
  }

  getTeam(id) {
    return this.teams.get(id);
  }

  getAllTeams() {
    return Array.from(this.teams.values());
  }

  clear() {
    this.teams.clear();
  }
}

class WorkflowContext {
  constructor(options) {
    this.pool = options.pool;
    this.teamManager = options.teamManager;
    this.bus = options.bus;
    this.state = options.state;
    this.memory = new Map();
  }

  async spawnAgent(type, options, execOptions = {}) {
    const agent = this.pool.createAgent(type, options);
    this.bus.emit('task_start', { agentId: agent.id, type });

    try {
      const execute = execOptions.execute || this._defaultExecute.bind(this);
      const result = await execute(agent);
      this.pool.completeAgent(agent.id, result);
      this.bus.emit('task_complete', { agentId: agent.id, result });
      return result;
    } catch (err) {
      this.pool.failAgent(agent.id, err);
      this.bus.emit('workflow_error', { agentId: agent.id, error: err.message });
      throw err;
    }
  }

  async spawnAgents(tasks, execOptions = {}) {
    const promises = tasks.map(task =>
      this.spawnAgent(task.type, task, execOptions)
    );
    return Promise.all(promises);
  }

  async runTeams(teams, options = {}) {
    const assembled = teams.map(t => this.teamManager.assembleTeam(t));
    return this.teamManager.runTeams(assembled, options);
  }

  async verify(result, options = {}) {
    const verifyFn = options.verify || this._defaultVerify.bind(this);
    return verifyFn(result);
  }

  async verifyAll(results, options = {}) {
    const verifyFn = options.verify || this._defaultVerify.bind(this);
    const verifications = await Promise.all(
      results.map(r => verifyFn(r))
    );
    return {
      allPassed: verifications.every(v => v.status === 'pass'),
      results: verifications
    };
  }

  setMemory(key, value) {
    this.memory.set(key, value);
  }

  getMemory(key) {
    return this.memory.get(key);
  }

  getMemoryKeys() {
    return Array.from(this.memory.keys());
  }

  deleteMemory(key) {
    this.memory.delete(key);
  }

  clearMemory() {
    this.memory.clear();
  }

  async cached(key, fn) {
    const cacheKey = `cache:${key}`;
    const existing = this.memory.get(cacheKey);
    if (existing !== undefined) return existing;
    const result = await fn();
    this.memory.set(cacheKey, result);
    return result;
  }

  checkpoint() {
    this.bus.emit('checkpoint', {
      agents: this.pool.count(),
      memoryKeys: this.getMemoryKeys().length
    });
  }

  reportProgress(data) {
    this.bus.emit('progress_report', data);
  }

  getState() {
    return this.state.toJSON();
  }

  getAgentStats() {
    const all = this.pool.getAllAgents();
    return {
      total: all.length,
      active: all.filter(a => a.status === 'running').length,
      completed: all.filter(a => a.status === 'completed').length,
      failed: all.filter(a => a.status === 'failed').length
    };
  }

  async _defaultExecute(agent) {
    return { output: `agent ${agent.id} completed` };
  }

  async _defaultVerify(result) {
    return { status: 'pass' };
  }
}

class WorkflowRuntime {
  constructor(options = {}) {
    this.bus = new WorkflowEventBus();
    this.state = new StateManager();
    this.pool = new AgentPool(options);
    this.teamManager = new TeamManager(this.pool, options);
    this.stateFile = options.stateFile || null;
  }

  async execute(workflowFn) {
    this.bus.emit('workflow_start', {
      timestamp: Date.now()
    });

    const ctx = new WorkflowContext({
      pool: this.pool,
      teamManager: this.teamManager,
      bus: this.bus,
      state: this.state
    });

    try {
      const result = await workflowFn(ctx);

      this.bus.emit('workflow_complete', {
        timestamp: Date.now(),
        result
      });

      if (this.stateFile) {
        const fs = require('fs');
        fs.writeFileSync(
          this.stateFile,
          JSON.stringify(this.state.toJSON(), null, 2)
        );
      }

      return result;
    } catch (error) {
      this.bus.emit('workflow_error', {
        timestamp: Date.now(),
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = { WorkflowEventBus, StateManager, AgentPool, TeamManager, WorkflowContext, WorkflowRuntime };
