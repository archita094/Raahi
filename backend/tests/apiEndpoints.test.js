const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');

let mongoServer;

beforeAll(async () => {

}, 30000);

afterAll(async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
});

describe('Raahi REST API Endpoint Tests', () => {
  test('GET /api/health returns 200 ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/stops/search returns matching stops', async () => {
    const res = await request(app).get('/api/stops/search?q=Sector%2017');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/routes/plan calculates routes for valid origin & destination', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({
        origin: { latitude: 30.7398, longitude: 76.7865 },
        destination: { latitude: 30.7208, longitude: 76.7451 },
        preferences: { priority: 'balanced' }
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recommendedRoute).toBeDefined();
    expect(res.body.data.availableRoutes.length).toBeGreaterThan(0);
  });

  test('POST /api/routes/plan returns error on missing params', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_REQUEST');
  });

  test('POST /api/admin/import-pdf rejects unauthorized requests without admin key', async () => {
    const res = await request(app).post('/api/admin/import-pdf');
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  test('POST /api/admin/import-pdf accepts requests with valid admin key', async () => {
    const adminKey = process.env.ADMIN_API_KEY || 'raahi_ctu_admin_secret_key_2026';
    const res = await request(app)
      .post('/api/admin/import-pdf')
      .set('x-admin-key', adminKey);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.routesImported).toBeGreaterThan(0);
  });
});

