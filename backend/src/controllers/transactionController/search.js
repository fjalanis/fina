const Transaction = require('../../models/Transaction');

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
    
    // Date range filter - only include entries from last N days
    const earliestDate = new Date();
    earliestDate.setDate(earliestDate.getDate() - parseInt(dateRange || 15));
    
    // Calculate pagination
    const skipAmount = (parseInt(page) - 1) * parseInt(limit);
    
    console.log('Filtering transactions from date:', earliestDate);
    
    // Get transactions that match the date range
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
    searchQuery._id = { 
      $in: transactionIds,
    };
    
    // Add excludeTransactionId filter if provided
    if (excludeTransactionId && excludeTransactionId.trim() !== '') {
      searchQuery._id.$ne = excludeTransactionId;
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
        searchQuery._id = { 
          $in: textSearchTransactions,
        };
        
        // Re-add excludeTransactionId filter if it was provided
        if (excludeTransactionId && excludeTransactionId.trim() !== '') {
          searchQuery._id.$ne = excludeTransactionId;
        }
      } catch (err) {
        console.error('Error in text search:', err);
        // Continue with all transactions if text search fails
      }
    }
    
    console.log('Final search query:', JSON.stringify(searchQuery));
    
    // Get transactions with matching entries
    const transactions = await Transaction.find(searchQuery)
      .populate('entries.account')
      .sort({ date: -1 })
      .skip(skipAmount)
      .limit(parseInt(limit));
    
    // Filter entries based on criteria
    const filteredEntries = transactions.reduce((acc, transaction) => {
      const matchingEntries = transaction.entries.filter(entry => {
        // Amount range filter
        if (minAmount !== undefined && entry.amount < parseFloat(minAmount)) return false;
        if (maxAmount !== undefined && entry.amount > parseFloat(maxAmount)) return false;
        
        // Account filter
        if (accountId && accountId.trim() !== '' && entry.account._id.toString() !== accountId) return false;
        
        // Type filter
        if (type && ['debit', 'credit'].includes(type) && entry.type !== type) return false;
        
        return true;
      });
      
      return acc.concat(matchingEntries.map(entry => ({
        ...entry.toObject(),
        transaction: {
          _id: transaction._id,
          date: transaction.date,
          description: transaction.description,
          isBalanced: transaction.isBalanced
        }
      })));
    }, []);
    
    // Count total matching entries for pagination
    const totalCount = filteredEntries.length;
    console.log(`Found ${totalCount} matching entries`);
    
    return res.status(200).json({
      success: true,
      data: {
        entries: filteredEntries,
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

// @route   GET /api/transactions/search
// @desc    Search transactions and their entries
// @access  Private
exports.searchTransactions = async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      description,
      accountId,
      minAmount,
      maxAmount,
      type,
      page = 1,
      limit = 10
    } = req.query;
    
    // Build the search query
    const searchQuery = {};
    
    // Date range
    if (startDate || endDate) {
      searchQuery.date = {};
      if (startDate) searchQuery.date.$gte = new Date(startDate);
      if (endDate) searchQuery.date.$lte = new Date(endDate);
    }
    
    // Description
    if (description) {
      searchQuery.description = { $regex: description, $options: 'i' };
    }
    
    // Entry filters
    if (accountId || minAmount || maxAmount || type) {
      searchQuery.entries = {
        $elemMatch: {}
      };
      
      if (accountId) {
        searchQuery.entries.$elemMatch.account = accountId;
      }
      
      if (minAmount || maxAmount) {
        searchQuery.entries.$elemMatch.amount = {};
        if (minAmount) searchQuery.entries.$elemMatch.amount.$gte = parseFloat(minAmount);
        if (maxAmount) searchQuery.entries.$elemMatch.amount.$lte = parseFloat(maxAmount);
      }
      
      if (type) {
        searchQuery.entries.$elemMatch.type = type;
      }
    }
    
    // Execute the search
    const transactions = await Transaction.find(searchQuery)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    // Get total count for pagination
    const totalCount = await Transaction.countDocuments(searchQuery);
    
    res.json({
      success: true,
      data: transactions,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error searching transactions:', error);
    res.status(500).json({ error: 'Error searching transactions' });
  }
}; 