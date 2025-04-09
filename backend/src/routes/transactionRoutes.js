const express = require('express');
const router = express.Router();
const { 
  getTransactions, 
  getTransaction, 
  createTransaction, 
  updateTransaction, 
  deleteTransaction,
  getSuggestedMatches,
  searchEntries,
  searchTransactions,
  moveEntry,
  mergeTransaction,
} = require('../controllers/transactionController');

const { 
  getEntries, 
  createEntry,
  getEntry,
  updateEntry,
  deleteEntry,
  addEntry,
  splitTransaction: entriesSplitTransaction
} = require('../controllers/transactionController/entries');

const {
  balanceTransactions,
  getBalancedOrUnbalanced
} = require('../controllers/transactionController/balance');

// Transaction routes
router
  .route('/')
  .get(getTransactions)
  .post(createTransaction);

// --- SPECIAL ROUTES FIRST ---
// Add route for manual entry search
router
  .route('/search-entries')
  .get(searchEntries);

// Search routes (Define before /:id)
router.route('/search/entries')
  .post(searchEntries);

router.route('/search')
  .get(searchTransactions);

// Transaction balancing routes
router
  .route('/balance')
  .get(getBalancedOrUnbalanced)
  .post(balanceTransactions);

router
  .route('/matches')
  .get(getSuggestedMatches)
  .post(getSuggestedMatches);

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

// Entry routes for a specific transaction
router
  .route('/:transactionId/entries')
  .get(getEntries)
  .post(addEntry);

// Entry routes
router.get('/:transactionId/entries/:entryId', getEntry);
router.post('/:transactionId/entries', addEntry);
router.put('/:transactionId/entries/:entryId', updateEntry);
router.delete('/:transactionId/entries/:entryId', deleteEntry);

// Restructure routes
router.route('/move-entry')
  .post(moveEntry);

// Search routes
// router.route('/search/entries') // Moved above
//  .post(searchEntries);

// router.route('/search/transactions') // Moved above
//  .post(searchTransactions);

module.exports = router; 