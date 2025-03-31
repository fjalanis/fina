import React from 'react';
import { formatCurrency } from './TransactionBalancerUtils';

const EntryLineTable = ({ 
  entries, 
  selectedEntryId, 
  onEditEntry, 
  onDeleteEntry 
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entries.map(entry => (
            <tr 
              key={entry._id} 
              className={`hover:bg-gray-50 ${
                selectedEntryId === entry._id ? 'bg-blue-50' : ''
              }`}
            >
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                {entry.account?.name || 'Unknown Account'}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm">
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
                  onClick={() => onEditEntry(entry)}
                  className="text-blue-600 hover:text-blue-900 mr-3"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDeleteEntry(entry)}
                  className="text-red-600 hover:text-red-900 mr-3"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default EntryLineTable; 