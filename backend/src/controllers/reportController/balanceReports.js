const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const { handleError } = require('../../utils/validators');

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
    handleError(res, error, 'Error generating account balance report');
  }
};

// @desc    Get account balance at a specific date
// @route   GET /api/reports/account-balance-at-date
// @access  Public
exports.getAccountBalance = async (req, res) => {
  try {
    const { date, startDate, endDate, accountId } = req.query;
    
    // Support both date (single point in time) and startDate/endDate (range)
    let targetDate = date ? new Date(date) : null;
    let query = {};
    
    if (targetDate) {
      query.date = { $lte: targetDate };
    } else if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else {
      // Default to current date if neither is provided
      query.date = { $lte: new Date() };
    }
    
    if (accountId) {
      query['entries.account'] = accountId;
    }
    
    const transactions = await Transaction.find(query)
      .populate('entries.account');
    
    const balances = {};
    
    transactions.forEach(transaction => {
      transaction.entries.forEach(entry => {
        const accountId = entry.account._id.toString();
        if (!balances[accountId]) {
          balances[accountId] = {
            accountId,
            accountName: entry.account.name,
            accountType: entry.account.type,
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
    handleError(res, error, 'Error getting account balance');
  }
};

// @desc    Get net worth report
// @route   GET /api/reports/net-worth
// @access  Public
exports.getNetWorthReport = async (req, res) => {
  try {
    const { startDate, endDate, interval = 'month' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false,
        error: 'Start date and end date are required' 
      });
    }
    
    // Get all asset and liability accounts
    const accounts = await Account.find({
      type: { $in: ['asset', 'liability'] }
    });
    
    const assetIds = accounts.filter(a => a.type === 'asset').map(a => a._id);
    const liabilityIds = accounts.filter(a => a.type === 'liability').map(a => a._id);
    
    // Generate dates for each period in the range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const periods = [];
    
    let current = new Date(start);
    while (current <= end) {
      periods.push(new Date(current));
      
      if (interval === 'month') {
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      } else if (interval === 'quarter') {
        current = new Date(current.getFullYear(), current.getMonth() + 3, 1);
      } else { // yearly
        current = new Date(current.getFullYear() + 1, 0, 1);
      }
    }
    
    // Calculate net worth for each period
    const netWorthData = await Promise.all(periods.map(async periodEnd => {
      // Get all transactions up to the period end
      const transactions = await Transaction.find({
        date: { $lte: periodEnd }
      });
      
      // Calculate assets and liabilities
      let assets = 0;
      let liabilities = 0;
      
      const accountBalances = {};
      
      transactions.forEach(txn => {
        txn.entries.forEach(entry => {
          const accountId = entry.account.toString();
          if (!accountBalances[accountId]) {
            accountBalances[accountId] = 0;
          }
          
          // Update balance based on debit/credit
          if (entry.type === 'debit') {
            accountBalances[accountId] += entry.amount;
          } else {
            accountBalances[accountId] -= entry.amount;
          }
        });
      });
      
      // Sum up assets and liabilities
      assetIds.forEach(id => {
        assets += accountBalances[id.toString()] || 0;
      });
      
      liabilityIds.forEach(id => {
        liabilities += accountBalances[id.toString()] || 0;
      });
      
      return {
        date: periodEnd,
        assets,
        liabilities,
        netWorth: assets - liabilities
      };
    }));
    
    res.json({
      success: true,
      data: netWorthData
    });
  } catch (error) {
    handleError(res, error, 'Error generating net worth report');
  }
}; 