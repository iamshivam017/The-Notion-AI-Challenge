// Server middleware — validation, rate limiting, error handling, request logging

import rateLimit from 'express-rate-limit';

export function createMiddleware(logger) {
  // Rate limit middleware for Express
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 500,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });

  // Request logger 
  const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info(`${req.method} ${req.url} ${res.statusCode} (${duration}ms)`);
    });
    next();
  };

  // Error handler
  const errorHandler = (err, req, res, _next) => {
    logger.error(`Unhandled error: ${err.message}`, { stack: err.stack });
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  };

  return { apiLimiter, requestLogger, errorHandler };
}
