const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const { handleError } = require('../../utils/validation');

// @desc    Get income/expense summary for a specific date range
// @route   GET /api/reports/income-expense-summary
// @access  Public
exports.getIncomeExpenseSummary = async (req, res) => {
  try {
    const { startDate: startDateParam, endDate: endDateParam } = req.query;
    
    // Validate date parameters
    if (!startDateParam || !endDateParam) {
      return res.status(400).json({ 
        success: false, 
        error: 'Start date and end date parameters are required' 
      });
    }

    const startDate = new Date(startDateParam);
    const endDate = new Date(endDateParam);
    // Set end date to end of day for inclusive range
    endDate.setHours(23, 59, 59, 999); 

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid date format' 
      });
    }
    if (startDate > endDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Start date cannot be after end date' 
      });
    }
    
    // Get all accounts of type income and expense
    const accounts = await Account.find({
      type: { $in: ['income', 'expense'] }
    }, '_id name type');
    
    const accountIds = accounts.map(account => account._id);
    
    // Aggregate transactions for the accounts during the specified date range
    const entrySummary = await Transaction.aggregate([
      {
        $match: {
          date: {
            $gte: startDate, // Use the provided start date
            $lte: endDate    // Use the provided end date
          }
        }
      },
      {
        $unwind: '$entries'
      },
      {
        $match: {
          'entries.accountId': { $in: accountIds }
        }
      },
      {
        $lookup: {
          from: 'accounts',
          localField: 'entries.accountId',
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
            accountId: '$entries.accountId',
            accountType: '$accountData.type'
          },
          accountName: { $first: '$accountData.name' },
          // Sum amounts based on entry type relative to account type
          // Income: credits increase income (should be positive), debits decrease (should be negative)
          // Expense: debits increase expense (should be positive), credits decrease (should be negative)
          totalAmount: {
            $sum: {
              $cond: {
                if: { $eq: ['$accountData.type', 'income'] },
                then: { // For Income accounts
                  $cond: { 
                    if: { $eq: ['$entries.type', 'credit'] }, 
                    then: '$entries.amount', // Credit to income = positive
                    else: { $multiply: ['$entries.amount', -1] } // Debit to income = negative
                  }
                },
                else: { // For Expense accounts (and others, though filtered out)
                  $cond: { 
                    if: { $eq: ['$entries.type', 'debit'] }, 
                    then: '$entries.amount', // Debit to expense = positive
                    else: { $multiply: ['$entries.amount', -1] } // Credit to expense = negative
                  }
                }
              }
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
        startDate: startDateParam,
        endDate: endDateParam
      }
    };
    
    entrySummary.forEach(entry => {
      const type = entry._id.accountType;
      if (type === 'income' || type === 'expense') {
        const amount = entry.totalAmount; // Use the calculated amount directly
        
        // Add to the correct list (income/expense)
        summary[type].accounts.push({
          id: entry._id.accountId,
          name: entry.accountName,
          amount: amount // Amount already has the correct sign relative to the account type
        });
        
        // Add to the total for the type
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
    handleError(res, err, 'Error generating income/expense summary report');
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
    
    // Fetch account data explicitly inside the loop
    for (const transaction of transactions) {
      for (const entry of transaction.entries) { 
        // Fetch account data to check type
        const accountData = await Account.findById(entry.accountId).lean();
        
        // Skip if no account data or not income/expense
        if (!accountData || (accountData.type !== 'income' && accountData.type !== 'expense')) {
          continue; 
        }
        
        const accountIdStr = entry.accountId.toString();
        const accountName = accountData.name;
        const accountType = accountData.type;
        
        if (accountType === 'income' && entry.type === 'credit') {
          if (!report.income.byAccount[accountIdStr]) {
            report.income.byAccount[accountIdStr] = {
              name: accountName,
              total: 0
            };
          }
          report.income.byAccount[accountIdStr].total += entry.amount;
          report.income.total += entry.amount;
        } else if (accountType === 'expense' && entry.type === 'debit') {
          if (!report.expense.byAccount[accountIdStr]) {
            report.expense.byAccount[accountIdStr] = {
              name: accountName,
              total: 0
            };
          }
          report.expense.byAccount[accountIdStr].total += entry.amount;
          report.expense.total += entry.amount;
        }
      }
    }
    
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