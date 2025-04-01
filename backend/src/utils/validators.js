/**
 * Validates an entry for transaction operations
 * @param {Object} entry - The entry object to validate
 * @returns {Object} Object with isValid boolean and error message if not valid
 */
exports.validateEntry = (entry) => {
  const { account, amount, type } = entry;
  
  if (!account || !amount || !type) {
    return {
      isValid: false,
      error: 'Account, amount, and type are required'
    };
  }
  
  // Make sure amount is a number
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be a positive number'
    };
  }
  
  // Make sure type is valid
  if (type !== 'debit' && type !== 'credit') {
    return {
      isValid: false,
      error: 'Type must be either debit or credit'
    };
  }
  
  return {
    isValid: true,
    parsedAmount
  };
};

/**
 * Standard error response handler
 * @param {Object} res - Express response object
 * @param {Error} error - The error that occurred
 * @param {string} defaultMessage - Default message if error doesn't have a message
 */
exports.handleError = (res, error, defaultMessage = 'Server error') => {
  console.error(`Error: ${defaultMessage}`, error);
  
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