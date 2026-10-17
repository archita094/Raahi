const mongoose = require('mongoose');

const FareRuleSchema = new mongoose.Schema({
  busType: {
    type: String,
    enum: ['ordinary', 'ac', 'express', 'all'],
    default: 'all'
  },
  minDistanceKm: {
    type: Number,
    required: true,
    default: 0
  },
  maxDistanceKm: {
    type: Number,
    required: true,
    default: 999
  },
  fareAmount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'INR'
  },
  source: {
    type: String,
    default: 'CTU Fare Policy'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('FareRule', FareRuleSchema);

