const mongoose = require('mongoose');

const EntryLineSchema = new mongoose.Schema({
  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: [true, 'Transaction reference is required']
  },
  account: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Account reference is required']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    validate: {
      validator: function(value) {
        return value > 0;
      },
      message: 'Amount must be a positive number'
    }
  },
  type: {
    type: String,
    required: [true, 'Entry type is required'],
    enum: ['debit', 'credit'],
    default: 'debit'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Middleware to update the 'updatedAt' field on save
EntryLineSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware to update transaction balance after entry line is saved
EntryLineSchema.post('save', async function() {
  try {
    const Transaction = mongoose.model('Transaction');
    const transactionId = this.transaction;
    
    if (!transactionId) return;
    
    // Find the transaction with a fresh query to ensure we have latest state
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      console.log(`Transaction ${transactionId} not found for entry line ${this._id}`);
      return; // Skip if transaction is gone
    }
    
    // Update the balance flag
    const isBalanced = await transaction.isTransactionBalanced();
    transaction.isBalanced = isBalanced;
    
    // Save with minimal validation to avoid race conditions
    await transaction.save();
  } catch (error) {
    console.error('Error updating transaction balance:', error);
  }
});

// Middleware to update transaction balance after entry line is removed
EntryLineSchema.post('deleteOne', { document: true, query: false }, async function() {
  try {
    const Transaction = mongoose.model('Transaction');
    const transactionId = this.transaction;
    
    if (!transactionId) return;
    
    // Find the transaction with a fresh query to ensure we have latest state
    const transaction = await Transaction.findById(transactionId);
    
    if (!transaction) {
      console.log(`Transaction ${transactionId} not found for deleted entry line ${this._id}`);
      return; // Skip if transaction is gone
    }
    
    // Update the balance flag
    const isBalanced = await transaction.isTransactionBalanced();
    transaction.isBalanced = isBalanced;
    
    // Save with minimal validation to avoid race conditions
    await transaction.save();
  } catch (error) {
    console.error('Error updating transaction balance:', error);
  }
});

module.exports = mongoose.model('EntryLine', EntryLineSchema); 