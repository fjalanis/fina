const mongoose = require('mongoose');

const AssetPriceSchema = new mongoose.Schema({
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    trim: true,
    maxlength: [50, 'Unit cannot be more than 50 characters']
  },
  rate: {
    type: Number,
    required: [true, 'Asset price is required'],
    min: [0, 'Asset price must be positive']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  }
}, {
  timestamps: true // Add createdAt and updatedAt timestamps
});

// REMOVED: Unique index on unit + date. Timestamps should be unique enough in practice,
// and enforcing it could cause issues. Handle potential display duplicates on frontend if needed.
// AssetPriceSchema.index({ unit: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AssetPrice', AssetPriceSchema); 