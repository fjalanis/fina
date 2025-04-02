const mongoose = require('mongoose');

const EntrySchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Account reference ID is required']
  },
  unit: { // The unit of measure for the entry (denormalized from Account)
    type: String,
    required: [true, 'Unit is required for transaction entry']
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
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual populate for the 'account' field
EntrySchema.virtual('account', {
  ref: 'Account',
  localField: 'accountId',
  foreignField: '_id',
  justOne: true
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
    return false; // Cannot be balanced with no entries
  }

  // Use a Set to find unique units involved directly from the denormalized entry field
  const units = new Set();
  for (const entry of this.entries) {
    // The unit field is required by the schema, so it should exist if validation passed.
    // If it's missing here, it indicates an earlier issue (e.g., direct manipulation bypassing validation).
    if (!entry.unit) {
      console.warn(`Transaction ${this._id}: Entry missing required unit field. Cannot reliably determine balance.`);
      return false; 
    }
    units.add(entry.unit);
  }

  // If more than one unit is involved, consider it implicitly balanced (as per Step 8 design)
  if (units.size > 1) {
    return true;
  }

  // If only one unit is involved (or zero entries, handled above), check debit/credit balance for that unit
  const totalDebits = this.entries.reduce((sum, entry) => 
    sum + (entry.type === 'debit' ? entry.amount : 0), 0);
  const totalCredits = this.entries.reduce((sum, entry) => 
    sum + (entry.type === 'credit' ? entry.amount : 0), 0);
  
  // Use a small threshold for floating point comparisons
  const threshold = 0.01;
  return Math.abs(totalDebits - totalCredits) < threshold;
});

// Pre-save middleware to validate entries
TransactionSchema.pre('save', function(next) {
  if (!this.entries || this.entries.length === 0) {
    console.error('Transaction must have at least one entry', this);
    next(new Error('Transaction must have at least one entry'));
    return;
  }
  
  // Validate that all entry amounts are positive
  const hasInvalidAmount = this.entries.some(entry => entry.amount <= 0);
  if (hasInvalidAmount) {
    console.error('All entry amounts must be positive', this);
    next(new Error('All entry amounts must be positive'));
    return;
  }
  
  next();
});

// Static method to find unbalanced transactions using aggregation
TransactionSchema.statics.findUnbalanced = async function(options = {}) {
  const { populate = true, threshold = 0.01, query = {} } = options;
  
  const pipeline = [
    // Apply the query if provided
    { $match: query },

    // Unwind entries to work with them individually
    { $unwind: '$entries' },
    
    // Group by transaction ID and calculate sums for each type
    {
      $group: {
        _id: '$_id',
        date: { $first: '$date' },
        description: { $first: '$description' },
        reference: { $first: '$reference' },
        notes: { $first: '$notes' },
        entries: { $push: '$entries' },
        appliedRules: { $first: '$appliedRules' },
        createdAt: { $first: '$createdAt' },
        updatedAt: { $first: '$updatedAt' },
        totalDebit: {
          $sum: {
            $cond: [
              { $eq: ['$entries.type', 'debit'] },
              '$entries.amount',
              0
            ]
          }
        },
        totalCredit: {
          $sum: {
            $cond: [
              { $eq: ['$entries.type', 'credit'] },
              '$entries.amount',
              0
            ]
          }
        }
      }
    },
    
    // Calculate the absolute difference between debits and credits
    {
      $addFields: {
        balanceDifference: { $abs: { $subtract: ['$totalDebit', '$totalCredit'] } }
      }
    },
    
    // Filter to only include transactions where the difference is greater than or equal to the threshold
    {
      $match: {
        balanceDifference: { $gte: threshold }
      }
    },
    
    // Sort by date (most recent first)
    { $sort: { date: -1 } }
  ];
  
  let transactions = await this.aggregate(pipeline);
  
  // If populate is requested, we need to manually populate since
  // aggregate doesn't support automatic population
  if (populate && transactions.length > 0) {
    // Convert aggregation results to proper format
    transactions = await this.populate(transactions, {
      path: 'entries.account',
      select: 'name type'
    });
  }
  
  return transactions;
};

module.exports = mongoose.model('Transaction', TransactionSchema); 