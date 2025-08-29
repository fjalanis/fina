const Rule = require('../models/Rule');
const Transaction = require('../models/Transaction');

// Get all rules
exports.getAllRules = async (req, res) => {
  try {
    const { type } = req.query;
    const query = type ? { type } : {};
    
    const rules = await Rule.find(query)
      .sort({ priority: -1 })
      .populate('sourceAccounts', 'name type')
      .populate('destinationAccounts.accountId', 'name type');
    
    res.status(200).json({ 
      success: true, 
      data: rules 
    });
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
    const { type, ...ruleData } = req.body;
    
    if (!type || !['edit', 'merge', 'complementary'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid rule type. Must be one of: edit, merge, complementary'
      });
    }
    
    // Validate required fields based on type
    if (type === 'edit' && !ruleData.newDescription) {
      return res.status(400).json({
        success: false,
        error: 'New description is required for edit rules'
      });
    }
    
    if (type === 'merge' && !ruleData.maxDateDifference) {
      return res.status(400).json({
        success: false,
        error: 'Maximum date difference is required for merge rules'
      });
    }
    
    if (type === 'complementary' && (!ruleData.destinationAccounts || ruleData.destinationAccounts.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'Destination accounts are required for complementary rules'
      });
    }
    
    const rule = new Rule({...ruleData, type});
    await rule.save();
    
    const populatedRule = await Rule.findById(rule._id)
      .populate('sourceAccounts', 'name type')
      .populate('destinationAccounts.accountId', 'name type');
    
    res.status(201).json({
      success: true,
      data: populatedRule
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Update a rule
exports.updateRule = async (req, res) => {
  try {
    const { type, ...updateData } = req.body;
    
    // Validate required fields based on type
    if (type === 'edit' && !updateData.newDescription) {
      return res.status(400).json({
        success: false,
        message: 'New description is required for edit rules'
      });
    }
    
    if (type === 'merge' && !updateData.maxDateDifference) {
      return res.status(400).json({
        success: false,
        message: 'Maximum date difference is required for merge rules'
      });
    }
    
    if (type === 'complementary' && (!updateData.destinationAccounts || updateData.destinationAccounts.length === 0)) {
      return res.status(400).json({
        success: false,
        message: 'Destination accounts are required for complementary rules'
      });
    }
    
    const rule = await Rule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({
        success: false,
        message: 'Rule not found'
      });
    }
    
    // Update fields
    Object.assign(rule, updateData, { type });
    await rule.save();
    
    const updatedRule = await Rule.findById(rule._id)
      .populate('sourceAccounts', 'name type')
      .populate('destinationAccounts.accountId', 'name type');
    
    res.status(200).json({
      success: true,
      data: updatedRule
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
const applyRuleToTransactionInternal = async (transaction) => {
  // Calculate current transaction net (sum of entry amounts; zero means balanced)
  const transactionNet = transaction.entries.reduce((sum, entry) => sum + entry.amount, 0);
  
  if (Math.abs(transactionNet) < 0.01) {
    // Transaction is already balanced (within rounding error)
    await transaction.save();
    
    return {
      success: true,
      message: 'Transaction is already balanced',
      data: { transaction }
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
      const sourceEntry = transaction.entries.find(entry => 
        entry.accountId.equals(rule.sourceAccount) && entry.amount > 0
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
  
  // Create new entries based on the rule
  const createdEntries = [];
  
  for (const entry of newEntries) {
    const newEntry = {
      accountId: entry.accountId,
      amount: entry.amount,
      description: `Auto-generated by rule: ${appliedRule.name}`,
      type: 'credit'
    };
    
    transaction.entries.push(newEntry);
    createdEntries.push(newEntry);
  }
  
  // Check if transaction is now balanced
  const newTransactionNet = transaction.entries.reduce((sum, entry) => sum + entry.amount, 0);
  
  await transaction.save();
  
  return {
    success: true,
    message: 'Rule applied successfully',
    data: {
      transaction,
      appliedRule: appliedRule._id,
      createdEntries,
      isNowBalanced: Math.abs(newTransactionNet) < 0.01
    }
  };
};

// Apply rules to an unbalanced transaction
exports.applyRule = async (req, res) => {
  try {
    const { id } = req.params;
    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({ success: false, error: 'Transaction ID is required' });
    }

    const rule = await Rule.findById(id);
    if (!rule) {
      return res.status(404).json({ success: false, error: 'Rule not found' });
    }

    let transaction = await Transaction.findById(transactionId);
    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Transaction not found' });
    }

    // Import specific service functions - assuming they are separated or accessible
    // NOTE: Actual service structure might need adjustment
    const ruleApplicationService = require('../services/ruleApplicationService');

    let ruleApplied = false;
    let originalDescription = transaction.description; // Store original description

    // Apply ONLY the specific rule requested
    try {
        switch (rule.type) {
            case 'edit':
                // Check if rule matches and apply description update
                if (rule.matchesTransaction(transaction)) {
                    console.log(`[applyRule] Applying specific edit rule ${rule.name} to TX ${transaction._id}. Current desc: "${transaction.description}"`);
                    transaction.description = rule.newDescription;
                    console.log(`[applyRule] Set transaction.description to: "${transaction.description}"`);
                    // Mark rule as applied
                    if (!transaction.appliedRules) transaction.appliedRules = [];
                    if (!transaction.appliedRules.some(ar => ar.ruleId.equals(rule._id))) {
                        transaction.appliedRules.push({ ruleId: rule._id });
                    }
                    ruleApplied = true;
                }
                break;
            case 'merge':
                // TODO: Ideally call a standalone applyMergeRule function from the service
                console.warn('Applying merge rule via single-apply endpoint not fully implemented using service');
                // ruleApplied = await ruleApplicationService.applyMergeRule(transaction, rule);
                break;
            case 'complementary':
                // TODO: Ideally call a standalone applyComplementaryRule function from the service
                console.warn('Applying complementary rule via single-apply endpoint not fully implemented using service');
                // ruleApplied = await ruleApplicationService.applyComplementaryRule(transaction, rule);
                break;
            default:
                console.warn(`Unknown rule type encountered in applyRule: ${rule.type}`);
        }
    } catch (serviceError) {
        console.error(`Error during specific rule application (${rule.type}):`, serviceError);
        // Decide if we should bail or continue - for now, continue and fetch final state
    }

    // Save the transaction if this specific rule modified it
    if (ruleApplied) {
        console.log(`[applyRule] Saving transaction ${transaction._id} after applying rule ${rule.name}...`);
        await transaction.save();
        console.log(`[applyRule] Saved transaction ${transaction._id}.`);
    } else {
        console.log(`[applyRule] Rule ${rule.name} was not applied or did not modify transaction ${transaction._id}. Skipping save.`);
    }

    // Fetch the final state of the transaction
    console.log(`[applyRule] Fetching final state for transaction ${transactionId}...`);
    const finalTransaction = await Transaction.findById(transactionId)
      .populate('entries.account');
      
    if (!finalTransaction) {
      console.error(`Failed to fetch transaction ${transactionId} after potential rule application.`);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve transaction after rule application.'
      });
    } else {
        console.log(`[applyRule] Fetched final transaction. Description: "${finalTransaction.description}"`);
        // Sanity check: If description unexpectedly changed back, log it.
        if (rule.type === 'edit' && ruleApplied && finalTransaction.description !== rule.newDescription) {
            console.error(`[applyRule] CRITICAL: Description mismatch after fetch! Expected "${rule.newDescription}", got "${finalTransaction.description}". Original was "${originalDescription}"`);
        }
    }

    res.status(200).json({
      success: true,
      data: {
        transaction: finalTransaction
      }
    });
  } catch (error) {
    console.error('Error in applyRule endpoint:', error);
    res.status(400).json({ success: false, error: error.message });
  }
};

// Apply rules to all unbalanced transactions
exports.applyRulesToAllTransactions = async (req, res) => {
  try {
    const { applyEditRule, applyMergeRule, applyComplementaryRule } = require('../services/ruleApplicationService');
    const { ruleId } = req.body || {};

    if (!ruleId) {
      return res.status(400).json({ success: false, message: 'ruleId is required' });
    }

    const rule = await Rule.findById(ruleId);
    if (!rule) return res.status(404).json({ success: false, message: 'Rule not found' });

    // Find candidate transactions (all that match description; filtering by rule.matchesTransaction)
    const candidates = await Transaction.find({ description: { $regex: rule.pattern, $options: 'i' } });

    let processed = 0;
    let matched = 0;
    let modified = 0;
    const skippedAlreadyApplied = [];
    const errors = [];

    const { getIo } = require('../socket');
    const io = getIo();
    const jobId = `${rule._id}:${Date.now()}`;
    for (const tx of candidates) {
      processed++;
      if (!rule.matchesTransaction(tx)) continue;
      matched++;
      // Skip if already applied to this tx
      const already = tx.appliedRules && tx.appliedRules.some(ar => ar.ruleId.equals(rule._id));
      if (already) {
        skippedAlreadyApplied.push(tx._id);
        continue;
      }
      try {
        switch (rule.type) {
          case 'edit':
            await applyEditRule(tx, rule);
            break;
          case 'merge':
            await applyMergeRule(tx, rule);
            break;
          case 'complementary':
            await applyComplementaryRule(tx, rule);
            break;
        }
        modified++;
        if (io) io.emit('rule-apply-progress', { jobId, processed, matched, modified });
      } catch (e) {
        errors.push({ id: tx._id, error: e.message });
      }
    }

    res.status(200).json({
      success: true,
      data: { processed, matched, modified, skippedAlreadyAppliedCount: skippedAlreadyApplied.length, errorsCount: errors.length }
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

// Preview transactions that would match a rule
exports.previewMatchingTransactions = async (req, res) => {
  try {
    const { pattern, sourceAccounts, entryType } = req.query;
    
    // Validate pattern is provided
    if (!pattern) {
      return res.status(400).json({
        success: false,
        error: 'Pattern is required for preview'
      });
    }
    
    // Create a temporary rule object to use for matching
    const tempRule = {
      pattern,
      sourceAccounts: sourceAccounts ? (Array.isArray(sourceAccounts) ? sourceAccounts : [sourceAccounts]) : [],
      entryType: entryType || 'both',
      ignoreCase: true
    };
    
    // Query for all transactions
    const transactions = await Transaction.find()
      .populate('entries.account')
      .sort({ date: -1 })
      .lean();
    
    // Filter transactions that match the rule criteria
    const matchingTransactions = transactions.filter(transaction => {
      return Rule.matchesTransaction(tempRule, transaction);
    });
    
    // Get unbalanced transactions count using the aggregation method
    const unbalancedTransactions = await Transaction.findUnbalanced();
    
    res.status(200).json({
      success: true,
      data: {
        matchingTransactions,
        totalUnbalanced: unbalancedTransactions.length,
        totalMatching: matchingTransactions.length
      }
    });
  } catch (error) {
    console.error('Error in previewMatchingTransactions:', error);
    res.status(500).json({
      success: false,
      message: 'Error previewing rule matches',
      error: error.message
    });
  }
}; 