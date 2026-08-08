const fs = require('fs');
const path = require('path');

const transcriptPath = 'C:\\Users\\athar\\.gemini\\antigravity-ide\\brain\\9bef19e2-fb90-43a9-8261-67f5876af944\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'CHAT_TRANSCRIPT.md');

try {
  const data = fs.readFileSync(transcriptPath, 'utf8');
  const lines = data.trim().split('\n');
  
  let md = '# Full Chat Transcript (Vibe-Coding Hackathon)\n\n';
  md += 'This document is the exported chat transcript of the entire development process.\n\n---\n\n';

  for (const line of lines) {
    if (!line) continue;
    const entry = JSON.parse(line);
    
    if (entry.type === 'USER_INPUT' && entry.content) {
      let content = entry.content.replace(/<USER_REQUEST>/g, '').replace(/<\/USER_REQUEST>/g, '').trim();
      // Remove metadata junk from the UI
      content = content.split('<ADDITIONAL_METADATA>')[0].trim();
      md += `### 🧑 User (At ${new Date(entry.created_at).toLocaleString()})\n\n${content}\n\n---\n\n`;
    } 
    else if (entry.type === 'PLANNER_RESPONSE' && entry.content) {
      md += `### 🤖 Antigravity AI (At ${new Date(entry.created_at).toLocaleString()})\n\n${entry.content}\n\n---\n\n`;
    }
  }

  fs.writeFileSync(outputPath, md);
  console.log('Successfully generated CHAT_TRANSCRIPT.md!');
} catch (err) {
  console.error('Error parsing transcript:', err);
}
