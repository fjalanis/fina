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

    // Check if entry lines are provided
    if (!entryLines || entryLines.length < 2) {
      throw new Error('A transaction must have at least two entry lines');
    }

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