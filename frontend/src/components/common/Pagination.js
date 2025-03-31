import React from 'react';

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  // Don't render pagination if there's only one page
  if (totalPages <= 1) {
    return null;
  }
  
  // Generate page numbers to display
  const getPageNumbers = () => {
    const pageNumbers = [];
    
    // Always include first page
    pageNumbers.push(1);
    
    // Calculate range around current page
    const rangeStart = Math.max(2, currentPage - 1);
    const rangeEnd = Math.min(totalPages - 1, currentPage + 1);
    
    // Add ellipsis after first page if needed
    if (rangeStart > 2) {
      pageNumbers.push('...');
    }
    
    // Add pages in range
    for (let i = rangeStart; i <= rangeEnd; i++) {
      pageNumbers.push(i);
    }
    
    // Add ellipsis before last page if needed
    if (rangeEnd < totalPages - 1) {
      pageNumbers.push('...');
    }
    
    // Add last page if more than one page
    if (totalPages > 1) {
      pageNumbers.push(totalPages);
    }
    
    return pageNumbers;
  };
  
  return (
    <div className="flex items-center justify-center my-4">
      <nav className="flex items-center" role="navigation" aria-label="Pagination Navigation">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 mr-2 rounded border ${
            currentPage === 1
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-blue-600 border-gray-300 hover:bg-blue-50'
          }`}
        >
          <span className="sr-only">Previous Page</span>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        
        {/* Page numbers */}
        {getPageNumbers().map((page, index) => (
          <React.Fragment key={index}>
            {page === '...' ? (
              <span className="px-3 py-1 mx-1 text-gray-500">...</span>
            ) : (
              <button
                onClick={() => onPageChange(page)}
                className={`px-3 py-1 mx-1 rounded ${
                  currentPage === page
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {page}
              </button>
            )}
          </React.Fragment>
        ))}
        
        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 ml-2 rounded border ${
            currentPage === totalPages
              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
              : 'bg-white text-blue-600 border-gray-300 hover:bg-blue-50'
          }`}
        >
          <span className="sr-only">Next Page</span>
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </button>
      </nav>
    </div>
  );
};

export default Pagination; 