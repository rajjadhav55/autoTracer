'use strict';

module.exports = function globalIntegration(autotraceClient) {
  process.on('uncaughtException', (err) => {
    autotraceClient.captureException(err, { origin: 'uncaughtException' }).finally(() => {
      setTimeout(() => process.exit(1), 500);
    });
  });

  process.on('unhandledRejection', (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    autotraceClient.captureException(error, { origin: 'unhandledRejection' });
  });
};
