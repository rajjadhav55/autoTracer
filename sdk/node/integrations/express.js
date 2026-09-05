'use strict';

module.exports = function expressIntegration(autotraceClient) {
  const sanitize = typeof autotraceClient?.sanitizeData === 'function'
    ? autotraceClient.sanitizeData
    : (data) => data;

  return function expressErrorHandler(err, req, res, next) {
    const context = {
      endpoint: req.originalUrl || req.url || '',
      method: req.method || 'GET',
      headers: sanitize(req.headers || {}),
      query: sanitize(req.query || {}),
      ip: req.ip || req.socket?.remoteAddress,
      body: sanitize(req.body || null),
    };

    autotraceClient.captureException(err, context).catch(() => {});
    next(err);
  };
};
