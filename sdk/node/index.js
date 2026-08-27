/**
 * AutoTrace Node.js SDK (autotrace-node)
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * Lightweight client for capturing and reporting Node.js exceptions
 * asynchronously to the AutoTrace ingestion endpoint.
 */

'use strict';

const os = require('os');

const DEFAULT_ENDPOINT = 'http://localhost:8000/api/ingest/';
const DEFAULT_ENVIRONMENT = 'production';
const TIMEOUT_MS = 5000;

const SENSITIVE_REGEX = /password|secret|token|authorization|api_key|access_token/i;
const MASK_VALUE = '********';

/**
 * Recursively scrub sensitive keys from an object or array.
 */
function sanitizeData(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  const sanitized = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_REGEX.test(key)) {
      sanitized[key] = MASK_VALUE;
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

class AutoTrace {
  constructor() {
    this.apiKey = null;
    this.endpointUrl = DEFAULT_ENDPOINT;
    this.environment = DEFAULT_ENVIRONMENT;
    this.defaultContext = {};
    this.initialized = false;
  }

  /**
   * Initialize the AutoTrace client.
   * @param {Object} options
   * @param {string} options.apiKey - Project API Key (autotrace_pk_...)
   * @param {string} [options.endpointUrl] - Ingest URL (default: http://localhost:8000/api/ingest/)
   * @param {string} [options.environment] - 'production' | 'staging' | 'development'
   * @param {Object} [options.context] - Default context metadata
   */
  init(options = {}) {
    if (!options.apiKey) {
      console.warn('[AutoTrace] Warning: apiKey was not provided in autotrace.init()');
    }
    this.apiKey = (options.apiKey || '').trim();
    this.endpointUrl = options.endpointUrl || DEFAULT_ENDPOINT;
    this.environment = options.environment || DEFAULT_ENVIRONMENT;
    this.defaultContext = options.context || {};
    this.initialized = true;
    return this;
  }

  /**
   * Capture and asynchronously dispatch an error event to AutoTrace.
   * @param {Error|any} error
   * @param {Object} [context] - Request or application context
   * @returns {Promise<{status: number, data: any}|null>}
   */
  async captureException(error, context = {}) {
    if (!this.apiKey) {
      if (!this.initialized) {
        console.warn('[AutoTrace] Not initialized. Call autotrace.init({ apiKey }) first.');
      }
      return null;
    }

    // 1. Resolve exception metadata
    const errorType = (error && error.name) ? error.name : (typeof error === 'object' && error?.constructor?.name) || 'Error';
    const errorMessage = (error && error.message) ? error.message : String(error);

    // 2. Parse stack trace into clean string array
    let traceback = [];
    if (error && error.stack) {
      traceback = error.stack
        .split('\n')
        .map((line) => line.trimEnd())
        .filter(Boolean);
    } else {
      traceback = [`${errorType}: ${errorMessage}`];
    }

    // 3. Runtime & system metadata
    const runtime = `node ${process.version}`;
    const endpoint = context.endpoint || context.path || '';

    // 4. Merge context
    const mergedContext = {
      ...this.defaultContext,
      environment: this.environment,
      os: `${os.type()} ${os.release()} (${os.arch()})`,
      nodeVersion: process.version,
      pid: process.pid,
      timestamp: new Date().toISOString(),
      ...context,
    };

    // 5. Construct universal ingestion payload
    const payload = {
      error_type: errorType,
      error_message: errorMessage,
      endpoint: endpoint,
      runtime: runtime,
      traceback: traceback,
      context: sanitizeData(mergedContext),
    };

    // 6. Non-blocking asynchronous dispatch
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(this.endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
          'User-Agent': `autotrace-node/0.1.0 (Node ${process.version})`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));
      return { status: response.status, data };
    } catch (err) {
      // Fail silently so client applications never crash due to monitoring network failures
      if (process.env.AUTOTRACE_DEBUG) {
        console.error('[AutoTrace] Failed to deliver error event (suppressed):', err.message);
      }
      return null;
    }
  }

  /**
   * Express error-handling middleware.
   * Usage: app.use(autotrace.expressErrorHandler());
   */
  expressErrorHandler() {
    return (err, req, res, next) => {
      const context = {
        endpoint: req.originalUrl || req.url || '',
        method: req.method || 'GET',
        headers: req.headers || {},
        query: req.query || {},
        ip: req.ip || req.socket?.remoteAddress,
        body: req.body || null,
      };

      // Non-blocking capture
      this.captureException(err, context).catch(() => {});

      // Always pass to the next Express error handler
      next(err);
    };
  }

  /**
   * Register global uncaught exception and unhandled rejection hooks.
   */
  captureGlobalUncaught() {
    process.on('uncaughtException', (err) => {
      console.error('[AutoTrace] Captured Uncaught Exception:', err);
      this.captureException(err, { origin: 'uncaughtException' }).finally(() => {
        // Allow time for event to hit network before process exits if fatal
        setTimeout(() => process.exit(1), 500);
      });
    });

    process.on('unhandledRejection', (reason) => {
      console.error('[AutoTrace] Captured Unhandled Rejection:', reason);
      const error = reason instanceof Error ? reason : new Error(String(reason));
      this.captureException(error, { origin: 'unhandledRejection' });
    });

    return this;
  }
}

// Export singleton instance + class
const autotrace = new AutoTrace();
autotrace.AutoTrace = AutoTrace;
autotrace.sanitizeData = sanitizeData;

module.exports = autotrace;
