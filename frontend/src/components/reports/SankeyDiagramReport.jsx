import React, { useState, useEffect } from 'react';
import { fetchSankeyReportData } from '../../services/reportService';
import SankeyDiagram from '../charts/SankeyDiagram';
import LoadingSpinner from '../common/LoadingSpinner';
import { useSearchParams } from 'react-router-dom'; // Import useSearchParams

const SankeyDiagramReport = () => {
  const [sankeyData, setSankeyData] = useState({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(true); // Start loading true
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams(); // Get search params

  // Extract dates directly
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  // Fetch data on initial load and when dates change in URL
  useEffect(() => {
    // Define the async function inside useEffect
    const loadData = async () => {
      // Check for dates inside the fetch logic
      if (!startDate || !endDate) {
        console.log('SankeyDiagramReport: Dates missing, clearing data.');
        setIsLoading(false); // Set loading false if no dates
        setError(null);
        setSankeyData({ nodes: [], links: [] }); // Clear previous data
        return;
      }

      console.log(`[DEBUG] SankeyReport - useEffect triggered. Start: ${startDate}, End: ${endDate}`);

      setIsLoading(true); // Set loading true when we start fetching
      setError(null);
      console.log(`Fetching Sankey data from ${startDate} to ${endDate}`);
      try {
        const response = await fetchSankeyReportData(startDate, endDate);
        if (response.success && response.data) {
          setSankeyData(response.data);
        } else {
          // Use response.message if available, otherwise default error
          setError(response.message || 'Failed to fetch Sankey data');
          setSankeyData({ nodes: [], links: [] }); // Clear data on error
        }
      } catch (err) {
        console.error("Error fetching Sankey data:", err);
        setError(err.message || 'An unexpected error occurred');
        setSankeyData({ nodes: [], links: [] }); // Clear data on error
      } finally {
        setIsLoading(false); // Always set loading false at the end
      }
    };

    loadData(); // Call the async function

  }, [startDate, endDate]); // Use startDate and endDate as dependencies

  // Display loading state initially or when fetching
  if (isLoading) {
    return (
      <div>
        <h2 className="text-2xl font-semibold mb-4">Cash Flow Sankey Diagram</h2>
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      </div>
    );
  }
  
  // Display message if dates are missing after initial load attempt
  if (!startDate || !endDate && !isLoading) {
      return (
        <div>
            <h2 className="text-2xl font-semibold mb-4">Cash Flow Sankey Diagram</h2>
            <p className="text-gray-500 text-center py-8">Please select a date range in the header.</p>
        </div>
      );
  }

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Cash Flow Sankey Diagram</h2>
      {/* Date picker is removed */} 

      {/* Error display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {/* Sankey Diagram or No Data message */}
      {!error && (
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