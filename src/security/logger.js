// Logger — Winston-based structured logging with rotation

import winston from 'winston';
import path from 'path';
import fs from 'fs';

export function createLogger(config = {}) {
  const logDir = config.logDir || 'logs';
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

  const logger = winston.createLogger({
    level: config.level || process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
      winston.format.errors({ stack: true }),
      winston.format.json()
    ),
    defaultMeta: { service: 'naos' },
    transports: [
      // Console with colors
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
            const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp} [${level}] ${message}${metaStr}`;
          })
        ),
      }),
      // File transport
      new winston.transports.File({
        filename: path.join(logDir, 'naos.log'),
        maxsize: 5 * 1024 * 1024, // 5MB
        maxFiles: 3,
      }),
      // Error-only file
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        maxsize: 5 * 1024 * 1024,
        maxFiles: 3,
      }),
    ],
  });

  return logger;
}
