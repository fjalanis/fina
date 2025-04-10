const express = require('express');
const { 
  getAccountBalanceReport,
  getIncomeExpenseSummary,
  getTransactionSummary,
  getSankeyReport,
  getNetWorthReport
} = require('../controllers/reportController');

const router = express.Router();

// Account balance report route
router.get('/account-balance', getAccountBalanceReport);

// Net worth report route
router.get('/net-worth', getNetWorthReport);

// Income/expense summary route for a date range
router.get('/income-expense-summary', getIncomeExpenseSummary);

// Transaction summary route
router.get('/transaction-summary', getTransactionSummary);

// Sankey diagram report route
router.get('/sankey', getSankeyReport);

module.exports = router; 