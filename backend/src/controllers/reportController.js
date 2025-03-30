const Transaction = require('../models/Transaction');
const EntryLine = require('../models/EntryLine');
const Account = require('../models/Account');
const mongoose = require('mongoose');

// @desc    Get account balance report for a specific date range
// @route   GET /api/reports/account-balance
// @access  Public
exports.getAccountBalanceReport = async (req, res) => {
  try {
    const { startDate, endDate, accountId } = req.query;
    
    // Validate input parameters
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'Start date and end date are required' });
    }
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Validate dates
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    
    // Account filter
    const accountMatch = accountId ? 
      { account: new mongoose.Types.ObjectId(accountId) } : 
      {};
    
    // Aggregate entry lines to calculate balance
    const entryLines = await EntryLine.aggregate([
      // Join with transactions to get transaction date
      {
        $lookup: {
          from: 'transactions',
          localField: 'transaction',
          foreignField: '_id',
          as: 'transactionData'
        }
      },
      {
        $unwind: '$transactionData'
      },
      // Apply date and account filters
      {
        $match: {
          'transactionData.date': {
            $gte: start,
            $lte: end
          },
          ...accountMatch
        }
      },
      // Join with accounts to get account info
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
          foreignField: '_id',
          as: 'accountData'
        }
      },
      {
        $unwind: '$accountData'
      },
      // Group by account
      {
        $group: {
          _id: '$account',
          accountName: { $first: '$accountData.name' },
          accountType: { $first: '$accountData.type' },
          totalDebits: {
            $sum: {
              $cond: [{ $eq: ['$type', 'debit'] }, '$amount', 0]
            }
          },
          totalCredits: {
            $sum: {
              $cond: [{ $eq: ['$type', 'credit'] }, '$amount', 0]
            }
          }
        }
      },
      // Calculate balance
      {
        $project: {
          _id: 1,
          accountName: 1,
          accountType: 1,
          totalDebits: 1,
          totalCredits: 1,
          balance: {
            $subtract: ['$totalDebits', '$totalCredits']
          }
        }
      },
      {
        $sort: { accountName: 1 }
      }
    ]);
    
    res.status(200).json({
      success: true,
      count: entryLines.length,
      data: entryLines,
      period: {
        startDate: start,
        endDate: end
      }
    });
  } catch (err) {
    console.error('Error generating account balance report:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
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
    
    // Aggregate entry lines for the accounts during the specified month
    const entrySummary = await EntryLine.aggregate([
      {
        $lookup: {
          from: 'transactions',
          localField: 'transaction',
          foreignField: '_id',
          as: 'transactionData'
        }
      },
      {
        $unwind: '$transactionData'
      },
      {
        $match: {
          'account': { $in: accountIds },
          'transactionData.date': {
            $gte: startDate,
            $lte: endDate
          }
        }
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'account',
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
            accountId: '$account',
            accountType: '$accountData.type'
          },
          accountName: { $first: '$accountData.name' },
          totalAmount: {
            $sum: {
              $cond: [
                { $eq: ['$type', 'debit'] },
                '$amount',
                { $multiply: ['$amount', -1] } // Negate credit amounts
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