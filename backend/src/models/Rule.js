const mongoose = require('mongoose');

const destinationAccountSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  ratio: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  absoluteAmount: {
    type: Number,
    min: 0
  }
}, { _id: false });

// Base rule schema with common fields
const baseRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Rule name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  pattern: {
    type: String,
    required: [true, 'Pattern for matching descriptions is required'],
    trim: true,
    validate: {
      validator: function(value) {
        try {
          new RegExp(value);
          return true;
        } catch (e) {
          return false;
        }
      },
      message: 'Pattern must be a valid regular expression'
    }
  },
  sourceAccounts: {
    type: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Account'
    }],
    required: [true, 'Source accounts array is required'],
    default: [] // Empty array means all accounts
  },
  entryType: {
    type: String,
    enum: ['debit', 'credit', 'both'],
    default: 'both',
    required: true
  },
  autoApply: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    required: true,
    enum: ['edit', 'merge', 'complementary']
  }
}, { 
  timestamps: true,
  discriminatorKey: 'type'
});

// Method to test if a transaction description matches the rule pattern
baseRuleSchema.methods.matchesDescription = function(description) {
  if (!description) return false;
  const regex = new RegExp(this.pattern, 'i');
  return regex.test(description);
};

// Method to test if the rule matches the entry type
baseRuleSchema.methods.matchesEntryType = function(entryType) {
  if (this.entryType === 'both') return true;
  return this.entryType === entryType;
};

// Method to check if a transaction matches all the rule's criteria
baseRuleSchema.methods.matchesTransaction = function(transaction) {
  // First check description
  if (!this.matchesDescription(transaction.description)) {
    return false;
  }
  
  // Skip entry type and source account checks if rule accepts both types and has no source accounts
  if (this.entryType === 'both' && this.sourceAccounts.length === 0) {
    return true;
  }
  
  // Check if any entry matches the criteria
  return transaction.entries.some(entry => {
    // Match entry type if specified
    const typeMatches = this.entryType === 'both' || entry.type === this.entryType;
    
    // Match source account if specified
    const accountMatches = this.sourceAccounts.length === 0 || 
      this.sourceAccounts.some(sourceAccountId => {
        if (!sourceAccountId || !entry.accountId) return false;
        const sourceAccountIdStr = sourceAccountId.toString();
        const entryAccountIdStr = entry.accountId.toString();
        return sourceAccountIdStr === entryAccountIdStr;
      });
    
    return typeMatches && accountMatches;
  });
};

// Static method to check if a transaction matches a rule's criteria
baseRuleSchema.statics.matchesTransaction = function(rule, transaction) {
  // Check description
  if (!transaction.description || !rule.pattern) {
    return false;
  }
  
  // Check if description matches the pattern
  const regex = new RegExp(rule.pattern, 'i');
  if (!regex.test(transaction.description)) {
    return false;
  }
  
  // Skip entry type and source account checks if rule accepts both types and has no source accounts
  if (rule.entryType === 'both' && (!rule.sourceAccounts || rule.sourceAccounts.length === 0)) {
    return true;
  }
  
  // Check if any entry matches the criteria
  return transaction.entries.some(entry => {
    // Match entry type if specified
    const entryType = entry.entryType || entry.type; // Support both field names
    const typeMatches = rule.entryType === 'both' || entryType === rule.entryType;
    
    // Match source account if specified
    let accountMatches = true;
    if (rule.sourceAccounts && rule.sourceAccounts.length > 0) {
      accountMatches = rule.sourceAccounts.some(sourceAccountId => {
        if (!sourceAccountId || !entry.accountId) return false;
        const sourceAccountIdStr = sourceAccountId.toString();
        const entryAccountIdStr = entry.accountId.toString();
        return sourceAccountIdStr === entryAccountIdStr;
      });
    }
    
    return typeMatches && accountMatches;
  });
};

// Edit rule schema
const editRuleSchema = new mongoose.Schema({
  newDescription: {
    type: String,
    required: [true, 'New description is required for edit rules'],
    trim: true
  }
});

// Merge rule schema
const mergeRuleSchema = new mongoose.Schema({
  maxDateDifference: {
    type: Number,
    required: [true, 'Maximum date difference is required for merge rules'],
    min: [1, 'Maximum date difference must be at least 1 business day'],
    max: [15, 'Maximum date difference cannot exceed 15 business days'],
    default: 3
  }
});

// Complementary rule schema
const complementaryRuleSchema = new mongoose.Schema({
  destinationAccounts: {
    type: [destinationAccountSchema],
    validate: {
      validator: function(accounts) {
        // At least one destination account required
        if (accounts.length === 0) return false;
        
        // Sum of ratios should be 1 if using ratios
        const usingRatios = accounts.some(acc => acc.ratio !== undefined);
        if (usingRatios) {
          const sum = accounts.reduce((total, acc) => total + (acc.ratio || 0), 0);
          return Math.abs(sum - 1) < 0.0001; // Allow for floating point imprecision
        }
        
        return true;
      },
      message: 'Invalid destination accounts configuration'
    }
  }
});

// Method to calculate destination amounts based on a total source amount
complementaryRuleSchema.methods.calculateDestinationAmounts = function(sourceAmount) {
  if (!sourceAmount) return [];
  
  const result = [];
  
  // Get sum of ratios for proportional distribution
  const totalRatio = this.destinationAccounts.reduce((sum, dest) => {
    return sum + (dest.ratio || 0);
  }, 0);
  
  // Calculate amounts for each destination account
  this.destinationAccounts.forEach(dest => {
    let amount = 0;
    
    // If absolute amount is set, use it
    if (dest.absoluteAmount && dest.absoluteAmount > 0) {
      amount = dest.absoluteAmount;
    } 
    // If ratio is set and we have a total ratio, calculate proportional amount
    else if (dest.ratio && dest.ratio > 0 && totalRatio > 0) {
      amount = (dest.ratio / totalRatio) * sourceAmount;
    }
    
    if (amount !== 0) {
      result.push({
        accountId: dest.accountId,
        amount: amount // Keep amount positive, type field will handle debit/credit
      });
    }
  });
  
  return result;
};

// Create the base Rule model
const Rule = mongoose.model('Rule', baseRuleSchema);

// Create the specific rule type models
const EditRule = Rule.discriminator('edit', editRuleSchema);
const MergeRule = Rule.discriminator('merge', mergeRuleSchema);
const ComplementaryRule = Rule.discriminator('complementary', complementaryRuleSchema);

module.exports = Rule; 