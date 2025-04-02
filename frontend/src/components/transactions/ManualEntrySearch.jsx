import React, { useState, useEffect } from 'react';
import { formatCurrency, formatDate } from '../../utils/formatters';
import Pagination from '../common/Pagination';
import { searchEntries } from '../../services/transactionService';

const ManualEntrySearch = ({ 
  isOpen, 
  setIsOpen, 
  targetTransaction, 
  suggestedFix,
  onEntrySelect,
  accounts = []
}) => {
  // Search form state
  const [searchForm, setSearchForm] = useState({
    minAmount: '',
    maxAmount: '',
    accountId: '',
    type: '',
    searchText: '',
    dateRange: '15'
  });
  
  // Search results state
  const [searchResults, setSearchResults] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle search submission
  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    await fetchSearchResults(1);
  };
  
  // Handle page change
  const handlePageChange = async (page) => {
    await fetchSearchResults(page);
  };
  
  // Fetch search results from API
  const fetchSearchResults = async (page = 1) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create filters object from form
      const filters = {
        ...searchForm,
        excludeTransactionId: targetTransaction?._id
      };
      
      // Call API
      const response = await searchEntries(filters, page, pagination.limit);
      
      if (response.success && response.data) {
        setSearchResults(response.data.entries || []);
        setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
      } else {
        setError('Failed to fetch search results');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching entries:', err);
      setError(err.message || 'Failed to search entries');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Reset search when panel is opened
  useEffect(() => {
    if (isOpen) {
      // Set defaults - min amount to one cent, max amount to match transaction imbalance if available
      let updatedForm = {
        ...searchForm,
        minAmount: '0.01'  // Default to one cent
      };
      
      if (suggestedFix) {
        updatedForm = {
          ...updatedForm,
          maxAmount: suggestedFix.amount.toString(),
          type: suggestedFix.type
        };
      }
      
      setSearchForm(updatedForm);
    }
  }, [isOpen, suggestedFix]); // eslint-disable-line react-hooks/exhaustive-deps
  
  if (!isOpen) {
    return (
      <div className="mt-4">
        <button
          onClick={() => setIsOpen(true)}
          className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 flex items-center justify-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Manual Entry Search
        </button>
      </div>
    );
  }
  
  return (
    <div className="mt-4 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-700">Manual Entry Search</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Amount Range Fields */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount Range</label>
              <div className="flex space-x-2">
                <div className="flex-1">
                  <input
                    type="number"
                    name="minAmount"
                    value={searchForm.minAmount}
                    onChange={handleInputChange}
                    placeholder="Min"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="number"
                    name="maxAmount"
                    value={searchForm.maxAmount}
                    onChange={handleInputChange}
                    placeholder="Max"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Account Dropdown */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
              <select
                name="accountId"
                value={searchForm.accountId}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Accounts</option>
                {accounts.map(account => (
                  <option key={account._id} value={account._id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Type Selector */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
              <select
                name="type"
                value={searchForm.type}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Any Type</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            
            {/* Description Search */}
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <input
                type="text"
                name="searchText"
                value={searchForm.searchText}
                onChange={handleInputChange}
                placeholder="Search transaction descriptions..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            
            {/* Date Range */}
            <div className="col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range (days)</label>
              <select
                name="dateRange"
                value={searchForm.dateRange}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="7">Last 7 days</option>
                <option value="15">Last 15 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>
            </div>
          </div>
          
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setSearchForm({
                minAmount: '',
                maxAmount: '',
                accountId: '',
                type: '',
                searchText: '',
                dateRange: '15'
              })}
              className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md mr-2"
            >
              Reset
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
            >
              Search
            </button>
          </div>
        </form>
      </div>
      
      {/* Search Results */}
      <div className="border-t border-gray-200 mt-4">
        {isLoading ? (
          <div className="flex justify-center p-6">
            <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
          </div>
        ) : error ? (
          <div className="p-6 text-center text-red-500">{error}</div>
        ) : searchResults.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No matching entries found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {searchResults.map(entry => (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[250px]">
                      <div className="truncate">{entry.transaction.description}</div>
                      <span className="text-xs text-gray-500 block">
                        {formatDate(entry.transaction.date)}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {entry.account?.name || 'Unknown Account'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        entry.type === 'debit' 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {entry.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                      {formatCurrency(entry.amount)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => onEntrySelect(entry)}
                        className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                      >
                        Move
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination */}
            <div className="border-t border-gray-200 px-4 py-2">
              <Pagination 
                currentPage={pagination.page} 
                totalPages={pagination.pages} 
                onPageChange={handlePageChange}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManualEntrySearch; 