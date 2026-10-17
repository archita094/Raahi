require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const healthRoute = require('./routes/healthRoute');
const stopRoutes = require('./routes/stopRoutes');
const routeRoutes = require('./routes/routeRoutes');
const routingRoutes = require('./routes/routingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const Route = require('./models/Route');
const Stop = require('./models/Stop');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  skip: (req) => req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1',
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests from this IP, please try again later.'
    }
  }
});
app.use('/api/', apiLimiter);

app.use('/api', healthRoute);
app.use('/api', stopRoutes);
app.use('/api', routeRoutes);
app.use('/api/routing', routingRoutes);
app.use('/api', adminRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

let mongoServer = null;

async function startServer() {
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/raahi';

  try {
    console.log('[DB] Connecting to MongoDB at:', uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
    console.log('[DB] Successfully connected to MongoDB.');
  } catch (err) {
    console.log('[DB] Local MongoDB not running. Launching MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('[DB] Successfully connected to MongoMemoryServer:', uri);
  }

  const routeCount = await Route.countDocuments();
  const stopCount = await Stop.countDocuments();
  if (routeCount !== 13 || stopCount !== 251) {
    console.log(`[SEED] Syncing database to match user JSON (found routes: ${routeCount}/13, stops: ${stopCount}/251)...`);
    const { importDistanceRoutes } = require('./scripts/import_distance_routes');
    await importDistanceRoutes();
    console.log('[SEED] User distance dataset sync complete.');
  }

  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`\n🚀 Raahi CTU Bus Planner Backend running on http://localhost:${PORT}`);
      console.log(`   Health Check: http://localhost:${PORT}/api/health\n`);
    });
  }
}

startServer();

module.exports = app;

