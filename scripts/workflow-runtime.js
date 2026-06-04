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
