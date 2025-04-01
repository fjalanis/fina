const Transaction = require('../../models/Transaction');
const { validateEntry, handleError } = require('../../utils/validators');

// @route   POST /api/transactions/:transactionId/entries
// @desc    Add an entry to a transaction
// @access  Private
exports.addEntry = async (req, res) => {
  try {
    const validationResult = validateEntry(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.error
      });
    }
    
    const { account, description } = req.body;
    const { parsedAmount: amount } = validationResult;
    const type = req.body.type;
    
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
      amount,
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
    handleError(res, error, 'Error adding entry');
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
    handleError(res, error, 'Error splitting transaction');
  }
}; 

// @desc    Create a new entry for a transaction
// @route   POST /api/transactions/:transactionId/entries
// @access  Public
exports.createEntry = async (req, res) => {
  try {
    const validationResult = validateEntry(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.error
      });
    }
    
    const { account, description } = req.body;
    const { parsedAmount: amount } = validationResult;
    const type = req.body.type;

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
      amount,
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
    handleError(res, error, 'Error creating entry');
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

    res.status(200).json({
      success: true,
      count: transaction.entries.length,
      data: transaction.entries
    });
  } catch (error) {
    handleError(res, error, 'Error retrieving entries');
  }
};

// @desc    Get a specific entry for a transaction
// @route   GET /api/transactions/:transactionId/entries/:entryId
// @access  Public
exports.getEntry = async (req, res) => {
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

    res.status(200).json({
      success: true,
      data: entry
    });
  } catch (error) {
    handleError(res, error, 'Error retrieving entry');
  }
};

// @desc    Update an entry
// @route   PUT /api/transactions/:transactionId/entries/:entryId
// @access  Public
exports.updateEntry = async (req, res) => {
  try {
    const validationResult = validateEntry(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.error
      });
    }

    const { account, description } = req.body;
    const { parsedAmount: amount } = validationResult;
    const type = req.body.type;

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

    // Update entry
    entry.account = account;
    entry.amount = amount;
    entry.type = type;
    if (description) entry.description = description;

    await transaction.save();

    const updatedTransaction = await Transaction.findById(req.params.transactionId)
      .populate('entries.account');

    res.status(200).json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    handleError(res, error, 'Error updating entry');
  }
};

// @desc    Delete an entry
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

    entry.remove();
    await transaction.save();

    const updatedTransaction = await Transaction.findById(req.params.transactionId)
      .populate('entries.account');

    res.status(200).json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    handleError(res, error, 'Error deleting entry');
  }
}; 