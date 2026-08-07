import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import morgan from 'morgan';
import mongoSanitize from 'express-mongo-sanitize';
import hpp from 'hpp';
import mongoose from 'mongoose';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import publicRoomRoutes from "./routes/publicRoom.routes";
import { env } from './config/env';
import { morganStream } from './config/logger';
import { generalLimiter } from './middleware/rateLimiter';
import { notFound, errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth.routes';
import hotelRoutes from './routes/hotel.routes';
import bookingRoutes from './routes/booking.routes';
import paymentRoutes from './routes/payment.routes';
import reviewRoutes from './routes/review.routes';
import customerRoutes from './routes/customer.routes';
import ownerRoutes from './routes/owner.routes';
import adminRoutes from './routes/admin.routes';
import supportTicketRoutes from './routes/supportTicket.routes';

const app: Application = express();


app.use(helmet());
// app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
app.use(cors({
    origin: [
        "https://myroomm.in",
        "https://www.myroomm.in"
    ],
    credentials: true,
}));

app.use("/api/v1/rooms", publicRoomRoutes);
app.use("/api/v1/hotels", hotelRoutes);
app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "MyRoomm backend API is running",
  });
});

app.use(compression());
app.use(
  express.json({
    limit: '10kb',
    verify: (req, res, buf) => {
      // Razorpay's webhook signature is computed over the exact raw bytes — JSON.stringify(req.body)
      // is not guaranteed to reproduce them (key order, whitespace), so this is captured separately.
      (req as { rawBody?: Buffer }).rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(hpp());
app.use(morgan('combined', { stream: morganStream }));
app.use('/api', generalLimiter);

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

// Populated as routes are added in later phases — the JSDoc comments on each
// route file will feed this spec automatically.
const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'MyRoomm.in API', version: '0.1.0', description: 'Hotel room booking platform API' },
    servers: [{ url: '/api/v1' }],
  },
  apis: ['./src/routes/*.ts'],
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// All route modules through Phase 5:
app.use('/api/v1/auth', authRoutes); // rooms are nested: /api/v1/hotels/:hotelId/rooms
app.use('/api/v1/bookings', bookingRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/reviews', reviewRoutes);
app.use('/api/v1/customer', customerRoutes);
app.use('/api/v1/owner', ownerRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/support-tickets', supportTicketRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
