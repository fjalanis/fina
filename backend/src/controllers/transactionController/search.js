const Transaction = require('../../models/Transaction');
const { calculateBusinessDayRange } = require('../../utils/dateUtils');
const mongoose = require('mongoose'); // Ensure mongoose is required for ObjectId

// @desc    Search for entries with filters using Aggregation
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
      referenceDate,
      excludeTransactionId,
      page = 1,
      limit = 10
    } = req.query;

    // --- Date Range Calculation --- (Using referenceDate/dateRange)
    let referenceDateObj;
    if (referenceDate) {
      referenceDateObj = new Date(referenceDate);
      if (isNaN(referenceDateObj.getTime())) {
        return res.status(400).json({ success: false, error: 'Invalid referenceDate format' });
      }
    } else {
      referenceDateObj = new Date();
    }
    let dateRangeInt = parseInt(dateRange);
    if (isNaN(dateRangeInt) || dateRangeInt <= 0) {
      dateRangeInt = 15;
    }
    const dateRangeResult = calculateBusinessDayRange(referenceDateObj, dateRangeInt);
    const dateRangeStart = dateRangeResult.startDate;
    const dateRangeEnd = dateRangeResult.endDate;

    // --- Aggregation Pipeline --- 
    const pipeline = [];

    // Stage 1: Match transactions within the date range
    pipeline.push({
      $match: {
        date: { $gte: dateRangeStart, $lte: dateRangeEnd }
      }
    });

    // Stage 2: Exclude specific transaction if requested
    if (excludeTransactionId) {
       try {
         const excludeId = new mongoose.Types.ObjectId(excludeTransactionId);
         pipeline.push({ $match: { _id: { $ne: excludeId } } });
       } catch (e) { 
          console.warn('Invalid excludeTransactionId format, ignoring.');
       } 
    }

    // Stage 3: Filter transactions by searchText on description (if provided)
    if (searchText && searchText.trim() !== '') {
      pipeline.push({
        $match: {
          description: { $regex: searchText, $options: 'i' }
        }
      });
    }
    
    // Stage 4: Unwind the entries array
    pipeline.push({ $unwind: '$entries' });

    // Stage 5: Match entries based on filters
    const entryMatchStage = {};
    if (accountId) {
       try {
         entryMatchStage['entries.accountId'] = new mongoose.Types.ObjectId(accountId);
       } catch(e) { console.warn('Invalid accountId format, ignoring.'); }
    }
    if (type && ['debit', 'credit'].includes(type)) {
      entryMatchStage['entries.type'] = type;
    }
    if (minAmount !== undefined && !isNaN(parseFloat(minAmount))) {
      entryMatchStage['entries.amount'] = { ...entryMatchStage['entries.amount'], $gte: parseFloat(minAmount) };
    }
    if (maxAmount !== undefined && !isNaN(parseFloat(maxAmount))) {
      entryMatchStage['entries.amount'] = { ...entryMatchStage['entries.amount'], $lte: parseFloat(maxAmount) };
    }
    // Add the entry match stage if it has any conditions
    if (Object.keys(entryMatchStage).length > 0) {
        pipeline.push({ $match: entryMatchStage });
    }
    
    // Stage 6: Lookup Account Details for matched entries
    pipeline.push({
      $lookup: {
        from: 'accounts',
        localField: 'entries.accountId',
        foreignField: '_id',
        as: 'entries.accountDetails' // Use a temporary field
      }
    });
    // Unwind the lookup result and handle cases where account might not be found
    pipeline.push({ $unwind: { path: '$entries.accountDetails', preserveNullAndEmptyArrays: true } });

    // Stage 7: Add transaction fields to the entry for context
    pipeline.push({
      $addFields: {
        'entries.transaction': {
          _id: '$_id',
          date: '$date',
          description: '$description'
          // Add isBalanced if needed, though it requires calculation or fetching the full tx
        },
        // Add account virtual manually if needed, or use populated data
        'entries.account': '$entries.accountDetails' // Replace entry.account with populated details
      }
    });

    // Stage 8: Replace root with the modified entry document
    pipeline.push({ $replaceRoot: { newRoot: '$entries' } });

    // Stage 9: Facet for pagination and total count
    const limitInt = parseInt(limit) || 10;
    const pageInt = parseInt(page) || 1;
    const skipAmount = (pageInt - 1) * limitInt;

    pipeline.push({
      $facet: {
        paginatedResults: [
          { $skip: skipAmount },
          { $limit: limitInt }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    });

    // --- Execute Aggregation --- 
    const results = await Transaction.aggregate(pipeline);

    const paginatedEntries = results[0].paginatedResults;
    const totalCount = results[0].totalCount.length > 0 ? results[0].totalCount[0].count : 0;

    return res.status(200).json({
      success: true,
      data: {
        entries: paginatedEntries,
        pagination: {
          total: totalCount,
          page: pageInt,
          limit: limitInt,
          pages: Math.ceil(totalCount / limitInt)
        }
      }
    });

  } catch (error) {
    console.error('Error in searchEntries aggregation:', error);
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