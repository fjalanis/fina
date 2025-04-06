import React, { useState, useEffect, useCallback } from 'react';
import { fetchAccountBalanceReport } from '../../services/reportService';
import { fetchAccounts } from '../../services/accountService';
import DateRangePicker from './DateRangePicker';

const AccountBalanceReport = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [reportData, setReportData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Default dates (last 30 days)
  const endDate = new Date().toISOString().split('T')[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  const [dateRange, setDateRange] = useState({
    startDate,
    endDate
  });

  // Load accounts for filter dropdown
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const response = await fetchAccounts();
        setAccounts(response.data);
      } catch (err) {
        setError('Failed to load accounts. Please try again.');
        console.error('Error loading accounts:', err);
      }
    };

    loadAccounts();
  }, []);

  const handleDateRangeChange = useCallback((newDateRange) => {
    setDateRange(newDateRange);
  }, []);

  const handleAccountChange = (e) => {
    setSelectedAccount(e.target.value);
  };

  const generateReport = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const { startDate, endDate } = dateRange;
      const response = await fetchAccountBalanceReport(
        startDate, 
        endDate, 
        selectedAccount || null
      );
      
      setReportData(response);
    } catch (err) {
      setError('Failed to generate report. Please try again.');
      console.error('Error generating report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4">
      <h2 className="text-2xl font-bold mb-4">Account Balance Report</h2>
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-8">
        <h3 className="text-lg font-semibold mb-4">Report Parameters</h3>
        
        <DateRangePicker 
          onChange={handleDateRangeChange}
          initialStartDate={startDate}
          initialEndDate={endDate}
        />
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Account (Optional)
          </label>
          <select
            value={selectedAccount}
            onChange={handleAccountChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">All Accounts</option>
            {accounts.map(account => (
              <option key={account._id} value={account._id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        
        <button
          onClick={generateReport}
          disabled={isLoading || !dateRange.startDate || !dateRange.endDate}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
        >
          {isLoading ? 'Generating...' : 'Generate Report'}
        </button>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {reportData && !isLoading && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold">
              Account Balances: {new Date(dateRange.startDate).toLocaleDateString()} to {new Date(dateRange.endDate).toLocaleDateString()}
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Account Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Debits
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Credits
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Balance
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                      No data found for the selected period.
                    </td>
                  </tr>
                ) : (
                  reportData.map((account) => {
                    // Calculate totals from entries
                    const totalDebits = account.entries
                      .filter(entry => entry.type === 'debit')
                      .reduce((sum, entry) => sum + entry.amount, 0);
                      
                    const totalCredits = account.entries
                      .filter(entry => entry.type === 'credit')
                      .reduce((sum, entry) => sum + entry.amount, 0);

                    return (
                      <tr key={account.accountId}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {account.accountName}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                          {account.accountType}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          ${totalDebits.toFixed(2)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          ${totalCredits.toFixed(2)}
                        </td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium text-right ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${Math.abs(account.balance).toFixed(2)} {account.balance < 0 ? '(CR)' : ''}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountBalanceReport; 