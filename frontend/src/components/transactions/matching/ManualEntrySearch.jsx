import React from 'react';
import { useManualEntrySearch } from './hooks/useManualEntrySearch';
import SearchFilterForm from './SearchFilterForm';
import SearchResultsTable from './SearchResultsTable';

const ManualEntrySearch = ({ 
  isOpen, 
  setIsOpen, 
  targetTransaction, 
  suggestedFix,
  onEntrySelect,
  accounts = []
}) => {
  const {
    searchForm,
    searchResults,
    pagination,
    isLoading,
    handleInputChange,
    handleSearch,
    handlePageChange,
    handleReset,
  } = useManualEntrySearch(
       targetTransaction?._id, 
       targetTransaction?.date,
       suggestedFix
    );

  // Effect to trigger initial search if form is pre-filled
  // This might be better handled within the hook itself, 
  // but keeping it here for now if specific component logic is needed.
  // useEffect(() => {
  //   if (isOpen && (suggestedFix?.amount || searchForm.searchText)) {
  //     // Maybe trigger an initial search?
  //     // fetchSearchResults(1); // Or handleSearch()
  //   }
  // }, [isOpen, suggestedFix, searchForm.searchText]);

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
          aria-label="Close manual search"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4">
        <SearchFilterForm
          searchForm={searchForm}
          accounts={accounts}
          isLoading={isLoading}
          onInputChange={handleInputChange}
          onSearch={handleSearch}
          onReset={handleReset}
        />
        
        <SearchResultsTable
          isLoading={isLoading}
          searchResults={searchResults}
          pagination={pagination}
          onPageChange={handlePageChange}
          onEntrySelect={onEntrySelect}
          sourceTransaction={targetTransaction}
        />
      </div>
    </div>
  );
};

export default ManualEntrySearch; 