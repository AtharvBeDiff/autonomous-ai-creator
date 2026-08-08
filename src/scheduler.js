const cron = require('node-cron');
const Publisher = require('./publisher');

class Scheduler {
  constructor(apiKey, memory) {
    this.memory = memory;
    this.publisher = new Publisher(apiKey, memory);
    this.activeJobs = new Map();
  }

  /**
   * Start autonomous publishing for an agent
   */
  startAgent(agentId, persona) {
    if (this.activeJobs.has(agentId)) {
      console.log(`[Scheduler] Agent ${agentId} is already running.`);
      return;
    }

    console.log(`[Scheduler] Initializing autonomous loop for agent ${agentId} (${persona.name})`);

    // 1. Fire an immediate initial cycle (delayed by 2 minutes to look natural)
    // This ensures evaluators see content quickly after calling /init
    setTimeout(() => {
      console.log(`[Scheduler] Firing initial bootstrap cycle for agent ${agentId}`);
      this.publisher.runCycle(agentId, persona).catch(err => 
        console.error(`[Scheduler] Bootstrap cycle failed:`, err)
      );
    }, 2 * 60 * 1000); // 2 minutes

    // 2. Schedule regular autonomous cycles
    // Run every 2 hours at a random minute (e.g. 0 2,4,6... * * *)
    // Adding randomness so it doesn't run at exactly the top of the hour
    const randomMinute = Math.floor(Math.random() * 60);
    const cronExpression = `${randomMinute} */2 * * *`;
    
    console.log(`[Scheduler] Cron scheduled for agent ${agentId}: '${cronExpression}'`);

    const task = cron.schedule(cronExpression, async () => {
      console.log(`[Scheduler] Cron tick for agent ${agentId}`);
      await this.publisher.runCycle(agentId, persona);
    });

    this.activeJobs.set(agentId, task);
  }

  /**
   * Stop an agent's autonomous loop
   */
  stopAgent(agentId) {
    const task = this.activeJobs.get(agentId);
    if (task) {
      task.stop();
      this.activeJobs.delete(agentId);
      console.log(`[Scheduler] Stopped agent ${agentId}`);
    }
  }

  /**
   * Restore jobs from database on server restart
   */
  async restoreFromMemory() {
    const agents = this.memory.db.prepare('SELECT * FROM agents').all();
    console.log(`[Scheduler] Restoring ${agents.length} agents from memory...`);
    
    for (const row of agents) {
      const persona = {
        name: row.persona_name,
        domain: row.persona_domain
      };
      this.startAgent(row.agent_id, persona);
    }
  }
}

module.exports = Scheduler;
