import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const redisConnection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

export interface EmailJobData {
  to: string;
  subject: string;
  html: string;
  template: string;
  relatedBooking?: string;
  emailLogId: string;
}

export const emailQueue = new Queue<EmailJobData>('emails', { connection: redisConnection });
