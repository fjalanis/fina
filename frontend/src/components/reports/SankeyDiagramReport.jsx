import React, { useState, useEffect, useCallback } from 'react';
import { fetchSankeyReportData } from '../../services/reportService';
import DateRangePicker from './DateRangePicker';
import SankeyDiagram from '../charts/SankeyDiagram'; // Placeholder for the chart component
import LoadingSpinner from '../common/LoadingSpinner'; // Corrected path

// Helper function to format date as YYYY-MM-DD
const formatDate = (date) => {
  return date.toISOString().split('T')[0];
};

const SankeyDiagramReport = () => {
  // Initialize date range for the last 90 days
  const initialEndDate = new Date();
  const initialStartDate = new Date();
  initialStartDate.setDate(initialEndDate.getDate() - 90);

  const [startDate, setStartDate] = useState(formatDate(initialStartDate));
  const [endDate, setEndDate] = useState(formatDate(initialEndDate));
  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Function to fetch data from the API
  const loadSankeyData = useCallback(async (start, end) => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching Sankey data from ${start} to ${end}`);
    try {
      const response = await fetchSankeyReportData(start, end);
      if (response.success && response.data) {
        setSankeyData(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch Sankey data');
      }
    } catch (err) {
      console.error("Error fetching Sankey data:", err);
      setError(err.message || 'An unexpected error occurred');
      setSankeyData({ nodes: [], links: [] }); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch data on initial load and when dates change
  useEffect(() => {
    if (startDate && endDate) {
      loadSankeyData(startDate, endDate);
    }
  }, [startDate, endDate, loadSankeyData]);

  // Handler for the DateRangePicker component
  const handleDateChange = useCallback(({ startDate: newStart, endDate: newEnd }) => {
    setStartDate(newStart);
    setEndDate(newEnd);
    // Data will be refetched by the useEffect hook
  }, []);

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Cash Flow Sankey Diagram</h2>
      <DateRangePicker 
        initialStartDate={startDate} 
        initialEndDate={endDate} 
        onChange={handleDateChange} 
      />

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!isLoading && !error && (
        <div className="mt-6 bg-white p-4 rounded shadow">
          {sankeyData.nodes.length > 0 ? (
            <SankeyDiagram data={sankeyData} />
          ) : (
            <p className="text-gray-500 text-center py-8">
              No transaction data found for the selected period to generate the diagram.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default SankeyDiagramReport; 