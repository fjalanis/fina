const Transaction = require('../../models/Transaction');

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
      query['entries.accountId'] = accountId;
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