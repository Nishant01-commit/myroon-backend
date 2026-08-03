// Runs before the test framework loads and before any test file imports application code —
// config/env.ts validates process.env at import time and calls process.exit(1) if required
// vars are missing, so these have to exist before anything else gets imported.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/myroomm-test-placeholder'; // unused for real
// connections — tests/db.setup.ts points mongoose at mongodb-memory-server's own URI instead.
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.RAZORPAY_KEY_SECRET = 'test-razorpay-key-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = 'test-razorpay-webhook-secret';
