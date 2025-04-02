const express = require('express');
const router = express.Router();
const {
  createRate,
  getAllRates,
  getRateById,
  updateRate,
  deleteRate
} = require('../controllers/exchangeRateController');

// Define routes
router.route('/')
  .post(createRate)
  .get(getAllRates);

router.route('/:id')
  .get(getRateById)
  .patch(updateRate) // Using PATCH for partial updates is conventional
  .delete(deleteRate);

module.exports = router; 