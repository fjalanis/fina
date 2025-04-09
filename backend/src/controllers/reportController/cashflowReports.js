const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const { handleError } = require('../../utils/validation');

// @desc    Get cash flow report (bank account transactions)
// @route   GET /api/reports/cash-flow
// @access  Public
exports.getCashFlowReport = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'Start date and end date are required' 
      });
    }
    
    // Find bank accounts if no specific account provided
    let accountIds = [];
    if (accountId) {
      accountIds = [accountId];
    } else {
      const bankAccounts = await Account.find({ 
        type: 'asset',
        // Using a simple pattern to find bank accounts
        $or: [
          { name: { $regex: /bank/i } },
          { name: { $regex: /check/i } },
          { name: { $regex: /saving/i } },
          { name: { $regex: /cash/i } }
        ]
      });
      accountIds = bankAccounts.map(account => account._id);
    }
    
    if (accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No bank accounts found'
      });
    }
    
    // Get transactions for the bank accounts
    const transactions = await Transaction.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      'entries.accountId': { $in: accountIds }
    })
    .populate('entries.account')
    .sort({ date: 1 });
    
    // Process transactions to calculate cash flows
    const cashFlows = {
      inflows: [],
      outflows: [],
      summary: {
        totalInflow: 0,
        totalOutflow: 0,
        netCashFlow: 0
      }
    };
    
    transactions.forEach(transaction => {
      let isBankTransaction = false;
      let bankEntry = null;
      let counterEntry = null;
      
      // Find the bank account entry and its counterpart
      transaction.entries.forEach(entry => {
        const isEntryBankAccount = accountIds.some(id => 
          entry.accountId.toString() === id.toString());
        
        if (isEntryBankAccount) {
          isBankTransaction = true;
          bankEntry = entry;
        } else if (bankEntry && !counterEntry) {
          counterEntry = entry;
        }
      });
      
      // Skip if not a bank transaction
      if (!isBankTransaction || !bankEntry) return;
      
      const amount = bankEntry.amount;
      const isInflow = bankEntry.type === 'debit';
      const flowCategory = isInflow ? 'inflows' : 'outflows';
      
      const flowEntry = {
        date: transaction.date,
        description: transaction.description,
        amount,
        account: {
          id: bankEntry.accountId,
          name: bankEntry.account ? bankEntry.account.name : 'Unknown Account'
        },
        counterparty: counterEntry ? {
          id: counterEntry.accountId,
          name: counterEntry.account ? counterEntry.account.name : 'Unknown Account'
        } : null
      };
      
      cashFlows[flowCategory].push(flowEntry);
      
      if (isInflow) {
        cashFlows.summary.totalInflow += amount;
      } else {
        cashFlows.summary.totalOutflow += amount;
      }
    });
    
    cashFlows.summary.netCashFlow = cashFlows.summary.totalInflow - cashFlows.summary.totalOutflow;
    
    res.status(200).json({
      success: true,
      dateRange: {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      data: cashFlows
    });
  } catch (error) {
    handleError(res, error, 'Error generating cash flow report');
  }
};

// @desc    Get cash flow forecast
// @route   GET /api/reports/cash-flow-forecast
// @access  Public
exports.getCashFlowForecast = async (req, res) => {
  try {
    const { months = 3, accountId } = req.query;
    const forecastMonths = parseInt(months);
    
    if (isNaN(forecastMonths) || forecastMonths <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Number of months must be a positive number'
      });
    }
    
    // Find bank accounts if no specific account provided
    let accountIds = [];
    if (accountId) {
      accountIds = [accountId];
    } else {
      const bankAccounts = await Account.find({ 
        type: 'asset',
        $or: [
          { name: { $regex: /bank/i } },
          { name: { $regex: /check/i } },
          { name: { $regex: /saving/i } },
          { name: { $regex: /cash/i } }
        ]
      });
      accountIds = bankAccounts.map(account => account._id);
    }
    
    if (accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No bank accounts found'
      });
    }
    
    // Get current date to start forecast
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Calculate date range for historical data (previous 3 months)
    const historicalMonths = 3;
    const historicalStartDate = new Date(
      startDate.getFullYear(),
      startDate.getMonth() - historicalMonths,
      1
    );
    
    // Get historical transactions
    const historicalTransactions = await Transaction.find({
      date: {
        $gte: historicalStartDate,
        $lt: startDate
      },
      'entries.accountId': { $in: accountIds }
    })
    .populate('entries.account')
    .sort({ date: 1 });
    
    // Calculate average monthly inflows and outflows
    const inflows = [];
    const outflows = [];
    
    // Get account types
    const accounts = await Account.find({ _id: { $in: accountIds } });
    
    historicalTransactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        const isAccountOfInterest = accountIds.some(id => 
          entry.accountId.toString() === id.toString());
        
        if (isAccountOfInterest) {
          // Get account type to determine if debit/credit is inflow or outflow
          const account = accounts.find(a => a._id.toString() === entry.accountId.toString());
          const accountType = account.type;
          
          // For assets and expenses: debits are inflows, credits are outflows
          // For liabilities, income, and equity: credits are inflows, debits are outflows
          if (['asset', 'expense'].includes(accountType)) {
            if (entry.type === 'debit') {
              inflows.push({
                date: transaction.date,
                amount: entry.amount,
                description: transaction.description
              });
            } else {
              outflows.push({
                date: transaction.date,
                amount: entry.amount,
                description: transaction.description
              });
            }
          } else {
            if (entry.type === 'credit') {
              inflows.push({
                date: transaction.date,
                amount: entry.amount,
                description: transaction.description
              });
            } else {
              outflows.push({
                date: transaction.date,
                amount: entry.amount,
                description: transaction.description
              });
            }
          }
        }
      });
    });
    
    const avgMonthlyInflow = inflows.reduce((sum, entry) => sum + entry.amount, 0) / historicalMonths;
    const avgMonthlyOutflow = outflows.reduce((sum, entry) => sum + entry.amount, 0) / historicalMonths;
    
    // Generate forecast for the requested number of months
    const forecast = [];
    let runningBalance = 0;
    
    // Get current balances of the accounts
    const accountBalances = await Promise.all(accountIds.map(async id => {
      const account = await Account.findById(id);
      const transactions = await Transaction.find({
        'entries.accountId': id
      });
      
      let balance = 0;
      transactions.forEach(transaction => {
        transaction.entries.forEach(entry => {
          if (entry.accountId.toString() === id.toString()) {
            // Calculate balance based on account type and entry type
            if (['asset', 'expense'].includes(account.type)) {
              // For assets and expenses: debits increase balance, credits decrease
              balance += entry.type === 'debit' ? entry.amount : -entry.amount;
            } else {
              // For liabilities, income, and equity: credits increase balance, debits decrease
              balance += entry.type === 'credit' ? entry.amount : -entry.amount;
            }
          }
        });
      });
      
      return { id, name: account.name, balance };
    }));
    
    runningBalance = accountBalances.reduce((sum, account) => sum + account.balance, 0);
    
    for (let i = 0; i < forecastMonths; i++) {
      const forecastDate = new Date(
        startDate.getFullYear(),
        startDate.getMonth() + i,
        1
      );
      
      const monthInflow = avgMonthlyInflow;
      const monthOutflow = avgMonthlyOutflow;
      const netCashFlow = monthInflow - monthOutflow;
      
      runningBalance += netCashFlow;
      
      forecast.push({
        date: forecastDate,
        inflow: monthInflow,
        outflow: monthOutflow,
        netCashFlow,
        projectedBalance: runningBalance
      });
    }
    
    res.status(200).json({
      success: true,
      currentBalance: accountBalances,
      historicalAverage: {
        inflow: avgMonthlyInflow,
        outflow: avgMonthlyOutflow,
        netCashFlow: avgMonthlyInflow - avgMonthlyOutflow
      },
      forecast
    });
  } catch (error) {
    handleError(res, error, 'Error generating cash flow forecast');
  }
}; 