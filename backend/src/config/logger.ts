import winston from 'winston';
import { env } from './env';

// winston's default ("npm") levels already include error/warn/info/http/verbose/debug/silly,
// so morgan's HTTP request logs can use logger.http(...) with no custom level config needed.

const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  env.NODE_ENV === 'production'
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.printf((info) => `${info.timestamp} ${info.level}: ${info.stack || info.message}`)
      )
);

export const logger = winston.createLogger({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  format,
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exitOnError: false,
});

export const morganStream = {
  write: (message: string) => logger.http(message.trim()),
};
