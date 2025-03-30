import React from 'react';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { formatDate, formatCurrency } from './TransactionBalancerUtils';

// Component for displaying the selected entry in the drop area
export const SelectedEntryDropZone = ({ selectedEntry }) => (
  <Droppable 
    droppableId="transaction" 
    isDropDisabled={false} 
    ignoreContainerClipping={true}
  >
    {(provided) => (
      <div
        ref={provided.innerRef}
        {...provided.droppableProps}
        className="mb-4 p-3 min-h-[100px] bg-blue-50 rounded-lg border-2 border-dashed border-blue-300"
        data-testid="droppable-area"
      >
        <h4 className="font-medium text-blue-600 mb-2">Selected Entry (Drop Match Here)</h4>
        <div className="bg-white rounded p-3 mb-2">
          <div className="flex justify-between">
            <span>
              {selectedEntry.account ? selectedEntry.account.name : 'Unknown Account'}
            </span>
            <span className={selectedEntry.type === 'debit' ? 'text-red-500' : 'text-green-500'}>
              {selectedEntry.type === 'debit' ? '+ ' : '- '}
              {formatCurrency(selectedEntry.amount)}
            </span>
          </div>
          {selectedEntry.description && (
            <p className="text-sm text-gray-500 mt-1">{selectedEntry.description}</p>
          )}
        </div>
        {provided.placeholder}
      </div>
    )}
  </Droppable>
);

// Component for the list of suggested matches
export const SuggestedMatchesList = ({ matchLoading, suggestedMatches }) => {
  if (matchLoading) {
    return (
      <div className="flex justify-center p-5">
        <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (suggestedMatches.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg text-center">
        <p className="text-gray-500">No matching entries found.</p>
        <p className="text-sm text-gray-400 mt-1">Try selecting a different entry.</p>
      </div>
    );
  }

  return (
    <Droppable 
      droppableId="matches" 
      isDropDisabled={false}
      ignoreContainerClipping={true}
    >
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className="space-y-2"
        >
          {suggestedMatches.map((match, index) => (
            <Draggable key={match._id} draggableId={match._id} index={index}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.draggableProps}
                  {...provided.dragHandleProps}
                  className={`p-3 bg-white rounded-lg shadow border select-none ${
                    snapshot.isDragging 
                      ? 'border-blue-500 bg-blue-50 shadow-lg' 
                      : 'border-gray-200 hover:border-blue-300'
                  } cursor-grab`}
                >
                  <div className="flex justify-between">
                    <span>
                      {match.account ? match.account.name : 'Unknown Account'}
                    </span>
                    <span className={match.type === 'debit' ? 'text-red-500' : 'text-green-500'}>
                      {match.type === 'debit' ? '+ ' : '- '}
                      {formatCurrency(match.amount)}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {match.transaction.description}
                    {match.description && <p>{match.description}</p>}
                    <p>{formatDate(match.transaction.date)}</p>
                  </div>
                </div>
              )}
            </Draggable>
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

// Component for displaying unbalanced transactions list with entries
export const UnbalancedTransactionsList = ({ unbalancedTransactions, handleEntrySelect, selectedEntry }) => {
  if (unbalancedTransactions.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No unbalanced transactions found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unbalancedTransactions.map(transaction => (
        <div 
          key={transaction._id} 
          className="bg-white rounded-lg shadow p-4"
        >
          <div className="flex justify-between mb-2">
            <h4 className="font-medium">{transaction.description}</h4>
            <span className="text-sm text-gray-500">{formatDate(transaction.date)}</span>
          </div>
          
          <div className="space-y-2 border-t pt-2 mt-2">
            <h5 className="text-xs text-gray-500 mb-2">Entry Lines (Select one to find matches)</h5>
            
            {transaction.entryLines && transaction.entryLines.map(entry => (
              <div 
                key={entry._id}
                onClick={() => handleEntrySelect(entry)}
                className={`p-2 rounded cursor-pointer transition ${
                  selectedEntry && selectedEntry._id === entry._id
                    ? 'bg-blue-100 border border-blue-300'
                    : entry.hasMatchPotential 
                      ? 'hover:bg-gray-100 border border-yellow-200 bg-yellow-50' 
                      : 'hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <div className="flex justify-between">
                  <span>{entry.account ? entry.account.name : 'Unknown Account'}</span>
                  <span className={entry.type === 'debit' ? 'text-red-500' : 'text-green-500'}>
                    {entry.type === 'debit' ? '+ ' : '- '}
                    {formatCurrency(entry.amount)}
                    {entry.hasMatchPotential && <span className="ml-1 text-yellow-500">●</span>}
                  </span>
                </div>
                {entry.description && (
                  <p className="text-sm text-gray-500 mt-1">{entry.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// Placeholder component for when no entry is selected
export const NoSelectionPlaceholder = () => (
  <div className="bg-gray-50 p-6 rounded-lg flex items-center justify-center h-full">
    <div className="text-center">
      <p className="text-gray-500 mb-4">
        Select an entry from an unbalanced transaction to find matching entries.
      </p>
      <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    </div>
  </div>
); 