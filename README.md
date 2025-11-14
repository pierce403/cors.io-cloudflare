# cors.io-cloudflare

cors.io, but as a cloudflare worker

A simple CORS proxy service built as a Cloudflare Worker that allows you to fetch resources from any URL with CORS headers enabled.

## Features

- ✓ CORS headers enabled (Access-Control-Allow-Origin: *)
- ✓ Supports GET, POST, and OPTIONS methods
- ✓ Strips hop-by-hop headers from proxied responses
- ✓ Returns JSON response format with url, status, headers, and body
- ✓ HTML landing page with usage instructions
- ✓ Single JavaScript file with ES modules syntax

## Usage

### Proxy a URL

Add `?url=` or `?u=` parameter with the target URL:

```
https://your-worker.workers.dev/?url=https://api.example.com/data
https://your-worker.workers.dev/?u=https://api.example.com/data
```

### Response Format

The proxy returns a JSON response:

```json
{
  "url": "https://api.example.com/data",
  "status": 200,
  "headers": {
    "content-type": "application/json",
    ...
  },
  "body": "response body content"
}
```

## Development

### Install Wrangler

```bash
npm install -g wrangler
```

### Run locally

```bash
wrangler dev
```

### Deploy

```bash
wrangler deploy
```

## Files

- `worker.js` - Main worker code with ES modules syntax
- `wrangler.toml` - Wrangler configuration
