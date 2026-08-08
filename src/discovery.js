/**
 * Discovery — Scrapes AI/tech topics from Hacker News and RSS feeds.
 * 
 * Sources:
 * - Hacker News top stories (filtered for AI relevance)
 * - TechCrunch AI, MIT Tech Review, The Verge AI, Ars Technica, VentureBeat
 * 
 * All sources are free with no API keys required.
 */

const RssParser = require('rss-parser');

const RSS_FEEDS = [
  { name: 'TechCrunch AI', url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'MIT Technology Review', url: 'https://www.technologyreview.com/feed/' },
  { name: 'The Verge AI', url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
  { name: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/technology-lab' },
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'Wired AI', url: 'https://www.wired.com/feed/tag/ai/latest/rss' },
];

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';

// Keywords that signal AI/tech relevance
const AI_KEYWORDS = [
  'ai', 'artificial intelligence', 'machine learning', 'deep learning',
  'llm', 'large language model', 'gpt', 'claude', 'gemini', 'openai',
  'anthropic', 'neural', 'transformer', 'diffusion', 'generative',
  'chatbot', 'copilot', 'autonomous', 'robotics', 'computer vision',
  'nlp', 'natural language', 'reinforcement learning', 'rag',
  'vector database', 'embedding', 'fine-tuning', 'fine tuning', 'prompt',
  'agentic', 'multi-agent', 'multimodal', 'foundation model',
  'safety', 'alignment', 'hallucination', 'reasoning', 'benchmark',
  'gpu', 'nvidia', 'cuda', 'inference', 'training', 'quantization',
  'hugging face', 'meta ai', 'google deepmind', 'mistral', 'llama',
  'cybersecurity', 'security', 'encryption', 'vulnerability', 'exploit',
  'open source', 'api', 'sdk', 'framework', 'deployment', 'mlops',
  'data pipeline', 'model serving', 'edge computing', 'on-device',
];

class Discovery {
  constructor() {
    this.rssParser = new RssParser({
      timeout: 15000,
      headers: { 'User-Agent': 'AutonomousAICreator/1.0 (Hackathon Project)' },
    });
  }

  /**
   * Discover fresh topics from all sources, filtered against memory.
   */
  async discoverTopics(memory, agentId) {
    console.log('[Discovery] Scanning sources...');

    const [hnTopics, rssTopics] = await Promise.all([
      this._fetchHackerNews(20),
      this._fetchAllRSS(),
    ]);

    const allTopics = [...hnTopics, ...rssTopics];

    // Deduplicate by URL
    const seen = new Set();
    const unique = allTopics.filter(topic => {
      if (!topic.url || seen.has(topic.url)) return false;
      seen.add(topic.url);
      return true;
    });

    // Filter out previously seen URLs from memory
    const fresh = unique.filter(topic => !memory.isUrlSeen(agentId, topic.url));

    // Mark all fresh URLs as seen
    fresh.forEach(topic => memory.markUrlSeen(agentId, topic.url));

    console.log(
      `[Discovery] Results: ${allTopics.length} total → ${unique.length} unique → ${fresh.length} fresh`
    );

    return fresh;
  }

  /**
   * Fetch top stories from Hacker News, filtered for AI relevance.
   */
  async _fetchHackerNews(limit = 20) {
    try {
      const res = await fetch(`${HN_API_BASE}/topstories.json`);
      if (!res.ok) throw new Error(`HN API returned ${res.status}`);

      const storyIds = await res.json();
      const selected = storyIds.slice(0, Math.min(limit, 30));

      const results = await Promise.allSettled(
        selected.map(async id => {
          const r = await fetch(`${HN_API_BASE}/item/${id}.json`);
          return r.json();
        })
      );

      const stories = results
        .filter(r => r.status === 'fulfilled' && r.value && r.value.url && r.value.title)
        .map(r => r.value)
        .filter(story => this._isAIRelated(story.title));

      console.log(`[Discovery] HN: ${stories.length} AI-related stories found`);

      return stories.map(story => ({
        title: story.title,
        url: story.url,
        summary: `Hacker News discussion with ${story.score || 0} points and ${story.descendants || 0} comments. A high-engagement topic from the developer community.`,
        source: 'Hacker News',
        discoveredAt: new Date().toISOString(),
      }));
    } catch (err) {
      console.error('[Discovery] HN fetch failed:', err.message);
      return [];
    }
  }

  /**
   * Fetch items from all configured RSS feeds.
   */
  async _fetchAllRSS() {
    const allTopics = [];

    const feedResults = await Promise.allSettled(
      RSS_FEEDS.map(feed => this._fetchSingleRSS(feed))
    );

    for (const result of feedResults) {
      if (result.status === 'fulfilled') {
        allTopics.push(...result.value);
      }
    }

    console.log(`[Discovery] RSS: ${allTopics.length} AI-related articles found`);
    return allTopics;
  }

  /**
   * Fetch and filter a single RSS feed.
   */
  async _fetchSingleRSS(feed) {
    try {
      const parsed = await this.rssParser.parseURL(feed.url);
      const items = (parsed.items || []).slice(0, 12);

      return items
        .filter(item =>
          this._isAIRelated(item.title || '') ||
          this._isAIRelated(item.contentSnippet || '')
        )
        .map(item => ({
          title: (item.title || 'Untitled').trim(),
          url: item.link || '',
          summary: (item.contentSnippet || item.content || '').substring(0, 350).trim(),
          source: feed.name,
          discoveredAt: new Date().toISOString(),
        }));
    } catch (err) {
      console.error(`[Discovery] RSS feed "${feed.name}" failed: ${err.message}`);
      return [];
    }
  }

  /**
   * Check if text contains AI/tech related keywords.
   */
  _isAIRelated(text) {
    const lower = text.toLowerCase();
    return AI_KEYWORDS.some(kw => lower.includes(kw));
  }
}

module.exports = Discovery;
