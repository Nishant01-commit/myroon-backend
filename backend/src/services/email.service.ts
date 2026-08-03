import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../config/logger';
import EmailLog from '../models/EmailLog';

import { emailQueue } from '../queues/email.queue';

export interface EmailInput {
  to: string;
  subject: string;
  html: string;
  /** e.g. 'email_verification', 'password_reset', 'booking_confirmation' — tracked on EmailLog */
  template: string;
  relatedBooking?: string;
}

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

const smtpTransport =
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS
    ? nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ?? 587,
        secure: env.SMTP_PORT === 465,
        auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      })
    : null;

/**
 * Enqueues an email — this is what controllers call, and what auth.controller.ts already
 * calls unchanged from Phase 2. The actual send now happens on the BullMQ worker
 * (queues/email.worker.ts), not inline, so a slow or flaky provider can no longer add
 * latency to the request that triggered the email.
 */
export const sendEmail = async ({ to, subject, html, template, relatedBooking }: EmailInput): Promise<void> => {
  const log = await EmailLog.create({ to, subject, template, status: 'queued', relatedBooking });

  await emailQueue.add(
    'send-email',
    { to, subject, html, template, relatedBooking, emailLogId: String(log._id) },
    {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: true,
      removeOnFail: 100, // keep the last 100 failures around on the queue for inspection
    }
  );
};

/**
 * Does the actual sending. Called only by the BullMQ worker — never call this directly from
 * a controller. Unlike Phase 2's version, this RE-THROWS on failure: that's what tells BullMQ
 * the attempt failed and it should retry with backoff, rather than silently treating it as
 * done. EmailLog still ends up correct either way — 'sent' on success, 'failed' once the
 * worker's `failed` handler sees every attempt has been exhausted.
 */
export const sendEmailNow = async ({
  to,
  subject,
  html,
  emailLogId,
}: EmailInput & { emailLogId: string }): Promise<void> => {
  try {
    if (resend) {
      const result = await resend.emails.send({ from: env.EMAIL_FROM, to, subject, html });
      if (result.error) throw new Error(result.error.message);
    } else if (smtpTransport) {
      await smtpTransport.sendMail({ from: env.EMAIL_FROM, to, subject, html });
    } else {
      throw new Error('No email provider configured — set RESEND_API_KEY or SMTP_* in .env');
    }

    await EmailLog.findByIdAndUpdate(emailLogId, { status: 'sent', sentAt: new Date() });
  } catch (err) {
    logger.error(`Email to ${to} failed (will retry if attempts remain): ${(err as Error).message}`);
    await EmailLog.findByIdAndUpdate(emailLogId, {
      status: 'retrying',
      lastError: (err as Error).message,
      $inc: { attempts: 1 },
    });
    throw err;
  }
};
