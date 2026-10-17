const express = require('express');
const router = express.Router();
const { searchStops, getStopById, getNearbyStops } = require('../controllers/stopController');

router.get('/stops/search', searchStops);
router.get('/stops/nearby', getNearbyStops);
router.get('/stops/:id', getStopById);

module.exports = router;

