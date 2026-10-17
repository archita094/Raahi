const mongoose = require('mongoose');

const StopSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  normalizedName: {
    type: String,
    required: true,
    lowercase: true,
    index: true
  },
  aliases: [{
    type: String,
    trim: true
  }],
  sector: {
    type: String,
    trim: true,
    default: null
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    }
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

StopSchema.index({ location: '2dsphere' });
StopSchema.index({ name: 'text', aliases: 'text' });

module.exports = mongoose.model('Stop', StopSchema);

