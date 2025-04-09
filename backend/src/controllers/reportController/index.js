const { 
  getAccountBalanceReport,
  getAccountBalance,
  getNetWorthReport
} = require('./balanceReports');

const {
  getIncomeExpenseSummary
} = require('./incomeReports');

const {
  getTransactionSummary
} = require('./transactionReports');

const {
  getCashflowReport,
  getCashflowForecast
} = require('./cashflowReports');

const { 
  getSankeyReport 
} = require('./sankeyReport');

// Re-export all the report functions
module.exports = {
  getAccountBalanceReport,
  getAccountBalance,
  getNetWorthReport,
  getIncomeExpenseSummary,
  getTransactionSummary,
  getCashflowReport,
  getCashflowForecast,
  getSankeyReport
}; 