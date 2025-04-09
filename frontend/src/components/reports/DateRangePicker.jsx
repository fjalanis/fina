import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { format, subDays, isValid, parseISO } from 'date-fns';

/**
 * A reusable date range picker component that uses URL search parameters.
 * Allows selection of a start and end date with validation.
 */
const DateRangePicker = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');

  // --- Helper Functions ---
  const formatDateForInput = (date) => {
    if (!date || !isValid(date)) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const parseDateFromParam = (param) => {
    const dateStr = searchParams.get(param);
    if (!dateStr) return null;
    const parsed = parseISO(dateStr);
    return isValid(parsed) ? parsed : null;
  };

  // --- State Initialization ---
  // Get dates from URL or set defaults (last 30 days)
  const initialEndDate = parseDateFromParam('endDate') || new Date();
  const initialStartDate = parseDateFromParam('startDate') || subDays(initialEndDate, 30);

  // Local state for input values to allow intermediate invalid states
  const [startDateInput, setStartDateInput] = useState(formatDateForInput(initialStartDate));
  const [endDateInput, setEndDateInput] = useState(formatDateForInput(initialEndDate));

  // Format today's date as YYYY-MM-DD for max date attribute
  const today = format(new Date(), 'yyyy-MM-dd');

  // --- Effect to update URL search parameters ---
  useEffect(() => {
    // Update local state if URL params change externally
    const urlStartDate = formatDateForInput(parseDateFromParam('startDate') || subDays(parseDateFromParam('endDate') || new Date(), 30));
    const urlEndDate = formatDateForInput(parseDateFromParam('endDate') || new Date());
    if (startDateInput !== urlStartDate) {
      setStartDateInput(urlStartDate);
    }
    if (endDateInput !== urlEndDate) {
      setEndDateInput(urlEndDate);
    }
  }, [searchParams]); // Rerun only when searchParams change

  // Effect to set default dates in URL on initial mount if missing
  useEffect(() => {
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');

    if (!urlStartDate || !urlEndDate) {
      // Calculate defaults (same logic as initial state)
      const defaultEndDate = new Date();
      const defaultStartDate = subDays(defaultEndDate, 30);
      const startStr = formatDateForInput(defaultStartDate);
      const endStr = formatDateForInput(defaultEndDate);
      
      console.log('DateRangePicker: Setting default URL params:', { startStr, endStr });
      // Update URL without triggering re-render loops if possible
      // updateUrlParams uses navigate which should be safe
      updateUrlParams(startStr, endStr); 
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Handlers ---
  const updateUrlParams = (startStr, endStr) => {
    const start = parseISO(startStr);
    const end = parseISO(endStr);

    if (!isValid(start) || !isValid(end)) {
      setError('Invalid date format');
      return;
    }

    if (start > end) {
      setError('Start date must be before end date');
      return; // Don't update URL if dates are invalid
    }

    setError(''); // Clear error on valid update

    // Preserve existing search params
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('startDate', startStr);
    newSearchParams.set('endDate', endStr);

    // Use navigate to update URL without full page reload
    // Replace ensures back button works as expected
    navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
  };

  const handleStartDateChange = (e) => {
    const newStartDateStr = e.target.value;
    setStartDateInput(newStartDateStr);
    // Update URL only if both dates are present and potentially valid
    if (newStartDateStr && endDateInput) {
       updateUrlParams(newStartDateStr, endDateInput);
    }
  };

  const handleEndDateChange = (e) => {
    const newEndDateStr = e.target.value;
    setEndDateInput(newEndDateStr);
    // Update URL only if both dates are present and potentially valid
    if (startDateInput && newEndDateStr) {
       updateUrlParams(startDateInput, newEndDateStr);
    }
  };

  // --- Render Logic ---
  return (
    <div className="flex items-center space-x-4">
      <div className="flex items-center space-x-2">
        <label htmlFor="startDate" className="text-sm font-medium text-gray-700">Start:</label>
        <input
          id="startDate"
          type="date"
          value={startDateInput}
          onChange={handleStartDateChange}
          max={endDateInput || today} // Prevent start date after end date
          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          required
        />
      </div>
      <div className="flex items-center space-x-2">
         <label htmlFor="endDate" className="text-sm font-medium text-gray-700">End:</label>
        <input
          id="endDate"
          type="date"
          value={endDateInput}
          onChange={handleEndDateChange}
          min={startDateInput} // Prevent end date before start date
          max={today}          // Prevent future dates
          className="w-full px-2 py-1 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          required
        />
      </div>
      {error && (
        <p className="ml-2 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
};

export default DateRangePicker; 