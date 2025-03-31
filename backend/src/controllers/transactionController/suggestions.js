const Transaction = require('../../models/Transaction');
const EntryLine = require('../../models/EntryLine');

// @desc    Get suggested matches for unbalanced transactions
// @route   GET /api/transactions/matches/:id
// @access  Public
exports.getSuggestedMatches = async (req, res) => {
  try {
    const { maxMatches = 10, dateRange = 15, amount, type, excludeTransactionId, page = 1, limit = 10 } = req.query;
    
    let targetEntryLine = null;
    let targetTransaction = null;
    let requiredType = null;
    let targetAmount = null;
    
    // Check if we're matching directly by amount/type
    if (amount && type) {
      // Direct matching by amount and type
      console.log(`Getting matches for amount ${amount} and type ${type}`);
      
      // Make sure amount is a proper number
      try {
        // Use the exact type provided (no longer calculating opposite)
        requiredType = type; // Direct match with the requested type
        targetAmount = parseFloat(amount);
        
        if (isNaN(targetAmount) || !isFinite(targetAmount)) {
          console.error(`Invalid amount value: ${amount}`);
          return res.status(400).json({
            success: false,
            error: 'Amount must be a valid number'
          });
        }
        
        console.log(`Parsed amount: ${targetAmount}, requested type: ${requiredType}`);
      } catch (err) {
        console.error(`Error parsing amount parameter: ${err.message}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid amount format'
        });
      }
      
      // If excludeTransactionId is provided, we'll exclude that transaction's entries
      if (excludeTransactionId) {
        console.log(`Excluding entries from transaction ${excludeTransactionId}`);
      }
    } else {
      return res.status(400).json({
        success: false,
        error: 'Amount and type must be provided'
      });
    }
    
    // Instead of searching for individual entries, let's find unbalanced transactions
    // that have a complementary imbalance
    console.log(`Finding transactions with ${requiredType} imbalance of approximately ${targetAmount}`);
    
    // Calculate pagination
    const skipAmount = (parseInt(page) - 1) * parseInt(limit);
    
    // Find all unbalanced transactions
    const unbalancedTransactions = await Transaction.find({
      isBalanced: false,
      _id: { $ne: excludeTransactionId } ,
      date: {
        $gte: new Date(Date.now() - dateRange * 24 * 60 * 60 * 1000),
      }
    }).populate('entryLines');
    
    // Calculate the imbalance of each transaction and filter for complementary imbalances
    const complementaryTransactions = [];
    
    for (const transaction of unbalancedTransactions) {
      let totalDebits = 0;
      let totalCredits = 0;
      
      // Skip transactions with no entry lines
      if (!transaction.entryLines || transaction.entryLines.length === 0) {
        continue;
      }
      
      // Calculate transaction balance
      transaction.entryLines.forEach(entry => {
        if (entry.type === 'debit') {
          totalDebits += parseFloat(entry.amount);
        } else {
          totalCredits += parseFloat(entry.amount);
        }
      });
      
      const imbalance = totalDebits - totalCredits;
      
      // For our required type 'credit', we need transactions with debit imbalance
      // For our required type 'debit', we need transactions with credit imbalance
      const TOLERANCE = 1.00;
      const difference = Math.abs(imbalance - targetAmount);
      const hasComplementaryImbalance = 
        (requiredType === 'credit' && imbalance > 0 && difference < TOLERANCE) ||
        (requiredType === 'debit' && imbalance < 0 && difference < TOLERANCE);
      
      if (hasComplementaryImbalance) {
        // Add calculated imbalance to transaction object for display
        complementaryTransactions.push({ ...transaction.toObject(), imbalance: imbalance.toFixed(2) });
      }
    }
    
    // Get total count for pagination
    const totalCount = complementaryTransactions.length;
    
    // Apply pagination
    const paginatedResults = complementaryTransactions.slice(skipAmount, skipAmount + parseInt(limit));
    
    return res.status(200).json({
      success: true,
      data: {
        targetEntry: targetEntryLine,
        transactions: paginatedResults,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in getSuggestedMatches:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error'
    });
  }
}; 