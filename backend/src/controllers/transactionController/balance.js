const Transaction = require('../../models/Transaction');

// Balance two transactions
exports.balanceTransactions = async (req, res) => {
  try {
    const { sourceTransactionId, targetTransactionId } = req.body;
    
    if (!sourceTransactionId || !targetTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'Both transaction IDs are required'
      });
    }
    
    const sourceTransaction = await Transaction.findById(sourceTransactionId);
    const targetTransaction = await Transaction.findById(targetTransactionId);
    
    if (!sourceTransaction || !targetTransaction) {
      return res.status(404).json({
        success: false,
        error: 'One or both transactions not found'
      });
    }
    
    // Check if transactions have opposite types
    const sourceType = sourceTransaction.entries[0].type;
    const targetType = targetTransaction.entries[0].type;
    
    if (sourceType === targetType) {
      return res.status(400).json({
        success: false,
        error: 'Transactions must have opposite types to balance'
      });
    }
    
    // Add entries from target transaction to source transaction
    const amount = Math.abs(targetTransaction.entries[0].amount);
    
    if (sourceType === 'debit') {
      sourceTransaction.entries.push({
        account: targetTransaction.entries[0].account,
        type: 'credit',
        amount
      });
    } else {
      sourceTransaction.entries.push({
        account: targetTransaction.entries[0].account,
        type: 'debit',
        amount
      });
    }
    
    // Save the updated source transaction
    await sourceTransaction.save();
    
    // Delete the target transaction
    await targetTransaction.deleteOne();
    
    // Get the updated source transaction
    const updatedTransaction = await Transaction.findById(sourceTransaction._id)
      .populate('entries.account');
    
    res.json({
      success: true,
      data: {
        transaction: updatedTransaction
      }
    });
  } catch (error) {
    console.error('Error balancing transactions:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Find matching entries for an unbalanced transaction
exports.findMatchingEntries = async (req, res) => {
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
    const totalDebit = transaction.entries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);
      
    const totalCredit = transaction.entries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);
      
    if (Math.abs(totalDebit - totalCredit) <= 0.01) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is already balanced'
      });
    }
    
    // Find transactions with opposite type and matching amount
    const amount = Math.abs(totalDebit - totalCredit);
    const type = totalDebit > totalCredit ? 'credit' : 'debit';
    
    const matchingTransactions = await Transaction.find({
      _id: { $ne: transaction._id },
      'entries.type': type,
      'entries.amount': amount,
      date: {
        $gte: new Date(transaction.date.getTime() - 7 * 24 * 60 * 60 * 1000), // Within 7 days
        $lte: new Date(transaction.date.getTime() + 7 * 24 * 60 * 60 * 1000)
      }
    })
    .populate('entries.account');
    
    res.json({
      success: true,
      data: {
        transactions: matchingTransactions
      }
    });
  } catch (error) {
    console.error('Error finding matching entries:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
}; 