const EventEmitter = require('events');

const MAX_CONCURRENT_AGENTS = 16;
const MAX_TOTAL_AGENTS = 1000;
const AGENT_TIMEOUT_MS = 300000;

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

module.exports = { WorkflowEventBus, StateManager, AgentPool };
