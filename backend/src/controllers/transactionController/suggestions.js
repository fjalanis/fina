const Transaction = require('../../models/Transaction');

// Helper function to find matching transactions
const findMatchingTransactions = async (transaction) => {
  // Calculate the imbalance of the transaction
  let totalDebits = 0;
  let totalCredits = 0;
  
  transaction.entries.forEach(entry => {
    if (entry.type === 'debit') {
      totalDebits += parseFloat(entry.amount);
    } else {
      totalCredits += parseFloat(entry.amount);
    }
  });
  
  const imbalance = totalDebits - totalCredits;
  
  // Determine the type of transaction we need to find
  const requiredType = imbalance > 0 ? 'credit' : 'debit';
  const targetAmount = Math.abs(imbalance);
  
  // Find transactions with complementary imbalance
  const dateRange = 15; // 15 days
  const unbalancedTransactions = await Transaction.find({
    isBalanced: false,
    _id: { $ne: transaction._id },
    date: {
      $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000),
    }
  }).populate('entries.account');
  
  // Filter for transactions with complementary imbalance
  const complementaryTransactions = [];
  const TOLERANCE = 1.00;
  
  for (const tx of unbalancedTransactions) {
    let txTotalDebits = 0;
    let txTotalCredits = 0;
    
    tx.entries.forEach(entry => {
      if (entry.type === 'debit') {
        txTotalDebits += parseFloat(entry.amount);
      } else {
        txTotalCredits += parseFloat(entry.amount);
      }
    });
    
    const txImbalance = txTotalDebits - txTotalCredits;
    
    // Check if this transaction has a complementary imbalance
    const hasComplementaryImbalance = 
      (requiredType === 'credit' && txImbalance < 0 && Math.abs(txImbalance + imbalance) < TOLERANCE) ||
      (requiredType === 'debit' && txImbalance > 0 && Math.abs(txImbalance + imbalance) < TOLERANCE);
    
    if (hasComplementaryImbalance) {
      complementaryTransactions.push(tx);
    }
  }
  
  return {
    transactions: complementaryTransactions,
    message: complementaryTransactions.length > 0 
      ? `Found ${complementaryTransactions.length} matching transactions` 
      : 'No matching transactions found'
  };
};

// @desc    Get suggested matches for unbalanced transactions
// @route   GET /api/transactions/matches/:id
// @access  Public
exports.getSuggestedMatches = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('entries.account');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Check if transaction is already balanced
    if (transaction.isBalanced) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is already balanced'
      });
    }
    
    // Find matching transactions
    const { transactions, message } = await findMatchingTransactions(transaction);
    
    res.status(200).json({
      success: true,
      data: {
        transactions,
        message
      }
    });
  } catch (error) {
    console.error('Error getting suggested matches:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}; 