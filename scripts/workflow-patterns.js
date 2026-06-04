const { WorkflowContext, WorkflowEventBus, StateManager, AgentPool, TeamManager } = require('./workflow-runtime.js');

async function conditionalBranch(condition, trueBranch, falseBranch) {
  const result = await condition();
  return result ? trueBranch() : falseBranch();
}

async function loopUntil(body, predicate, options = {}) {
  const maxIterations = options.maxIterations || 100;
  let lastValue;
  
  for (let i = 0; i < maxIterations; i++) {
    lastValue = await body();
    if (predicate(lastValue)) return lastValue;
  }
  
  return lastValue;
}

async function subWorkflow(workflowFn, options = {}) {
  const pool = new AgentPool();
  const manager = new TeamManager(pool);
  const bus = new WorkflowEventBus();
  const state = new StateManager();
  
  const ctx = new WorkflowContext({
    pool,
    teamManager: manager,
    bus,
    state,
    memory: options.isolateMemory ? new Map() : undefined
  });
  
  return workflowFn(ctx);
}

async function withRetry(fn, options = {}) {
  const maxRetries = options.maxRetries || 3;
  const delay = options.delay || 0;
  let lastError;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries && delay > 0) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

function circuitBreaker(fn, options = {}) {
  const threshold = options.threshold || 5;
  const resetTimeout = options.resetTimeout || 30000;
  
  let failures = 0;
  let lastFailureTime = 0;
  let state = 'closed'; // closed, open, half-open
  
  return async (...args) => {
    // Check if circuit should reset
    if (state === 'open' && Date.now() - lastFailureTime > resetTimeout) {
      state = 'half-open';
      failures = 0;
    }
    
    // Reject if circuit is open
    if (state === 'open') {
      throw new Error('Circuit breaker is open');
    }
    
    try {
      const result = await fn(...args);
      // Success resets failures
      if (state === 'half-open') {
        state = 'closed';
      }
      failures = 0;
      return result;
    } catch (err) {
      failures++;
      lastFailureTime = Date.now();
      
      if (failures >= threshold) {
        state = 'open';
      }
      
      throw err;
    }
  };
}

module.exports = {
  conditionalBranch,
  loopUntil,
  subWorkflow,
  withRetry,
  circuitBreaker
};
