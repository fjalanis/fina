const Transaction = require('../../models/Transaction');
const EntryLine = require('../../models/EntryLine');

// @desc    Search for entries with filters
// @route   GET /api/transactions/search-entries
// @access  Public
exports.searchEntries = async (req, res) => {
  try {
    console.log('Received search request with params:', req.query);
    
    const { 
      minAmount = 0, 
      maxAmount, 
      accountId, 
      type,
      searchText, 
      dateRange = 15, 
      excludeTransactionId,
      page = 1, 
      limit = 10 
    } = req.query;
    
    // Build the search query
    const searchQuery = {};
    
    // Amount range filter - always convert to numbers
    if (minAmount !== undefined || maxAmount !== undefined) {
      searchQuery.amount = {};
      
      if (minAmount !== undefined) {
        const minAmountNum = parseFloat(minAmount);
        if (!isNaN(minAmountNum)) {
          searchQuery.amount.$gte = minAmountNum;
        }
      }
      
      if (maxAmount !== undefined) {
        const maxAmountNum = parseFloat(maxAmount);
        if (!isNaN(maxAmountNum)) {
          searchQuery.amount.$lte = maxAmountNum;
        }
      }
    }
    
    // Account filter
    if (accountId && accountId.trim() !== '') {
      searchQuery.account = accountId;
    }
    
    // Type filter (debit/credit)
    if (type && ['debit', 'credit'].includes(type)) {
      searchQuery.type = type;
    }
    
    // Date range filter - only include entries from last N days
    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - parseInt(dateRange || 15));
    
    // Calculate pagination
    const skipAmount = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Filtering transactions from date:', earliestDate);
    
    // Get entry lines that match the criteria
    // First find transactions that match the date range
    const recentTransactions = await Transaction.find({
      date: { $gte: earliestDate },
      isBalanced: false // Only consider unbalanced transactions
    }).select('_id date description');
    
    console.log(`Found ${recentTransactions.length} recent transactions`);
    
    // If no transactions in date range, return empty results
    if (!recentTransactions || recentTransactions.length === 0) {
      console.log('No transactions found in date range');
      return res.status(200).json({
        success: true,
        data: {
          entries: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            pages: 0
          }
        }
      });
    }
    
    // Extract transaction IDs
    const transactionIds = recentTransactions.map(t => t._id);
    
    // Add transaction filter to search query
    searchQuery.transaction = { 
      $in: transactionIds,
    };
    
    // Add excludeTransactionId filter if provided
    if (excludeTransactionId && excludeTransactionId.trim() !== '') {
      searchQuery.transaction.$ne = excludeTransactionId;
    }
    
    // Text search on description if provided
    let textSearchTransactions = transactionIds;
    if (searchText && searchText.trim() !== '') {
      const textPattern = new RegExp(searchText, 'i');
      
      try {
        const matchingTransactions = recentTransactions.filter(t => 
          t.description && textPattern.test(t.description)
        );
        
        textSearchTransactions = matchingTransactions.map(t => t._id);
        
        if (textSearchTransactions.length === 0) {
          // No transactions match the text search
          console.log('No transactions match the text search');
          return res.status(200).json({
            success: true,
            data: {
              entries: [],
              pagination: {
                total: 0,
                page: parseInt(page),
                limit: parseInt(limit),
                pages: 0
              }
            }
          });
        }
        
        // Update transaction filter to include only text-matching transactions
        searchQuery.transaction = { 
          $in: textSearchTransactions,
        };
        
        // Re-add excludeTransactionId filter if it was provided
        if (excludeTransactionId && excludeTransactionId.trim() !== '') {
          searchQuery.transaction.$ne = excludeTransactionId;
        }
      } catch (err) {
        console.error('Error in text search:', err);
        // Continue with all transactions if text search fails
      }
    }
    
    console.log('Final search query:', JSON.stringify(searchQuery));
    
    // Count total matching entries for pagination
    const totalCount = await EntryLine.countDocuments(searchQuery);
    console.log(`Found ${totalCount} matching entries`);
    
    // Get paginated results
    const entries = await EntryLine.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skipAmount)
      .limit(parseInt(limit))
      .populate({
        path: 'transaction',
        select: 'date description isBalanced'
      })
      .populate('account');
    
    return res.status(200).json({
      success: true,
      data: {
        entries,
        pagination: {
          total: totalCount,
          page: parseInt(page),
          limit: parseInt(limit),
          pages: Math.ceil(totalCount / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error in searchEntries:', error);
    return res.status(500).json({
      success: false,
      error: 'Server Error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}; 