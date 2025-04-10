const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const { validateEntry, handleError } = require('../../utils/validation');

// Helper to get unit for an account ID
async function getUnitForAccount(accountId) {
  if (!accountId) {
    throw new Error('Account ID is required to fetch unit.');
  }
  const account = await Account.findById(accountId).select('unit').lean();
  if (!account) {
    throw new Error(`Account not found for ID: ${accountId}`);
  }
  return account.unit || 'USD'; // Default to USD if missing
}

// @route   POST /api/transactions/:transactionId/entries
// @desc    Add an entry to a transaction
// @access  Private
exports.addEntry = async (req, res) => {
  try {
    const validationResult = await validateEntry(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.errors.join(', ')
      });
    }
    
    const { accountId, description } = req.body;
    const { parsedAmount: amount } = validationResult;
    const type = req.body.type;
    
    // Fetch the unit for the account
    const unit = await getUnitForAccount(accountId);

    const transaction = await Transaction.findById(req.params.transactionId);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
    }
    
    // Add the entry to the transaction, including the unit
    transaction.entries.push({
      accountId,
      amount,
      type,
      unit,
      description
    });
    
    await transaction.save();
    
    // Get the updated transaction
    const updatedTransaction = await Transaction.findById(req.params.transactionId)
      .populate({ path: 'entries.account', select: 'name type unit' });
    
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

// @desc    Get all entries for a transaction
// @route   GET /api/transactions/:transactionId/entries
// @access  Public
exports.getEntries = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate({ path: 'entries.account', select: 'name type unit' });

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
    const transaction = await Transaction.findById(req.params.transactionId)
        .populate({ path: 'entries.account', select: 'name type unit' });

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
    const validationResult = await validateEntry(req.body);
    
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: validationResult.errors.join(', ')
      });
    }

    const { accountId, description } = req.body;
    const { parsedAmount: amount } = validationResult;
    const type = req.body.type;

    // Fetch the unit for the potentially new account ID
    const unit = await getUnitForAccount(accountId);

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

    // Update entry, including the unit
    entry.accountId = accountId;
    entry.amount = amount;
    entry.type = type;
    entry.unit = unit;
    if (description !== undefined) entry.description = description;

    await transaction.save();

    const updatedTransaction = await Transaction.findById(req.params.transactionId)
      .populate({ path: 'entries.account', select: 'name type unit' });

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
    const { transactionId, entryId } = req.params;

    // Step 1: Try to find the transaction and pull the entry
    const transaction = await Transaction.findByIdAndUpdate(
      transactionId,
      { $pull: { entries: { _id: entryId } } },
      { new: true } // Return the updated document after the pull
    ).populate({ path: 'entries.account', select: 'name type unit' });

    // Step 2: Check if the transaction was found at all
    if (!transaction) {
      // If findByIdAndUpdate returns null, the transaction ID itself was invalid
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Step 3: Transaction was found. Check if it's now empty.
    if (transaction.entries.length === 0) {
      // If now empty, delete the transaction document
      await Transaction.findByIdAndDelete(transactionId);
      return res.status(200).json({
        success: true,
        data: {}, // Indicate transaction was also deleted
        message: 'Entry deleted and transaction removed as it became empty.'
      });
    } else {
      // Transaction still has entries (entry was pulled or was already gone)
      // Return the current state of the transaction.
      return res.status(200).json({
        success: true,
        data: transaction 
      });
    }
  } catch (error) {
    handleError(res, error, 'Error deleting entry');
  }
}; 