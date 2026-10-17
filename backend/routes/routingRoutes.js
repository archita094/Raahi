const express = require('express');
const router = express.Router();
const {
  getWalkingRoute,
  getRoadCorridorRoute,
  enrichJourney,
  getAutocompleteSuggestions
} = require('../controllers/routingController');

router.get('/walk', getWalkingRoute);
router.post('/road-corridor', getRoadCorridorRoute);
router.post('/enrich-journey', enrichJourney);
router.get('/autocomplete', getAutocompleteSuggestions);

module.exports = router;

