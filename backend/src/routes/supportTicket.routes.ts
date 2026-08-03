import { Router } from 'express';
import {
  createTicket,
  listMyTickets,
  listAllTickets,
  getTicketById,
  replyToTicket,
  updateTicketStatus,
} from '../controllers/supportTicket.controller';
import { protect, authorize } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { imageUpload } from '../middleware/upload';
import { createTicketSchema, replyTicketSchema, updateTicketStatusSchema } from '../validators/supportTicket.validator';

const router = Router();
router.use(protect);

/**
 * @openapi
 * /support-tickets:
 *   post:
 *     summary: Open a support ticket, with optional attachments
 *     tags: [Support]
 * /support-tickets/my:
 *   get:
 *     summary: List the caller's own tickets
 *     tags: [Support]
 * /support-tickets/all:
 *   get:
 *     summary: List every ticket, optional ?status= filter (admin only)
 *     tags: [Support]
 * /support-tickets/{id}:
 *   get:
 *     summary: Get one ticket with its reply thread
 *     tags: [Support]
 * /support-tickets/{id}/reply:
 *   post:
 *     summary: Add a reply to a ticket's thread
 *     tags: [Support]
 * /support-tickets/{id}/status:
 *   patch:
 *     summary: Update a ticket's status (admin only)
 *     tags: [Support]
 */
router.post('/', imageUpload.array('attachments', 5), validate(createTicketSchema), createTicket);
router.get('/my', listMyTickets);
router.get('/all', authorize('admin'), listAllTickets);
router.get('/:id', getTicketById);
router.post('/:id/reply', validate(replyTicketSchema), replyToTicket);
router.patch('/:id/status', authorize('admin'), validate(updateTicketStatusSchema), updateTicketStatus);

export default router;
