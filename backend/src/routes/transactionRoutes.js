const express = require('express');
const router = express.Router();
const { 
  getTransactions, 
  getTransaction, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getSuggestedMatches,
  balanceTransactions,
  extractEntry
} = require('../controllers/transactionController');

const { 
  getEntryLines, 
  createEntryLine 
} = require('../controllers/entryLineController');

// Transaction routes
router
  .route('/')
  .get(getTransactions)
  .post(createTransaction);

router
  .route('/:id')
  .get(getTransaction)
  .put(updateTransaction)
  .delete(deleteTransaction);

// Entry line routes for a specific transaction
router
  .route('/:transactionId/entries')
  .get(getEntryLines)
  .post(createEntryLine);

// Transaction balancing routes
router
  .route('/matches/direct')
  .get(getSuggestedMatches);

router
  .route('/matches/:id')
  .get(getSuggestedMatches);

router
  .route('/balance')
  .post(balanceTransactions);

router
  .route('/extract-entry')
  .post(extractEntry);

module.exports = router; 