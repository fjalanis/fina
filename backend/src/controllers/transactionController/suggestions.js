const Transaction = require('../../models/Transaction');
const mongoose = require('mongoose');

// @desc    Get suggested matches for unbalanced transactions
// @route   GET /api/transactions/matches/
// @access  Public
exports.getSuggestedMatches = async (req, res) => {
  try {
    const { dateRange = 15, amount, type, excludeTransactionId, page = 1, limit = 10, referenceDate } = req.body;
    
    let targetEntryLine = null;
    let requiredType = null;
    let targetAmount = null;
    let referenceDateObj = null;
    
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
        
        // Parse reference date if provided
        if (referenceDate) {
          referenceDateObj = new Date(referenceDate);
          if (isNaN(referenceDateObj.getTime())) {
            console.error(`Invalid reference date: ${referenceDate}`);
            return res.status(400).json({
              success: false,
              error: 'Reference date must be a valid date'
            });
          }
        } else {
          // Fall back to current date if no reference date provided
          referenceDateObj = new Date();
        }
        
        console.log(`Parsed amount: ${targetAmount}, requested type: ${requiredType}, reference date: ${referenceDateObj}`);
      } catch (err) {
        console.error(`Error parsing parameters: ${err.message}`);
        return res.status(400).json({
          success: false,
          error: 'Invalid parameter format'
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
       
    // Calculate pagination
    const skipAmount = (parseInt(page) - 1) * parseInt(limit);
    
    // Calculate the date range filter based on the reference date
    const halfDateRange = Math.floor(parseInt(dateRange) / 2);
    const dateRangeStart = new Date(referenceDateObj);
    dateRangeStart.setDate(dateRangeStart.getDate() - halfDateRange);
    const dateRangeEnd = new Date(referenceDateObj);
    dateRangeEnd.setDate(dateRangeEnd.getDate() + halfDateRange);
    
    console.log(`Date range: ${dateRangeStart} to ${dateRangeEnd}`);
    
    // Build the aggregation pipeline
    const pipeline = [
      // Match transactions and exclude specified transaction
      {
        $match: {
          _id: excludeTransactionId ? { $ne: new mongoose.Types.ObjectId(excludeTransactionId) } : { $exists: true },
          date: {
            $gte: dateRangeStart,
            $lte: dateRangeEnd
          }
        }
      },
      
      // Unwind entries to work with them individually
      { $unwind: '$entries' },
      
      // Group by transaction ID and calculate sums for each type
      {
        $group: {
          _id: '$_id',
          date: { $first: '$date' },
          description: { $first: '$description' },
          reference: { $first: '$reference' },
          notes: { $first: '$notes' },
          entries: { $push: '$entries' },
          appliedRules: { $first: '$appliedRules' },
          createdAt: { $first: '$createdAt' },
          updatedAt: { $first: '$updatedAt' },
          totalDebit: {
            $sum: {
              $cond: [
                { $eq: ['$entries.type', 'debit'] },
                '$entries.amount',
                0
              ]
            }
          },
          totalCredit: {
            $sum: {
              $cond: [
                { $eq: ['$entries.type', 'credit'] },
                '$entries.amount',
                0
              ]
            }
          }
        }
      },
      
      // Calculate the imbalance
      {
        $addFields: {
          imbalance: { $subtract: ['$totalDebit', '$totalCredit'] }
        }
      },
      
      // Filter for complementary imbalances based on required type and amount
      {
        $match: {
          ...(requiredType === 'debit' ? 
          {
            // For debit type search, find transactions with excess debits matching the target amount
            imbalance: { $gt: 0 },
            $expr: { $lt: [{ $abs: { $subtract: ['$imbalance', targetAmount] } }, 0.01] }
          } :
          {
            // For credit type search, find transactions with excess credits matching the target amount
            imbalance: { $lt: 0 },
            $expr: { $lt: [{ $abs: { $add: ['$imbalance', targetAmount] } }, 0.01] }
          })
        }
      },
      
      // Sort by date (most recent first)
      { $sort: { date: -1 } },
      
      // Skip and limit for pagination
      { $skip: skipAmount },
      { $limit: parseInt(limit) }
    ];
    
    // Execute the aggregation
    const complementaryTransactions = await Transaction.aggregate(pipeline);
    
    // Get total count for pagination (execute a separate count aggregation)
    const countPipeline = pipeline.slice(0, -2); // Remove skip and limit stages
    const totalCount = (await Transaction.aggregate([...countPipeline, { $count: 'total' }]))[0]?.total || 0;
    
    // Populate the entries.account field
    const populatedTransactions = await Transaction.populate(complementaryTransactions, {
      path: 'entries.account',
      select: 'name type'
    });
    
    return res.status(200).json({
      success: true,
      data: {
        targetEntry: targetEntryLine,
        transactions: populatedTransactions,
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