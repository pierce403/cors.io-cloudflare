// Cloudflare Worker for cors.io proxy
// Modules syntax

// Hop-by-hop headers that should be stripped
const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
];

// HTML landing page with instructions
const LANDING_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>cors.io</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 0 20px;
      line-height: 1.6;
      color: #333;
    }
    h1 {
      color: #2c3e50;
      border-bottom: 2px solid #3498db;
      padding-bottom: 10px;
    }
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: "Monaco", "Courier New", monospace;
    }
    pre {
      background: #f4f4f4;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
    }
    .example {
      margin: 20px 0;
    }
    .note {
      background: #fff3cd;
      border-left: 4px solid #ffc107;
      padding: 10px 15px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <h1>cors.io</h1>

  <p>cors.io is a simple drop-in CORS proxy. Point your request here when you see browser console messages like <em>"No 'Access-Control-Allow-Origin' header is present on the requested resource"</em> or <em>"Access to fetch at ... from origin ... has been blocked by CORS policy"</em>. These are the errors that probably brought you here—use the proxy to debug and unblock your requests.</p>

  <p>This worker is modeled after the original <a href="https://cors.io/">cors.io</a> landing page so you can still find it by searching for those CORS error strings.</p>
  
  <h2>Usage</h2>
  
  <div class="example">
    <h3>Fetch a URL:</h3>
    <p>Add <code>?url=</code> or <code>?u=</code> parameter with the target URL:</p>
    <pre>https://your-worker.workers.dev/?url=https://api.example.com/data</pre>
    <pre>https://your-worker.workers.dev/?u=https://api.example.com/data</pre>
  </div>
  
  <div class="example">
    <h3>Response Format:</h3>
    <p>The proxy returns a JSON response with the following structure:</p>
    <pre>{
  "url": "https://api.example.com/data",
  "status": 200,
  "headers": {
    "content-type": "application/json",
    ...
  },
  "body": "response body content"
}</pre>
  </div>
  
  <div class="example">
    <h3>JavaScript Example:</h3>
    <pre>fetch('https://your-worker.workers.dev/?url=https://api.example.com/data')
  .then(response => response.json())
  .then(data => {
    console.log('Status:', data.status);
    console.log('Body:', data.body);
  });</pre>
  </div>
  
  <div class="note">
    <strong>Need this because of the error above?</strong> Just proxy your request through cors.io and it will add the missing CORS headers for you.
    The service supports GET, POST, and OPTIONS methods and will echo the response body so you can debug what your API is returning.
  </div>
  
  <h2>Features</h2>
  <ul>
    <li>✓ CORS headers enabled (Access-Control-Allow-Origin: *)</li>
    <li>✓ Supports GET, POST, and OPTIONS methods</li>
    <li>✓ Strips hop-by-hop headers</li>
    <li>✓ Returns JSON response format</li>
    <li>✓ Proxies request headers and body</li>
  </ul>
</body>
</html>`;

// Add CORS headers to a response
function addCorsHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', '*');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', '*');
  headers.set('Access-Control-Max-Age', '86400');
  return headers;
}

// Strip hop-by-hop headers from response headers
function stripHopByHopHeaders(headers) {
  const cleaned = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!HOP_BY_HOP_HEADERS.includes(key.toLowerCase())) {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// Proxy a URL and return JSON response
async function proxyUrl(url, request) {
  try {
    // Prepare fetch options
    const fetchOptions = {
      method: request.method,
      headers: {},
    };

    // Copy headers from original request (excluding hop-by-hop)
    for (const [key, value] of request.headers.entries()) {
      if (!HOP_BY_HOP_HEADERS.includes(key.toLowerCase())) {
        fetchOptions.headers[key] = value;
      }
    }

    // Include body for POST requests
    if (request.method === 'POST' && request.body) {
      fetchOptions.body = await request.text();
    }

    // Fetch the target URL
    const response = await fetch(url, fetchOptions);

    // Get response body as text
    const body = await response.text();

    // Convert headers to plain object and strip hop-by-hop headers
    const responseHeaders = {};
    for (const [key, value] of response.headers.entries()) {
      responseHeaders[key] = value;
    }
    const cleanedHeaders = stripHopByHopHeaders(responseHeaders);

    // Build JSON response
    const jsonResponse = {
      url: url,
      status: response.status,
      headers: cleanedHeaders,
      body: body,
    };

    // Return JSON with CORS headers
    return new Response(JSON.stringify(jsonResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': '*',
        'Access-Control-Max-Age': '86400',
      },
    });
  } catch (error) {
    // Return error as JSON
    return new Response(
      JSON.stringify({
        url: url,
        status: 0,
        headers: {},
        body: `Error: ${error.message}`,
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      }
    );
  }
}

// Main request handler
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Handle OPTIONS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Get target URL from query parameters
    const targetUrl = url.searchParams.get('url') || url.searchParams.get('u');

    // If no target URL, return landing page
    if (!targetUrl) {
      return new Response(LANDING_PAGE, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    // Proxy the target URL
    return proxyUrl(targetUrl, request);
  },
};
