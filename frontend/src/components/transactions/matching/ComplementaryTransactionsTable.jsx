import React from 'react';
import { formatCurrency, formatDate } from '../../../utils/formatters';
import Pagination from '../../common/Pagination';

const ComplementaryTransactionsTable = ({ 
  isLoading, 
  transactions, 
  pagination,
  onPageChange,
  onMoveTransaction
}) => {
  if (isLoading) {
    return (
      <div className="flex justify-center p-5">
        <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-gray-50 p-4 rounded-lg text-center">
        <p className="text-gray-500">No complementary transactions found.</p>
        <p className="text-sm text-gray-400 mt-1">Try using the manual search to find specific entries.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Entries</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Imbalance</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map(transaction => (
            <tr key={transaction._id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900 max-w-[250px] truncate">
                {transaction.description}
              </td>
              <td className="px-4 py-3 text-sm text-center text-gray-500">
                {formatDate(transaction.date)}
              </td>
              <td className="px-4 py-3 text-sm text-center">
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                  {transaction.entries?.length || 0} entries
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right font-medium">
                <span className={parseFloat(transaction.imbalance) > 0 ? 'text-red-600' : 'text-green-600'}>
                  {formatCurrency(Math.abs(parseFloat(transaction.imbalance)))}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-right">
                <button
                  onClick={() => onMoveTransaction(transaction)}
                  className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600"
                >
                  Merge
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {/* Pagination */}
      {pagination && (
        <div className="border-t border-gray-200 px-4 py-2">
          <Pagination 
            currentPage={pagination.page} 
            totalPages={pagination.pages} 
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
};

export default ComplementaryTransactionsTable; 