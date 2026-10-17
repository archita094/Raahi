const express = require('express');
const router = express.Router();
const { getRouteByNumber, planJourney } = require('../controllers/routeController');

router.get('/routes/:routeNumber', getRouteByNumber);
router.post('/routes/plan', planJourney);
router.post('/routes/search', planJourney);

module.exports = router;

