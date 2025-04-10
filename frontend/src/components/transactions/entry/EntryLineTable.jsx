import React from 'react';
// Import icons
import { FaEdit, FaTrashAlt, FaPlus } from 'react-icons/fa';

const EntryLineTable = ({ 
  entries, 
  selectedEntryId, 
  onEditEntry, 
  onDeleteEntry,
  onAddEntry // Added prop
}) => {
  const entriesArray = entries || [];
  

  
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
          {entriesArray.length === 0 && (
            <tr>
              <td colSpan="4" className="px-4 py-3 text-center text-sm text-gray-500">
                No entries yet.
              </td>
            </tr>
          )}
          {entriesArray.map((entry) => {
            const entryType = entry.entryType || entry.type;
            const isSelected = selectedEntryId === entry._id;
            
            return (
              <tr 
                key={entry._id} 
                // Refined highlighting: darker background and maybe a subtle left border
                className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : ''}`}
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
                  {/* Consider adding currency formatting if needed */}
                  ${parseFloat(entry.amount).toFixed(2)}
                </td>
                <td className="px-4 py-2 whitespace-nowrap text-sm text-right flex justify-center space-x-2">
                  {/* Use icons */}
                   <button 
                    type="button"
                    onClick={() => onEditEntry(entry)}
                    className="text-blue-600 hover:text-blue-900 text-xs p-1"
                    title="Edit Entry"
                  >
                    <FaEdit />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => onDeleteEntry(event, entry)}
                    className="text-red-600 hover:text-red-900 text-xs p-1"
                     title="Delete Entry"
                 >
                    <FaTrashAlt />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
        {/* Footer for Add button */}
        <tfoot className="bg-gray-50">
           <tr>
             <td colSpan="4" className="px-4 py-2 text-right">
                <button
                  onClick={onAddEntry}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 flex items-center ml-auto"
                  title="Add New Entry Line"
                >
                  <FaPlus className="inline mr-1"/>
                  Add Entry
                </button>
             </td>
           </tr>
        </tfoot>
      </table>
    </div>
  );
};

export default EntryLineTable; 