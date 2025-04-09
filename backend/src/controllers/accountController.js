const Account = require('../models/Account');
const logger = require('../config/logger');
const Transaction = require('../models/Transaction');

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
    // Destructure allowed fields to prevent unwanted fields from being saved
    const { name, type, subtype, institution, isHidden, parent, description, unit, isActive } = req.body;
    const accountData = { name, type, subtype, institution, isHidden, parent, description, unit, isActive };

    // Remove parent if it's an empty string or null to avoid CastError
    if (accountData.parent === '' || accountData.parent === null) {
      delete accountData.parent;
    }

    // Check if parent exists when specified
    if (accountData.parent) {
      const parentAccount = await Account.findById(accountData.parent);
      
      if (!parentAccount) {
        return res.status(400).json({
          success: false,
          error: 'Parent account not found'
        });
      }
    }
    
    // Ensure unit defaults to USD if not provided or empty (model default handles this, but good practice)
    if (!accountData.unit) {
      accountData.unit = 'USD';
    }

    const account = await Account.create(accountData);
    
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
    // Destructure allowed fields for update
    const { name, type, subtype, institution, isHidden, parent, description, unit, isActive } = req.body;
    const updateData = { name, type, subtype, institution, isHidden, parent, description, unit, isActive };

    // Remove fields that are explicitly set to null or undefined to avoid overwriting with null
    Object.keys(updateData).forEach(key => (updateData[key] === undefined || updateData[key] === null) && delete updateData[key]);

    // Special handling for parent: if empty string, set to null to remove parent
    if (updateData.parent === '') {
      updateData.parent = null;
    }

    // Check if parent exists when specified and is not null
    if (updateData.parent) {
      const parentAccount = await Account.findById(updateData.parent);
      
      if (!parentAccount) {
        return res.status(400).json({
          success: false,
          error: 'Parent account not found'
        });
      }
      
      // Prevent circular references
      if (updateData.parent === req.params.id) {
        return res.status(400).json({
          success: false,
          error: 'Account cannot be its own parent'
        });
      }
    }
    
    const account = await Account.findByIdAndUpdate(
      req.params.id,
      updateData,
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
    const { startDate, endDate } = req.query;

    // Get top-level accounts (no parent)
    const accounts = await Account.find({ parent: null }).lean();
    
    // For each root account, populate its children and calculate transaction sums
    const processedAccounts = [];
    for (const rootAccount of accounts) {
      const accountWithDetails = await getAccountWithChildren(rootAccount._id, startDate, endDate); 
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

// Recursively get an account with its children, transaction counts, and debit/credit sums within a date range
async function getAccountWithChildren(accountId, startDate, endDate) { 
  // Use .lean() for efficiency, we build the plain object manually
  const account = await Account.findById(accountId).lean();

  if (!account) {
    // Handle case where account might not be found
    return null; 
  }

  // --- Calculate Debits and Credits for the current account within the date range ---
  let directDebits = 0;
  let directCredits = 0;

  // Build the date match condition if dates are provided
  const dateMatch = {};
  if (startDate) dateMatch.$gte = new Date(startDate);
  if (endDate) dateMatch.$lte = new Date(endDate);

  // Match criteria only includes date if provided
  const transactionMatchCriteria = { 
    ...(Object.keys(dateMatch).length > 0 && { date: dateMatch })
  };
  
  try {
    const aggregationResult = await Transaction.aggregate([
      // Match transactions within the date range (if specified)
      ...(Object.keys(transactionMatchCriteria).length > 0 ? [{ $match: transactionMatchCriteria }] : []), 
      { $unwind: '$entries' },
      // Match specific entries for the current accountId
      { $match: { 'entries.accountId': accountId } }, 
      {
        $group: {
          _id: null, // Group all matched entries for this account
          debits: { 
            $sum: { 
              // Sum amount only if type is 'debit'
              $cond: [ { $eq: ['$entries.type', 'debit'] }, '$entries.amount', 0 ] 
            } 
          },
          credits: { 
            $sum: { 
              // Sum amount only if type is 'credit'
              $cond: [ { $eq: ['$entries.type', 'credit'] }, '$entries.amount', 0 ] 
            } 
          }
        }
      }
    ]);

    if (aggregationResult.length > 0) {
      directDebits = aggregationResult[0].debits || 0;
      directCredits = aggregationResult[0].credits || 0;
    }
  } catch (aggError) {
    logger.error(`Aggregation error for account ${accountId}: ${aggError.message}`);
    // Decide how to handle aggregation errors, e.g., return 0s or throw
  }
  // --- End Debit/Credit Calculation ---

  // Get direct transaction count (consider if this count should also be date-filtered)
  const directTransactionCount = await Transaction.countDocuments({
    'entries.accountId': accountId 
    // Potentially add date filtering here too if count should match debits/credits period
  });
  
  // Get children (lean)
  const children = await Account.find({ parent: accountId }).sort({ name: 1 }).lean();
  
  const processedChildren = [];
  let childrenTransactionCount = 0;
  let childrenDebits = 0;
  let childrenCredits = 0;
  
  for (const child of children) {
    // Recursive call returns a plain object with calculated sums/counts, or null
    // Pass dates down recursively
    const processedChild = await getAccountWithChildren(child._id, startDate, endDate); 
    if (processedChild) {
      // Access the calculated properties directly from the returned plain object
      childrenTransactionCount += processedChild.totalTransactionCount || 0; 
      childrenDebits += processedChild.totalDebits || 0;
      childrenCredits += processedChild.totalCredits || 0;
      processedChildren.push(processedChild);
    } 
  }
  
  // Add calculated sums and counts to the plain object
  account.children = processedChildren;
  account.transactionCount = directTransactionCount; // Direct count (consider date filtering?)
  account.totalTransactionCount = directTransactionCount + childrenTransactionCount; // Total count (recursive)
  account.debits = directDebits; // Direct debits for this account in range
  account.credits = directCredits; // Direct credits for this account in range
  account.totalDebits = directDebits + childrenDebits; // Total debits (recursive) in range
  account.totalCredits = directCredits + childrenCredits; // Total credits (recursive) in range
  
  return account; // Return the augmented plain object
} 