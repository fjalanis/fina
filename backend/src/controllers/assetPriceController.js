const AssetPrice = require('../models/AssetPrice');

// @desc    Create new asset price
// @route   POST /api/asset-prices
// @access  Public
exports.createAssetPrice = async (req, res) => {
  try {
    const newPrice = await AssetPrice.create(req.body);
    res.status(201).json({
      success: true,
      data: newPrice
    });
  } catch (error) {
    console.error("Error creating asset price:", error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all asset prices
// @route   GET /api/asset-prices
// @access  Public
exports.getAssetPrices = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    // Add date range filtering if parameters are provided
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) };
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) };
    }

    const prices = await AssetPrice.find(query).sort({ date: -1 });
    res.status(200).json({
      success: true,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    console.error("Error getting all asset prices:", error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single asset price by ID
// @route   GET /api/asset-prices/:id
// @access  Public
exports.getAssetPrice = async (req, res) => {
  try {
    const price = await AssetPrice.findById(req.params.id);
    if (!price) {
      return res.status(404).json({ success: false, error: 'Asset price not found' });
    }
    res.status(200).json({
      success: true,
      data: price
    });
  } catch (error) {
    console.error(`Error getting asset price by ID ${req.params.id}:`, error);
    // Specifically check for CastError (invalid ID format)
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, error: 'Invalid ID format' });
    }
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update asset price
// @route   PUT /api/asset-prices/:id
// @access  Public
exports.updateAssetPrice = async (req, res) => {
  try {
    const updateData = { ...req.body };
    // Prevent unit from being updated
    delete updateData.unit;

    const price = await AssetPrice.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    });

    if (!price) {
      return res.status(404).json({ success: false, error: 'Asset price not found' });
    }

    res.status(200).json({
      success: true,
      data: price
    });
  } catch (error) {
    console.error(`Error updating asset price ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete asset price
// @route   DELETE /api/asset-prices/:id
// @access  Public
exports.deleteAssetPrice = async (req, res) => {
  try {
    const price = await AssetPrice.findByIdAndDelete(req.params.id);

    if (!price) {
      return res.status(404).json({ success: false, error: 'Asset price not found' });
    }

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(`Error deleting asset price ${req.params.id}:`, error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 