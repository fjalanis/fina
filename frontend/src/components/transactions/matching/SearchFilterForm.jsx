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
    <form onSubmit={onSearch}>
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
                onChange={onInputChange}
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
                onChange={onInputChange}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
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
            onChange={onInputChange}
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
          onClick={onReset}
          className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md mr-2"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 text-sm text-white rounded-md ${isLoading ? 'bg-blue-300' : 'bg-blue-500 hover:bg-blue-600'}`}
        >
          {isLoading ? 'Searching...' : 'Search'}
        </button>
      </div>
    </form>
  );
};

export default SearchFilterForm; 