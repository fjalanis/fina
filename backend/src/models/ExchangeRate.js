const mongoose = require('mongoose');

const ExchangeRateSchema = new mongoose.Schema({
  baseCurrency: {
    type: String,
    required: [true, 'Base currency/asset identifier is required'],
    uppercase: true,
    trim: true,
    maxlength: [20, 'Base currency/asset identifier must be 20 characters or less']
  },
  targetCurrency: {
    type: String,
    required: [true, 'Target currency/asset identifier is required'],
    uppercase: true,
    trim: true,
    maxlength: [20, 'Target currency/asset identifier must be 20 characters or less']
  },
  rate: {
    type: Number,
    required: [true, 'Exchange rate is required'],
    min: [0, 'Exchange rate must be positive']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  }
}, {
  timestamps: true // Add createdAt and updatedAt timestamps
});

// Ensure unique combination of identifiers and date
ExchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('ExchangeRate', ExchangeRateSchema); 