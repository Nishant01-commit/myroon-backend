import { Response } from 'express';
import { Types } from 'mongoose';
import SupportTicket from '../models/SupportTicket';
import { ApiError, ApiResponse, catchAsync } from '../utils/apiHelpers';
import { AuthRequest } from '../middleware/auth';
import { uploadImages } from '../services/upload.service';

export const createTicket = catchAsync(async (req: AuthRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  const uploaded = files.length ? await uploadImages(files, 'support-tickets') : [];

  const ticket = await SupportTicket.create({
    user: req.user!.userId,
    subject: req.body.subject,
    description: req.body.description,
    priority: req.body.priority,
    attachments: uploaded.map((f) => f.url),
  });

  return ApiResponse.success(res, ticket, "Support ticket created — we'll get back to you soon.", 201);
});

export const listMyTickets = catchAsync(async (req: AuthRequest, res: Response) => {
  const tickets = await SupportTicket.find({ user: req.user!.userId }).sort({ createdAt: -1 });
  return ApiResponse.success(res, tickets);
});

export const listAllTickets = catchAsync(async (req: AuthRequest, res: Response) => {
  const { status } = req.query as { status?: string };
  const filter = status ? { status } : {};
  const tickets = await SupportTicket.find(filter).sort({ createdAt: -1 }).populate('user', 'name email');
  return ApiResponse.success(res, tickets);
});

export const getTicketById = catchAsync(async (req: AuthRequest, res: Response) => {
  const ticket = await SupportTicket.findById(req.params.id)
    .populate('user', 'name email')
    .populate('replies.sender', 'name role');

  if (!ticket) throw new ApiError(404, 'Ticket not found.');
  if (String(ticket.user) !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to view this ticket.');
  }

  return ApiResponse.success(res, ticket);
});

export const replyToTicket = catchAsync(async (req: AuthRequest, res: Response) => {
  const ticket = await SupportTicket.findById(req.params.id);
  if (!ticket) throw new ApiError(404, 'Ticket not found.');
  if (String(ticket.user) !== req.user!.userId && req.user!.role !== 'admin') {
    throw new ApiError(403, 'You do not have permission to reply to this ticket.');
  }

  ticket.replies.push({
    sender: new Types.ObjectId(req.user!.userId),
    message: req.body.message,
    attachments: [],
    createdAt: new Date(),
  });
  if (req.user!.role === 'admin' && ticket.status === 'open') ticket.status = 'in_progress';
  await ticket.save();

  return ApiResponse.success(res, ticket, 'Reply added.');
});

export const updateTicketStatus = catchAsync(async (req: AuthRequest, res: Response) => {
  const ticket = await SupportTicket.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
  if (!ticket) throw new ApiError(404, 'Ticket not found.');
  return ApiResponse.success(res, ticket, 'Ticket status updated.');
});
