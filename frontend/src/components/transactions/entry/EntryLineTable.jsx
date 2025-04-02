import React from 'react';

const EntryLineTable = ({ 
  entries, 
  selectedEntryId, 
  onEditEntry, 
  onDeleteEntry 
}) => {
  const entriesArray = entries || [];
  
  if (entriesArray.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded mb-4">
        <p className="text-gray-500 text-center">No entries found</p>
      </div>
    );
  }
  
  return (
    <div className="overflow-x-auto bg-gray-50 border border-gray-200 rounded mb-4">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-100">
          <tr>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Account
            </th>
            <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Type
            </th>
            <th scope="col" className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th scope="col" className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {entriesArray.map((entry) => {
            // Support both entry.type and entry.entryType fields
            const entryType = entry.entryType || entry.type;
            
            return (
              <tr 
                key={entry._id} 
                className={`hover:bg-gray-50 ${selectedEntryId === entry._id ? 'bg-blue-50' : ''}`}
              >
                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                  {entry.account?.name || 'Unknown Account'}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    entryType === 'debit' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {entryType}
                  </span>
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900 text-right">
                  ${parseFloat(entry.amount).toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right flex justify-center space-x-2">
                  <button
                    onClick={() => onEditEntry(entry)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDeleteEntry(entry)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default EntryLineTable; 