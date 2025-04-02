const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
const { validateTransaction } = require('../../utils/validation');
const { applyRulesToTransaction } = require('../../services/ruleApplicationService');
const mongoose = require('mongoose');

// Helper function to enrich entries with units
async function enrichEntriesWithUnits(entriesData) {
  if (!entriesData || entriesData.length === 0) {
    return [];
  }
  
  const accountIds = entriesData.map(entry => entry.accountId).filter(id => !!id);
  if (accountIds.length === 0) {
    throw new Error('No valid account IDs found in entries.');
  }

  // Find accounts and create a map for quick lookup
  const accounts = await Account.find({ '_id': { $in: accountIds } }).select('_id unit').lean();
  const accountUnitMap = accounts.reduce((map, acc) => {
    map[acc._id.toString()] = acc.unit || 'USD'; // Default to USD if unit is somehow missing
    return map;
  }, {});

  // Map entries and add the unit
  return entriesData.map(entry => {
    const unit = accountUnitMap[entry.accountId?.toString()];
    if (!unit) {
      // This indicates an entry references an account that doesn't exist or wasn't found
      throw new Error(`Account not found for entry referencing ID: ${entry.accountId}`);
    }
    return {
      ...entry,
      unit: unit // Add the denormalized unit
    };
  });
}

// @route   POST /api/transactions
// @desc    Create a new transaction
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const { date, description, reference, notes, entries } = req.body;
    
    // Prepare raw entries data
    const rawEntries = entries?.map(entry => ({
      accountId: entry.account || entry.accountId,
      amount: entry.amount,
      type: entry.type,
      description: entry.description
    })) || [];

    // Enrich entries with units from their accounts
    const enrichedEntries = await enrichEntriesWithUnits(rawEntries);
    
    // Create transaction data object
    const transactionData = {
      date,
      description,
      reference,
      notes,
      entries: enrichedEntries // Use enriched entries
    };
    
    // Create the transaction in the database
    const newTransaction = await Transaction.create(transactionData);
    
    // Apply rules to the newly created transaction
    await applyRulesToTransaction(newTransaction._id);
    
    // Fetch the final transaction data, populated with account details and applied rules
    const finalTransaction = await Transaction.findById(newTransaction._id)
      .populate({ // Populate virtual 'account'
        path: 'entries.account',
        select: 'name type unit' // Add unit
      });
      
    if (!finalTransaction) {
        // This case should ideally not happen after successful creation
        // but adding a safeguard check.
        console.error('Failed to fetch transaction immediately after creation.');
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve transaction after creation.'
        });
    }
    
    // Convert to plain object to ensure virtuals like isBalanced are included
    const transactionObject = finalTransaction.toObject({ virtuals: true });
    
    res.status(201).json({
      success: true,
      data: transactionObject
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
};

// @route   GET /api/transactions
// @desc    Get all transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    console.log('getTransactions called with query:', req.query);
    
    const { startDate, endDate, accountId } = req.query;
    const query = {};
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (accountId) {
      query['entries.accountId'] = accountId;
    }
    
    console.log('MongoDB query:', JSON.stringify(query));
    
    const transactions = await Transaction.find(query)
      .populate({
        path: 'entries.account',
        select: 'name type unit' // Add unit
      })
      .sort({ date: -1 });
    
    console.log(`Found ${transactions.length} transactions`);
    
    if (transactions.length === 0) {
      // If no transactions found, log the total count in the database
      const totalCount = await Transaction.countDocuments({});
      console.log(`Total transactions in database: ${totalCount}`);
      
      if (totalCount > 0) {
        // Get a sample of transactions to understand what's in there
        const sampleTransactions = await Transaction.find().limit(3);
        console.log('Sample transactions:', 
          sampleTransactions.map(t => ({
            id: t._id.toString(),
            date: t.date,
            description: t.description
          }))
        );
      }
    }
      
    res.json({
      success: true,
      data: transactions
    });
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// @route   GET /api/transactions/:id
// @desc    Get a single transaction
// @access  Private
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate({
        path: 'entries.account',
        select: 'name type unit' // Add unit
      });
      
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
    }
    
    res.json({
      success: true,
      data: transaction
    });
  } catch (error) {
    console.error('Error getting transaction:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

// @route   PUT /api/transactions/:id
// @desc    Update a transaction
// @access  Private
exports.updateTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
    }
    
    const { date, description, reference, notes, entries } = req.body;
    
    // Prepare raw entries data from request
    const rawEntries = entries?.map(entry => ({
      _id: entry._id,
      accountId: entry.account || entry.accountId,
      amount: entry.amount,
      type: entry.type,
      description: entry.description
    }));
    
    // Update transaction fields selectively
    if (date) transaction.date = date;
    if (description) transaction.description = description;
    if (reference !== undefined) transaction.reference = reference;
    if (notes !== undefined) transaction.notes = notes;
    // Only update entries if provided in the request body
    if (rawEntries) {
      // Enrich the updated entries with units before assigning
      const enrichedEntries = await enrichEntriesWithUnits(rawEntries);
      transaction.entries = enrichedEntries;
    }
    
    // Manually mark entries as modified if they were updated
    if (rawEntries) {
      transaction.markModified('entries');
    }

    // Save the updated transaction (pre-save hook will validate)
    await transaction.save();
    
    // Apply rules to the updated transaction
    await applyRulesToTransaction(transaction._id);
    
    // Fetch the final transaction data, populated
    const finalTransaction = await Transaction.findById(transaction._id)
      .populate({ // Populate virtual 'account'
        path: 'entries.account',
        select: 'name type unit' // Add unit
      });
      
    if (!finalTransaction) {
        console.error('Failed to fetch transaction immediately after update.');
        return res.status(500).json({
            success: false,
            error: 'Failed to retrieve transaction after update.'
        });
    }
      
    // Convert to plain object to ensure virtuals are included
    const transactionObject = finalTransaction.toObject({ virtuals: true });
    
    res.json({
      success: true,
      data: transactionObject
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    res.status(400).json({ 
      success: false,
      error: error.message 
    });
  }
};

// @route   DELETE /api/transactions/:id
// @desc    Delete a transaction
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
    }
    
    await transaction.deleteOne();
    
    res.json({ 
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};

exports.getEntries = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId)
      .populate({
        path: 'entries.account',
        select: 'name type unit' // Add unit
      });
      
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
    }
    
    res.json({
      success: true,
      data: transaction.entries
    });
  } catch (error) {
    console.error('Error getting entries:', error);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
};