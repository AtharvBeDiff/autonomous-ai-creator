const http = require('http');

// 1. Initial Configuration (Judges provide this)
const initData = JSON.stringify({
  persona: {
    name: "JudgeBot",
    domain: "AI & Machine Learning"
  }
});

// Options for POST /api/agent/init
const initOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/agent/init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(initData)
  }
};

console.log("=========================================");
console.log("🕵️‍♂️  JUDGE SIMULATOR STARTED");
console.log("=========================================\n");

// Helper function to make GET requests
function getFeed(agentId) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:3000/api/agent/feed?agentId=${agentId}`, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// 2. Perform the POST initialization
console.log("Step 1: Sending POST /api/agent/init with Persona Data...");
const req = http.request(initOptions, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', async () => {
    console.log(`HTTP Status: ${res.statusCode}`);
    if (res.statusCode !== 200) {
      console.error("❌ Initialization Failed.");
      return;
    }
    
    const responseData = JSON.parse(body);
    const agentId = responseData.agentId;
    console.log(`✅ Success! Received Agent ID: ${agentId}\n`);
    
    console.log("Step 2: Starting silent monitoring period...");
    console.log("Rule Check: The judge provides NO further instructions.\n");
    
    let attempts = 1;
    const maxAttempts = 20; // 10 minutes max
    
    // 3. Periodic Polling
    const pollInterval = setInterval(async () => {
      console.log(`[Poll ${attempts}/${maxAttempts}] Sending GET /api/agent/feed?agentId=${agentId}...`);
      try {
        const feed = await getFeed(agentId);
        
        if (feed.posts && feed.posts.length > 0) {
          console.log(`\n🎉 SUCCESS: Found ${feed.posts.length} generated post(s) in the feed!`);
          console.log("\n--- LATEST POST ---");
          console.log(`ID: ${feed.posts[0].id}`);
          console.log(`Time: ${feed.posts[0].createdAt}`);
          console.log(`Content:\n${feed.posts[0].text}`);
          console.log(`\nRationale:\n${feed.posts[0].rationale}`);
          console.log("-------------------\n");
          console.log("✅ SIMULATION PASSED: Agent operated entirely autonomously.");
          clearInterval(pollInterval);
        } else {
          console.log(`   Result: Feed is empty ({"posts": []}). The agent is likely researching/writing... waiting 20 seconds.`);
        }
      } catch (err) {
        console.error("   Error retrieving feed:", err.message);
      }
      
      attempts++;
      if (attempts > maxAttempts) {
        console.log("\n❌ SIMULATION FAILED: No posts appeared within 10 minutes.");
        clearInterval(pollInterval);
      }
    }, 20000); // Check every 20 seconds
    
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(initData);
req.end();
