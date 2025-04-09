import React, { useState, useEffect, useCallback } from 'react';
import { fetchSankeyReportData } from '../../services/reportService';
import SankeyDiagram from '../charts/SankeyDiagram';
import LoadingSpinner from '../common/LoadingSpinner';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams

const SankeyDiagramReport = () => {
  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams(); // Get search params

  // Function to fetch data from the API using URL params
  const loadSankeyData = useCallback(async () => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      // Don't fetch yet if dates are missing from URL.
      // Wait for DateRangePicker to set them via URL update.
      console.log('SankeyDiagramReport: Dates missing, waiting for URL update.');
      setIsLoading(true); 
      setError(null);
      setSankeyData({ nodes: [], links: [] }); // Clear previous data
      return;
    }

    // Only set loading true when we are actually fetching with dates
    setIsLoading(true);
    setError(null);
    console.log(`Fetching Sankey data from ${startDate} to ${endDate}`);
    try {
      // Pass dates from URL params
      const response = await fetchSankeyReportData(startDate, endDate);
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
  }, [searchParams]); // Re-run effect when searchParams change

  // Fetch data on initial load and when dates change in URL
  useEffect(() => {
    loadSankeyData();
  }, [loadSankeyData]); // Dependency is the memoized loadSankeyData function

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Cash Flow Sankey Diagram</h2>
      {/* Remove the local DateRangePicker instance */}
      {/* <DateRangePicker 
        initialStartDate={startDate} 
        initialEndDate={endDate} 
        onChange={handleDateChange} 
      /> */}

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