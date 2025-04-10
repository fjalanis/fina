import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  format, subDays, isValid, parseISO, startOfDay, 
  subMonths, subYears, startOfYear, endOfYear,
  endOfDay, startOfMonth, endOfMonth
} from 'date-fns';
import { DateRangePicker as ReactDateRange, createStaticRanges } from 'react-date-range';

// Define custom static ranges
const staticRanges = createStaticRanges([
  {
    label: 'This Paycheck Period',
    range: () => {
      const today = new Date();
      const day = today.getDate();
      
      // First half of month (1st to 15th)
      if (day <= 15) {
        return {
          startDate: startOfDay(new Date(today.getFullYear(), today.getMonth(), 1)),
          endDate: endOfDay(new Date(today.getFullYear(), today.getMonth(), 15))
        };
      }
      
      // Second half of month (16th to end)
      return {
        startDate: startOfDay(new Date(today.getFullYear(), today.getMonth(), 16)),
        endDate: endOfDay(new Date(today.getFullYear(), today.getMonth() + 1, 0))
      };
    },
  },
  {
    label: 'This Month',
    range: () => ({
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
    }),
  },
  {
    label: 'This Year',
    range: () => ({
      startDate: startOfYear(new Date()),
      endDate: endOfYear(new Date())
    })
  },
  {
    label: 'Last Month',
    range: () => ({
      startDate: startOfDay(subMonths(new Date(), 1)),
      endDate: endOfDay(new Date())
    })
  },
  {
    label: 'Last 3 Months',
    range: () => ({
      startDate: startOfDay(subMonths(new Date(), 3)),
      endDate: endOfDay(new Date())
    })
  },
  {
    label: 'Last 6 Months',
    range: () => ({
      startDate: startOfDay(subMonths(new Date(), 6)),
      endDate: endOfDay(new Date()) // Use endOfDay for inclusivity if needed
    })
  },
  {
    label: 'Last 12 Months',
    range: () => ({
      startDate: startOfDay(subYears(new Date(), 1)),
      endDate: endOfDay(new Date()) // Use endOfDay for inclusivity if needed
    })
  },
 ]);

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
    // Always format URL params as full UTC ISO strings
    if (!date || !isValid(date)) return '';
    return date.toISOString(); 
  };

  const parseDateFromParam = (param) => {
    const dateStr = searchParams.get(param);
    if (!dateStr) return null;
    try {
      // Parse the full ISO string
      const parsed = parseISO(dateStr); 
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
    // Expects Date objects already converted to desired UTC boundaries
    if (!isValid(newStartDate) || !isValid(newEndDate)) return;
    
    const startStr = formatDateForParam(newStartDate);
    const endStr = formatDateForParam(newEndDate);

    const currentStartStr = searchParams.get('startDate');
    const currentEndStr = searchParams.get('endDate');

    // Only navigate if params actually changed
    if (currentStartStr !== startStr || currentEndStr !== endStr) {
      const newSearchParams = new URLSearchParams(searchParams);
      newSearchParams.set('startDate', startStr);
      newSearchParams.set('endDate', endStr);
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
    const localStartDate = selection.startDate;
    const localEndDate = selection.endDate;

    if (!isValid(localStartDate) || !isValid(localEndDate)) return;

    // Convert selected local dates to UTC start/end of day boundaries
    const utcStart = new Date(Date.UTC(
      localStartDate.getFullYear(),
      localStartDate.getMonth(),
      localStartDate.getDate(),
      0, 0, 0, 0 // Start of day UTC
    ));
    const utcEnd = new Date(Date.UTC(
      localEndDate.getFullYear(),
      localEndDate.getMonth(),
      localEndDate.getDate(),
      23, 59, 59, 999 // End of day UTC
    ));

    // Update local state for the picker display (uses local times)
    setDateRange(selection); 
    
    // Update URL params with the calculated UTC boundaries
    updateUrlParams(utcStart, utcEnd);
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
        <div className="absolute right-0 mt-2 z-50 flex">
          <ReactDateRange
            editableDateInputs={true}
            onChange={handleSelect}
            moveRangeOnFirstSelection={false}
            ranges={[dateRange]}
            months={2}
            direction="horizontal"
            showDateDisplay={false}
            maxDate={new Date()}
            staticRanges={staticRanges}
            inputRanges={[]}
          />
        </div>
      )}
    </div>
  );
};

export default DateRangePicker; 