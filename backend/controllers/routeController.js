const Route = require('../models/Route');
const { planJourneyWithLangGraph } = require('../services/routePlanningGraph');

async function getRouteByNumber(req, res, next) {
  try {
    const { routeNumber } = req.params;
    const route = await Route.findOne({ routeNumber: routeNumber.toUpperCase() })
      .populate('directions.stops')
      .lean();

    if (!route) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ROUTE_NOT_FOUND',
          message: `CTU bus route '${routeNumber}' was not found in timetable database.`
        }
      });
    }

    res.json({
      success: true,
      data: route
    });
  } catch (error) {
    next(error);
  }
}

async function planJourney(req, res, next) {
  try {

    const source = req.body.source || req.body.origin;
    const destination = req.body.destination;
    const rawPrefs = req.body.preferences || {};
    const timingMode = req.body.timingMode || rawPrefs.timingMode || (req.body.departureTime ? 'later' : 'now');
    const preferences = { ...rawPrefs, timingMode };
    const departureTime = req.body.departureTime || req.body.time || preferences.departureTime || preferences.time || null;

    if (!source || !destination) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_REQUEST',
          message: 'Both Source and Destination must be provided.'
        }
      });
    }

    const result = await planJourneyWithLangGraph({
      source,
      destination,
      departureTime,
      timingMode,
      preferences
    });

    if (result.isSameLocation) {
      return res.json({
        success: true,
        data: result
      });
    }

    if (result.locationNotFound) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: result.message || 'Location not found in the current CTU data.'
        }
      });
    }

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRouteByNumber,
  planJourney
};

