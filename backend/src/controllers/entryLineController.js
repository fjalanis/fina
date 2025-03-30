const EntryLine = require('../models/EntryLine');
const Transaction = require('../models/Transaction');
const mongoose = require('mongoose');

// Helper to determine if we should use transactions
const useTransactions = () => {
  // In test environment, we might be using a standalone MongoDB which doesn't support transactions
  return process.env.NODE_ENV !== 'test';
};

// @desc    Create a new entry line for a transaction
// @route   POST /api/transactions/:transactionId/entries
// @access  Public
exports.createEntryLine = async (req, res) => {
  let session;
  
  if (useTransactions()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const { account, description, amount, type } = req.body;

    // Verify transaction exists
    const transaction = await Transaction.findById(req.params.transactionId);
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

    // Create entry line
    const entryLine = new EntryLine({
      transaction: req.params.transactionId,
      account,
      description,
      amount,
      type
    });

    if (session) {
      await entryLine.save({ session });
    } else {
      await entryLine.save();
    }

    // Reload transaction with entry lines to update balance
    await transaction.populate('entryLines');
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
      data: entryLine
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

// @desc    Get all entry lines for a transaction
// @route   GET /api/transactions/:transactionId/entries
// @access  Public
exports.getEntryLines = async (req, res) => {
  try {
    const entryLines = await EntryLine.find({ transaction: req.params.transactionId })
      .populate('account', 'name type');

    return res.status(200).json({
      success: true,
      count: entryLines.length,
      data: entryLines
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get single entry line
// @route   GET /api/entries/:id
// @access  Public
exports.getEntryLine = async (req, res) => {
  try {
    const entryLine = await EntryLine.findById(req.params.id)
      .populate('account', 'name type')
      .populate('transaction', 'description date');

    if (!entryLine) {
      return res.status(404).json({
        success: false,
        error: 'Entry line not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: entryLine
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update entry line
// @route   PUT /api/entries/:id
// @access  Public
exports.updateEntryLine = async (req, res) => {
  let session;
  
  if (useTransactions()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const { account, description, amount, type } = req.body;

    // Find entry line
    const entryLine = await EntryLine.findById(req.params.id);

    if (!entryLine) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        error: 'Entry line not found'
      });
    }

    // Update entry line fields
    entryLine.account = account || entryLine.account;
    entryLine.description = description || entryLine.description;
    entryLine.amount = amount || entryLine.amount;
    entryLine.type = type || entryLine.type;

    if (session) {
      await entryLine.save({ session });
    } else {
      await entryLine.save();
    }

    // Update transaction balance
    const transaction = await Transaction.findById(entryLine.transaction);
    if (transaction) {
      await transaction.populate('entryLines');
      transaction.isBalanced = await transaction.isTransactionBalanced();
      
      if (session) {
        await transaction.save({ session });
      } else {
        await transaction.save();
      }
    }

    if (session) {
      await session.commitTransaction();
      session.endSession();
    }

    return res.status(200).json({
      success: true,
      data: entryLine
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

// @desc    Delete entry line
// @route   DELETE /api/entries/:id
// @access  Public
exports.deleteEntryLine = async (req, res) => {
  let session;
  
  if (useTransactions()) {
    session = await mongoose.startSession();
    session.startTransaction();
  }

  try {
    const entryLine = await EntryLine.findById(req.params.id);

    if (!entryLine) {
      if (session) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({
        success: false,
        error: 'Entry line not found'
      });
    }

    // Save transaction ID before removing entry line
    const transactionId = entryLine.transaction;

    // Remove entry line
    if (session) {
      await EntryLine.deleteOne({ _id: entryLine._id }, { session });
    } else {
      await EntryLine.deleteOne({ _id: entryLine._id });
    }

    // Update transaction balance
    const transaction = await Transaction.findById(transactionId);
    if (transaction) {
      await transaction.populate('entryLines');
      transaction.isBalanced = await transaction.isTransactionBalanced();
      
      if (session) {
        await transaction.save({ session });
      } else {
        await transaction.save();
      }
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