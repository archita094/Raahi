const Stop = require('../models/Stop');
const { geocode } = require('../services/geocodingService');

async function searchStops(req, res, next) {
  try {
    const q = req.query.q ? req.query.q.trim() : '';

    if (!q) {
      const defaultStops = await Stop.find({}).limit(10).lean();
      return res.json({
        success: true,
        data: defaultStops.map(s => ({
          id: s._id,
          name: s.name,
          detail: s.sector ? `Sector ${s.sector}, Chandigarh` : s.name,
          location: s.location
        }))
      });
    }

    const regex = new RegExp(q, 'i');
    let stops = await Stop.find({
      $or: [
        { name: regex },
        { normalizedName: regex },
        { aliases: regex }
      ]
    }).limit(10).lean();

    if (stops.length === 0) {

      const geo = await geocode(q);
      stops = geo ? [{
        _id: `geo-${Date.now()}`,
        name: geo.name,
        sector: geo.sector,
        location: geo.location
      }] : [];
    }

    res.json({
      success: true,
      data: stops.map(s => ({
        id: s._id,
        name: s.name,
        detail: s.sector ? `Sector ${s.sector}, Chandigarh` : s.name,
        location: s.location
      }))
    });
  } catch (error) {
    next(error);
  }
}

async function getStopById(req, res, next) {
  try {
    const { id } = req.params;
    let stop = null;

    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      stop = await Stop.findById(id).lean();
    } else {
      stop = await Stop.findOne({ normalizedName: id.toLowerCase() }).lean();
    }

    if (!stop) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'STOP_NOT_FOUND',
          message: `Bus stop with ID '${id}' was not found.`
        }
      });
    }

    res.json({
      success: true,
      data: stop
    });
  } catch (error) {
    next(error);
  }
}

async function getNearbyStops(req, res, next) {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const radiusMeters = parseInt(req.query.radius || '2000', 10);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_LOCATION',
          message: 'The provided latitude and longitude coordinates are invalid.'
        }
      });
    }

    let stops = [];
    try {
      stops = await Stop.find({
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: radiusMeters
          }
        }
      }).limit(15).lean();
    } catch (e) {

      stops = await Stop.find({}).limit(50).lean();
    }

    res.json({
      success: true,
      data: stops
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchStops,
  getStopById,
  getNearbyStops
};

