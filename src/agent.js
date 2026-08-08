const { v4: uuidv4 } = require('uuid');

class AgentManager {
  constructor(memory, scheduler) {
    this.memory = memory;
    this.scheduler = scheduler;
  }

  /**
   * Initialize a new autonomous agent persona.
   * Required for POST /api/agent/init
   */
  initAgent(persona) {
    if (!persona || !persona.name || !persona.domain) {
      throw new Error('Invalid persona config. Requires name and domain.');
    }

    const agentId = uuidv4();
    
    // Store in memory
    this.memory.createAgent(agentId, persona.name, persona.domain);
    
    // Start autonomous publishing loop
    this.scheduler.startAgent(agentId, persona);
    
    return agentId;
  }

  /**
   * Retrieve the generated feed for an agent.
   * Required for GET /api/agent/feed?agentId=xxx
   */
  getFeed(agentId) {
    if (!agentId) {
      throw new Error('agentId is required');
    }

    const agent = this.memory.getAgent(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} not found`);
    }

    // getPosts returns them ordered by created_at DESC as required
    const posts = this.memory.getPosts(agentId);
    
    return { posts };
  }
}

module.exports = AgentManager;
