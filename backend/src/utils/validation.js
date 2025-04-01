const { logger } = require('./logger');

/**
 * Validates a transaction object
 * @param {Object} transaction - The transaction to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
const validateTransaction = (transaction) => {
  const errors = [];

  // Required fields
  if (!transaction.date) errors.push('Date is required');
  if (!transaction.description) errors.push('Description is required');
  if (!transaction.entries || !Array.isArray(transaction.entries)) {
    errors.push('Entries array is required');
  }

  // Validate entries
  if (transaction.entries && transaction.entries.length > 0) {
    let totalDebit = 0;
    let totalCredit = 0;

    transaction.entries.forEach((entry, index) => {
      // Required fields for each entry
      if (!entry.accountId) errors.push(`Entry ${index + 1}: Account ID is required`);
      if (entry.amount === undefined || entry.amount === null) {
        errors.push(`Entry ${index + 1}: Amount is required`);
      }
      if (!entry.type) errors.push(`Entry ${index + 1}: Type is required`);

      // Validate amount based on type
      if (entry.type === 'debit') {
        totalDebit += entry.amount;
      } else if (entry.type === 'credit') {
        totalCredit += entry.amount;
      } else {
        errors.push(`Entry ${index + 1}: Type must be either 'debit' or 'credit'`);
      }
    });

    // Check if debits equal credits
    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      errors.push('Total debits must equal total credits');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Validates a rule object
 * @param {Object} rule - The rule to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
const validateRule = (rule) => {
  const errors = [];

  // Required fields
  if (!rule.name) errors.push('Name is required');
  if (!rule.type) errors.push('Type is required');
  if (!rule.conditions || !Array.isArray(rule.conditions)) {
    errors.push('Conditions array is required');
  }
  if (!rule.actions || !Array.isArray(rule.actions)) {
    errors.push('Actions array is required');
  }

  // Validate conditions
  if (rule.conditions && rule.conditions.length > 0) {
    rule.conditions.forEach((condition, index) => {
      if (!condition.field) errors.push(`Condition ${index + 1}: Field is required`);
      if (!condition.operator) errors.push(`Condition ${index + 1}: Operator is required`);
      if (condition.value === undefined || condition.value === null) {
        errors.push(`Condition ${index + 1}: Value is required`);
      }
    });
  }

  // Validate actions
  if (rule.actions && rule.actions.length > 0) {
    rule.actions.forEach((action, index) => {
      if (!action.type) errors.push(`Action ${index + 1}: Type is required`);
      if (!action.field) errors.push(`Action ${index + 1}: Field is required`);
      if (action.value === undefined || action.value === null) {
        errors.push(`Action ${index + 1}: Value is required`);
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports = {
  validateTransaction,
  validateRule
}; 