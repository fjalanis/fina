import { useState } from 'react';

/**
 * Custom hook for managing manual search state
 */
export const useManualSearchControl = () => {
  const [showManualSearch, setShowManualSearch] = useState(false);

  const openManualSearch = () => setShowManualSearch(true);
  const closeManualSearch = () => setShowManualSearch(false);
  const toggleManualSearch = () => setShowManualSearch(prev => !prev);

  return {
    showManualSearch,
    setShowManualSearch,
    openManualSearch,
    closeManualSearch,
    toggleManualSearch
  };
}; 