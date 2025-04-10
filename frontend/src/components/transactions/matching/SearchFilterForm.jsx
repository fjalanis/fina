import React from 'react';

const SearchFilterForm = ({ 
  searchForm, 
  accounts, 
  isLoading, 
  onInputChange, 
  onSearch, 
  onReset 
}) => {
  return (
    <form onSubmit={onSearch} className="mb-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Amount Range Fields */}
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Amount Range</label>
          <div className="flex space-x-2">
            <div className="flex-1">
              <input
                type="number"
                name="minAmount"
                value={searchForm.minAmount}
                onChange={onInputChange}
                placeholder="Min"
                step="0.01"
                min="0"
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
              />
            </div>
            <div className="flex-1">
              <input
                type="number"
                name="maxAmount"
                value={searchForm.maxAmount}
                onChange={onInputChange}
                placeholder="Max"
                step="0.01"
                min="0"
                className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
              />
            </div>
          </div>
        </div>
        
        {/* Account Dropdown */}
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Account</label>
          <select
            name="accountId"
            value={searchForm.accountId}
            onChange={onInputChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
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
          <label className="block text-xs font-medium text-gray-600 mb-1">Entry Type</label>
          <select
            name="type"
            value={searchForm.type}
            onChange={onInputChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
          >
            <option value="">Any Type</option>
            <option value="debit">Debit</option>
            <option value="credit">Credit</option>
          </select>
        </div>
        
        {/* Description Search */}
        <div className="col-span-1 md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
          <input
            type="text"
            name="searchText"
            value={searchForm.searchText}
            onChange={onInputChange}
            placeholder="Search descriptions..."
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
          />
        </div>
        
        {/* Date Range */}
        <div className="col-span-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Date Range (days)</label>
          <select
            name="dateRange"
            value={searchForm.dateRange}
            onChange={onInputChange}
            className="w-full px-2 py-1 border border-gray-300 rounded-md text-xs"
          >
            <option value="7">Last 7 days</option>
            <option value="15">Last 15 days</option>
            <option value="30">Last 30 days</option>
            <option value="60">Last 60 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>
      
      <div className="mt-3 flex justify-end space-x-2">
        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1 text-xs text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-3 py-1 text-xs text-white rounded-md ${isLoading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
};

export default SearchFilterForm; 