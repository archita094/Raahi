const mongoose = require('mongoose');

const AdminUserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  apiKey: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    default: 'admin'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminUser', AdminUserSchema);

