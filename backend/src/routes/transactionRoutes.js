const express = require('express');
const router = express.Router();
const { 
  getTransactions, 
  getTransaction, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getSuggestedMatches,
  extractEntry,
  searchEntries,
  mergeTransaction
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

// Special routes that might conflict with dynamic parameters should come first
// Add route for manual entry search
router
  .route('/search-entries')
  .get(searchEntries);

// Transaction balancing routes
router
  .route('/matches/direct')
  .get(getSuggestedMatches);

router
  .route('/matches/:id')
  .get(getSuggestedMatches);

router
  .route('/extract-entry')
  .post(extractEntry);

// Add route for merging transactions
router
  .route('/merge-transaction')
  .post(mergeTransaction);

// Routes with dynamic parameters should come last
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

module.exports = router; 