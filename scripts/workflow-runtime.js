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
