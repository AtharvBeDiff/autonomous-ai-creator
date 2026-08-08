const { GoogleGenerativeAI } = require('@google/generative-ai');
const { buildEditorialPrompt } = require('./persona');

/**
 * Helper: retry an async function with exponential backoff on 429 errors
 */
async function withRetry(fn, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err.status === 429 || (err.message && err.message.includes('429'));
      if (is429 && attempt < maxRetries) {
        const waitSec = Math.pow(2, attempt) * 30; // 30s, 60s, 120s
        console.log(`[Retry] Rate limited. Waiting ${waitSec}s before retry ${attempt + 1}/${maxRetries}...`);
        await new Promise(r => setTimeout(r, waitSec * 1000));
      } else {
        throw err;
      }
    }
  }
}

class Editorial {
  constructor(apiKey) {
    if (apiKey) {
      const genAI = new GoogleGenerativeAI(apiKey);
      this.model = genAI.getGenerativeModel({
        model: 'gemini-3.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        }
      });
    } else {
      console.warn('[Editorial] No API key — LLM features disabled until key is set.');
    }
  }

  /**
   * Evaluates ALL topics in a SINGLE API call to conserve rate limits.
   * Returns only the accepted topics. Rejected ones are logged to memory.
   */
  async judgeTopics(persona, topics, memory, agentId) {
    if (topics.length === 0) return [];

    // Limit to 15 topics max per call to keep context manageable
    const topicsToJudge = topics.slice(0, 15);
    console.log(`[Editorial] Judging ${topicsToJudge.length} topics as ${persona.name}...`);

    const systemInstruction = buildEditorialPrompt(persona);

    const recentPosts = memory.getRecentPostTopics(agentId, 10);
    const recentContext = recentPosts.length > 0
      ? `\nRecent topics you've covered (avoid repetition):\n${recentPosts.map(p => `- ${p.text.substring(0, 80)}...`).join('\n')}`
      : '';

    const topicList = topicsToJudge.map((t, idx) =>
      `Topic ${idx + 1}:\nTitle: ${t.title}\nSource: ${t.source}\nSummary: ${t.summary}`
    ).join('\n---\n');

    const prompt = `Evaluate these topics for publishing:\n\n${topicList}

${recentContext}

For EACH topic (${topicsToJudge.length} total), return a JSON array of objects with:
- "index": topic number (1-based)
- "publish": boolean
- "reason": why you accepted or rejected

Return exactly ${topicsToJudge.length} objects. Be VERY selective — reject ~70%.`;

    try {
      const result = await withRetry(async () => {
        return await this.model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          systemInstruction: { role: 'system', parts: [{ text: systemInstruction }] }
        });
      });

      const responseText = result.response.text();
      const judgments = JSON.parse(responseText);

      const accepted = [];

      judgments.forEach(verdict => {
        const topic = topicsToJudge[verdict.index - 1];
        if (!topic) return;

        if (verdict.publish) {
          console.log(`[Editorial] ✅ ACCEPTED: ${topic.title}`);
          accepted.push({ topic, reason: verdict.reason });
        } else {
          console.log(`[Editorial] ❌ REJECTED: ${topic.title} - ${verdict.reason}`);
          memory.addRejection(agentId, topic.title, topic.url, verdict.reason);
        }
      });

      console.log(`[Editorial] Judgment complete: ${accepted.length} accepted, ${topicsToJudge.length - accepted.length} rejected`);
      return accepted;

    } catch (err) {
      console.error(`[Editorial] Judgment failed after retries:`, err.message);
      // Mark remaining topics as rejected due to error
      topicsToJudge.forEach(t => {
        memory.addRejection(agentId, t.title, t.url, 'LLM evaluation failed — skipped');
      });
      return [];
    }
  }
}

module.exports = Editorial;
module.exports.withRetry = withRetry;
