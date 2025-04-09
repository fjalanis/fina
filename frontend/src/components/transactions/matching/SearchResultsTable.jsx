import React from 'react';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import Pagination from '../../common/Pagination';

const SearchResultsTable = ({ 
  isLoading, 
  searchResults, 
  pagination, 
  onPageChange, 
  onEntrySelect,
  sourceTransaction
}) => {
  if (isLoading && searchResults.length === 0) {
    return (
      <div className="flex justify-center p-5">
        <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  // No results message handled by toast in hook, just render nothing or empty state?
  // Let's render a minimal empty state if not loading and no results.
  if (!isLoading && searchResults.length === 0) {
    return (
      <div className="text-center p-4 text-gray-500 bg-gray-50 rounded mt-6">
        No entries match your search criteria.
      </div>
    );
  }

  // Only render the table if there are results
  if (searchResults.length > 0) {
    return (
      <div className="mt-6">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg shadow-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {searchResults.map(entry => {
                let isMoveInvalid = false;
                let invalidMoveReason = '';

                if (sourceTransaction) {
                  const sourceAccountIds = new Set(sourceTransaction.entries.map(e => e.accountId.toString()));
                  const sourceTypes = new Set(sourceTransaction.entries.map(e => e.type));
                  
                  const targetAccountId = entry.accountId.toString();
                  const targetType = entry.type;

                  if (sourceAccountIds.has(targetAccountId)) {
                    if ((targetType === 'debit' && sourceTypes.has('credit')) ||
                        (targetType === 'credit' && sourceTypes.has('debit'))) {
                      isMoveInvalid = true;
                      invalidMoveReason = 'Moving this entry would create opposing entries to the same account.';
                    }
                  }
                }

                return (
                  <tr key={entry._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[250px]">
                      <div className="truncate" title={entry.transaction?.description}>{entry.transaction?.description || 'N/A'}</div>
                      <span className="text-xs text-gray-500 block">
                        {entry.transaction?.date ? formatDate(entry.transaction.date) : 'N/A'}
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
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      <button
                        onClick={() => onEntrySelect(entry)}
                        className={`px-3 py-1 text-white text-xs rounded ${ 
                          isMoveInvalid 
                            ? 'bg-gray-400 cursor-not-allowed' 
                            : 'bg-green-500 hover:bg-green-600'
                        }`}
                        disabled={isMoveInvalid}
                        title={invalidMoveReason || 'Move this entry to balance transaction'}
                      >
                        Move
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="border-t border-gray-200 px-4 py-2 mt-4">
            <Pagination 
              currentPage={pagination.page} 
              totalPages={pagination.pages} 
              onPageChange={onPageChange}
            />
          </div>
        )}
      </div>
    );
  }
  
  // Fallback if still loading but has old results, or other edge cases
  return null; 
};

export default SearchResultsTable; 