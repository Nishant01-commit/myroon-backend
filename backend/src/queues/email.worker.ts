import { Worker } from 'bullmq';
import { redisConnection, EmailJobData } from './email.queue';
import { sendEmailNow } from '../services/email.service';
import { logger } from '../config/logger';
import EmailLog from '../models/EmailLog';

export const startEmailWorker = () => {
  const worker = new Worker<EmailJobData>(
    'emails',
    async (job) => {
      await sendEmailNow(job.data);
    },
    { connection: redisConnection }
  );

  worker.on('completed', (job) => {
    logger.info(`Email job ${job.id} sent to ${job.data.to} (${job.data.template})`);
  });

  worker.on('failed', async (job, err) => {
    logger.error(`Email job ${job?.id} failed: ${err.message}`);
    // Only mark it permanently 'failed' once BullMQ has exhausted all retry attempts —
    // sendEmailNow already marks it 'retrying' after each individual attempt.
    if (job && job.attemptsMade >= (job.opts.attempts ?? 1)) {
      await EmailLog.findByIdAndUpdate(job.data.emailLogId, { status: 'failed', lastError: err.message });
    }
  });

  return worker;
};
