const Transaction = require('../../models/Transaction');

// @route   POST /api/transactions/:transactionId/entries
// @desc    Add an entry to a transaction
// @access  Private
exports.addEntry = async (req, res) => {
  try {
    const { account, amount, type, description } = req.body;
    
    if (!account || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: 'Account, amount, and type are required'
      });
    }
    
    // Make sure amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }
    
    // Make sure type is valid
    if (type !== 'debit' && type !== 'credit') {
      return res.status(400).json({
        success: false,
        error: 'Type must be either debit or credit'
      });
    }
    
    const transaction = await Transaction.findById(req.params.transactionId);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
    }
    
    // Add the entry to the transaction
    transaction.entries.push({
      account,
      amount: parsedAmount,
      type,
      description
    });
    
    await transaction.save();
    
    // Get the updated transaction
    const updatedTransaction = await Transaction.findById(req.params.transactionId)
      .populate('entries.account');
    
    res.status(201).json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error adding entry:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// @route   POST /api/transactions/:transactionId/split
// @desc    Split a transaction into two transactions
// @access  Private
exports.splitTransaction = async (req, res) => {
  try {
    const { entryIds, description } = req.body;
    const sourceTransaction = await Transaction.findById(req.params.transactionId);
    
    if (!sourceTransaction) {
      return res.status(404).json({ error: 'Source transaction not found' });
    }
    
    // Create new transaction
    const newTransaction = new Transaction({
      date: sourceTransaction.date,
      description: description || sourceTransaction.description,
      reference: sourceTransaction.reference,
      notes: sourceTransaction.notes
    });
    
    // Move entries to new transaction
    entryIds.forEach(entryId => {
      const entry = sourceTransaction.entries.id(entryId);
      if (entry) {
        entry.remove();
        newTransaction.entries.push(entry);
      }
    });
    
    await sourceTransaction.save();
    await newTransaction.save();
    
    res.status(201).json({
      success: true,
      data: {
        sourceTransaction,
        newTransaction
      }
    });
  } catch (error) {
    console.error('Error splitting transaction:', error);
    res.status(500).json({ error: 'Error splitting transaction' });
  }
}; 


// @desc    Create a new entry for a transaction
// @route   POST /api/transactions/:transactionId/entries
// @access  Public
exports.createEntry = async (req, res) => {
  try {
    const { account, description, amount, type } = req.body;

    if (!account || !amount || !type) {
      return res.status(400).json({
        success: false,
        error: 'Account, amount, and type are required'
      });
    }
    
    // Make sure amount is a number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be a positive number'
      });
    }
    
    // Make sure type is valid
    if (type !== 'debit' && type !== 'credit') {
      return res.status(400).json({
        success: false,
        error: 'Type must be either debit or credit'
      });
    }

    // Verify transaction exists
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Add entry to transaction
    transaction.entries.push({
      account,
      description,
      amount: parsedAmount,
      type
    });

    await transaction.save();

    // Get the updated transaction
    const updatedTransaction = await Transaction.findById(req.params.transactionId)
      .populate('entries.account');

    return res.status(201).json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error creating entry:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        error: messages
      });
    } else {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
};

// @desc    Get all entries for a transaction
// @route   GET /api/transactions/:transactionId/entries
// @access  Public
exports.getEntries = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('entries.account', 'name type');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    return res.status(200).json({
      success: true,
      count: transaction.entries.length,
      data: transaction.entries
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single entry
// @route   GET /api/transactions/:transactionId/entries/:entryId
// @access  Public
exports.getEntry = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate('entries.account', 'name type');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const entry = transaction.entries.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: entry
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update entry
// @route   PUT /api/transactions/:transactionId/entries/:entryId
// @access  Public
exports.updateEntry = async (req, res) => {
  try {
    const { account, description, amount, type } = req.body;

    // Find transaction and entry
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const entry = transaction.entries.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    // Update entry fields
    if (account) entry.account = account;
    if (description !== undefined) entry.description = description;
    if (amount) entry.amount = amount;
    if (type) entry.type = type;

    await transaction.save();

    // Update transaction balance
    transaction.isBalanced = await transaction.isTransactionBalanced();
    await transaction.save();

    return res.status(200).json({
      success: true,
      data: entry
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

// @desc    Delete entry
// @route   DELETE /api/transactions/:transactionId/entries/:entryId
// @access  Public
exports.deleteEntry = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    const entry = transaction.entries.id(req.params.entryId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        error: 'Entry not found'
      });
    }

    // Check if this is the only entry in the transaction
    if (transaction.entries.length <= 1) {
      // If this was the last entry, delete the transaction too
      console.log(`Automatically deleting transaction ${transaction._id} as its last entry was removed`);
      await Transaction.findByIdAndDelete(transaction._id);
      
      return res.status(200).json({
        success: true,
        data: {},
        message: 'Entry and its parent transaction were deleted since this was the last entry'
      });
    }

    // Remove entry
    entry.remove();
    await transaction.save();

    // Update transaction balance
    transaction.isBalanced = await transaction.isTransactionBalanced();
    await transaction.save();

    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    // Log the detailed error
    console.error(`Error deleting entry ${req.params.entryId}:`, error);
    
    // Return more specific error message if possible
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid entry ID format'
      });
    } else if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Validation error',
        details: Object.values(error.errors).map(err => err.message)
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Server Error',
        message: error.message || 'Unknown error occurred when deleting entry'
      });
    }
  }
}; 