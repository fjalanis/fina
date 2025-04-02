import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { searchEntries } from '../../../../services/transactionService';

const initialSearchForm = {
  minAmount: '',
  maxAmount: '',
  accountId: '',
  type: '',
  searchText: '',
  dateRange: '15'
};

export const useManualEntrySearch = (targetTransactionId, suggestedFix) => {
  const [searchForm, setSearchForm] = useState(initialSearchForm);
  const [searchResults, setSearchResults] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [isLoading, setIsLoading] = useState(false);

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSearchForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Fetch search results from API
  const fetchSearchResults = async (page = 1) => {
    try {
      setIsLoading(true);

      const filters = {
        ...searchForm,
        excludeTransactionId: targetTransactionId
      };

      const response = await searchEntries(filters, page, pagination.limit);

      if (response.success && response.data) {
        const entries = response.data.entries || [];
        setSearchResults(entries);
        setPagination(response.data.pagination || { page: 1, limit: 10, total: 0, pages: 0 });
        if (entries.length === 0 && page === 1) {
          toast.info('No matching entries found for the current criteria.');
        }
      } else {
        toast.error(response.message || 'Failed to fetch search results');
        setSearchResults([]);
      }
    } catch (err) {
      console.error('Error searching entries:', err);
      toast.error(err.message || 'Failed to search entries');
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
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
  
  // Handle form reset
  const handleReset = () => {
    setSearchForm(initialSearchForm);
    setSearchResults([]);
    setPagination({ page: 1, limit: 10, total: 0, pages: 0 });
  };

  // Effect to pre-fill form based on suggested fix
  useEffect(() => {
    let updatedForm = {
      ...initialSearchForm,
      minAmount: '0.01' // Default to one cent
    };
    
    if (suggestedFix) {
      updatedForm = {
        ...updatedForm,
        maxAmount: suggestedFix.amount.toString(),
        type: suggestedFix.type
      };
    }
    setSearchForm(updatedForm);
    // Reset results when suggested fix changes (or on initial load)
    setSearchResults([]); 
    setPagination({ page: 1, limit: 10, total: 0, pages: 0 });

  }, [suggestedFix]); // Re-run only when suggestedFix changes

  return {
    searchForm,
    searchResults,
    pagination,
    isLoading,
    handleInputChange,
    handleSearch,
    handlePageChange,
    handleReset,
    fetchSearchResults // Expose fetch too if needed elsewhere
  };
}; 