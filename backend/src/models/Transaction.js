const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: [true, 'Transaction date is required'],
    default: Date.now
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
  isBalanced: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for entry lines
TransactionSchema.virtual('entryLines', {
  ref: 'EntryLine',
  localField: '_id',
  foreignField: 'transaction'
});

// Method to check if transaction is balanced
TransactionSchema.methods.isTransactionBalanced = async function() {
  try {
    const EntryLine = mongoose.model('EntryLine');
    
    // Get entry lines directly from the database to ensure we have the latest
    const entryLines = await EntryLine.find({ transaction: this._id });
    
    if (!entryLines || entryLines.length === 0) {
      console.log(`Transaction ${this._id} has no entry lines - considered unbalanced`);
      return false;
    }
    
    let totalDebits = 0;
    let totalCredits = 0;
    
    entryLines.forEach(entry => {
      const amount = parseFloat(entry.amount);
      // Add debits, subtract credits
      if (entry.type === 'debit') {
        totalDebits += amount;
      } else if (entry.type === 'credit') {
        totalCredits += amount;
      } else {
        console.warn(`Entry ${entry._id} has invalid type: ${entry.type}`);
      }
    });
    
    const netBalance = totalDebits - totalCredits;
    const isBalanced = Math.abs(netBalance) < 0.001;
    
    console.log(`Transaction ${this._id} balance check:
      Total Debits: ${totalDebits}
      Total Credits: ${totalCredits}
      Net Balance: ${netBalance}
      Is Balanced: ${isBalanced}
    `);
    
    // Transaction is balanced if total is zero (or very close to zero to account for floating point)
    return isBalanced;
  } catch (error) {
    console.error('Error in isTransactionBalanced:', error);
    return false;
  }
};

// Middleware to update the 'updatedAt' field on save
TransactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware to check balance before save
TransactionSchema.pre('save', async function(next) {
  if (this.isNew) {
    // Don't check balance for new transactions
    return next();
  }
  
  try {
    this.isBalanced = await this.isTransactionBalanced();
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Transaction', TransactionSchema); 