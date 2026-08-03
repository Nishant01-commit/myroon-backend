// Mocking email.service.ts here (rather than mocking queues/email.queue.ts directly) means
// the real email.queue.ts — which opens a live ioredis connection at import time — never
// actually gets imported during a test run, so tests don't need Redis available at all.
jest.mock('../src/services/email.service', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  sendEmailNow: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../src/services/upload.service', () => ({
  uploadImages: jest.fn().mockResolvedValue([{ url: 'https://example.com/test-image.jpg', publicId: 'test-public-id' }]),
  deleteImage: jest.fn().mockResolvedValue(undefined),
}));
