const { 
  calculateBusinessDayRange,
  isBusinessDay,
  countBusinessDays
} = require('../../src/utils/dateUtils');

describe('dateUtils', () => {
  // Define some test dates using local time constructor
  const wednesday = new Date(2023, 0, 4); // Jan 4, 2023 (month is 0-indexed)
  const saturday = new Date(2023, 0, 7); // Jan 7, 2023
  const sunday = new Date(2023, 0, 8); // Jan 8, 2023

  describe('isBusinessDay', () => {
    test('should identify weekdays as business days', () => {
      // Monday through Friday
      for (let day = 0; day < 5; day++) { // Loop Mon(0) to Fri(4)
        const date = new Date(2023, 0, 2 + day); // Jan 2nd is Monday
        expect(isBusinessDay(date)).toBe(true);
      }
    });

    test('should identify weekends as non-business days', () => {
      expect(isBusinessDay(saturday)).toBe(false);
      expect(isBusinessDay(sunday)).toBe(false);
    });
  });

  describe('countBusinessDays', () => {
    test('should count business days correctly between two dates', () => {
      // Monday Jan 2 to Friday Jan 6 = 5 business days
      const startDate = new Date(2023, 0, 2);
      const endDate = new Date(2023, 0, 6);
      expect(countBusinessDays(startDate, endDate)).toBe(5);
    });

    test('should handle weekend dates correctly', () => {
      // Saturday Jan 7 to Monday Jan 9 = 1 business day (Monday)
      const startDate = new Date(2023, 0, 7);
      const endDate = new Date(2023, 0, 9);
      expect(countBusinessDays(startDate, endDate)).toBe(1);
    });

    test('should count correctly when spanning multiple weeks', () => {
      // Monday Jan 2 to Friday Jan 13 = 10 business days (2 weeks)
      const startDate = new Date(2023, 0, 2);
      const endDate = new Date(2023, 0, 13);
      expect(countBusinessDays(startDate, endDate)).toBe(10);
    });

    test('should handle reverse date order correctly', () => {
      // End date before start date
      const startDate = new Date(2023, 0, 13);
      const endDate = new Date(2023, 0, 2);
      expect(countBusinessDays(startDate, endDate)).toBe(10);
    });

    test('should return 0 for same day if not a business day', () => {
      expect(countBusinessDays(saturday, saturday)).toBe(0);
    });

    test('should return 1 for same day if it is a business day', () => {
      const monday = new Date(2023, 0, 2);
      expect(countBusinessDays(monday, monday)).toBe(1);
    });
  });

  describe('calculateBusinessDayRange', () => {
    test('should return the correct date range for default 15 business days', () => {
      const result = calculateBusinessDayRange(wednesday, 15);
      
      // Given 15 business days before and after, plus buffer
      // Before: 15 business days + ~5 buffer days = ~20 calendar days
      // After: 15 business days + ~5 buffer days = ~20 calendar days
      
      // Check that the result contains all expected properties
      expect(result).toHaveProperty('startDate');
      expect(result).toHaveProperty('endDate');
      expect(result).toHaveProperty('businessDays', 15);
      expect(result).toHaveProperty('referenceDate');
      
      // Check the dates are Date objects
      expect(result.startDate instanceof Date).toBe(true);
      expect(result.endDate instanceof Date).toBe(true);
      
      // Check the reference date matches what we provided
      expect(result.referenceDate.getTime()).toBe(wednesday.getTime());
      
      // Validate the range - should be at least 15 business days before and after
      const businessDaysBefore = countBusinessDays(result.startDate, wednesday);
      const businessDaysAfter = countBusinessDays(wednesday, result.endDate);
      
      expect(businessDaysBefore).toBeGreaterThanOrEqual(15);
      expect(businessDaysAfter).toBeGreaterThanOrEqual(15);
    });

    test('should handle weekend reference dates correctly', () => {
      const result = calculateBusinessDayRange(saturday, 10);
      
      // Saturday is a weekend - the range should still include proper business days
      expect(result.businessDays).toBe(10);
      
      // Validate the range - should be at least 10 business days before and after
      const businessDaysBefore = countBusinessDays(result.startDate, saturday);
      const businessDaysAfter = countBusinessDays(saturday, result.endDate);
      
      expect(businessDaysBefore).toBeGreaterThanOrEqual(10);
      expect(businessDaysAfter).toBeGreaterThanOrEqual(10);
    });

    test('should use default values for invalid inputs', () => {
      // Invalid number of business days
      const result1 = calculateBusinessDayRange(wednesday, 'invalid');
      expect(result1.businessDays).toBe(15); // Default to 15
      
      // Invalid reference date
      const result2 = calculateBusinessDayRange('invalid', 10);
      expect(result2.businessDays).toBe(10);
      expect(result2.referenceDate instanceof Date).toBe(true);
    });

    test('should handle different business day ranges', () => {
      const smallRange = calculateBusinessDayRange(wednesday, 5);
      const largeRange = calculateBusinessDayRange(wednesday, 30);
      
      expect(smallRange.businessDays).toBe(5);
      expect(largeRange.businessDays).toBe(30);
      
      // The small range should be contained within the large range
      // Compare dates using timestamps instead of direct date comparison
      expect(smallRange.startDate.getTime()).toBeGreaterThan(largeRange.startDate.getTime());
      expect(smallRange.endDate.getTime()).toBeLessThan(largeRange.endDate.getTime());
    });
  });
}); 