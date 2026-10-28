const request = require('supertest');
const app = require('../../src/app');

// Mock the database
jest.mock('../../src/config/database', () => {
  const mockQuery = jest.fn();
  const mockGetConnection = jest.fn(() => ({
    beginTransaction: jest.fn(),
    commit: jest.fn(),
    rollback: jest.fn(),
    release: jest.fn(),
    query: mockQuery,
  }));
  return { query: mockQuery, getConnection: mockGetConnection };
});

const db = require('../../src/config/database');

describe('Auth API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('POST /api/auth/login - missing fields returns 422', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'test@test.com' });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('POST /api/auth/login - invalid email returns 422', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'notanemail', password: 'pass' });
    expect(res.status).toBe(422);
  });

  it('POST /api/auth/login - unknown user returns 401', async () => {
    db.query.mockResolvedValueOnce([[]]);
    const res = await request(app).post('/api/auth/login').send({ email: 'x@test.com', password: 'Test@1234' });
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid/i);
  });

  it('GET /api/auth/me - no token returns 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('POST /api/auth/refresh - missing token returns 422', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(422);
  });
});

describe('Role-based access', () => {
  it('GET /api/staff - no auth returns 401', async () => {
    const res = await request(app).get('/api/staff');
    expect(res.status).toBe(401);
  });

  it('GET /api/programs - no auth returns 401', async () => {
    const res = await request(app).get('/api/programs');
    expect(res.status).toBe(401);
  });
});

describe('Health check', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});
