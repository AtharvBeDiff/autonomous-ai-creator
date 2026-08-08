const fs = require('fs');
const path = require('path');

class Memory {
  constructor(dbPath) {
    const defaultPath = path.join(__dirname, '..', 'data', 'agent_db.json');
    this.dbPath = dbPath || defaultPath;

    // Ensure directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this._load();
  }

  _load() {
    if (fs.existsSync(this.dbPath)) {
      try {
        const data = fs.readFileSync(this.dbPath, 'utf8');
        this.data = JSON.parse(data);
      } catch (err) {
        console.error('[Memory] Failed to load JSON DB, starting fresh:', err.message);
        this._initEmpty();
      }
    } else {
      this._initEmpty();
    }
  }

  _initEmpty() {
    this.data = {
      agents: {},       // agentId -> { name, domain, createdAt }
      posts: [],        // array of post objects
      rejections: [],   // array of rejection objects
      seenUrls: {}      // url -> agentId
    };
    this._save();
  }

  _save() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('[Memory] Failed to save JSON DB:', err.message);
    }
  }

  // ── Agent Operations ──────────────────────────────────────

  createAgent(agentId, name, domain) {
    this.data.agents[agentId] = {
      agent_id: agentId,
      persona_name: name,
      persona_domain: domain,
      created_at: new Date().toISOString()
    };
    this._save();
  }

  getAgent(agentId) {
    return this.data.agents[agentId];
  }

  get db() {
    // Mock for the scheduler's restoreFromMemory
    return {
      prepare: () => ({
        all: () => Object.values(this.data.agents)
      })
    };
  }

  // ── Post Operations ───────────────────────────────────────

  addPost(post) {
    this.data.posts.push({
      id: post.id,
      agent_id: post.agentId,
      text: post.text,
      rationale: post.rationale,
      sources: post.sources,
      created_at: post.createdAt
    });
    this._save();
  }

  getPosts(agentId) {
    return this.data.posts
      .filter(p => p.agent_id === agentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(p => ({
        id: p.id,
        createdAt: p.created_at,
        text: p.text,
        rationale: p.rationale,
        sources: p.sources
      }));
  }

  getRecentPostTopics(agentId, limit = 20) {
    return this.data.posts
      .filter(p => p.agent_id === agentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, limit)
      .map(p => ({
        text: p.text,
        rationale: p.rationale
      }));
  }

  // ── Rejection Operations ──────────────────────────────────

  addRejection(agentId, title, url, reason) {
    this.data.rejections.push({
      agent_id: agentId,
      topic_title: title,
      topic_url: url || null,
      reason: reason,
      created_at: new Date().toISOString()
    });
    this._save();
  }

  getRejections(agentId) {
    return this.data.rejections
      .filter(r => r.agent_id === agentId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  // ── URL Tracking ──────────────────────────────────────────

  isUrlSeen(agentId, url) {
    return this.data.seenUrls[url] === agentId;
  }

  markUrlSeen(agentId, url) {
    this.data.seenUrls[url] = agentId;
    this._save();
  }

  // ── Lifecycle ─────────────────────────────────────────────

  close() {
    this._save();
  }
}

module.exports = Memory;
