'use strict';

module.exports = function expressIntegration(autotraceClient) {
  return function expressErrorHandler(err, req, res, next) {
    const context = {
      endpoint: req.originalUrl || req.url || '',
      method: req.method || 'GET',
      headers: req.headers || {},
      query: req.query || {},
      ip: req.ip || req.socket?.remoteAddress,
      body: req.body || null,
    };

    autotraceClient.captureException(err, context).catch(() => {});
    next(err);
  };
};
