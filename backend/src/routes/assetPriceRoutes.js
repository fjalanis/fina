const express = require('express');
const router = express.Router();
const {
  createAssetPrice,
  getAssetPrices,
  getAssetPrice,
  updateAssetPrice,
  deleteAssetPrice
} = require('../controllers/assetPriceController');

// Define routes
router.route('/')
  .post(createAssetPrice)
  .get(getAssetPrices);

router.route('/:id')
  .get(getAssetPrice)
  .put(updateAssetPrice)
  .delete(deleteAssetPrice);

module.exports = router; 