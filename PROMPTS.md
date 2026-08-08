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
