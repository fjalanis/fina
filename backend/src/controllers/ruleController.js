const Rule = require('../models/Rule');
const Transaction = require('../models/Transaction');
const EntryLine = require('../models/EntryLine');

// Get all rules
exports.getAllRules = async (req, res) => {
  try {
    const rules = await Rule.find()
      .sort({ priority: -1 })
      .populate('sourceAccount', 'name type')
      .populate('destinationAccounts.accountId', 'name type');
    
    res.status(200).json({ success: true, data: rules });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching rules',
      error: error.message
    });
  }
};

// Get a single rule by ID
exports.getRuleById = async (req, res) => {
  try {
    const rule = await Rule.findById(req.params.id)
      .populate('sourceAccount', 'name type')
      .populate('destinationAccounts.accountId', 'name type');
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }
    
    res.status(200).json({ success: true, data: rule });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching rule',
      error: error.message
    });
  }
};

// Create a new rule
exports.createRule = async (req, res) => {
  try {
    const rule = new Rule(req.body);
    await rule.save();
    
    const populatedRule = await Rule.findById(rule._id)
      .populate('sourceAccount', 'name type')
      .populate('destinationAccounts.accountId', 'name type');
    
    res.status(201).json({
      success: true,
      message: 'Rule created successfully',
      data: populatedRule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error creating rule',
      error: error.message
    });
  }
};

// Update a rule
exports.updateRule = async (req, res) => {
  try {
    const rule = await Rule.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('sourceAccount', 'name type')
    .populate('destinationAccounts.accountId', 'name type');
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Rule updated successfully',
      data: rule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Error updating rule',
      error: error.message
    });
  }
};

// Delete a rule
exports.deleteRule = async (req, res) => {
  try {
    const rule = await Rule.findByIdAndDelete(req.params.id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Rule deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting rule',
      error: error.message
    });
  }
};

// Test a rule against a sample transaction description
exports.testRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { description, amount } = req.body;
    
    if (!description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Description and amount are required for testing'
      });
    }
    
    const rule = await Rule.findById(id)
      .populate('sourceAccount', 'name type')
      .populate('destinationAccounts.accountId', 'name type');
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }
    
    // Test if description matches the rule pattern
    const isMatch = rule.matchesDescription(description);
    
    // If it's a match, calculate destination amounts
    const destinationEntries = isMatch 
      ? rule.calculateDestinationAmounts(parseFloat(amount))
      : [];
    
    res.status(200).json({
      success: true,
      data: {
        isMatch,
        rule: rule,
        testDescription: description,
        testAmount: amount,
        destinationEntries
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error testing rule',
      error: error.message
    });
  }
};

// Shared function to apply rules to a transaction
const applyRulesToTransaction = async (transaction) => {
  const entryLines = await EntryLine.find({ transaction: transaction._id });
  
  // Calculate current balance
  const currentBalance = entryLines.reduce((sum, entry) => sum + entry.amount, 0);
  
  if (Math.abs(currentBalance) < 0.01) {
    // Transaction is already balanced (within rounding error)
    transaction.isBalanced = true;
    await transaction.save();
    
    return {
      success: true,
      message: 'Transaction is already balanced',
      data: { transaction, entryLines }
    };
  }
  
  // Find all enabled rules ordered by priority
  const rules = await Rule.find({ isEnabled: true })
    .sort({ priority: -1 });
  
  // Try to find an applicable rule
  let appliedRule = null;
  let newEntries = [];
  
  for (const rule of rules) {
    if (rule.matchesDescription(transaction.description)) {
      // Find source entry that matches the rule's source account
      const sourceEntry = entryLines.find(entry => 
        entry.account.equals(rule.sourceAccount) && entry.amount > 0
      );
      
      if (sourceEntry) {
        // Calculate destination entries
        const destinationEntries = rule.calculateDestinationAmounts(sourceEntry.amount);
        
        if (destinationEntries.length > 0) {
          appliedRule = rule;
          newEntries = destinationEntries;
          break;
        }
      }
    }
  }
  
  if (!appliedRule) {
    return {
      success: false,
      message: 'No applicable rule found for this transaction'
    };
  }
  
  // Create new entry lines based on the rule
  const createdEntries = [];
  
  for (const entry of newEntries) {
    const newEntry = new EntryLine({
      transaction: transaction._id,
      account: entry.accountId,
      amount: entry.amount,
      description: `Auto-generated by rule: ${appliedRule.name}`,
      type: 'credit'
    });
    
    await newEntry.save();
    createdEntries.push(newEntry);
  }
  
  // Check if transaction is now balanced
  const newBalance = entryLines.reduce((sum, entry) => sum + entry.amount, 0) + 
                     createdEntries.reduce((sum, entry) => sum + entry.amount, 0);
  
  if (Math.abs(newBalance) < 0.01) {
    transaction.isBalanced = true;
    await transaction.save();
  }
  
  return {
    success: true,
    message: 'Rule applied successfully',
    data: {
      transaction,
      appliedRule: appliedRule._id,
      createdEntries,
      isNowBalanced: Math.abs(newBalance) < 0.01
    }
  };
};

// Apply rules to an unbalanced transaction
exports.applyRuleToTransaction = async (req, res) => {
  try {
    const { transactionId } = req.params;
    
    // Find the transaction
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Check if transaction is already balanced
    if (transaction.isBalanced) {
      return res.status(400).json({
        success: false,
        message: 'Transaction is already balanced'
      });
    }
    
    const result = await applyRulesToTransaction(transaction);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error applying rule to transaction',
      error: error.message
    });
  }
};

// Apply rules to all unbalanced transactions
exports.applyRulesToAllTransactions = async (req, res) => {
  try {
    console.log('Starting applyRulesToAllTransactions...');
    
    // Find all unbalanced transactions
    const unbalancedTransactions = await Transaction.find({ isBalanced: false });
    console.log(`Found ${unbalancedTransactions.length} unbalanced transactions`);
    
    const results = {
      total: unbalancedTransactions.length,
      successful: 0,
      failed: 0,
      details: []
    };
    
    // Process each transaction
    for (const transaction of unbalancedTransactions) {
      console.log(`Processing transaction: ${transaction.description}`);
      try {
        const result = await applyRulesToTransaction(transaction);
        
        if (result.success) {
          results.successful++;
          results.details.push({
            transactionId: transaction._id,
            status: 'success',
            message: result.message,
            appliedRuleId: result.data?.appliedRule,
            isNowBalanced: result.data?.isNowBalanced
          });
        } else {
          results.failed++;
          results.details.push({
            transactionId: transaction._id,
            status: 'failure',
            message: result.message
          });
        }
      } catch (error) {
        console.error(`Error processing transaction ${transaction._id}:`, error);
        results.failed++;
        results.details.push({
          transactionId: transaction._id,
          status: 'error',
          message: error.message
        });
      }
    }
    
    console.log('Rules processing completed:', results);
    res.status(200).json({
      success: true,
      message: 'Rules processing completed',
      data: results
    });
  } catch (error) {
    console.error('Error in applyRulesToAllTransactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error applying rules to transactions',
      error: error.message
    });
  }
}; 