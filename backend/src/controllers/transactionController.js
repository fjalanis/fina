const Transaction = require('../models/Transaction');
const EntryLine = require('../models/EntryLine');
const mongoose = require('mongoose');

// @desc    Create a new transaction with entry lines
// @route   POST /api/transactions
// @access  Public
exports.createTransaction = async (req, res) => {
  try {
    const { date, description, reference, notes, entryLines } = req.body;

    // Create transaction without entry lines
    const transaction = new Transaction({
      date,
      description,
      reference,
      notes
    });

    // Save the transaction to get an ID
    await transaction.save();

    // If entry lines are provided, add them
    if (entryLines && entryLines.length > 0) {
      // Create entry lines with transaction reference
      const entryLinesWithTransaction = entryLines.map(entry => ({
        ...entry,
        transaction: transaction._id
      }));

      // Insert all entry lines
      await EntryLine.insertMany(entryLinesWithTransaction);

      // Reload transaction with entry lines
      await transaction.populate('entryLines');
    }

    // Check if transaction is balanced
    transaction.isBalanced = await transaction.isTransactionBalanced();
    await transaction.save();

    return res.status(201).json({
      success: true,
      data: transaction
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
        error: error.message || 'Server Error'
      });
    }
  }
};

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Public
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .sort({ date: -1 })
      .populate({
        path: 'entryLines',
        populate: {
          path: 'account',
          select: 'name type'
        }
      });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Public
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate({
        path: 'entryLines',
        populate: {
          path: 'account',
          select: 'name type'
        }
      });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Public
exports.updateTransaction = async (req, res) => {
  try {
    const { date, description, reference, notes } = req.body;

    // Find transaction
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Update transaction fields
    transaction.date = date || transaction.date;
    transaction.description = description || transaction.description;
    transaction.reference = reference || transaction.reference;
    transaction.notes = notes || transaction.notes;

    await transaction.save();

    return res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Public
exports.deleteTransaction = async (req, res) => {
  try {
    // Find the transaction
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }
    
    // Delete all associated entry lines first
    const result = await EntryLine.deleteMany({ transaction: req.params.id });
    console.log(`Deleted ${result.deletedCount} entry lines for transaction ${req.params.id}`);
    
    // Then delete the transaction
    await Transaction.findByIdAndDelete(req.params.id);
    
    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error(`Error deleting transaction ${req.params.id}:`, error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      message: error.message || 'Unknown error occurred'
    });
  }
};

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

// @desc    Get suggested matches for unbalanced transactions
// @route   GET /api/transactions/matches/:id
// @access  Public
exports.getSuggestedMatches = async (req, res) => {
  try {
    const { maxMatches = 10, dateRange = 15, amount, type, excludeTransactionId, page = 1, limit = 10 } = req.query;
    
    let targetEntryLine = null;
    let targetTransaction = null;
    let requiredType = null;
    let targetAmount = null;
    
    // Check if we're matching directly by amount/type
    if (amount && type) {
      // Direct matching by amount and type
      console.log(`Getting matches for amount ${amount} and type ${type}`);
      
      // Make sure amount is a proper number
      try {
        // Use the exact type provided (no longer calculating opposite)
        requiredType = type; // Direct match with the requested type
        targetAmount = parseFloat(amount);
        
        if (isNaN(targetAmount) || !isFinite(targetAmount)) {
          console.error(`Invalid amount value: ${amount}`);
          return res.status(400).json({
            success: false,
            error: 'Amount must be a valid number'
          });
        }
        
        console.log(`Parsed amount: ${targetAmount}, requested type: ${requiredType}`);
      } catch (err) {
        console.error(`Error parsing amount parameter: ${err.message}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid amount format'
        });
      }
      
      // If excludeTransactionId is provided, we'll exclude that transaction's entries
      if (excludeTransactionId) {
        console.log(`Excluding entries from transaction ${excludeTransactionId}`);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Amount and type must be provided'
      });
    }
    
    // Instead of searching for individual entries, let's find unbalanced transactions
    // that have a complementary imbalance
    console.log(`Finding transactions with ${requiredType} imbalance of approximately ${targetAmount}`);
    
    // Calculate pagination
    const skipAmount = (parseInt(page) - 1) * parseInt(limit);
    
    // Find all unbalanced transactions
    const unbalancedTransactions = await Transaction.find({
      isBalanced: false,
      _id: { $ne: excludeTransactionId } ,
      date: {
        $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000),
      }
    }).populate('entryLines');
    
    // Calculate the imbalance of each transaction and filter for complementary imbalances
    const complementaryTransactions = [];
    
    for (const transaction of unbalancedTransactions) {
      let totalDebits = 0;
      let totalCredits = 0;
      
      // Skip transactions with no entry lines
      if (!transaction.entryLines || transaction.entryLines.length === 0) {
        continue;
      }
      
      // Calculate transaction balance
      transaction.entryLines.forEach(entry => {
        if (entry.type === 'debit') {
          totalDebits += parseFloat(entry.amount);
        } else {
          totalCredits += parseFloat(entry.amount);
        }
      });
      
      const imbalance = totalDebits - totalCredits;
      
      // For our required type 'credit', we need transactions with debit imbalance
      // For our required type 'debit', we need transactions with credit imbalance
      const TOLERANCE = 1.00;
      const difference = Math.abs(imbalance - targetAmount);
      const hasComplementaryImbalance = 
        (requiredType === 'credit' && imbalance > 0 && difference < TOLERANCE) ||
        (requiredType === 'debit' && imbalance < 0 && difference < TOLERANCE);
      
      if (hasComplementaryImbalance) {
        // Add calculated imbalance to transaction object for display
        complementaryTransactions.push({ ...transaction.toObject(), imbalance: imbalance.toFixed(2) });
      }
    }
    
    // Get total count for pagination
    const totalCount = complementaryTransactions.length;
    
    // Apply pagination
    const paginatedResults = complementaryTransactions.slice(skipAmount, skipAmount + parseInt(limit));
    
    return res.status(200).json({
      success: true,
      data: {
        targetEntry: targetEntryLine,
        transactions: paginatedResults,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in getSuggestedMatches:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

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

// @desc    Search for entries with filters
// @route   GET /api/transactions/search-entries
// @access  Public
exports.searchEntries = async (req, res) => {
  try {
    console.log('Received search request with params:', req.query);
    
    const { 
      minAmount = 0, 
      maxAmount, 
      accountId, 
      type,
      searchText, 
      dateRange = 15, 
      excludeTransactionId,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Build the search query
    const searchQuery = {};
    
    // Amount range filter - always convert to numbers
    if (minAmount !== undefined || maxAmount !== undefined) {
      searchQuery.amount = {};
      
      if (minAmount !== undefined) {
        const minAmountNum = parseFloat(minAmount);
        if (!isNaN(minAmountNum)) {
          searchQuery.amount.$gte = minAmountNum;
        }
      }
      
      if (maxAmount !== undefined) {
        const maxAmountNum = parseFloat(maxAmount);
        if (!isNaN(maxAmountNum)) {
          searchQuery.amount.$lte = maxAmountNum;
        }
      }
    }
    
    // Account filter
    if (accountId && accountId.trim() !== '') {
      searchQuery.account = accountId;
    }
    
    // Type filter (debit/credit)
    if (type && ['debit', 'credit'].includes(type)) {
      searchQuery.type = type;
    }
    
    // Date range filter - only include entries from last N days
    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - parseInt(dateRange || 15));
    
    // Calculate pagination
    const skipAmount = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Filtering transactions from date:', earliestDate);
    
    // Get entry lines that match the criteria
    // First find transactions that match the date range
    const recentTransactions = await Transaction.find({
      date: { $gte: earliestDate },
      isBalanced: false // Only consider unbalanced transactions
    }).select('_id date description');
    
    console.log(`Found ${recentTransactions.length} recent transactions`);
    
    // If no transactions in date range, return empty results
    if (!recentTransactions || recentTransactions.length === 0) {
      console.log('No transactions found in date range');
      return res.status(200).json({
        success: true,
        data: {
          entries: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0
          }
        }
      });
    }
    
    // Extract transaction IDs
    const transactionIds = recentTransactions.map(t => t._id);
    
    // Add transaction filter to search query
    searchQuery.transaction = { 
      $in: transactionIds,
    };
    
    // Add excludeTransactionId filter if provided
    if (excludeTransactionId && excludeTransactionId.trim() !== '') {
      searchQuery.transaction.$ne = excludeTransactionId;
    }
    
    // Text search on description if provided
    let textSearchTransactions = transactionIds;
    if (searchText && searchText.trim() !== '') {
      const textPattern = new RegExp(searchText, 'i');
      
      try {
        const matchingTransactions = recentTransactions.filter(t => 
          t.description && textPattern.test(t.description)
        );
        
        textSearchTransactions = matchingTransactions.map(t => t._id);
        
        if (textSearchTransactions.length === 0) {
          // No transactions match the text search
          console.log('No transactions match the text search');
          return res.status(200).json({
            success: true,
            data: {
              entries: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0
              }
            }
          });
        }
        
        // Update transaction filter to include only text-matching transactions
        searchQuery.transaction = { 
          $in: textSearchTransactions,
        };
        
        // Re-add excludeTransactionId filter if it was provided
        if (excludeTransactionId && excludeTransactionId.trim() !== '') {
          searchQuery.transaction.$ne = excludeTransactionId;
        }
      } catch (err) {
        console.error('Error in text search:', err);
        // Continue with all transactions if text search fails
      }
    }
    
    console.log('Final search query:', JSON.stringify(searchQuery));
    
    // Count total matching entries for pagination
    const totalCount = await EntryLine.countDocuments(searchQuery);
    console.log(`Found ${totalCount} matching entries`);
    
    // Get paginated results
    const entries = await EntryLine.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(parseInt(limit))
      .populate({
        path: 'transaction',
        select: 'date description isBalanced'
      })
      .populate('account');
    
    return res.status(200).json({
      success: true,
      data: {
        entries,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in searchEntries:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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