const Rule = require('../models/Rule');
const Transaction = require('../models/Transaction');

// Helper function to check if a rule has been applied to a transaction
const hasRuleBeenApplied = (transaction, ruleId) => {
  return transaction.appliedRules && 
         transaction.appliedRules.some(rule => rule.ruleId.equals(ruleId));
};

// Helper to check if a date is within business days range
const isWithinBusinessDays = (date1, date2, maxBusinessDays) => {
  const diffTime = Math.abs(date1 - date2);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Simple business days calculation (excluding weekends)
  let businessDays = 0;
  let currentDate = new Date(date1);
  
  while (businessDays < maxBusinessDays) {
    if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
    
    if (currentDate > date2) break;
  }
  
  return businessDays <= maxBusinessDays;
};

// Apply an edit rule to a transaction
const applyEditRule = async (transaction, rule) => {
  if (hasRuleBeenApplied(transaction, rule._id)) {
    return false;
  }
  
  // Use the new comprehensive matching method
  if (!rule.matchesTransaction(transaction)) {
    console.log(`Transaction ${transaction._id} does not match rule ${rule._id} with pattern ${rule.pattern}`);
    return false;
  }
  
  console.log(`Rule ${rule.name} matches transaction ${transaction._id}: ${transaction.description}`);
  
  // Replace the entire description with the new one
  transaction.description = rule.newDescription;
  console.log(`Updated description to: ${transaction.description}`);
  
  // Mark rule as applied
  if (!transaction.appliedRules) transaction.appliedRules = [];
  transaction.appliedRules.push({ ruleId: rule._id });
  
  await transaction.save();
  return true;
};

// Apply a merge rule to a transaction
const applyMergeRule = async (transaction, rule) => {
  if (hasRuleBeenApplied(transaction, rule._id)) {
    return false;
  }
  
  // Find matching transactions within date range
  const dateRange = new Date(transaction.date);
  dateRange.setDate(dateRange.getDate() + rule.maxDateDifference);
  
  const matchingTransactions = await Transaction.find({
    _id: { $ne: transaction._id },
    description: { $regex: rule.pattern, $options: 'i' },
    date: { 
      $gte: new Date(transaction.date),
      $lte: dateRange
    },
    entries: {
      $elemMatch: {
        account: { $in: rule.sourceAccounts }
      }
    }
  });
  
  if (matchingTransactions.length !== 1) {
    return false;
  }
  
  // Merge all matching transactions into the first one
  const targetTransaction = matchingTransactions[0];
  
  // Add entries from other transactions and the original transaction
  for (let i = 1; i < matchingTransactions.length; i++) {
    targetTransaction.entries.push(...matchingTransactions[i].entries);
  }
  
  // Add entries from the original transaction if it's not the target
  if (transaction._id.toString() !== targetTransaction._id.toString()) {
    targetTransaction.entries.push(...transaction.entries);
  }
  
  // Mark all transactions as merged
  targetTransaction.appliedRules.push({ ruleId: rule._id });
  await targetTransaction.save();
  
  // Delete other transactions
  await Transaction.deleteMany({
    _id: { $in: matchingTransactions.slice(1).map(t => t._id) }
  });
  
  // Delete the original transaction if it's not the target
  if (transaction._id.toString() !== targetTransaction._id.toString()) {
    await Transaction.deleteOne({ _id: transaction._id });
  }
  
  return true;
};

// Apply a complementary rule to a transaction
const applyComplementaryRule = async (transaction, rule) => {
  if (hasRuleBeenApplied(transaction, rule._id)) {
    return false;
  }
  
  // Find source entry that matches the rule's source accounts
  const sourceEntry = transaction.entries.find(entry => 
    (rule.sourceAccounts.length === 0 || rule.sourceAccounts.some(accountId => accountId.equals(entry.account))) &&
    entry.amount > 0
  );
  
  if (!sourceEntry) return false;
  
  // Check if we already have complementary entries
  const hasComplementaryEntries = transaction.entries.some(entry => 
    rule.destinationAccounts.some(dest => 
      dest.accountId.equals(entry.account) && 
      entry.description && 
      entry.description.includes(`Auto-generated by rule: ${rule.name}`)
    )
  );
  
  if (hasComplementaryEntries) return false;
  
  // Calculate destination entries
  const destinationEntries = rule.destinationAccounts.map(dest => ({
    account: dest.accountId,
    amount: Math.round(sourceEntry.amount * dest.ratio * 100) / 100, // Round to 2 decimal places
    type: 'credit',
    description: `Auto-generated by rule: ${rule.name}`
  }));
  
  // Add new entries to the transaction
  transaction.entries.push(...destinationEntries);
  
  // Mark rule as applied
  if (!transaction.appliedRules) transaction.appliedRules = [];
  transaction.appliedRules.push({ ruleId: rule._id });
  
  await transaction.save();
  return true;
};

// Main function to apply rules to a transaction
const applyRulesToTransaction = async (transactionId) => {
  // Get the transaction
  const transaction = await Transaction.findById(transactionId);
  if (!transaction) {
    throw new Error('Transaction not found');
  }
  
  // Get all rules
  const rules = await Rule.find({ autoApply: true });
  
  // Sort rules by priority (higher priority first)
  rules.sort((a, b) => (b.priority || 0) - (a.priority || 0));
  
  const appliedRules = [];
  const skippedRules = [];
  
  // Apply rules in reverse order (lowest priority first)
  for (const rule of rules.reverse()) {
    let applied = false;
    
    switch (rule.type) {
      case 'edit':
        applied = await applyEditRule(transaction, rule);
        break;
      case 'merge':
        applied = await applyMergeRule(transaction, rule);
        break;
      case 'complementary':
        applied = await applyComplementaryRule(transaction, rule);
        break;
    }
    
    if (applied) {
      appliedRules.push(rule._id);
    } else {
      skippedRules.push(rule._id);
    }
  }
  
  return {
    appliedRules,
    skippedRules
  };
};

const applyRuleToTransaction = async (transaction, rule) => {
  if (!transaction.entries || transaction.entries.length === 0) {
    throw new Error('Transaction must have at least one entry');
  }

  // Apply rule based on type
  switch (rule.type) {
    case 'edit':
      if (rule.matchesDescription(transaction.description)) {
        transaction.description = rule.newDescription;
      }
      break;
    case 'merge':
      // Merge logic remains the same
      break;
    case 'complementary':
      // Complementary logic remains the same
      break;
  }

  await transaction.save();
  return transaction;
};

module.exports = {
  applyRulesToTransaction,
  applyRuleToTransaction
}; 