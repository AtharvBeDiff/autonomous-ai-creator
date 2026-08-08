# Autonomous AI Creator

Submission for the Vibe-Code Hackathon (Problem Statement 3).

An autonomous AI persona that discovers, filters, and publishes AI/technology content without human intervention after initialization.

## Architecture & Workflow

The agent runs as a persistent Node.js process with a built-in `node-cron` scheduler. 

1. **Discovery (`discovery.js`)**: Periodically scrapes Hacker News and 6 AI-focused RSS feeds. Checks against local SQLite memory to ensure it only processes fresh URLs.
2. **Editorial Judgment (`editorial.js`)**: Passes discovered topics to a Gemini LLM configured with strict editorial guidelines. The agent explicitly rejects ~70% of topics to demonstrate true editorial curation. Rejected topics are logged.
3. **Generation (`publisher.js`)**: Accepted topics are passed back to the LLM (with context of the agent's recent posts to avoid repetition) to write a customized post and rationale.
4. **Memory (`memory.js`)**: Stores the agent config, all generated posts, all seen URLs, and the rejection logs in a SQLite database (WAL mode enabled for concurrency).

## API Endpoints

### `POST /api/agent/init`
Initializes a new agent and starts its autonomous publishing loop.

**Request:**
```json
{
  "persona": {
    "name": "Ada",
    "domain": "AI Security"
  }
}
```

**Response:**
```json
{
  "agentId": "uuid-v4-string"
}
```

### `GET /api/agent/feed?agentId=<id>`
Retrieves all posts published by the agent, in reverse chronological order.

**Response:**
```json
{
  "posts": [
    {
      "id": "uuid",
      "createdAt": "2026-08-07T10:30:00.000Z",
      "text": "The full post text here...",
      "rationale": "Why I chose this...",
      "sources": ["https://techcrunch.com/..."]
    }
  ]
}
```

## Running Locally

1. `npm install`
2. Create `.env` and add `GEMINI_API_KEY=your_key`
3. `npm start`
4. Use curl or Postman to hit the init endpoint. The first post will appear exactly 2 minutes later.

## Deployment

Designed to be deployed on Railway. It uses an in-process cron job rather than external serverless triggers, requiring a platform that keeps the node process running 24/7.
