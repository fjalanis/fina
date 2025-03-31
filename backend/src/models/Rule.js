const mongoose = require('mongoose');

const destinationAccountSchema = new mongoose.Schema({
  accountId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: true
  },
  ratio: {
    type: Number,
    min: 0,
    default: 0
  },
  absoluteAmount: {
    type: Number,
    default: 0
  }
}, { _id: false });

const ruleSchema = new mongoose.Schema({
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
    trim: true
  },
  sourceAccount: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    required: [true, 'Source account is required']
  },
  destinationAccounts: {
    type: [destinationAccountSchema],
    validate: {
      validator: function(v) {
        return v && v.length > 0;
      },
      message: 'At least one destination account is required'
    }
  },
  priority: {
    type: Number,
    default: 0,
    min: 0
  },
  isEnabled: {
    type: Boolean,
    default: true
  }
}, { 
  timestamps: true
});

// Method to test if a transaction description matches the rule pattern
ruleSchema.methods.matchesDescription = function(description) {
  if (!description) return false;
  const regex = new RegExp(this.pattern, 'i');
  return regex.test(description);
};

// Method to calculate destination amounts based on a total source amount
ruleSchema.methods.calculateDestinationAmounts = function(sourceAmount) {
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

const Rule = mongoose.model('Rule', ruleSchema);

module.exports = Rule; 