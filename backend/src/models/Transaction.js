const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
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
  }
});

const TransactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
  },
  description: {
    type: String,
    required: [true, 'Transaction description is required'],
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  reference: {
    type: String,
    trim: true,
    maxlength: [100, 'Reference cannot exceed 100 characters']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  entries: [EntrySchema],
  appliedRules: [{
    ruleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Rule',
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual property to check if transaction is balanced
TransactionSchema.virtual('isBalanced').get(function() {
  if (!this.entries || this.entries.length === 0) {
    return false;
  }
  
  const totalDebits = this.entries.reduce((sum, entry) => 
    sum + (entry.type === 'debit' ? entry.amount : 0), 0);
  const totalCredits = this.entries.reduce((sum, entry) => 
    sum + (entry.type === 'credit' ? entry.amount : 0), 0);
  
  // For a transaction to be balanced, total debits must equal total credits
  return Math.abs(totalDebits - totalCredits) < 0.01;
});

// Pre-save middleware to validate entries
TransactionSchema.pre('save', function(next) {
  if (!this.entries || this.entries.length === 0) {
    next(new Error('Transaction must have at least one entry'));
    return;
  }
  
  // Validate that all entry amounts are positive
  const hasInvalidAmount = this.entries.some(entry => entry.amount <= 0);
  if (hasInvalidAmount) {
    next(new Error('All entry amounts must be positive'));
    return;
  }
  
  next();
});

module.exports = mongoose.model('Transaction', TransactionSchema); 