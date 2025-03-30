import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { transactionApi } from '../../services/api';

const TransactionBalancer = () => {
  const [unbalancedTransactions, setUnbalancedTransactions] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnbalancedTransactions();
  }, []);

  const fetchUnbalancedTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionApi.getTransactions();
      // Filter only unbalanced transactions
      const unbalanced = response.data.filter(t => !t.isBalanced);
      setUnbalancedTransactions(unbalanced);
      setError(null);
    } catch (err) {
      setError('Failed to load transactions. Please try again.');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntrySelect = async (entry) => {
    try {
      setSelectedEntry(entry);
      setMatchLoading(true);
      setSuggestedMatches([]);
      
      const response = await transactionApi.getSuggestedMatches(entry._id);
      setSuggestedMatches(response.data.matches || []);
      setError(null);
    } catch (err) {
      setError('Failed to find matching entries. Please try again.');
      console.error('Error finding matches:', err);
      setSuggestedMatches([]);
    } finally {
      setMatchLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    const { destination, source } = result;

    // Dropped outside a droppable area
    if (!destination) {
      return;
    }

    // Dropped in the same area (no change)
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    // If source is 'matches' and destination is 'transaction', we're merging
    if (source.droppableId === 'matches' && destination.droppableId === 'transaction') {
      const matchedEntry = suggestedMatches[source.index];
      
      try {
        setLoading(true);
        
        // Call the balanceTransactions API
        await transactionApi.balanceTransactions(selectedEntry._id, matchedEntry._id);
        
        // Clear current selection and matches
        setSelectedEntry(null);
        setSuggestedMatches([]);
        
        // Refresh the transaction list
        await fetchUnbalancedTransactions();
        
        setSuccessMessage('Transactions successfully balanced!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } catch (err) {
        setError('Failed to balance transactions. Please try again.');
        console.error('Error balancing transactions:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading && !suggestedMatches.length) {
    return (
      <div className="flex justify-center p-5">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Transaction Balancer</h2>
        <p className="text-gray-600">
          Select an unbalanced entry and drag a matching entry to balance the transaction.
        </p>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <p>{error}</p>
        </div>
      )}

      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <p>{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Unbalanced Transactions */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium text-gray-700 mb-3">Unbalanced Transactions</h3>
          
          {unbalancedTransactions.length === 0 ? (
            <div className="text-center p-8">
              <p className="text-gray-500">No unbalanced transactions found.</p>
            </div>
          ) : (
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
                  
                  <div className="space-y-2">
                    {transaction.entryLines && transaction.entryLines.map(entry => (
                      <div 
                        key={entry._id}
                        onClick={() => handleEntrySelect(entry)}
                        className={`p-2 rounded cursor-pointer transition ${
                          selectedEntry && selectedEntry._id === entry._id
                            ? 'bg-blue-100 border border-blue-300'
                            : 'hover:bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="flex justify-between">
                          <span>{entry.account ? entry.account.name : 'Unknown Account'}</span>
                          <span className={entry.type === 'debit' ? 'text-red-500' : 'text-green-500'}>
                            {entry.type === 'debit' ? '+ ' : '- '}
                            {formatCurrency(entry.amount)}
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
          )}
        </div>

        {/* Drag and Drop Area */}
        <DragDropContext onDragEnd={handleDragEnd}>
          {selectedEntry ? (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium text-gray-700 mb-3">Balance with Matching Entry</h3>
              
              {/* Selected entry */}
              <Droppable droppableId="transaction">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="mb-4 p-3 min-h-[100px] bg-blue-50 rounded-lg border-2 border-dashed border-blue-300"
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
              
              {/* Suggested matches */}
              <h4 className="font-medium text-gray-700 mb-2">Suggested Matches</h4>
              {matchLoading ? (
                <div className="flex justify-center p-5">
                  <div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              ) : suggestedMatches.length > 0 ? (
                <Droppable droppableId="matches">
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className="space-y-2"
                    >
                      {suggestedMatches.map((match, index) => (
                        <Draggable key={match._id} draggableId={match._id} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className="p-3 bg-white rounded-lg shadow border border-gray-200 hover:border-blue-300 cursor-grab"
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
              ) : (
                <div className="bg-white p-4 rounded-lg text-center">
                  <p className="text-gray-500">No matching entries found.</p>
                  <p className="text-sm text-gray-400 mt-1">Try selecting a different entry.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <p className="text-gray-500 mb-4">
                  Select an entry from an unbalanced transaction to find matching entries.
                </p>
                <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
            </div>
          )}
        </DragDropContext>
      </div>
    </div>
  );
};

export default TransactionBalancer; 