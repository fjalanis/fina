const Transaction = require('../../models/Transaction');
const Account = require('../../models/Account');
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
    const { date, description, reference, notes, entries, contact, location, owner, category, zipCode, memo } = req.body;
    
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
      owner,
      category,
      zipCode,
      memo,
      contact,
      location,
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
    
    const { startDate, endDate, accountId, accountIds, description, entryType, owner, category } = req.query;
    // Pagination and meta flags
    const pageParam = parseInt(req.query.page, 10) || 1;
    const limitParam = parseInt(req.query.limit, 10) || 50;
    const includeCounts = String(req.query.includeCounts || 'false') === 'true';
    const query = {};
    
    // Fail fast if no date range
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    }
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid startDate or endDate' });
    }
    // Enforce max 1 year range
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if ((end - start) > oneYearMs) {
      return res.status(400).json({ success: false, error: 'Date range cannot exceed 1 year' });
    }
    query.date = { $gte: start, $lte: end };

    // Optional top-level filters
    if (description && description.trim() !== '') {
      try {
        // Validate regex to avoid catastrophic backtracking
        new RegExp(description);
        query.description = { $regex: description, $options: 'i' };
      } catch(e) {
        return res.status(400).json({ success: false, error: 'Invalid description regex' });
      }
    }
    if (owner && owner.trim() !== '') {
      query.owner = { $regex: owner.trim(), $options: 'i' };
    }
    if (category && category.trim() !== '') {
      query.category = { $regex: category.trim(), $options: 'i' };
    }
    
    // Entry-level filters (combined via $elemMatch)
    const entryFilter = {};
    if (accountIds) {
      const idsArray = Array.isArray(accountIds) ? accountIds : accountIds.split(',').map(id => id.trim()).filter(Boolean);
      if (idsArray.length > 0) entryFilter.accountId = { $in: idsArray };
    } else if (accountId) {
      entryFilter.accountId = accountId;
    }
    if (entryType && (entryType === 'debit' || entryType === 'credit')) {
      entryFilter.type = entryType;
    }
    if (Object.keys(entryFilter).length > 0) {
      query.entries = { $elemMatch: entryFilter };
    }
    
    console.log('MongoDB query:', JSON.stringify(query));

    // Base cursor with population and sorting
    let cursor = Transaction.find(query)
      .populate({
        path: 'entries.account',
        select: 'name type unit' // Add unit
      })
      .sort({ date: -1 });

    // Apply pagination
    const page = pageParam < 1 ? 1 : pageParam;
    const limit = Math.min(Math.max(limitParam, 1), 500);
    const skip = (page - 1) * limit;
    cursor = cursor.skip(skip).limit(limit);
    const transactions = await cursor.exec();

    if (transactions.length === 0) {
      // If no transactions found, log the total count in the database
      const totalCount = await Transaction.countDocuments({});
      
      if (totalCount > 0) {
        // Get a sample of transactions to understand what's in there
        const sampleTransactions = await Transaction.find().limit(3);
      }
    }

    // Optionally compute counts (total/balanced/unbalanced) for the given filters
    let meta = { page, limit };
    if (includeCounts) {
      // total documents count respecting the same top-level query (not paginated)
      const total = await Transaction.countDocuments(query);
      // Balanced vs unbalanced via aggregation over entries
      const pipeline = [
        { $match: query },
        { $unwind: '$entries' },
        {
          $group: {
            _id: '$_id',
            debits: { $sum: { $cond: [{ $eq: ['$entries.type', 'debit'] }, '$entries.amount', 0] } },
            credits: { $sum: { $cond: [{ $eq: ['$entries.type', 'credit'] }, '$entries.amount', 0] } }
          }
        },
        {
          $project: {
            _id: 1,
            net: { $subtract: ['$debits', '$credits'] }
          }
        },
        {
          $project: {
            isBalanced: { $lt: [{ $abs: '$net' }, 0.01] }
          }
        },
        {
          $group: {
            _id: null,
            balanced: { $sum: { $cond: ['$isBalanced', 1, 0] } },
            unbalanced: { $sum: { $cond: ['$isBalanced', 0, 1] } }
          }
        }
      ];
      const agg = await Transaction.aggregate(pipeline);
      const balanced = agg[0]?.balanced || 0;
      const unbalanced = agg[0]?.unbalanced || 0;
      const pages = Math.max(1, Math.ceil(total / limit));
      meta = { ...meta, total, balanced, unbalanced, pages, hasMore: page < pages };
    }

    res.json({
      success: true,
      data: transactions,
      meta
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
    // Check if ID is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(404).json({
            success: false,
            error: 'Transaction not found (Invalid ID format)'
        });
    }
    
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
    
    // Convert to plain object to ensure virtuals and populated fields are correctly serialized
    const transactionObject = transaction.toObject({ virtuals: true });
    
    res.json({
      success: true,
      data: transactionObject // Send the plain object instead of the Mongoose document
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
    
    const { date, description, reference, notes, entries, contact, location, owner, category, zipCode, memo } = req.body;
    
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
    if (owner !== undefined) transaction.owner = owner;
    if (category !== undefined) transaction.category = category;
    if (zipCode !== undefined) transaction.zipCode = zipCode;
    if (memo !== undefined) transaction.memo = memo;
    if (contact !== undefined) transaction.contact = contact;
    if (location !== undefined) transaction.location = location;
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