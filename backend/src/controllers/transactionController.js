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
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Delete all associated entry lines
    await EntryLine.deleteMany({ transaction: transaction._id });
      
    // Delete the transaction
    await Transaction.deleteOne({ _id: transaction._id });

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
    const { id } = req.params;
    const { maxMatches = 10, dateRange = 15 } = req.query;
    
    console.log(`Getting matches for entry line ${id}`);
    
    // First, get the target entry line
    const targetEntryLine = await EntryLine.findById(id).populate({
      path: 'transaction',
      select: 'date description isBalanced'
    }).populate('account');
    
    if (!targetEntryLine) {
      console.log(`Entry line ${id} not found`);
      return res.status(404).json({
        success: false,
        error: 'Entry line not found'
      });
    }

    // Get the transaction for this entry
    const transaction = targetEntryLine.transaction;
    
    if (!transaction) {
      console.log(`Transaction not found for entry line ${id}`);
      return res.status(400).json({
        success: false,
        error: 'Transaction is already balanced or does not exist'
      });
    }
    
    // Check if transaction is balanced
    if (transaction.isBalanced) {
      console.log(`Transaction ${transaction._id} is already balanced`);
      return res.status(400).json({
        success: false,
        error: 'Transaction is already balanced or does not exist'
      });
    }

    console.log(`Finding matches for entry ${id}, type: ${targetEntryLine.type}, amount: ${targetEntryLine.amount}`);
    
    // Find potential matches (entries that would balance this one)
    // Look for opposite entry types with similar absolute amounts
    const oppositeType = targetEntryLine.type === 'debit' ? 'credit' : 'debit';
    const targetAmount = targetEntryLine.amount;
    
    // Get the transaction date for date range filtering
    const targetDate = new Date(transaction.date);
    
    // We'll use a simpler approach for matching
    // Get all entry lines with opposite type and matching amount
    // that don't belong to the same transaction
    const matchingEntries = await EntryLine.find({
      _id: { $ne: targetEntryLine._id },
      type: oppositeType,
      amount: targetAmount
    }).populate({
      path: 'transaction',
      select: 'date description isBalanced _id'
    }).populate('account');
    
    // Filter out entries:
    // 1. From the same transaction
    // 2. From already balanced transactions
    // 3. Outside the date range (if date is provided)
    const validMatches = matchingEntries.filter(entry => {
      // Check if the entry belongs to a valid transaction
      if (!entry.transaction || 
          entry.transaction._id.toString() === transaction._id.toString() ||
          entry.transaction.isBalanced) {
        return false;
      }
      
      // Check if the transaction date is within range
      if (entry.transaction.date) {
        const entryDate = new Date(entry.transaction.date);
        const diffInDays = Math.abs(entryDate - targetDate) / (1000 * 60 * 60 * 24);
        
        // Skip entries outside the date range
        if (diffInDays > dateRange) {
          console.log(`Entry ${entry._id} excluded: ${diffInDays} days apart (max: ${dateRange})`);
          return false;
        }
      }
      
      return true;
    });
    
    console.log(`Found ${validMatches.length} matches out of ${matchingEntries.length} total entries with matching criteria`);
    
    return res.status(200).json({
      success: true,
      data: {
        targetEntry: targetEntryLine,
        matches: validMatches.slice(0, parseInt(maxMatches))
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

// @desc    Balance two transactions by combining their entry lines
// @route   POST /api/transactions/balance
// @access  Public
exports.balanceTransactions = async (req, res) => {
  try {
    const { sourceEntryId, targetEntryId } = req.body;
    
    // Get the entries
    const sourceEntry = await EntryLine.findById(sourceEntryId);
    const targetEntry = await EntryLine.findById(targetEntryId);
    
    if (!sourceEntry || !targetEntry) {
      return res.status(404).json({
        success: false,
        error: 'One or both entries not found'
      });
    }
    
    // Get transactions
    const sourceTransaction = await Transaction.findById(sourceEntry.transaction);
    const targetTransaction = await Transaction.findById(targetEntry.transaction);
    
    if (!sourceTransaction || !targetTransaction) {
      return res.status(404).json({
        success: false,
        error: 'One or both transactions not found'
      });
    }
    
    // Verify transactions aren't already balanced
    if (sourceTransaction.isBalanced && targetTransaction.isBalanced) {
      return res.status(400).json({
        success: false,
        error: 'Both transactions are already balanced'
      });
    }
    
    // Verify entries have opposite types (one debit, one credit)
    if (sourceEntry.type === targetEntry.type) {
      return res.status(400).json({
        success: false,
        error: 'Entries must have opposite types to balance'
      });
    }
    
    // Move all entry lines from target transaction to source transaction
    const targetEntries = await EntryLine.find({
      transaction: targetTransaction._id
    });
    
    // Update each entry to point to the source transaction
    for (const entry of targetEntries) {
      entry.transaction = sourceTransaction._id;
      await entry.save();
    }
    
    // Create a merged description if needed
    if (sourceTransaction.description !== targetTransaction.description) {
      sourceTransaction.description = 
        `${sourceTransaction.description} + ${targetTransaction.description}`;
    }
    
    // Add any notes from the target transaction
    if (targetTransaction.notes) {
      sourceTransaction.notes = 
        sourceTransaction.notes 
          ? `${sourceTransaction.notes}\n---\n${targetTransaction.notes}`
          : targetTransaction.notes;
    }
    
    // Update the source transaction timestamp
    sourceTransaction.updatedAt = Date.now();
    
    // Check if it's balanced
    sourceTransaction.isBalanced = await sourceTransaction.isTransactionBalanced();
    await sourceTransaction.save();
    
    // Delete the now-empty target transaction
    await Transaction.findByIdAndDelete(targetTransaction._id);
    
    return res.status(200).json({
      success: true,
      data: {
        transaction: sourceTransaction
      },
      message: 'Transactions successfully balanced'
    });
  } catch (error) {
    console.error('Error in balanceTransactions:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 