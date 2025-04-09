const mongoose = require('mongoose');

const AssetPriceSchema = new mongoose.Schema({
  baseCurrency: {
    type: String,
    required: [true, 'Base currency is required'],
    trim: true,
    maxlength: [50, 'Base currency cannot be more than 50 characters']
  },
  targetCurrency: {
    type: String,
    required: [true, 'Target currency is required'],
    trim: true,
    maxlength: [50, 'Target currency cannot be more than 50 characters']
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

// Create a compound index for baseCurrency, targetCurrency, and date
AssetPriceSchema.index({ baseCurrency: 1, targetCurrency: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('AssetPrice', AssetPriceSchema); 