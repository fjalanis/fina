const mongoose = require('mongoose');

const AccountSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Account name is required'],
    trim: true,
    maxlength: [100, 'Account name cannot exceed 100 characters']
  },
  type: {
    type: String,
    required: [true, 'Account type is required'],
    enum: ['asset', 'liability', 'income', 'expense', 'equity'],
    default: 'asset'
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Account',
    default: null
  },
  unit: {
    type: String,
    required: [true, 'Unit is required'],
    default: 'USD',
    maxlength: [20, 'Unit cannot exceed 20 characters']
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

// Virtual for child accounts
AccountSchema.virtual('children', {
  ref: 'Account',
  localField: '_id',
  foreignField: 'parent'
});

// Virtual for transaction count (direct transactions only)
AccountSchema.virtual('transactionCount', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'entries.account',
  count: true
});

// Virtual for total transaction count (including descendants)
AccountSchema.virtual('totalTransactionCount', {
  ref: 'Transaction',
  localField: '_id',
  foreignField: 'entries.account',
  count: true,
  get: async function() {
    // Get direct transaction count
    const directCount = await this.model('Transaction').countDocuments({
      'entries.account': this._id
    });

    // Get all descendant accounts
    const descendants = await this.model('Account').find({
      parent: this._id
    });

    // Recursively get transaction counts from descendants
    let descendantCount = 0;
    for (const descendant of descendants) {
      descendantCount += await descendant.totalTransactionCount;
    }

    return directCount + descendantCount;
  }
});

// Middleware to update the 'updatedAt' field on save
AccountSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Middleware to prevent circular references
AccountSchema.pre('save', async function(next) {
  if (this.parent) {
    // Check if this account is being set as its own parent
    if (this.parent.toString() === this._id.toString()) {
      return next(new Error('Account cannot be its own parent'));
    }

    // Check for circular references by traversing up the parent chain
    let currentParent = await this.constructor.findById(this.parent);
    while (currentParent) {
      if (currentParent._id.toString() === this._id.toString()) {
        return next(new Error('Circular reference detected in account hierarchy'));
      }
      currentParent = await this.constructor.findById(currentParent.parent);
    }
  }
  next();
});

module.exports = mongoose.model('Account', AccountSchema); 