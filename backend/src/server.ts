import app from './app';
import { env } from './config/env';
import { connectDB } from './config/db';
import { logger } from './config/logger';
import { startEmailWorker } from './queues/email.worker';

const startServer = async () => {
  await connectDB();

  const server = app.listen(env.PORT, () => {
    logger.info(`MyRoomm API running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Runs in the same process as the API for now — simplest thing that works at this stage.
  // Split into its own deployable worker service later if email volume ever justifies scaling
  // it independently of the API.
  const emailWorker = startEmailWorker();
  logger.info('Email queue worker started.');

  process.on('unhandledRejection', (err: Error) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error(`Uncaught Exception: ${err.message}`);
    process.exit(1);
  });

  process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully.');
    server.close(() => logger.info('Process terminated.'));
    emailWorker.close();
  });
};

startServer();
