import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { format, subDays, isValid, parseISO, startOfDay } from 'date-fns';
import { DateRangePicker as ReactDateRange } from 'react-date-range';

/**
 * A reusable date range picker component using react-date-range 
 * that syncs with URL search parameters.
 */
const DateRangePicker = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef(null);

  // --- Helper Functions ---
  const formatDateForDisplay = (date) => {
    if (!date || !isValid(date)) return '';
    return format(date, 'MM/dd/yyyy');
  };

  const formatDateForParam = (date) => {
    if (!date || !isValid(date)) return '';
    return format(date, 'yyyy-MM-dd');
  };

  const parseDateFromParam = (param) => {
    const dateStr = searchParams.get(param);
    if (!dateStr) return null;
    try {
      // Ensure we parse YYYY-MM-DD correctly, handling potential timezones
      const parsed = parseISO(dateStr + 'T00:00:00'); 
      return isValid(parsed) ? parsed : null;
    } catch (e) {
      console.error("Error parsing date from param:", param, dateStr, e);
      return null;
    }
  };

  // --- State Initialization ---
  // Get dates from URL or set defaults (last 30 days)
  const getInitialDates = () => {
    let endDate = parseDateFromParam('endDate') || startOfDay(new Date());
    let startDate = parseDateFromParam('startDate') || startOfDay(subDays(endDate, 30));
    
    // Ensure dates are valid Date objects
    if (!isValid(endDate)) endDate = startOfDay(new Date());
    if (!isValid(startDate)) startDate = startOfDay(subDays(endDate, 30));
    
    return {
      startDate,
      endDate,
      key: 'selection' // Required by react-date-range
    };
  };

  const [dateRange, setDateRange] = useState(getInitialDates());

  // --- URL Update Logic ---
  const updateUrlParams = useCallback((newStartDate, newEndDate) => {
    if (!isValid(newStartDate) || !isValid(newEndDate)) return;
    
    const startStr = formatDateForParam(newStartDate);
    const endStr = formatDateForParam(newEndDate);

    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.set('startDate', startStr);
    newSearchParams.set('endDate', endStr);

    // Only navigate if params actually changed to avoid loops
    if (searchParams.get('startDate') !== startStr || searchParams.get('endDate') !== endStr) {
      console.log('DateRangePicker: Updating URL params', { startStr, endStr });
      navigate(`${location.pathname}?${newSearchParams.toString()}`, { replace: true });
    }
  }, [navigate, location.pathname, searchParams]);

  // --- Effects ---
  // Effect to set default dates in URL on initial mount if missing
  useEffect(() => {
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');

    if (!urlStartDate || !urlEndDate) {
      const { startDate: defaultStartDate, endDate: defaultEndDate } = getInitialDates();
      updateUrlParams(defaultStartDate, defaultEndDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Effect to update local state if URL params change externally
  useEffect(() => {
    const urlStartDate = parseDateFromParam('startDate');
    const urlEndDate = parseDateFromParam('endDate');
    
    if (urlStartDate && urlEndDate && isValid(urlStartDate) && isValid(urlEndDate)) {
      // Only update if the dates are different from current state to prevent loops
      if (
        formatDateForParam(urlStartDate) !== formatDateForParam(dateRange.startDate) ||
        formatDateForParam(urlEndDate) !== formatDateForParam(dateRange.endDate)
      ) {
        console.log('DateRangePicker: Syncing state from URL params');
        setDateRange({
          startDate: urlStartDate,
          endDate: urlEndDate,
          key: 'selection'
        });
      }
    } else if (!urlStartDate && !urlEndDate) {
      // If params are removed, reset to defaults
      setDateRange(getInitialDates());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Rerun only when searchParams change

  // Effect to handle clicks outside the picker to close it
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [pickerRef]);

  // --- Handlers ---
  const handleSelect = (ranges) => {
    const { selection } = ranges;
    setDateRange(selection);
    updateUrlParams(selection.startDate, selection.endDate);
    // Close picker after selection - DO NOT close here for range selection
    // The "click outside" handler will close it.
    // setShowPicker(false); 
  };

  const togglePicker = () => setShowPicker(!showPicker);

  // --- Render Logic ---
  return (
    <div className="relative" ref={pickerRef}>
      <button 
        onClick={togglePicker} 
        className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
        <span>
          {`${formatDateForDisplay(dateRange.startDate)} - ${formatDateForDisplay(dateRange.endDate)}`}
        </span>
        <svg className="w-5 h-5 ml-2 -mr-1 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path></svg>
      </button>

      {showPicker && (
        <div className="absolute right-0 mt-2 z-50">
          <ReactDateRange
            editableDateInputs={true}
            onChange={handleSelect}
            moveRangeOnFirstSelection={false}
            ranges={[dateRange]} // Pass state as array
            months={2}           // Show two months
            direction="horizontal" // Horizontal layout
            showDateDisplay={false} // Hide the top input display row
            maxDate={new Date()} // Prevent selecting future dates
          />
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 