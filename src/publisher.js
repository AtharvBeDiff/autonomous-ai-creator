const { v4: uuidv4 } = require('uuid');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildPostPrompt } = require('./persona');
const Discovery = require('./discovery');
const Editorial = require('./editorial');
const { withRetry } = require('./editorial');

class Publisher {
  constructor(apiKey, memory) {
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for Publisher operations');
    }
    this.memory = memory;
    this.discovery = new Discovery();
    this.editorial = new Editorial(apiKey);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-3.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.7,
      }
    });
  }

  /**
   * Run the full pipeline: Discover -> Judge -> Write -> Store
   */
  async runCycle(agentId, persona) {
    console.log(`\n[Publisher] ══════════════════════════════════════`);
    console.log(`[Publisher] Starting cycle for ${persona.name} (${persona.domain})`);
    console.log(`[Publisher] Time: ${new Date().toISOString()}`);
    
    try {
      // 1. Discover fresh topics
      const freshTopics = await this.discovery.discoverTopics(this.memory, agentId);
      
      if (freshTopics.length === 0) {
        console.log('[Publisher] No fresh topics found. Cycle complete.');
        return 0;
      }

      // 2. Editorial Judgment — single API call with retry
      const approvedTopics = await this.editorial.judgeTopics(persona, freshTopics, this.memory, agentId);
      
      if (approvedTopics.length === 0) {
        console.log('[Publisher] No topics passed editorial review. Cycle complete.');
        return 0;
      }

      // 3. Wait 60s before writing to respect rate limits
      console.log('[Publisher] Waiting 60s before generating post (rate limit cooldown)...');
      await new Promise(r => setTimeout(r, 60000));

      // 4. Write post for the best accepted topic
      const chosen = approvedTopics[0];
      console.log(`[Publisher] Writing post about: "${chosen.topic.title}"`);
      
      const recentPosts = this.memory.getRecentPostTopics(agentId, 5);
      const prompt = buildPostPrompt(persona, chosen.topic, recentPosts);
      
      const result = await withRetry(async () => {
        return await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
      });
      
      const responseText = result.response.text();
      const postContent = JSON.parse(responseText);
      
      // 5. Store the new post
      const post = {
        id: uuidv4(),
        agentId: agentId,
        text: postContent.text,
        rationale: postContent.rationale || `Selected because: ${chosen.reason}`,
        sources: Array.isArray(postContent.sources) ? postContent.sources : [chosen.topic.url],
        createdAt: new Date().toISOString()
      };
      
      this.memory.addPost(post);
      console.log(`[Publisher] ✅ PUBLISHED post ${post.id}`);
      console.log(`[Publisher] ══════════════════════════════════════\n`);
      return 1;
      
    } catch (err) {
      console.error('[Publisher] Cycle failed:', err.message);
      return 0;
    }
  }
}

module.exports = Publisher;
