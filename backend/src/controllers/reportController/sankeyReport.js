const { handleError } = require('../../utils/validation');
const sankeyService = require('../../services/sankeyService'); // Import the service

// @desc    Get Sankey diagram data for a specified period
// @route   GET /api/reports/sankey
// @access  Public // Assuming public access like other reports
exports.getSankeyReport = async (req, res) => {
  try {
    let { startDate, endDate } = req.query;

    // Default date range: last 90 days
    if (!endDate) {
      endDate = new Date();
    } else {
      endDate = new Date(endDate);
    }
    
    if (!startDate) {
      const ninetyDaysAgo = new Date();
      // Ensure the default start date is calculated based on the final end date
      ninetyDaysAgo.setDate(new Date(endDate).getDate() - 90);
      startDate = ninetyDaysAgo;
    } else {
      startDate = new Date(startDate);
    }

    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ success: false, error: 'Invalid date format' });
    }
    if (startDate > endDate) {
      return res.status(400).json({ success: false, error: 'Start date cannot be after end date' });
    }

    // Call the service function to generate Sankey data
    const sankeyData = await sankeyService.generateSankeyData(startDate, endDate);
    
    // Remove placeholder response
    // const sankeyData = { 
    //   nodes: [], 
    //   links: [], 
    //   message: "Sankey data generation not yet implemented."
    // };

    res.status(200).json({
      success: true,
      dateRange: { start: startDate, end: endDate },
      data: sankeyData // Send the actual data from the service
    });

  } catch (error) {
    handleError(res, error, 'Error generating Sankey report');
  }
}; 