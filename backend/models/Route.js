const mongoose = require('mongoose');

const DirectionSchema = new mongoose.Schema({
  from: { type: String, required: true, trim: true },
  to: { type: String, required: true, trim: true },
  stops: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stop'
  }],
  stopNames: [{ type: String, trim: true }],
  operatingTime: {
    start: { type: String, default: null },
    end: { type: String, default: null }
  },
  rawTimeText: { type: String, default: null }
}, { _id: false });

const RouteSchema = new mongoose.Schema({
  routeNumber: {
    type: String,
    required: true,
    trim: true
  },
  srNo: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  directions: [DirectionSchema],
  frequencyMinutes: {
    min: { type: Number, default: 20 },
    max: { type: Number, default: 30 }
  },
  distanceKm: {
    type: Number,
    default: null
  },
  numberOfBuses: {
    type: Number,
    default: null
  },
  source: {
    type: String,
    default: 'CTU timetable'
  },
  sourceDate: {
    type: String,
    default: '2026-07-25'
  }
}, {
  timestamps: true
});

RouteSchema.index({ routeNumber: 1 });

module.exports = mongoose.model('Route', RouteSchema);

