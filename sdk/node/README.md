# AutoTrace Node.js SDK (`autotrace-node`)

Lightweight, zero-dependency Node.js client for autonomous error tracking and AI triage with [AutoTrace](https://autotrace.io).

## Installation

```bash
npm install autotrace-node
# or link locally:
npm link ./sdk/node
```

## Quickstart

```javascript
const autotrace = require('autotrace-node');

// 1. Initialize once at startup
autotrace.init({
  apiKey: '<YOUR_API_KEY>',
  endpointUrl: 'http://localhost:8000/api/ingest/',
  environment: 'production',
  context: { service: 'api-gateway', version: '1.0.0' },
});

// 2. Manual Exception Capture
try: {
  riskyOperation();
} catch (error) {
  autotrace.captureException(error, {
    endpoint: '/api/v1/checkout',
    userId: 'usr_456',
  });
}
```

## Framework Integrations

### Express Error Middleware

Place `autotrace.expressErrorHandler()` after your route handlers but before any custom error renderers:

```javascript
const express = require('express');
const autotrace = require('autotrace-node');

autotrace.init({ apiKey: '<YOUR_API_KEY>' });

const app = express();

// Your routes
app.get('/api/users', (req, res) => { /* ... */ });

// AutoTrace Error Handler
app.use(autotrace.expressErrorHandler());

// Fallback error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Internal Server Error' });
});
```

### Global Process Error Hooks

Capture any uncaught exceptions or unhandled promise rejections anywhere in your Node.js process:

```javascript
autotrace.captureGlobalUncaught();
```
