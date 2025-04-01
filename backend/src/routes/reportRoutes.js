const express = require('express');
const { 
  getAccountBalanceReport,
  getMonthlyIncomeExpenseSummary,
  getTransactionSummary
} = require('../controllers/reportController');

const router = express.Router();

// Account balance report route
router.get('/account-balance', getAccountBalanceReport);

// Monthly income/expense summary route
router.get('/monthly-summary', getMonthlyIncomeExpenseSummary);

// Transaction summary route
router.get('/transaction-summary', getTransactionSummary);

module.exports = router; 