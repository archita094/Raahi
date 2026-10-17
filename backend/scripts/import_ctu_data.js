require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { importDistanceRoutes } = require('./import_distance_routes');

async function runImport() {
  let mongoServer = null;
  let uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/raahi';

  try {
    console.log('Connecting to MongoDB at:', uri);
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 2000 });
  } catch (err) {
    console.log('Local MongoDB not detected. Starting embedded MongoMemoryServer...');
    mongoServer = await MongoMemoryServer.create();
    uri = mongoServer.getUri();
    await mongoose.connect(uri);
    console.log('Connected to MongoMemoryServer:', uri);
  }

  try {
    console.log('Starting CTU distance dataset import from user JSON...');
    const report = await importDistanceRoutes();
    console.log('\n========================================');
    console.log('CTU PDF IMPORT REPORT');
    console.log('========================================');
    console.log(JSON.stringify(report, null, 2));
    console.log('========================================\n');
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  }
}

if (require.main === module) {
  runImport();
}

module.exports = runImport;

