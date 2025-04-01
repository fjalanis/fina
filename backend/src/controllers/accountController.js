const Account = require('../models/Account');
const logger = require('../config/logger');

// @desc    Get all accounts
// @route   GET /api/accounts
// @access  Public
exports.getAccounts = async (req, res) => {
  try {
    const accounts = await Account.find()
      .populate('transactionCount');
    
    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    logger.error(`Error getting accounts: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get account by ID
// @route   GET /api/accounts/:id
// @access  Public
exports.getAccount = async (req, res) => {
  try {
    const account = await Account.findById(req.params.id)
      .populate({
        path: 'children',
        select: 'name type'
      });
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error(`Error getting account: ${error.message}`);
    
    // Check if error is a CastError (invalid ID format)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Create new account
// @route   POST /api/accounts
// @access  Public
exports.createAccount = async (req, res) => {
  try {
    // Check if parent exists when specified
    if (req.body.parent) {
      const parentAccount = await Account.findById(req.body.parent);
      
      if (!parentAccount) {
        return res.status(400).json({
          success: false,
          error: 'Parent account not found'
        });
      }
    }
    
    const account = await Account.create(req.body);
    
    res.status(201).json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error(`Error creating account: ${error.message}`);
    
    // Validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Update account
// @route   PUT /api/accounts/:id
// @access  Public
exports.updateAccount = async (req, res) => {
  try {
    // Check if parent exists when specified
    if (req.body.parent) {
      const parentAccount = await Account.findById(req.body.parent);
      
      if (!parentAccount) {
        return res.status(400).json({
          success: false,
          error: 'Parent account not found'
        });
      }
      
      // Prevent circular references
      if (req.body.parent === req.params.id) {
        return res.status(400).json({
          success: false,
          error: 'Account cannot be its own parent'
        });
      }
    }
    
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true
      }
    );
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error(`Error updating account: ${error.message}`);
    
    // Check if error is a CastError (invalid ID format)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }
    
    // Validation error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      
      return res.status(400).json({
        success: false,
        error: messages
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Delete account
// @route   DELETE /api/accounts/:id
// @access  Public
exports.deleteAccount = async (req, res) => {
  try {
    // Check if account has children
    const childrenCount = await Account.countDocuments({ parent: req.params.id });
    
    if (childrenCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete account with child accounts'
      });
    }
    
    const account = await Account.findById(req.params.id);
    
    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'Account not found'
      });
    }
    
    await account.deleteOne();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    logger.error(`Error deleting account: ${error.message}`);
    
    // Check if error is a CastError (invalid ID format)
    if (error.name === 'CastError') {
      return res.status(400).json({
        success: false,
        error: 'Invalid account ID'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get account hierarchy
// @route   GET /api/accounts/hierarchy
// @access  Public
exports.getAccountHierarchy = async (req, res) => {
  try {
    // Get top-level accounts (no parent)
    const accounts = await Account.find({ parent: null }).lean();
    
    // For each root account, populate its children and calculate transaction counts
    const processedAccounts = [];
    for (const rootAccount of accounts) {
      const accountWithDetails = await getAccountWithChildren(rootAccount._id);
      processedAccounts.push(accountWithDetails);
    }
    
    res.status(200).json({
      success: true,
      count: processedAccounts.length,
      data: processedAccounts
    });
  } catch (error) {
    logger.error(`Error getting account hierarchy: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// Recursively get an account with its children and transaction counts
async function getAccountWithChildren(accountId) {
  // Get the account with transaction count
  const account = await Account.findById(accountId).lean();
  
  // Get direct transaction count
  const directTransactionCount = await Account.model('Transaction').countDocuments({
    'entries.account': accountId
  });
  
  // Get children
  const children = await Account.find({ parent: accountId }).sort({ name: 1 }).lean();
  
  // Process children recursively
  const processedChildren = [];
  let childrenTransactionCount = 0;
  
  for (const child of children) {
    const processedChild = await getAccountWithChildren(child._id);
    processedChildren.push(processedChild);
    childrenTransactionCount += processedChild.totalTransactionCount;
  }
  
  // Set values on the account
  account.children = processedChildren;
  account.transactionCount = directTransactionCount;
  account.totalTransactionCount = directTransactionCount + childrenTransactionCount;
  
  return account;
} 