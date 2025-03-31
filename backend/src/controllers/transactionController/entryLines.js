const Transaction = require('../../models/Transaction');
const EntryLine = require('../../models/EntryLine');

// @desc    Add entry line to transaction
// @route   POST /api/transactions/:transactionId/entries
// @access  Public
exports.addEntryLine = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { account, amount, type, description } = req.body;
    
    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Create a new entry line
    const entryLine = new EntryLine({
      transaction: transaction._id,
      account,
      amount,
      type,
      description
    });
    
    // Save the entry line
    await entryLine.save();
    
    // Update transaction balance status
    transaction.isBalanced = await transaction.isTransactionBalanced();
    await transaction.save();
    
    // Return the updated transaction
    const updatedTransaction = await Transaction.findById(transactionId)
      .populate({
        path: 'entryLines',
        populate: {
          path: 'account',
          select: 'name type'
        }
      });
      
    return res.status(200).json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
};

// @desc    Update entry line
// @route   PUT /api/transactions/entries/:entryId
// @access  Public
exports.updateEntryLine = async (req, res) => {
  try {
    const { entryId } = req.params;
    const { account, amount, type, description } = req.body;
    
    // Find and update the entry line
    const entryLine = await EntryLine.findById(entryId);
    
    if (!entryLine) {
      return res.status(404).json({
        success: false,
        error: 'Entry line not found'
      });
    }
    
    // Update fields
    if (account) entryLine.account = account;
    if (amount) entryLine.amount = amount;
    if (type) entryLine.type = type;
    if (description !== undefined) entryLine.description = description;
    
    await entryLine.save();
    
    // Update transaction balance status
    const transaction = await Transaction.findById(entryLine.transaction);
    if (transaction) {
      transaction.isBalanced = await transaction.isTransactionBalanced();
      await transaction.save();
    }
    
    return res.status(200).json({
      success: true,
      data: entryLine
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error'
      });
    }
  }
};

// @desc    Delete entry line
// @route   DELETE /api/transactions/entries/:entryId
// @access  Public
exports.deleteEntryLine = async (req, res) => {
  try {
    const { entryId } = req.params;
    
    // Find the entry line
    const entryLine = await EntryLine.findById(entryId);
    
    if (!entryLine) {
      return res.status(404).json({
        success: false,
        error: 'Entry line not found'
      });
    }
    
    // Store the transaction ID before deleting
    const transactionId = entryLine.transaction;
    
    // Delete the entry line
    await EntryLine.findByIdAndDelete(entryId);
    
    // Update transaction balance status
    const transaction = await Transaction.findById(transactionId);
    if (transaction) {
      transaction.isBalanced = await transaction.isTransactionBalanced();
      await transaction.save();
    }
    
    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 