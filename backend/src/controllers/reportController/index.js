const { 
  getAccountBalanceReport,
  getAccountBalance,
  getNetWorthReport
} = require('./balanceReports');

const {
  getMonthlyIncomeExpenseSummary,
  getAnnualIncomeExpenseSummary
} = require('./incomeReports');

const {
  getTransactionSummary
} = require('./transactionReports');

const {
  getCashflowReport,
  getCashflowForecast
} = require('./cashflowReports');

// Re-export all the report functions
module.exports = {
  getAccountBalanceReport,
  getAccountBalance,
  getNetWorthReport,
  getMonthlyIncomeExpenseSummary,
  getAnnualIncomeExpenseSummary,
  getTransactionSummary,
  getCashflowReport,
  getCashflowForecast
}; 