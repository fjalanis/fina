const Account = require('../models/Account');
const logger = require('../config/logger');
const Transaction = require('../models/Transaction');
const Rule = require('../models/Rule');

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

// @desc    Get account by ID with date-scoped totals
// @route   GET /api/accounts/:id
// @access  Public
exports.getAccount = async (req, res) => {
  try {
    // Read startDate and endDate from query parameters
    const { startDate, endDate } = req.query;
    const accountId = req.params.id;

    // 1. Fetch the target account and its direct children
    const targetAccount = await Account.findById(accountId).lean();
    if (!targetAccount) {
      return res.status(404).json({ success: false, error: 'Account not found' });
    }
    // Fetch direct children separately for easier hierarchy construction later
    const directChildren = await Account.find({ parent: accountId }).lean();

    // 2. Get all descendant IDs (including the account itself for the aggregation)
    const descendantIds = await getAllDescendantIds(accountId);
    const allRelevantIds = [targetAccount._id, ...descendantIds]; // Ensure the target account's ID is included

    // 3. Prepare date range filter for aggregation
    const dateMatch = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) dateMatch.$lte = new Date(endDate);
    const transactionMatchCriteria = {
      'entries.accountId': { $in: allRelevantIds }, // Filter by relevant account IDs
      ...(Object.keys(dateMatch).length > 0 && { date: dateMatch })
    };

    // 4. Single aggregation for the account and all descendants within the date range
    const aggregationResult = await Transaction.aggregate([
      { $match: transactionMatchCriteria },
      { $unwind: '$entries' },
      // Re-match after unwind to ensure we only consider relevant entries
      { $match: { 'entries.accountId': { $in: allRelevantIds } } }, 
      {
        $group: {
          _id: '$entries.accountId', // Group by account ID
          debits: { $sum: { $cond: [{ $eq: ['$entries.type', 'debit'] }, '$entries.amount', 0] } },
          credits: { $sum: { $cond: [{ $eq: ['$entries.type', 'credit'] }, '$entries.amount', 0] } },
          transactionCount: { $sum: 1 } // Count entries per account
        }
      }
    ]);

    // 5. Create a lookup map for aggregation results
    const summaryMap = new Map();
    aggregationResult.forEach(item => {
      summaryMap.set(item._id.toString(), {
        debits: item.debits || 0,
        credits: item.credits || 0,
        transactionCount: item.transactionCount || 0
      });
    });

    // 6. Calculate totals for the target account (summing summaries of itself and all descendants)
    let totalDebits = 0;
    let totalCredits = 0;
    let totalTransactionCount = 0;
    
    allRelevantIds.forEach(relId => {
      const summary = summaryMap.get(relId.toString());
      if (summary) {
        totalDebits += summary.debits;
        totalCredits += summary.credits;
        totalTransactionCount += summary.transactionCount;
      }
    });

    // 7. Populate target account details
    const targetSummary = summaryMap.get(targetAccount._id.toString()) || { debits: 0, credits: 0, transactionCount: 0 };
    targetAccount.debits = targetSummary.debits; // Direct debits
    targetAccount.credits = targetSummary.credits; // Direct credits
    targetAccount.transactionCount = targetSummary.transactionCount; // Direct transaction count
    targetAccount.totalDebits = totalDebits; // Total hierarchy debits
    targetAccount.totalCredits = totalCredits; // Total hierarchy credits
    targetAccount.totalTransactionCount = totalTransactionCount; // Total hierarchy transaction count
    
    // 8. Populate direct children with their *total* hierarchy summaries
    targetAccount.children = await Promise.all(directChildren.map(async (child) => {
        const childIdStr = child._id.toString();
        const childDescendantIds = await getAllDescendantIds(child._id);
        const allChildRelevantIds = [child._id, ...childDescendantIds];
        
        let childTotalDebits = 0;
        let childTotalCredits = 0;
        let childTotalTransactionCount = 0;

        allChildRelevantIds.forEach(relId => {
            const summary = summaryMap.get(relId.toString()); // Use the main summaryMap
            if (summary) {
                childTotalDebits += summary.debits;
                childTotalCredits += summary.credits;
                childTotalTransactionCount += summary.transactionCount;
            }
        });

        // Get direct summary for the child itself
        const directChildSummary = summaryMap.get(childIdStr) || { debits: 0, credits: 0, transactionCount: 0 };

        return {
            ...child, // Keep original child fields
            debits: directChildSummary.debits,
            credits: directChildSummary.credits,
            transactionCount: directChildSummary.transactionCount,
            totalDebits: childTotalDebits,
            totalCredits: childTotalCredits,
            totalTransactionCount: childTotalTransactionCount,
        };
    }));

    // Sort children by name
    targetAccount.children.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      data: targetAccount // Return the augmented target account data
    });
  } catch (error) {
    logger.error(`Error getting account ${req.params.id} with details: ${error.message}`);
    
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
    // 1) Remove entries that reference this account from all transactions
    await Transaction.updateMany(
      { 'entries.accountId': account._id },
      { $pull: { entries: { accountId: account._id } } }
    );

    // 2) Mark rules that reference this account as invalid or delete them
    const rules = await Rule.find({
      $or: [
        { sourceAccounts: account._id },
        { 'destinationAccounts.accountId': account._id }
      ]
    });
    for (const rule of rules) {
      if (rule.sourceAccounts && rule.sourceAccounts.some(id => id.equals(account._id))) {
        // Delete rules whose source is the deleted account
        await Rule.deleteOne({ _id: rule._id });
      } else {
        // Mark as invalid if destination contains the deleted account
        rule.isInvalid = true;
        rule.invalidReason = `References deleted account ${account.name}`;
        await rule.save();
      }
    }

    // 3) Delete the account
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

// @desc    Get account hierarchy with date-scoped totals
// @route   GET /api/accounts/hierarchy
// @access  Public
exports.getAccountHierarchy = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // 1. Fetch all accounts efficiently
    const allAccounts = await Account.find().lean(); // Use lean for performance

    // 2. Prepare date range filter for aggregation
    const dateMatch = {};
    if (startDate) dateMatch.$gte = new Date(startDate);
    if (endDate) dateMatch.$lte = new Date(endDate);
    const transactionMatchCriteria = {
      ...(Object.keys(dateMatch).length > 0 && { date: dateMatch })
    };

    // 3. Single aggregation for all accounts within the date range
    const aggregationResult = await Transaction.aggregate([
      // Match transactions within the date range (if specified)
      ...(Object.keys(transactionMatchCriteria).length > 0 ? [{ $match: transactionMatchCriteria }] : []),
      { $unwind: '$entries' },
      {
        $group: {
          _id: '$entries.accountId', // Group by account ID
          debits: {
            $sum: { $cond: [{ $eq: ['$entries.type', 'debit'] }, '$entries.amount', 0] }
          },
          credits: {
            $sum: { $cond: [{ $eq: ['$entries.type', 'credit'] }, '$entries.amount', 0] }
          },
          transactionCount: { $sum: 1 } // Count entries per account
        }
      }
    ]);

    // 4. Create a lookup map for aggregation results
    const summaryMap = new Map();
    aggregationResult.forEach(item => {
      summaryMap.set(item._id.toString(), {
        debits: item.debits || 0,
        credits: item.credits || 0,
        transactionCount: item.transactionCount || 0
      });
    });

    // 5. Build hierarchy and inject summaries
    const accountMap = new Map();
    const rootAccounts = [];

    allAccounts.forEach(account => {
      const accountIdStr = account._id.toString();
      const summary = summaryMap.get(accountIdStr) || { debits: 0, credits: 0, transactionCount: 0 };

      account.debits = summary.debits; // Direct debits in range
      account.credits = summary.credits; // Direct credits in range
      account.transactionCount = summary.transactionCount; // Direct count in range

      // Initialize total fields (will be calculated next)
      account.totalDebits = account.debits;
      account.totalCredits = account.credits;
      account.totalTransactionCount = account.transactionCount;
      account.children = []; // Initialize children array

      accountMap.set(accountIdStr, account);

      if (!account.parent) {
        rootAccounts.push(account); // Add top-level accounts
      }
    });

    // Second pass: reliably attach all children to their parents (order independent)
    allAccounts.forEach(account => {
      if (account.parent) {
        const parentIdStr = account.parent.toString();
        const parentAccount = accountMap.get(parentIdStr);
        if (parentAccount) {
          const exists = parentAccount.children.some(c => c._id.toString() === account._id.toString());
          if (!exists) parentAccount.children.push(account);
        }
      }
    });

    // 6. Calculate totals recursively (post-order traversal simulation)
    const calculateTotals = (account) => {
      if (!account.children || account.children.length === 0) {
        return {
          totalDebits: account.debits,
          totalCredits: account.credits,
          totalTransactionCount: account.transactionCount
        };
      }

      let childrenDebits = 0;
      let childrenCredits = 0;
      let childrenCount = 0;

      account.children.forEach(child => {
        // Ensure child exists in map (it should based on previous step)
        const childData = accountMap.get(child._id.toString()); 
        if (childData) {
            const childTotals = calculateTotals(childData); // Recursive call on the actual mapped object
            childrenDebits += childTotals.totalDebits;
            childrenCredits += childTotals.totalCredits;
            childrenCount += childTotals.totalTransactionCount;
        }
      });

      account.totalDebits = account.debits + childrenDebits;
      account.totalCredits = account.credits + childrenCredits;
      account.totalTransactionCount = account.transactionCount + childrenCount;
      
      // Sort children by name before returning
      account.children.sort((a, b) => a.name.localeCompare(b.name));

      return {
        totalDebits: account.totalDebits,
        totalCredits: account.totalCredits,
        totalTransactionCount: account.totalTransactionCount
      };
    };

    // Trigger calculation for all root accounts
    rootAccounts.forEach(root => calculateTotals(root));

    // Sort root accounts by name
    rootAccounts.sort((a, b) => a.name.localeCompare(b.name));

    res.status(200).json({
      success: true,
      count: rootAccounts.length,
      data: rootAccounts // Return the processed root accounts
    });
  } catch (error) {
    logger.error(`Error getting account hierarchy: ${error.message}`);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
};

// @desc    Get IDs of an account and all its descendants
// @route   GET /api/accounts/:id/descendants
// @access  Public 
exports.getAccountDescendants = async (req, res) => {
    try {
        const accountId = req.params.id;

        // Validate the main account ID
        const account = await Account.findById(accountId).select('_id').lean();
        if (!account) {
            return res.status(404).json({ success: false, error: 'Account not found' });
        }

        // Start with the account itself
        let allIds = [accountId];
        
        // Get all descendant IDs recursively
        const descendantIds = await getAllDescendantIds(accountId);
        
        allIds = allIds.concat(descendantIds);
        
        res.status(200).json({
            success: true,
            data: allIds // Return flat array of IDs
        });

    } catch (error) {
        logger.error(`Error getting account descendants: ${error.message}`);
        // Check for CastError
        if (error.name === 'CastError') {
             return res.status(400).json({ success: false, error: 'Invalid account ID format' });
        }
        res.status(500).json({ success: false, error: 'Server Error' });
    }
}; 

// @desc    Get unique non-USD units from all accounts
// @route   GET /api/accounts/units
// @access  Public
exports.getUniqueAccountUnits = async (req, res) => {
  try {
    // Use distinct to get unique unit values directly from the database
    const units = await Account.distinct('unit');

    // Filter out 'USD'
    const nonUsdUnits = units.filter(unit => unit !== 'USD');

    res.status(200).json({
      success: true,
      count: nonUsdUnits.length,
      data: nonUsdUnits
    });
  } catch (error) {
    console.error("Error fetching unique account units:", error);
    res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 

// Helper function to recursively get all descendant IDs
async function getAllDescendantIds(accountId) {
    let descendantIds = [];
    // Find direct children
    const children = await Account.find({ parent: accountId }).select('_id').lean();

    for (const child of children) {
        descendantIds.push(child._id);
        // Recursively get IDs of grandchildren, etc.
        const furtherDescendants = await getAllDescendantIds(child._id);
        descendantIds = descendantIds.concat(furtherDescendants);
    }
    return descendantIds;
}

// Recursively get an account with its children, transaction counts, and debit/credit sums within a date range
// REMOVED: Inefficient recursive function getAccountWithChildren
/*
async function getAccountWithChildren(accountId, startDate, endDate) { 
  // ... implementation removed ...
} 
*/

// Helper function to recursively get all descendant IDs
// REMOVED: Duplicate definition
/*
async function getAllDescendantIds(accountId) {
    let descendantIds = [];
    // Find direct children
    const children = await Account.find({ parent: accountId }).select('_id').lean();

    for (const child of children) {
        descendantIds.push(child._id);
        // Recursively get IDs of grandchildren, etc.
        const furtherDescendants = await getAllDescendantIds(child._id);
        descendantIds = descendantIds.concat(furtherDescendants);
    }
    return descendantIds;
}
*/ 