import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchNetWorthReport } from '../../services/reportService';
import { formatNumber } from '../../utils/formatters';
import NetWorthChart from '../charts/NetWorthChart';

const NetWorthReport = () => {
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const [searchParams] = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const loadReportData = async (start, end) => {
    if (!start || !end) {
      setReportData(null);
      console.log("NetWorthReport: Start or end date missing from URL params.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchNetWorthReport(start, end);

      if (response && response.success && response.data) {
        setReportData(response.data);
      } else if (response && response.message) {
        setError(response.message);
        setReportData(null);
      } else {
        setError('Invalid response format from server');
        setReportData(null);
      }
    } catch (err) {
      setError(err.message || 'Failed to load net worth report');
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReportData(startDate, endDate);
  }, [startDate, endDate]);

  if (isLoading) {
    return <div className="text-center py-8">Loading report...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-8 text-red-600">
        Error: {error}
      </div>
    );
  }

  if (!startDate || !endDate) {
    return <div className="text-center py-8 text-gray-500">Please select a date range in the header.</div>;
  }

  return (
    <div className="space-y-6">
      {reportData && reportData.trend && reportData.trend.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-100 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-green-800">Total Assets</h3>
              <p className="text-2xl font-bold text-green-600">
                {formatNumber(reportData.assets ?? reportData.trend[reportData.trend.length-1]?.assets ?? 0)}
              </p>
            </div>
            <div className="bg-red-100 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-red-800">Total Liabilities</h3>
              <p className="text-2xl font-bold text-red-600">
                {formatNumber(reportData.liabilities ?? reportData.trend[reportData.trend.length-1]?.liabilities ?? 0)}
              </p>
            </div>
            <div className="bg-blue-100 p-4 rounded-lg shadow">
              <h3 className="text-lg font-semibold text-blue-800">Net Worth</h3>
              <p className={`text-2xl font-bold ${reportData.netWorth >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                {formatNumber(reportData.netWorth ?? reportData.trend[reportData.trend.length-1]?.netWorth ?? 0)}
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-semibold mb-4">Net Worth Trend</h3>
            <div className="w-full">
              <NetWorthChart data={reportData} />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-8">No data available for the selected period.</p>
      )}
    </div>
  );
};

export default NetWorthReport; 