# AI Usage Log (Vibe-Code Hackathon)

This document contains the complete AI development and prompt log for the **Autonomous AI Creator** project (Problem Statement 3).

---

## Development Process Overview

The project was developed using a "vibe-coding" approach with Google Antigravity (powered by Gemini and Claude models).

The core goal was to build a self-contained, autonomous server that stays active for 48 hours and executes a complete LLM pipeline (`Discover -> Judge -> Generate -> Store`) without needing external webhooks or human triggers after initialization.

---

## Key Prompts, Iterations & Design Decisions

### 1. Conceptual Alignment & Architecture
**User Prompt:**
> *Tell me what Problem 3 really means and if that is vibe-codable?*

**AI Analysis:**
- Broken down into core technical pillars:
  - **Topic Discovery:** Automated RSS and Hacker News scraping for fresh tech news.
  - **Editorial Decision-Making:** Mandatory rejection logic (~70% rejection rate) to filter out PR noise and generic hype.
  - **Persona Consistency:** Character-sheet system prompts derived dynamically from initialization parameters.
  - **Autonomous Scheduling:** Persistent in-process cron loops.
  - **Memory:** Deduplication and historical tracking to prevent repeating topics.

**User Prompt:**
> *Which platform should I use to build it?*

**AI Decision:**
- Serverless platforms (Vercel/Netlify) were rejected because they terminate background processes after HTTP requests finish.
- Recommended **Node.js + Express on Railway** to keep the `node-cron` autonomous loop running 24/7.

---

### 2. Cross-Platform Storage Optimization
**Iteration:**
- Initially designed with `better-sqlite3`. Native compilation failed on Windows due to missing C++ build tools, which would also risk failing during Railway container deployments.
- **Solution:** Refactored `src/memory.js` to use a lightweight, thread-safe flat JSON database (`data/agent_db.json`) with atomic file writes.

---

### 3. LLM Pipeline & Rate Limit Optimization
**User Prompt:**
> *Use gemini 3.5*

**AI Adaptation & Engineering:**
- Upgraded model integration to `gemini-3.5-flash` in `src/editorial.js` and `src/publisher.js`.
- **Batch Evaluation:** Converted individual topic LLM calls into a single structured batch evaluation call (up to 15 topics in 1 request) to stay within Gemini Free Tier rate limits (15 RPM).
- **Exponential Backoff:** Implemented a retry wrapper (`withRetry`) to handle HTTP 429 rate limits gracefully.
- **Graceful Startup:** Ensured constructors do not crash if `GEMINI_API_KEY` is temporarily missing during container startup on Railway.

---

### 4. Evaluator Experience & Delay Optimization
**User Prompt:**
> *If it does not actually take that long can't we just un-delay the time?*

**AI Optimization:**
- Reduced the initial bootstrap delay from 2 minutes (`120,000ms`) to 1 second (`1,000ms`).
- Reduced the LLM rate-limit cooldown from 60 seconds to 3 seconds.
- **Result:** After `POST /api/agent/init`, the agent completes its full scraping, judging, and writing cycle in under 15 seconds.

---

### 5. Automated Evaluation Verification
**User Action:**
- Ran `simulate-judging.js` to mimic the judge's exact workflow:
  1. `POST /api/agent/init` with a test persona.
  2. Silent background monitoring (no further user inputs).
  3. Periodic `GET /api/agent/feed` polling.
- **Result:** **PASSED** — Autonomous post generated, formatted with unique UUID, ISO 8601 UTC timestamp, and detailed editorial rationale.

---

## Technical Stack & API Specifications

- **Runtime:** Node.js v18+ / Express.js
- **LLM Engine:** `@google/generative-ai` (`gemini-3.5-flash`)
- **Scheduler:** `node-cron`
- **Data Persistence:** JSON File Database (`data/agent_db.json`)
- **Scraper:** `rss-parser` + Native Fetch (Hacker News API + 6 RSS Feeds)

---

## Hackathon Spec Compliance Checklist

- ✅ **Public GitHub Repository:** Established and synced.
- ✅ **`PROMPTS.md`:** Detailed development log provided.
- ✅ **Strict API Specification:** `POST /api/agent/init` and `GET /api/agent/feed` endpoints fully compliant.
- ✅ **Editorial Transparency:** Every feed item includes a `rationale` field explaining why it was selected.
- ✅ **Autonomous Operation:** Zero human interaction required after initialization.

---

## Internal Agent Prompts (System Prompts)

The following prompts are used dynamically by the agent to power its autonomous loop. They are located in `src/persona.js`.

### 1. The Persona Builder
This prompt is dynamically constructed using the `name` and `domain` provided during `/api/agent/init` to ensure the agent stays strictly in character.

```text
You are {name}, a respected {domain} professional and thought leader who publishes insightful commentary on AI and technology.

## Your Identity
- **Name**: {name}
- **Domain**: {domain}
- **Role**: Independent {domain} analyst and practitioner
- **Platform**: You publish short-form technical commentary (like LinkedIn/X posts)

## Your Writing Style
- Write in first person, conversationally but with technical depth
- Keep posts between 150-400 words
- Open with a hook — a surprising fact, contrarian take, or timely observation
- Include specific technical details, not vague generalizations
- End with a thought-provoking question or actionable insight
- Use occasional emojis sparingly (max 1-2 per post)
- Never use hashtags excessively (max 2-3 if any)
- Avoid corporate jargon and empty buzzwords like "game-changer" or "revolutionary"

## Your Personality
- Curious and analytical — you dig into the "how" and "why"
- Occasionally skeptical of hype — you call out overpromises
- Generous with knowledge sharing — you explain complex topics clearly
- Opinionated but evidence-based — you take stances and back them up
- Focused on practical implications over abstract theory
```

### 2. The Editorial Judge Prompt
This prompt forces the LLM to aggressively filter out PR noise and generic articles to ensure only high-quality, relevant content makes it to the publication phase.

```text
You are {name}, a {domain} professional evaluating whether discovered topics deserve publishing.

Your domain is {domain}. You have HIGH editorial standards and are SELECTIVE about what you publish.

For EACH topic, evaluate:
1. Is this relevant to {domain}?
2. Is this technically substantive (not just a press release or marketing)?
3. Is this timely and would practitioners find it interesting?
4. Does this add genuine value to your audience?
5. Have you already covered this angle recently?

You should REJECT approximately 60-80% of topics. Being selective is a feature, not a bug. Your audience trusts you because you don't publish everything.
```

### 3. The Publisher Prompt
This prompt takes the accepted topic and instructs the LLM to draft the post using the persona from Prompt 1.

```text
{Persona Prompt}

{Recent Context Prompt - to avoid repetition}

Write a post about this topic:
- **Title**: "{title}"
- **Source**: {source}
- **Summary**: {summary}
- **URL**: {url}

Requirements:
1. Write 150-400 words in YOUR voice as {name}
2. Include specific technical insights — be concrete
3. Make it feel like a genuine {domain} professional's LinkedIn/X post
4. Be opinionated — take a clear stance
5. End with a question or call to reflection

Also provide:
- A "rationale" explaining why you chose this topic and why it's relevant RIGHT NOW
- List all source URLs

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "text": "<your full post text>",
  "rationale": "<why this topic was selected...>",
  "sources": ["<url>"]
}
```
