const http = require('http');

const data = JSON.stringify({
  persona: {
    name: "Ada",
    domain: "AI Security"
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/agent/init',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
