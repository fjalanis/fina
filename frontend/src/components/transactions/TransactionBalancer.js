import React, { useState, useEffect } from 'react';
import { DragDropContext } from 'react-beautiful-dnd';
import { transactionApi } from '../../services/api';
import { 
  addMatchPotentialFlags, 
  createTestData as createTestDataUtil, 
  diagnoseMatching as diagnoseMatchingUtil,
  debugTransactionBalance
} from './TransactionBalancerUtils';
import {
  SelectedEntryDropZone,
  SuggestedMatchesList,
  UnbalancedTransactionsList,
  NoSelectionPlaceholder
} from './BalancerComponents';

const TransactionBalancer = () => {
  const [unbalancedTransactions, setUnbalancedTransactions] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [suggestedMatches, setSuggestedMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [matchLoading, setMatchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  useEffect(() => {
    fetchUnbalancedTransactions();
  }, []);

  const fetchUnbalancedTransactions = async () => {
    try {
      setLoading(true);
      const response = await transactionApi.getTransactions();
      
      // Filter only unbalanced transactions - explicitly check that they're not balanced 
      // to avoid transactions with undefined isBalanced property
      const unbalanced = response.data.filter(t => t.isBalanced === false);
      
      // Add a flag to highlight entries that potentially have matches
      const updatedTransactions = await addMatchPotentialFlags(unbalanced);
      setUnbalancedTransactions(updatedTransactions);
      
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
      
      console.log('Requesting matches for entry:', entry);
      const response = await transactionApi.getSuggestedMatches(entry._id);
      console.log('API Response:', response);
      
      if (response.data && response.data.matches) {
        console.log('Got matches:', response.data.matches.length);
        setSuggestedMatches(response.data.matches);
      } else {
        console.log('No matches found in response:', response);
        setSuggestedMatches([]);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error finding matches:', err);
      setError('Failed to find matching entries. Please try again.');
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

  // Wrapper functions to connect with utility functions
  const createTestData = async () => {
    await createTestDataUtil(setError, setSuccessMessage, fetchUnbalancedTransactions);
  };

  const diagnoseMatching = async () => {
    await diagnoseMatchingUtil(selectedEntry, setError, setMatchLoading);
  };
  
  const debugSelectedTransaction = async () => {
    if (!selectedEntry || !selectedEntry.transaction) {
      setError('Please select an entry to debug its transaction');
      return;
    }
    
    try {
      const result = await debugTransactionBalance(selectedEntry.transaction);
      if (result) {
        setSuccessMessage(`Debug info in console. Transaction ${result.isBalanced ? 'IS' : 'is NOT'} balanced.`);
        setTimeout(() => setSuccessMessage(null), 5000);
      }
    } catch (err) {
      console.error('Debug error:', err);
      setError('Error debugging transaction. Check console.');
    }
  };

  if (loading && !suggestedMatches.length) {
    return (
      <div className="flex justify-center p-5">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-8 flex flex-col" style={{ height: 'calc(100vh - 150px)', overflow: 'hidden' }}>

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

      {/* Use flex and flex-1 to ensure columns take up remaining space */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
        {/* Left Column: Unbalanced Transactions - completely independent scrolling */}
        <div className="bg-gray-50 p-4 rounded-lg flex flex-col overflow-hidden">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-medium text-gray-700">Unbalanced Transactions</h3>
            <div className="space-x-2">
              <button 
                onClick={debugSelectedTransaction}
                className="px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded"
                title="Debug transaction balance in console"
              >
                Debug Selected
              </button>
            </div>
          </div>
          
          {/* Scrollable area for transactions */}
          <div className="overflow-y-auto flex-1">
            <UnbalancedTransactionsList 
              unbalancedTransactions={unbalancedTransactions} 
              handleEntrySelect={handleEntrySelect} 
              selectedEntry={selectedEntry} 
            />
          </div>
        </div>

        {/* Right Column: Drag and Drop Area - independent scrolling */}
        <DragDropContext onDragEnd={handleDragEnd}>
          {selectedEntry ? (
            <div className="bg-gray-50 p-4 rounded-lg flex flex-col overflow-hidden">
              <div className="flex-none">
                <h3 className="font-medium text-gray-700 mb-3">Balance with Matching Entry</h3>
                
                {/* Selected entry - fixed position */}
                <SelectedEntryDropZone selectedEntry={selectedEntry} />
                
                <h4 className="font-medium text-gray-700 mb-2">Suggested Matches</h4>
              </div>
              
              {/* Scrollable matches section */}
              <div className="overflow-y-auto flex-1">
                <SuggestedMatchesList 
                  matchLoading={matchLoading}
                  suggestedMatches={suggestedMatches}
                />
              </div>
            </div>
          ) : (
            <NoSelectionPlaceholder />
          )}
        </DragDropContext>
      </div>
    </div>
  );
};

export default TransactionBalancer; 