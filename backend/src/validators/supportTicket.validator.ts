import { z } from 'zod';

export const createTicketSchema = z.object({
  subject: z.string().trim().min(3, 'Subject is required').max(150),
  description: z.string().trim().min(10, 'Please describe the issue in a bit more detail'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const replyTicketSchema = z.object({
  message: z.string().trim().min(1, 'Reply cannot be empty'),
});

export const updateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});
