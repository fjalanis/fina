const ExchangeRate = require('../models/ExchangeRate');

// Keep only the simpler CRUD functions

// @desc    Create new exchange rate
// @route   POST /api/exchange-rates
// @access  Private (TODO: Add authentication middleware)
exports.createRate = async (req, res) => {
  try {
    const newRate = await ExchangeRate.create(req.body);
    res.status(201).json({ success: true, data: newRate });
  } catch (error) {
    // Add more specific error handling if needed (e.g., validation vs. server error)
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Get all exchange rates
// @route   GET /api/exchange-rates
// @access  Public (or Private based on needs)
exports.getAllRates = async (req, res) => {
  try {
    // Add potential filtering/sorting/pagination later if needed
    const rates = await ExchangeRate.find().sort({ date: -1 });
    res.status(200).json({ success: true, count: rates.length, data: rates });
  } catch (error) {
    console.error("Error getting all exchange rates:", error); // Log server errors
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Get single exchange rate by ID
// @route   GET /api/exchange-rates/:id
// @access  Public (or Private)
exports.getRateById = async (req, res) => {
  try {
    const rate = await ExchangeRate.findById(req.params.id);
    if (!rate) {
      return res.status(404).json({ success: false, error: 'Exchange rate not found' });
    }
    res.status(200).json({ success: true, data: rate });
  } catch (error) {
    console.error(`Error getting exchange rate by ID ${req.params.id}:`, error);
    // Handle CastError specifically if ID format is invalid
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Update exchange rate
// @route   PATCH /api/exchange-rates/:id
// @access  Private (TODO: Add authentication)
exports.updateRate = async (req, res) => {
  try {
    const rate = await ExchangeRate.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return the modified document
      runValidators: true // Ensure validation rules are checked
    });
    if (!rate) {
      return res.status(404).json({ success: false, error: 'Exchange rate not found' });
    }
    res.status(200).json({ success: true, data: rate });
  } catch (error) {
    console.error(`Error updating exchange rate ${req.params.id}:`, error);
    if (error.name === 'CastError') {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }
    if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, error: error.message });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

// @desc    Delete exchange rate
// @route   DELETE /api/exchange-rates/:id
// @access  Private (TODO: Add authentication)
exports.deleteRate = async (req, res) => {
  try {
    const rate = await ExchangeRate.findByIdAndDelete(req.params.id);
    if (!rate) {
      return res.status(404).json({ success: false, error: 'Exchange rate not found' });
    }
    // Send 204 No Content for successful deletion
    res.status(204).send(); 
  } catch (error) {
    console.error(`Error deleting exchange rate ${req.params.id}:`, error);
     if (error.name === 'CastError') {
        return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }
    res.status(500).json({ success: false, error: 'Server Error' });
  }
}; 