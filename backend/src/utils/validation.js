const { logger } = require('./logger');
const Account = require('../models/Account');

/**
 * Validates a transaction entry
 * @param {Object} entry - The entry to validate
 * @returns {Object} - { isValid: boolean, errors: string[], parsedAmount?: number }
 */
const validateEntry = async (entry) => {
  const errors = [];
  const { accountId, amount, type, unit } = entry;
  
  if (!accountId) errors.push('Account ID is required');
  if (amount === undefined || amount === null) {
    errors.push('Amount is required');
  }
  if (!type) errors.push('Type is required');
  
  // Validate amount if present
  let parsedAmount;
  if (amount !== undefined && amount !== null) {
    parsedAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      errors.push('Amount must be a positive number');
    }
  }
  
  // Validate type if present
  if (type && type !== 'debit' && type !== 'credit') {
    errors.push('Type must be either debit or credit');
  }

  // Validate unit matches account's unit if accountId is present
  if (accountId) {
    const account = await Account.findById(accountId).select('unit').lean();
    if (!account) {
      errors.push(`Account not found for ID: ${accountId}`);
    } else if (unit && unit !== account.unit) {
      errors.push(`Entry unit (${unit}) must match account unit (${account.unit})`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    parsedAmount
  };
};

/**
 * Validates a transaction object
 * @param {Object} transaction - The transaction to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
const validateTransaction = async (transaction) => {
  const errors = [];

  // Required fields
  if (!transaction.date) errors.push('Date is required');
  if (!transaction.description) errors.push('Description is required');
  if (!transaction.entries || !Array.isArray(transaction.entries)) {
    errors.push('Entries array is required');
  }

  // Validate entries
  if (transaction.entries && transaction.entries.length > 0) {
    for (let i = 0; i < transaction.entries.length; i++) {
      const entryValidation = await validateEntry(transaction.entries[i]);
      if (!entryValidation.isValid) {
        entryValidation.errors.forEach(error => {
          errors.push(`Entry ${i + 1}: ${error}`);
        });
      }
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

/**
 * Standard error response handler
 * @param {Object} res - Express response object
 * @param {Error} error - The error that occurred
 * @param {string} defaultMessage - Default message if error doesn't have a message
 */
const handleError = (res, error, defaultMessage = 'Server error') => {
  logger.error(`Error: ${defaultMessage}`, error);
  
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(val => val.message);
    return res.status(400).json({
      success: false,
      error: messages
    });
  }
  
  return res.status(500).json({
    success: false,
    error: error.message || defaultMessage
  });
};

module.exports = {
  validateTransaction,
  validateRule,
  validateEntry,
  handleError
}; 