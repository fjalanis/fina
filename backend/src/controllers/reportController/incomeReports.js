const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const { handleError } = require('../../utils/validators');

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
    handleError(res, err, 'Error generating monthly summary report');
  }
};

// @desc    Get annual income/expense summary
// @route   GET /api/reports/annual-summary
// @access  Public
exports.getAnnualIncomeExpenseSummary = async (req, res) => {
  try {
    const { year } = req.query;
    
    // Default to current year if not specified
    const targetYear = parseInt(year) || new Date().getFullYear();
    
    // Create date range for the year
    const startDate = new Date(targetYear, 0, 1); // Jan 1
    const endDate = new Date(targetYear, 11, 31); // Dec 31
    
    // Get all accounts of type income and expense
    const accounts = await Account.find({
      type: { $in: ['income', 'expense'] }
    }, '_id name type');
    
    const accountIds = accounts.map(account => account._id);
    
    // Aggregate transactions by month
    const monthlyData = await Transaction.aggregate([
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
            month: { $month: '$date' },
            accountType: '$accountData.type'
          },
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
        $sort: { '_id.month': 1 }
      }
    ]);
    
    // Format the data for monthly comparison
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const summary = {
      year: targetYear,
      months: months.map(month => {
        const incomeEntry = monthlyData.find(
          entry => entry._id.month === month && entry._id.accountType === 'income'
        );
        
        const expenseEntry = monthlyData.find(
          entry => entry._id.month === month && entry._id.accountType === 'expense'
        );
        
        const income = incomeEntry ? -incomeEntry.totalAmount : 0;
        const expense = expenseEntry ? expenseEntry.totalAmount : 0;
        
        return {
          month,
          income,
          expense,
          netIncome: income - expense
        };
      }),
      totals: {
        income: 0,
        expense: 0,
        netIncome: 0
      }
    };
    
    // Calculate annual totals
    summary.months.forEach(month => {
      summary.totals.income += month.income;
      summary.totals.expense += month.expense;
    });
    
    summary.totals.netIncome = summary.totals.income - summary.totals.expense;
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (err) {
    handleError(res, err, 'Error generating annual summary report');
  }
};

// @desc    Get income vs expense comparison
// @route   GET /api/reports/income-vs-expense
// @access  Public
exports.getIncomeVsExpenseReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required'
      });
    }
    
    // Get all transactions in the date range
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
        // Skip accounts that aren't income or expense
        if (!entry.account || (entry.account.type !== 'income' && entry.account.type !== 'expense')) {
          return;
        }
        
        const accountId = entry.account._id.toString();
        const accountName = entry.account.name;
        const accountType = entry.account.type;
        
        if (accountType === 'income' && entry.type === 'credit') {
          if (!report.income.byAccount[accountId]) {
            report.income.byAccount[accountId] = {
              name: accountName,
              total: 0
            };
          }
          report.income.byAccount[accountId].total += entry.amount;
          report.income.total += entry.amount;
        } else if (accountType === 'expense' && entry.type === 'debit') {
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
    
    res.status(200).json({
      success: true,
      dateRange: {
        start: new Date(startDate),
        end: new Date(endDate)
      },
      data: report
    });
  } catch (error) {
    handleError(res, error, 'Error generating income vs expense report');
  }
}; 