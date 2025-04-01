const Transaction = require('../../models/Transaction');
const { validateTransaction } = require('../../utils/validation');

// @desc    Move an entry from one transaction to another
// @route   POST /api/transactions/move-entry
// @access  Public
exports.moveEntry = async (req, res) => {
  try {
    const { sourceTransactionId, entryIndex, destinationTransactionId } = req.body;
    
    if (!sourceTransactionId || entryIndex === undefined || !destinationTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'sourceTransactionId, entryIndex, and destinationTransactionId are required'
      });
    }
    
    // Find source and destination transactions
    const sourceTransaction = await Transaction.findById(sourceTransactionId);
    const destinationTransaction = await Transaction.findById(destinationTransactionId);
    
    if (!sourceTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Source transaction not found'
      });
    }
    
    if (!destinationTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Destination transaction not found'
      });
    }

    if (entryIndex >= sourceTransaction.entries.length) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entry index'
      });
    }
    
    // Get the entry to move
    const entryToMove = sourceTransaction.entries[entryIndex];
    
    // Remove entry from source transaction
    sourceTransaction.entries.splice(entryIndex, 1);
    
    // Add entry to destination transaction
    destinationTransaction.entries.push(entryToMove);
    
    // Validate both transactions
    const sourceValidation = validateTransaction(sourceTransaction);
    const destValidation = validateTransaction(destinationTransaction);
    
    if (!sourceValidation.isValid || !destValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Moving entry would create invalid transactions',
        sourceErrors: sourceValidation.errors,
        destErrors: destValidation.errors
      });
    }
    
    // Save both transactions
    if (sourceTransaction.entries.length === 0) {
      await Transaction.findByIdAndDelete(sourceTransactionId);
    } else {
      await sourceTransaction.save();
    }
    await destinationTransaction.save();
    
    return res.status(200).json({
      success: true,
      data: {
        transaction: destinationTransaction,
        sourceTransactionDeleted: sourceTransaction.entries.length === 0
      },
      message: 'Entry moved successfully'
    });
  } catch (error) {
    console.error('Error in moveEntry:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Split a transaction into two transactions
// @route   POST /api/transactions/split-transaction
// @access  Public
exports.splitTransaction = async (req, res) => {
  try {
    const { transactionId, entryIndices } = req.body;
    
    if (!transactionId || !Array.isArray(entryIndices)) {
      return res.status(400).json({
        success: false,
        error: 'Transaction ID and array of entry indices are required'
      });
    }
    
    // Find the source transaction
    const sourceTransaction = await Transaction.findById(transactionId);
    
    if (!sourceTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Sort indices in descending order to avoid shifting issues when removing entries
    const sortedIndices = [...entryIndices].sort((a, b) => b - a);
    
    // Validate indices
    if (sortedIndices.some(index => index >= sourceTransaction.entries.length)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid entry index'
      });
    }
    
    // Create new transaction with selected entries
    const newTransaction = new Transaction({
      date: sourceTransaction.date,
      description: `Split from: ${sourceTransaction.description}`,
      entries: []
    });
    
    // Move selected entries to new transaction
    for (const index of sortedIndices) {
      newTransaction.entries.push(sourceTransaction.entries[index]);
      sourceTransaction.entries.splice(index, 1);
    }
    
    // Validate both transactions
    const sourceValidation = validateTransaction(sourceTransaction);
    const newValidation = validateTransaction(newTransaction);
    
    if (!sourceValidation.isValid || !newValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Split would create invalid transactions',
        sourceErrors: sourceValidation.errors,
        newErrors: newValidation.errors
      });
    }
    
    // Save both transactions
    await sourceTransaction.save();
    await newTransaction.save();
    
    return res.status(200).json({
      success: true,
      data: {
        sourceTransaction,
        newTransaction
      },
      message: 'Transaction split successfully'
    });
  } catch (error) {
    console.error('Error in splitTransaction:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Merge all entries from source transaction to destination transaction
// @route   POST /api/transactions/merge-transaction
// @access  Public
exports.mergeTransaction = async (req, res) => {
  try {
    const { sourceTransactionId, destinationTransactionId } = req.body;
    
    // Validate input
    if (!sourceTransactionId || !destinationTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination transaction IDs are required'
      });
    }
    
    // Check if ids are the same
    if (sourceTransactionId === destinationTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'Source and destination transactions cannot be the same'
      });
    }
    
    // Get both transactions
    const sourceTransaction = await Transaction.findById(sourceTransactionId);
    const destinationTransaction = await Transaction.findById(destinationTransactionId);
    
    if (!sourceTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Source transaction not found'
      });
    }
    
    if (!destinationTransaction) {
      return res.status(404).json({
        success: false,
        error: 'Destination transaction not found'
      });
    }
    
    if (!sourceTransaction.entries || sourceTransaction.entries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Source transaction has no entries to merge'
      });
    }
    
    // Add all entries from source to destination
    destinationTransaction.entries.push(...sourceTransaction.entries);
    
    // Update destination transaction description to include source (if different)
    if (sourceTransaction.description !== destinationTransaction.description) {
      destinationTransaction.description = 
        `${destinationTransaction.description} + ${sourceTransaction.description}`;
    }
    
    // Add any notes from the source transaction
    if (sourceTransaction.notes) {
      destinationTransaction.notes = 
        destinationTransaction.notes 
          ? `${destinationTransaction.notes}\n---\n${sourceTransaction.notes}`
          : sourceTransaction.notes;
    }
    
    // Validate merged transaction
    const validation = validateTransaction(destinationTransaction);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Merge would create an invalid transaction',
        errors: validation.errors
      });
    }
    
    // Save destination and delete source
    await destinationTransaction.save();
    await Transaction.findByIdAndDelete(sourceTransactionId);
    
    return res.status(200).json({
      success: true,
      data: {
        transaction: destinationTransaction
      },
      message: 'Transaction successfully merged'
    });
  } catch (error) {
    console.error('Error in mergeTransaction:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 