import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchIncomeExpenseSummary } from '../../services/reportService';
import LoadingSpinner from '../common/LoadingSpinner';
import { formatNumber } from '../../utils/formatters'; // Assuming you have a number formatter

const IncomeExpenseSummaryReport = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();

  const loadReportData = useCallback(async () => {
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      // Don't fetch yet if dates are missing from URL.
      // Wait for DateRangePicker to set them via URL update.
      // Keep loading state true (or don't set it to false prematurely).
      console.log('IncomeExpenseSummaryReport: Dates missing, waiting for URL update.');
      // Set loading true here initially, it will be set false in finally block
      // only if a fetch attempt is actually made.
      setIsLoading(true); 
      setError(null); // Clear any previous errors
      setReportData(null); // Clear previous data
      return;
    }

    // Only set loading true when we are actually fetching with dates
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchIncomeExpenseSummary(startDate, endDate);
      if (response.success && response.data) {
        setReportData(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch income/expense summary');
      }
    } catch (err) {
      console.error("Error fetching income/expense summary:", err);
      setError(err.message || 'An unexpected error occurred');
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadReportData();
  }, [loadReportData]);

  // Helper to render account list for income/expense
  const renderAccountList = (accounts, title, colorClass) => (
    <div className={`p-4 rounded-lg shadow ${colorClass}`}>
      <h3 className="text-lg font-semibold mb-3">{title}</h3>
      {accounts && accounts.length > 0 ? (
        <ul className="space-y-1">
          {accounts.map((acc) => (
            <li key={acc.accountId} className="flex justify-between">
              <span>{acc.accountName || 'Unknown'}</span>
              <span>{formatNumber(acc.totalAmount)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-600">No {title.toLowerCase()} recorded.</p>
      )}
    </div>
  );

  const totalIncome = reportData?.incomeTotal || 0;
  const totalExpenses = reportData?.expenseTotal || 0;
  const netResult = totalIncome - totalExpenses;

  return (
    <div>
      <h2 className="text-2xl font-semibold mb-6">Income/Expense Summary</h2>

      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <LoadingSpinner />
        </div>
      )}

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-6" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}

      {!isLoading && !error && reportData && (
        <div className="space-y-6">
          {/* Income and Expense Sections Side-by-Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {renderAccountList(reportData.incomeAccounts, 'Income', 'bg-green-50 text-green-800 border border-green-200')}
            {renderAccountList(reportData.expenseAccounts, 'Expenses', 'bg-red-50 text-red-800 border border-red-200')}
          </div>

          {/* Summary Section */}
          <div className="bg-gray-100 p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-xl font-semibold mb-4 text-center">Summary</h3>
            <div className="flex justify-around items-center text-lg">
              <div>
                <span className="font-medium">Total Income:</span>
                <span className="ml-2 text-green-600 font-bold">{formatNumber(totalIncome)}</span>
              </div>
              <div>
                <span className="font-medium">Total Expenses:</span>
                <span className="ml-2 text-red-600 font-bold">{formatNumber(totalExpenses)}</span>
              </div>
              <div className="border-l-2 border-gray-300 pl-6 ml-6">
                <span className="font-medium">Net Result:</span>
                <span className={`ml-2 font-bold ${netResult >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatNumber(netResult)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!isLoading && !error && !reportData && (
         <p className="text-gray-500 text-center py-8">No data available for the selected period.</p>
      )}
    </div>
  );
};

export default IncomeExpenseSummaryReport; 