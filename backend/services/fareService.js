const FareRule = require('../models/FareRule');

async function calculateFare(distanceKm, busType = 'ordinary') {
  if (typeof distanceKm !== 'number' || distanceKm <= 0) {
    return {
      amount: null,
      formatted: 'N/A',
      currency: 'INR',
      isEstimated: false
    };
  }

  const mongoose = require('mongoose');
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    try {

      const rule = await FareRule.findOne({
        busType: { $in: [busType, 'all'] },
        minDistanceKm: { $lte: distanceKm },
        maxDistanceKm: { $gte: distanceKm }
      });

      if (rule) {
        return {
          amount: rule.fareAmount,
          formatted: `₹${rule.fareAmount}`,
          currency: rule.currency || 'INR',
          isEstimated: false
        };
      }
    } catch (err) {

    }
  }

  let amount = 10;
  if (distanceKm <= 5) {
    amount = 10;
  } else if (distanceKm <= 10) {
    amount = 25;
  } else if (distanceKm <= 15) {
    amount = 40;
  } else {
    amount = 45;
  }

  return {
    amount,
    formatted: `₹${amount}`,
    currency: 'INR',
    isEstimated: true
  };
}

module.exports = {
  calculateFare
};

