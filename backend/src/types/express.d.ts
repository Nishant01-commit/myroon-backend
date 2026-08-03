// Augments Express's Request type with the raw request body buffer, captured by the
// `verify` callback on express.json() in app.ts. Razorpay webhook signatures are computed
// over the exact raw bytes, which JSON.stringify(req.body) is not guaranteed to reproduce.
declare namespace Express {
  export interface Request {
    rawBody?: Buffer;
  }
}
