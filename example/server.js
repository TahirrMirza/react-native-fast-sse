const http = require('http');

http
  .createServer((req, res) => {
    // Common SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    // Force Node to send the HTTP headers immediately so the app shows "Connected" instantly
    res.flushHeaders();

    const baseText =
      'This is a streaming test scenario to verify the robustness of React Native Turbo SSE. ';

    if (req.url === '/firehose') {
      const text = baseText.repeat(200);
      const tokens = text.split(' ');
      let i = 0;
      const interval = setInterval(() => {
        if (i >= tokens.length) {
          res.write('event: done\ndata: [DONE]\n\n');
          clearInterval(interval);
          res.end();
          return;
        }
        res.write(`data: ${tokens[i]} \n\n`);
        i++;
      }, 1);
      req.on('close', () => clearInterval(interval));
    } else if (req.url === '/massive-payload') {
      // Wait 500ms before sending the payload so the HTTP headers flush and the app registers 'Connected'
      setTimeout(() => {
        const massive = 'X '.repeat(512 * 1024); // 1MB string with spaces so React Native can wrap the text
        res.write(
          `data: {"info": "Incoming 1MB string chunk!", "payload": "${massive}"}\n\n`
        );

        setTimeout(() => {
          res.write('event: done\ndata: [DONE]\n\n');
          res.end();
        }, 1000);
      }, 500);
    } else if (req.url === '/slow-drip') {
      const tokens = baseText.repeat(2).split(' ');
      let i = 0;
      const interval = setInterval(() => {
        if (i >= tokens.length) {
          res.write('event: done\ndata: [DONE]\n\n');
          clearInterval(interval);
          res.end();
          return;
        }
        res.write(`data: ${tokens[i]} \n\n`);
        i++;
      }, 2000); // 1 token every 2 seconds
      req.on('close', () => clearInterval(interval));
    } else if (req.url === '/error-drop') {
      // Stream normally for 2 seconds, then abruptly kill the socket to test reconnects
      let i = 1;
      const interval = setInterval(() => {
        res.write(`data: Streaming perfectly fine... (chunk ${i++})\n\n`);
      }, 400);

      setTimeout(() => {
        console.log('Simulating server crash! Dropping socket.');
        clearInterval(interval);
        req.socket.destroy(); // Abruptly drops the TCP connection
      }, 2500);

      req.on('close', () => clearInterval(interval));
    } else {
      // Default Infinite Stream
      let count = 1;
      const interval = setInterval(() => {
        res.write(`data: Infinite stream chunk ${count++} \n\n`);
      }, 200);
      req.on('close', () => clearInterval(interval));
    }
  })
  .listen(3000, '0.0.0.0', () => {
    console.log(
      'SSE Multi-Scenario Test Server running on http://0.0.0.0:3000'
    );
    console.log(
      'Routes available: /firehose, /massive-payload, /slow-drip, /error-drop, /infinite'
    );
  });
