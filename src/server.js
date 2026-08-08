require('dotenv').config();
const express = require('express');
const cors = require('cors');

const Memory = require('./memory');
const Scheduler = require('./scheduler');
const AgentManager = require('./agent');

const app = express();
app.use(express.json());
app.use(cors());

// Initialize core systems
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn('⚠️ WARNING: GEMINI_API_KEY is not set. Editorial/Publisher will crash on execution.');
}

const memory = new Memory();
const scheduler = new Scheduler(apiKey, memory);
const agentManager = new AgentManager(memory, scheduler);

// Restore any existing agents on server start
scheduler.restoreFromMemory().catch(err => {
  console.error('Failed to restore agents from memory:', err);
});

// ── API Endpoints ──────────────────────────────────────────

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

/**
 * 1. Initialize Agent
 * Called exactly once before evaluation begins.
 */
app.post('/api/agent/init', (req, res) => {
  try {
    const { persona } = req.body;
    if (!persona) {
      return res.status(400).json({ error: 'Missing persona object in body' });
    }

    const agentId = agentManager.initAgent(persona);
    console.log(`[API] Agent initialized: ${agentId} (${persona.name} - ${persona.domain})`);
    
    res.json({ agentId });
  } catch (err) {
    console.error('[API] /api/agent/init error:', err.message);
    res.status(400).json({ error: err.message });
  }
});

/**
 * 2. Retrieve Feed
 * After initialization, this is the only endpoint the evaluator will call.
 */
app.get('/api/agent/feed', (req, res) => {
  try {
    const { agentId } = req.query;
    if (!agentId) {
      return res.status(400).json({ error: 'Missing agentId query parameter' });
    }

    const feed = agentManager.getFeed(agentId);
    console.log(`[API] Feed retrieved for ${agentId}: ${feed.posts.length} posts`);
    
    res.json(feed);
  } catch (err) {
    console.error('[API] /api/agent/feed error:', err.message);
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// ── Error Handling ─────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('[API] Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start Server ───────────────────────────────────────────

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🤖 Autonomous AI Creator running on port ${PORT}`);
  console.log(`📡 Ready for evaluator initialization at /api/agent/init\n`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  memory.close();
  process.exit(0);
});
process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  memory.close();
  process.exit(0);
});
