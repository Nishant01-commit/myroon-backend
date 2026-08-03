import Notification, { NotificationType } from '../models/Notification';

export const createNotification = async (params: {
  user: string;
  type: NotificationType;
  title: string;
  message: string;
  relatedBooking?: string;
}) => Notification.create(params);
