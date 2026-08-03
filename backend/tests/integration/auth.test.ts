import request from 'supertest';
import app from '../../src/app';
import User from '../../src/models/User';
import { sendEmail } from '../../src/services/email.service';

describe('Auth flow (integration)', () => {
  const testUser = { name: 'Priya Verma', email: 'priya@test.com', password: 'password123' };

  it('registers a new customer', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(testUser.email);
    expect(res.body.data.role).toBe('customer');
  });

  it('rejects a duplicate email', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  it('rejects login with the wrong password', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('logs in, sets a refresh cookie, and can then fetch /me with the access token', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });
    expect(loginRes.status).toBe(200);

    const { accessToken } = loginRes.body.data;
    expect(accessToken).toBeDefined();

    const cookies = loginRes.headers['set-cookie'] as unknown as string[];
    expect(cookies?.some((c) => c.startsWith('myroomm_refresh_token='))).toBe(true);

    const meRes = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.email).toBe(testUser.email);
  });

  it('rejects /me with no token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  it('verifies email using the token from the (mocked) verification email', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);

    // sendEmail is mocked (tests/mocks.setup.ts) rather than actually sent — this pulls the
    // raw token back out of the HTML it was called with, so the full hash-and-compare flow
    // in verifyEmail still gets genuinely exercised.
    const calls = (sendEmail as jest.Mock).mock.calls;
    const verificationCall = calls.find((call) => call[0].template === 'email_verification');
    expect(verificationCall).toBeDefined();

    const match = (verificationCall![0].html as string).match(/verify-email\/([a-f0-9]+)/);
    expect(match).toBeTruthy();
    const rawToken = match![1];

    const res = await request(app).get(`/api/v1/auth/verify-email/${rawToken}`);
    expect(res.status).toBe(200);

    const user = await User.findOne({ email: testUser.email });
    expect(user?.isEmailVerified).toBe(true);
  });

  it('rejects an invalid verification token', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const res = await request(app).get('/api/v1/auth/verify-email/not-the-real-token');
    expect(res.status).toBe(400);
  });

  it('refreshes the access token using the refresh cookie', async () => {
    await request(app).post('/api/v1/auth/register').send(testUser);
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password });

    const cookie = (loginRes.headers['set-cookie'] as unknown as string[])[0];
    const refreshRes = await request(app).post('/api/v1/auth/refresh-token').set('Cookie', cookie);

    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.data.accessToken).toBeDefined();
  });
});
