const Transaction = require('../../models/Transaction');
const EntryLine = require('../../models/EntryLine');

// @desc    Move an entry from one transaction to another
// @route   POST /api/transactions/extract-entry
// @access  Public
exports.extractEntry = async (req, res) => {
  try {
    const { entryId, destinationTransactionId } = req.body;
    
    if (!entryId || !destinationTransactionId) {
      return res.status(400).json({
        success: false,
        error: 'Both entryId and destinationTransactionId are required'
      });
    }
    
    console.log(`Extracting entry ${entryId} to transaction ${destinationTransactionId}`);
    
    // Find the entry to move
    const entryToMove = await EntryLine.findById(entryId);
    if (!entryToMove) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }
    
    // Get the source transaction ID before we modify the entry
    const sourceTransactionId = entryToMove.transaction;
    
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
    
    console.log(`Moving entry from transaction ${sourceTransactionId} to ${destinationTransactionId}`);
    
    // Update the entry to point to the destination transaction
    entryToMove.transaction = destinationTransactionId;
    await entryToMove.save();
    
    // Check if source transaction is now empty
    const remainingEntries = await EntryLine.countDocuments({ transaction: sourceTransactionId });
    
    if (remainingEntries === 0) {
      // Delete the now-empty source transaction
      console.log(`Deleting empty source transaction ${sourceTransactionId}`);
      await Transaction.findByIdAndDelete(sourceTransactionId);
    } else {
      // Update source transaction balance status
      sourceTransaction.isBalanced = await sourceTransaction.isTransactionBalanced();
      await sourceTransaction.save();
    }
    
    // Update destination transaction balance status
    destinationTransaction.isBalanced = await destinationTransaction.isTransactionBalanced();
    await destinationTransaction.save();
    
    return res.status(200).json({
      success: true,
      data: {
        transaction: destinationTransaction,
        sourceTransactionDeleted: remainingEntries === 0
      },
      message: 'Entry moved successfully'
    });
  } catch (error) {
    console.error('Error in extractEntry:', error);
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
    console.log('Received merge request with params:', req.body);
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
    
    console.log(`Merging from transaction ${sourceTransactionId} to ${destinationTransactionId}`);
    
    // Find all entry lines from source transaction
    const sourceEntries = await EntryLine.find({ transaction: sourceTransactionId });
    
    if (sourceEntries.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Source transaction has no entries to merge'
      });
    }
    
    console.log(`Found ${sourceEntries.length} entries to merge`);
    
    try {
      // Update each entry to point to the destination transaction
      for (const entry of sourceEntries) {
        entry.transaction = destinationTransactionId;
        await entry.save();
      }
      
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
      
      // Check if destination transaction is now balanced
      destinationTransaction.isBalanced = await destinationTransaction.isTransactionBalanced();
      await destinationTransaction.save();
      
      // Delete the now-empty source transaction
      await Transaction.findByIdAndDelete(sourceTransactionId);
      
      // Get the updated destination transaction with populated entry lines
      const updatedTransaction = await Transaction.findById(destinationTransactionId)
        .populate({
          path: 'entryLines',
          populate: {
            path: 'account',
            select: 'name type'
          }
        });
      
      return res.status(200).json({
        success: true,
        data: {
          transaction: updatedTransaction
        },
        message: 'Transaction successfully merged'
      });
    } catch (err) {
      console.error('Error during merge operation:', err);
      return res.status(500).json({
        success: false,
        error: 'Error during merge operation',
        details: process.env.NODE_ENV === 'development' ? err.message : undefined
      });
    }
  } catch (error) {
    console.error('Error in mergeTransaction:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 