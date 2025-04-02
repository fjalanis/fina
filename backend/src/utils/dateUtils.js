/**
 * Date utility functions for financial date operations
 */

/**
 * Calculate a date range around a reference date considering business days
 * @param {Date} referenceDate - The center date of the range
 * @param {number} businessDays - How many business days before and after the reference date (default: 15)
 * @returns {Object} Object with startDate, endDate, businessDays, and referenceDate
 */
function calculateBusinessDayRange(referenceDate, businessDays) {
  // Ensure we have a valid reference date
  const referenceDateObj = referenceDate instanceof Date ? 
    new Date(referenceDate) : 
    new Date();
  
  // Parse and validate business days
  const days = parseInt(businessDays);
  const businessDaysToUse = (!isNaN(days) && days > 0) ? days : 15;
  
  // Create copies of the reference date to avoid modifying the original
  const startDate = new Date(referenceDateObj);
  const endDate = new Date(referenceDateObj);
  
  // Ensure a minimum of 5 business days for small ranges
  const minBusinessDays = Math.max(businessDaysToUse, 5);
  
  // Set to beginning of day for consistent comparisons
  startDate.setHours(0, 0, 0, 0);
  
  // Calculate start date (businessDays before reference date)
  // We need to go back more than exact business days to account for weekends
  let daysToMoveBack = minBusinessDays * 1.4; // Add buffer for weekends
  startDate.setDate(startDate.getDate() - Math.ceil(daysToMoveBack));
  
  // Move back until we have enough business days
  while (countBusinessDays(startDate, referenceDateObj) < minBusinessDays) {
    startDate.setDate(startDate.getDate() - 1);
  }
  
  // Set to end of day for inclusive ranges
  endDate.setHours(23, 59, 59, 999);
  
  // Calculate end date (businessDays after reference date)
  // We need to go forward more than exact business days to account for weekends
  let daysToMoveForward = minBusinessDays * 1.4; // Add buffer for weekends
  endDate.setDate(endDate.getDate() + Math.ceil(daysToMoveForward));
  
  // Move forward until we have enough business days
  while (countBusinessDays(referenceDateObj, endDate) < minBusinessDays) {
    endDate.setDate(endDate.getDate() + 1);
  }
  
  return { 
    startDate, 
    endDate, 
    businessDays: businessDaysToUse,
    referenceDate: referenceDateObj
  };
}

/**
 * Check if a date is a business day (Monday to Friday)
 * @param {Date} date - The date to check
 * @returns {boolean} True if it's a business day, false otherwise
 */
function isBusinessDay(date) {
  const day = date.getDay();
  // 0 is Sunday, 6 is Saturday in JavaScript's getDay()
  return day !== 0 && day !== 6;
}

/**
 * Count business days between two dates (inclusive of start and end dates if they are business days)
 * @param {Date} startDate - The start date
 * @param {Date} endDate - The end date
 * @returns {number} Number of business days
 */
function countBusinessDays(startDate, endDate) {
  // Check for invalid inputs
  if (!(startDate instanceof Date) || !(endDate instanceof Date)) {
    return 0;
  }
  
  // Create copies to avoid modifying original dates
  let start = new Date(startDate);
  let end = new Date(endDate);
  
  // Ensure start date is before end date
  if (start > end) {
    [start, end] = [end, start];
  }
  
  // Set time to beginning of day for both dates
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  // Handle the same day case
  if (start.getTime() === end.getTime()) {
    return isBusinessDay(start) ? 1 : 0;
  }
  
  // Count all business days between start and end inclusive
  const currentDate = new Date(start);
  let count = 0;
  
  while (currentDate <= end) {
    if (isBusinessDay(currentDate)) {
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return count;
}

module.exports = {
  calculateBusinessDayRange,
  isBusinessDay,
  countBusinessDays
}; 