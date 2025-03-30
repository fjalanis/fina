const Transaction = require('../models/Transaction');
const EntryLine = require('../models/EntryLine');
const mongoose = require('mongoose');

// Helper to determine if we should use transactions
const useTransactions = () => {
  // In test environment, we might be using a standalone MongoDB which doesn't support transactions
  return process.env.NODE_ENV !== 'test';
};

// @desc    Create a new transaction with entry lines
// @route   POST /api/transactions
// @access  Public
exports.createTransaction = async (req, res) => {
  let session;
  
  if (useTransactions()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

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
    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    // If entry lines are provided, add them
    if (entryLines && entryLines.length > 0) {
      // Create entry lines with transaction reference
      const entryLinesWithTransaction = entryLines.map(entry => ({
        ...entry,
        transaction: transaction._id
      }));

      // Insert all entry lines
      if (session) {
        await EntryLine.insertMany(entryLinesWithTransaction, { session });
      } else {
        await EntryLine.insertMany(entryLinesWithTransaction);
      }

      // Reload transaction with entry lines
      await transaction.populate('entryLines');
    }

    // Check if transaction is balanced
    transaction.isBalanced = await transaction.isTransactionBalanced();
    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

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
  let session;
  
  if (useTransactions()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const { date, description, reference, notes } = req.body;

    // Find transaction
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
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

    if (session) {
      await transaction.save({ session });
    } else {
      await transaction.save();
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

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

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Public
exports.deleteTransaction = async (req, res) => {
  let session;
  
  if (useTransactions()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Delete all associated entry lines
    if (session) {
      await EntryLine.deleteMany({ transaction: transaction._id }, { session });
      
      // Delete the transaction
      await Transaction.deleteOne({ _id: transaction._id }, { session });
    } else {
      await EntryLine.deleteMany({ transaction: transaction._id });
      
      // Delete the transaction
      await Transaction.deleteOne({ _id: transaction._id });
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }

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
    const { maxMatches = 10 } = req.query;
    
    // First, get the target entry line
    const targetEntryLine = await EntryLine.findById(id).populate({
      path: 'transaction',
      select: 'date description isBalanced'
    }).populate('account');
    
    if (!targetEntryLine) {
      return res.status(404).json({
        success: false,
        error: 'Entry line not found'
      });
    }

    // Get the transaction for this entry
    const transaction = targetEntryLine.transaction;
    
    if (!transaction) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is already balanced or does not exist'
      });
    }
    
    // Check if transaction is balanced
    if (transaction.isBalanced) {
      return res.status(400).json({
        success: false,
        error: 'Transaction is already balanced or does not exist'
      });
    }

    // Find potential matches (entries that would balance this one)
    // Look for opposite entry types with similar absolute amounts
    const oppositeType = targetEntryLine.type === 'debit' ? 'credit' : 'debit';
    const targetAmount = targetEntryLine.amount;
    
    // Calculate date range for matching
    const targetDate = new Date(transaction.date);
    const startDate = new Date(targetDate);
    startDate.setDate(startDate.getDate() - 15);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 15);
    
    // First, find all transactions in date range that are unbalanced
    // and not the same as our source transaction
    const matchingTransactions = await Transaction.find({
      _id: { $ne: transaction._id },
      date: { $gte: startDate, $lte: endDate },
      isBalanced: false
    }).select('_id');
    
    // Get the transaction IDs
    const transactionIds = matchingTransactions.map(t => t._id);
    
    // Now find entry lines that match our criteria
    const matchingEntries = await EntryLine.find({
      transaction: { $in: transactionIds },
      type: oppositeType,
      amount: targetAmount
    }).populate({
      path: 'transaction',
      select: 'date description isBalanced'
    }).populate('account')
    .limit(parseInt(maxMatches));

    return res.status(200).json({
      success: true,
      data: {
        targetEntry: targetEntryLine,
        matches: matchingEntries
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
  let session;
  
  if (useTransactions()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const { sourceEntryId, targetEntryId } = req.body;
    
    // Get the entries
    const sourceEntry = await EntryLine.findById(sourceEntryId);
    const targetEntry = await EntryLine.findById(targetEntryId);
    
    if (!sourceEntry || !targetEntry) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        error: 'One or both entries not found'
      });
    }
    
    // Get transactions
    const sourceTransaction = await Transaction.findById(sourceEntry.transaction);
    const targetTransaction = await Transaction.findById(targetEntry.transaction);
    
    if (!sourceTransaction || !targetTransaction) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        error: 'One or both transactions not found'
      });
    }
    
    // Verify transactions aren't already balanced
    if (sourceTransaction.isBalanced && targetTransaction.isBalanced) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({
        success: false,
        error: 'Both transactions are already balanced'
      });
    }
    
    // Verify entries have opposite types (one debit, one credit)
    if (sourceEntry.type === targetEntry.type) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
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
      if (session) {
        await entry.save({ session });
      } else {
        await entry.save();
      }
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
    
    if (session) {
      await sourceTransaction.save({ session });
    } else {
      await sourceTransaction.save();
    }
    
    // Delete the now-empty target transaction
    if (session) {
      await Transaction.findByIdAndDelete(targetTransaction._id, { session });
    } else {
      await Transaction.findByIdAndDelete(targetTransaction._id);
    }
    
    if (session) {
      await session.commitTransaction();
      session.endSession();
    }
    
    return res.status(200).json({
      success: true,
      data: {
        transaction: sourceTransaction
      },
      message: 'Transactions successfully balanced'
    });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    console.error('Error in balanceTransactions:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 