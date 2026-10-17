const { importDistanceRoutes } = require('../scripts/import_distance_routes');

async function importPdfData(req, res, next) {
  try {
    const report = await importDistanceRoutes();

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  importPdfData
};

