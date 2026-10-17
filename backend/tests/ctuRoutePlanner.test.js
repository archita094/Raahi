const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const request = require('supertest');
const app = require('../server');
const { importDistanceRoutes } = require('../scripts/import_distance_routes');

let mongoServer;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/raahi';
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    } catch (e) {
      mongoServer = await MongoMemoryServer.create();
      await mongoose.connect(mongoServer.getUri());
    }
  }
  await importDistanceRoutes();
}, 30000);

afterAll(async () => {
  if (mongoServer) {
    await mongoose.disconnect();
    await mongoServer.stop();
  }
});

describe('CTU Deterministic Route Planner Tests', () => {

  test('Test 1 — Direct route (ISBT 43 to PGI)', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({ source: 'ISBT 43', destination: 'PGI' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.directRoutes.length).toBeGreaterThan(0);

    const direct = res.body.data.directRoutes[0];
    expect(direct.transfers).toBe(0);
    expect(['551', '23A']).toContain(direct.busNumber);
    expect(direct.distance).toBeGreaterThan(0);
    expect(direct.estimatedTime).toBeGreaterThan(0);
  });

  test('Test 2 — Both Direct and Transfer routes returned when available', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({ source: 'ISBT 43', destination: 'ISBT 17' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    expect(res.body.data.directRoutes.length).toBeGreaterThan(0);
    expect(res.body.data.transferRoutes.length).toBeGreaterThan(0);

    const direct = res.body.data.directRoutes[0];
    const transfer = res.body.data.transferRoutes[0];

    expect(direct.transfers).toBe(0);
    expect(transfer.transfers).toBe(1);
    expect(transfer.transferStops.length).toBeGreaterThan(0);
  });

  test('Test 3 — Transfer only route (Kharar to PGI)', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({ source: 'Kharar', destination: 'PGI' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.directRoutes.length).toBe(0);
    expect(res.body.data.transferRoutes.length).toBeGreaterThan(0);

    const transfer = res.body.data.transferRoutes[0];
    expect(transfer.transfers).toBe(1);
    expect(transfer.busNumbers.length).toBe(2);
    expect(['ISBT 17', 'ISBT 43']).toContain(transfer.transferStops[0]);
  });

  test('Test 4 — Non-bus-stop location finds nearest CTU stop', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({ source: 'Elante Mall', destination: 'PGI' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.sourceStop.isExactMatch).toBe(false);
    expect(res.body.data.sourceStop.distanceKm).toBeGreaterThan(0);
    expect(res.body.data.availableRoutes.length).toBeGreaterThan(0);
  });

  test('Test 5 — Invalid / unknown location returns clear error without fabricating', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({ source: 'Atlantis Underwater City XYZ', destination: 'PGI' });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('not found in the current CTU data');
  });

  test('Test 6 — Same source and destination handled gracefully', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({ source: 'PGI', destination: 'PGI' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.isSameLocation).toBe(true);
    expect(res.body.data.message).toContain('same');
  });

  test('Test 7 — Direct buses are not broken into artificial transfers (Kharar to ISBT 17)', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({ source: 'Kharar', destination: 'ISBT 17' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.directRoutes.length).toBeGreaterThan(0);

    expect(res.body.data.transferRoutes.length).toBe(0);
  });
});

