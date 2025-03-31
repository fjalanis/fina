import React, { useState, useEffect } from 'react';

/**
 * A reusable date range picker component for reports
 * Allows selection of a start and end date with validation
 */
const DateRangePicker = ({ onChange, initialStartDate, initialEndDate }) => {
  const [startDate, setStartDate] = useState(initialStartDate || '');
  const [endDate, setEndDate] = useState(initialEndDate || '');
  const [error, setError] = useState('');

  // Format today's date as YYYY-MM-DD for max date attribute
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Only call onChange when both dates are set and valid
    if (startDate && endDate) {
      // Validate dates
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (start > end) {
        setError('Start date must be before end date');
        return;
      }
      
      setError('');
      onChange({ startDate, endDate });
    }
  }, [startDate, endDate, onChange]);

  const handleStartDateChange = (e) => {
    setStartDate(e.target.value);
  };

  const handleEndDateChange = (e) => {
    setEndDate(e.target.value);
  };

  return (
    <div className="mb-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={handleStartDateChange}
            max={endDate || today}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
        <div className="w-full sm:w-1/2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={handleEndDateChange}
            min={startDate}
            max={today}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            required
          />
        </div>
      </div>
      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default DateRangePicker; 