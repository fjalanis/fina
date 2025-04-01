const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// @desc    Get account balance report for a specific date range
// @route   GET /api/reports/account-balance
// @access  Public
exports.getAccountBalanceReport = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    
    if (!startDate) {
      return res.status(400).json({ 
        success: false,
        error: 'Start date is required' 
      });
    }
    
    if (!endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'End date is required' 
      });
    }
    
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (accountId) {
      query['entries.account'] = accountId;
    }
    
    const transactions = await Transaction.find(query)
      .populate('entries.account')
      .sort({ date: 1 });
      
    // Calculate running balance for each account
    const accountBalances = {};
    
    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        const accountId = entry.account._id.toString();
        if (!accountBalances[accountId]) {
          accountBalances[accountId] = {
            accountId: accountId,
            balance: 0,
            entries: []
          };
        }
        
        // Fix the sign calculation to match test expectations
        // For debits, add the amount; for credits, subtract the amount
        const amount = entry.type === 'debit' ? entry.amount : -entry.amount;
        accountBalances[accountId].balance += amount;
        accountBalances[accountId].entries.push({
          date: transaction.date,
          description: transaction.description,
          amount: entry.amount,
          type: entry.type
        });
      });
    });
    
    res.json(Object.values(accountBalances));
  } catch (error) {
    console.error('Error generating account balance report:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// @desc    Get monthly income/expense summary
// @route   GET /api/reports/monthly-summary
// @access  Public
exports.getMonthlyIncomeExpenseSummary = async (req, res) => {
  try {
    const { year, month } = req.query;
    
    // Default to current year and month if not specified
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth() + 1; // JS months are 0-indexed
    
    // Validate input
    if (targetMonth < 1 || targetMonth > 12) {
      return res.status(400).json({ success: false, error: 'Month must be between 1 and 12' });
    }
    
    // Create date range for the month
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0); // Last day of month
    
    // Get all accounts of type income and expense
    const accounts = await Account.find({
      type: { $in: ['income', 'expense'] }
    }, '_id name type');
    
    const accountIds = accounts.map(account => account._id);
    
    // Aggregate transactions for the accounts during the specified month
    const entrySummary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $unwind: '$entries'
      },
      {
        $match: {
          'entries.account': { $in: accountIds }
        }
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'entries.account',
          foreignField: '_id',
          as: 'accountData'
        }
      },
      {
        $unwind: '$accountData'
      },
      {
        $group: {
          _id: {
            accountId: '$entries.account',
            accountType: '$accountData.type'
          },
          accountName: { $first: '$accountData.name' },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ['$entries.type', 'debit'] },
                '$entries.amount',
                { $multiply: ['$entries.amount', -1] } // Negate credit amounts
              ]
            }
          }
        }
      },
      {
        $sort: { '_id.accountType': 1, 'accountName': 1 }
      }
    ]);
    
    // Calculate totals
    const summary = {
      income: {
        accounts: [],
        total: 0
      },
      expense: {
        accounts: [],
        total: 0
      },
      period: {
        year: targetYear,
        month: targetMonth,
        startDate,
        endDate
      }
    };
    
    entrySummary.forEach(entry => {
      const type = entry._id.accountType;
      if (type === 'income' || type === 'expense') {
        // For income accounts, credits increase the balance (positive amount)
        // For expense accounts, debits increase the balance (positive amount)
        const amount = type === 'income' ? -entry.totalAmount : entry.totalAmount;
        
        summary[type].accounts.push({
          id: entry._id.accountId,
          name: entry.accountName,
          amount
        });
        
        summary[type].total += amount;
      }
    });
    
    // Calculate net income (profit/loss)
    summary.netIncome = summary.income.total - summary.expense.total;
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    console.error('Error generating monthly summary report:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
};

// @route   GET /api/reports/income
// @desc    Get income report
// @access  Private
exports.getIncomeReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build the query
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      'entries.type': 'credit'
    };
    
    // Get transactions with credit entries
    const transactions = await Transaction.find(query);
    
    // Aggregate the data
    const incomeByAccount = {};
    
    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        if (entry.type === 'credit') {
          const accountId = entry.account.toString();
          if (!incomeByAccount[accountId]) {
            incomeByAccount[accountId] = {
              accountId,
              total: 0,
              transactions: []
            };
          }
          incomeByAccount[accountId].total += entry.amount;
          incomeByAccount[accountId].transactions.push({
            date: transaction.date,
            description: transaction.description,
            amount: entry.amount
          });
        }
      });
    });
    
    res.json({
      success: true,
      data: Object.values(incomeByAccount)
    });
  } catch (error) {
    console.error('Error generating income report:', error);
    res.status(500).json({ error: 'Error generating income report' });
  }
};

// @route   GET /api/reports/expenses
// @desc    Get expenses report
// @access  Private
exports.getExpensesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build the query
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      },
      'entries.type': 'debit'
    };
    
    // Get transactions with debit entries
    const transactions = await Transaction.find(query);
    
    // Aggregate the data
    const expensesByAccount = {};
    
    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        if (entry.type === 'debit') {
          const accountId = entry.account.toString();
          if (!expensesByAccount[accountId]) {
            expensesByAccount[accountId] = {
              accountId,
              total: 0,
              transactions: []
            };
          }
          expensesByAccount[accountId].total += entry.amount;
          expensesByAccount[accountId].transactions.push({
            date: transaction.date,
            description: transaction.description,
            amount: entry.amount
          });
        }
      });
    });
    
    res.json({
      success: true,
      data: Object.values(expensesByAccount)
    });
  } catch (error) {
    console.error('Error generating expenses report:', error);
    res.status(500).json({ error: 'Error generating expenses report' });
  }
};

exports.getAccountBalance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const transactions = await Transaction.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('entries.account');
    
    const balances = {};
    
    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        const accountId = entry.account._id.toString();
        if (!balances[accountId]) {
          balances[accountId] = {
            accountId,
            accountName: entry.account.name,
            balance: 0
          };
        }
        
        if (entry.type === 'debit') {
          balances[accountId].balance += entry.amount;
        } else {
          balances[accountId].balance -= entry.amount;
        }
      });
    });
    
    res.json({
      balances: Object.values(balances)
    });
  } catch (error) {
    console.error('Error getting account balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// @desc    Get transaction summary report for a specific date range
// @route   GET /api/reports/transaction-summary
// @access  Public
exports.getTransactionSummary = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    
    if (!startDate) {
      return res.status(400).json({ 
        success: false,
        error: 'Start date is required' 
      });
    }
    
    if (!endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'End date is required' 
      });
    }
    
    const query = {
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };
    
    if (accountId) {
      query['entries.account'] = accountId;
    }
    
    const transactions = await Transaction.find(query)
      .populate('entries.account')
      .sort({ date: 1 });
    
    // Calculate summary statistics
    let totalAmount = 0;
    let totalDebit = 0;
    let totalCredit = 0;
    
    const transactionSummary = transactions.map(transaction => {
      let txDebit = 0;
      let txCredit = 0;
      
      transaction.entries.forEach(entry => {
        if (entry.type === 'debit') {
          txDebit += entry.amount;
          totalDebit += entry.amount;
        } else {
          txCredit += entry.amount;
          totalCredit += entry.amount;
        }
      });
      
      totalAmount += txDebit + txCredit;
      
      return {
        _id: transaction._id,
        date: transaction.date,
        description: transaction.description,
        totalDebits: txDebit,
        totalCredits: txCredit,
        isBalanced: Math.abs(txDebit - txCredit) < 0.01
      };
    });
    
    // Return the array of transaction summaries for the API
    // Include the summary object for testing purposes
    res.json({
      transactions: transactionSummary,
      summary: {
        totalTransactions: transactions.length,
        totalAmount,
        averageAmount: transactions.length > 0 ? totalAmount / transactions.length : 0,
        byType: {
          debit: totalDebit,
          credit: totalCredit
        }
      }
    });
  } catch (error) {
    console.error('Error generating transaction summary report:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.getIncomeExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Start date and end date are required' });
    }
    
    const transactions = await Transaction.find({
      date: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    }).populate('entries.account');
    
    const report = {
      income: {
        total: 0,
        byAccount: {}
      },
      expense: {
        total: 0,
        byAccount: {}
      },
      net: 0
    };
    
    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        const accountId = entry.account._id.toString();
        const accountName = entry.account.name;
        
        if (entry.type === 'credit') {
          if (!report.income.byAccount[accountId]) {
            report.income.byAccount[accountId] = {
              name: accountName,
              total: 0
            };
          }
          report.income.byAccount[accountId].total += entry.amount;
          report.income.total += entry.amount;
        } else {
          if (!report.expense.byAccount[accountId]) {
            report.expense.byAccount[accountId] = {
              name: accountName,
              total: 0
            };
          }
          report.expense.byAccount[accountId].total += entry.amount;
          report.expense.total += entry.amount;
        }
      });
    });
    
    report.net = report.income.total - report.expense.total;
    
    res.json(report);
  } catch (error) {
    console.error('Error getting income expense report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 