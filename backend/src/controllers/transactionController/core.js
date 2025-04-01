const Transaction = require('../../models/Transaction');
const { validateTransaction } = require('../../utils/validation');
const { applyRulesToTransaction } = require('../../services/ruleApplicationService');
const mongoose = require('mongoose');

// @route   POST /api/transactions
// @desc    Create a new transaction
// @access  Private
exports.createTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.create(req.body);
    
    // Apply rules to the transaction
    await applyRulesToTransaction(transaction._id);
    
    // Refresh transaction data after rule application
    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('entries.account');
    
    // Calculate if the transaction is balanced
    const totalDebit = updatedTransaction.entries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);
      
    const totalCredit = updatedTransaction.entries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);
      
    await updatedTransaction.save();
    
    // Convert to plain object to ensure proper serialization
    const transactionObject = updatedTransaction.toObject({ virtuals: true });
    
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
      query['entries.account'] = accountId;
    }
    
    console.log('MongoDB query:', JSON.stringify(query));
    
    const transactions = await Transaction.find(query)
      .populate({
        path: 'entries.account',
        select: 'name type'
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
        select: 'name type'
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
    
    // Update fields
    Object.assign(transaction, req.body);
    
    // Calculate if the transaction is balanced, but don't enforce it
    const totalDebit = transaction.entries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    const totalCredit = transaction.entries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
    await transaction.save();
    
    // Apply rules to the updated transaction
    await applyRulesToTransaction(transaction._id);
    
    // Get the updated transaction with applied rules
    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('entries.account');
    
    res.json({
      success: true,
      data: updatedTransaction
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

exports.addEntry = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    
    if (!transaction) {
      return res.status(404).json({ 
        success: false,
        error: 'Transaction not found' 
      });
    }
    
    transaction.entries.push(req.body);
    
    // Calculate if the transaction is balanced, but don't enforce it
    const totalDebit = transaction.entries
      .filter(e => e.type === 'debit')
      .reduce((sum, e) => sum + e.amount, 0);
      
    const totalCredit = transaction.entries
      .filter(e => e.type === 'credit')
      .reduce((sum, e) => sum + e.amount, 0);
      
    await transaction.save();
    
    // Apply rules to the updated transaction
    await applyRulesToTransaction(transaction._id);
    
    // Get the updated transaction with applied rules
    const updatedTransaction = await Transaction.findById(transaction._id)
      .populate('entries.account');
    
    res.json({
      success: true,
      data: updatedTransaction
    });
  } catch (error) {
    console.error('Error adding entry:', error);
    res.status(400).json({ 
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
        select: 'name type'
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