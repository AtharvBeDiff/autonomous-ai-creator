# AI Usage Log (Vibe-Code Hackathon)

This document contains the AI prompt log for the **Autonomous AI Creator** project (Problem Statement 3).

## Development Process Overview

The project was developed using a "vibe-coding" approach with Google Antigravity (using the Gemini 1.5 Pro and Claude 3.5 Sonnet models). 

The core challenge was to build a server that stays alive for 48 hours and autonomously executes an LLM pipeline (Discover -> Judge -> Generate -> Store) without external webhooks or serverless functions being invoked.

## Key Prompts & Iterations

### 1. Conceptual Alignment & Tech Stack Selection
**User Prompt:**
> tell me what the no.3 really means and if that is vibe codable?

**AI Strategy & Analysis:**
The AI broke down the problem statement into concrete engineering requirements:
- Topic Discovery (RSS/HN Scraper)
- Editorial Judgment (Explicit LLM rejection logic)
- Consistent Persona (System prompts based on initialization)
- Autonomous Publishing (Background cron job)
- Memory (Local database to avoid duplicates)

**User Prompt:**
> which platform should i use to build it?

**AI Decision:**
The AI correctly identified that serverless platforms like Vercel or Netlify would fail the autonomous 48-hour requirement because background tasks would be killed. It recommended Node.js + Express deployed on **Railway** (or a similar persistent VM) to allow `node-cron` to run continuously in the background.

### 2. Implementation Planning
**User Prompt:**
> ok then lets bui; it and if u have read the whole script i pasted about the hackathon, u know what other requirement it needs like prompts.md so make that too but start from this convo.

**AI Action:**
The AI generated a comprehensive `implementation_plan.md` artifact detailing:
- The SQLite database schema (agents, posts, rejections, seen_urls)
- The scraping strategy (Hacker News + 6 AI RSS feeds via `rss-parser`)
- The multi-stage LLM pipeline (Gemini 1.5 Flash for cheap/fast editorial judgment, Gemini 1.5 Pro for post generation)
- The autonomous scheduler (running every ~2 hours with slight randomness)

### 3. Code Generation
The AI systematically generated the required files in a modular structure:
- `package.json`, `.env.example`, `railway.json`, `.gitignore`
- `src/memory.js`: A robust SQLite implementation using `better-sqlite3` with WAL mode enabled.
- `src/persona.js`: Dynamic prompt builders that enforce the persona provided during `/api/agent/init`.
- `src/discovery.js`: Fetching and parsing data from Hacker News API and standard RSS feeds, filtering for AI keywords.
- `src/editorial.js`: Implementing the critical "Editorial Judgment" requirement by forcing the LLM to explicitly reject 60-80% of topics and logging those rejections.
- `src/publisher.js`: Tying together discovery, editorial, and generation into a single "cycle".
- `src/scheduler.js`: Managing `node-cron` jobs and ensuring an immediate "bootstrap" post is generated 2 minutes after initialization for immediate evaluator feedback.
- `src/agent.js` & `src/server.js`: Exposing the strict API contract required by the hackathon.

## API Usage
- LLM API used: **Google Gemini API** (`gemini-1.5-flash` for judgment, `gemini-1.5-pro` for writing).
- The prompt engineering heavily emphasizes the persona's requirement to be highly selective (rejecting generic PR announcements) to satisfy the "editorial judgment" evaluation criteria.

## Hackathon Rules Compliance
- ✅ Public repository structure established.
- ✅ PROMPTS.md included.
- ✅ `POST /api/agent/init` and `GET /api/agent/feed` endpoints strictly match the specification.
- ✅ Demonstrates autonomous behavior without human intervention after initialization.
