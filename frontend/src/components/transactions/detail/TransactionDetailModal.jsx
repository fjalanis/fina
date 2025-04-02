
import React, { useState, useEffect } from 'react';
import { fetchTransactionById } from '../../../services/transactionService'; // Keep for potential refresh
import { applyRulesToAllTransactions } from '../../../services/ruleService';
import Modal from '../../common/Modal';
import { SingleEntryForm } from '../form';
import { toast } from 'react-toastify';

// Helper functions (can be moved to a utils file later)
const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

const formatCurrency = (amount) => {
  const num = Number(amount);
  return `$${isNaN(num) ? '0.00' : num.toFixed(2)}`;
};

const TransactionDetailModal = ({ isOpen, onClose, transaction: initialTransaction, onUpdate }) => {
  // Use state to manage the transaction data within the modal
  // This allows us to refresh the data after actions like adding an entry
  const [transaction, setTransaction] = useState(initialTransaction);
  const [loading, setLoading] = useState(false); // For internal refresh/actions
  const [isAddingEntry, setIsAddingEntry] = useState(false);
  const [applyingRules, setApplyingRules] = useState(false);

  // Update modal state if the initial transaction prop changes
  useEffect(() => {
    setTransaction(initialTransaction);
    // Reset subordinate states when transaction changes
    setIsAddingEntry(false); 
  }, [initialTransaction]);

  // Function to refresh the transaction data within the modal
  const fetchModalTransaction = async () => {
    if (!transaction?._id) return;
    try {
      setLoading(true);
      const response = await fetchTransactionById(transaction._id);
      setTransaction(response.data);
    } catch (err) {
      toast.error('Failed to refresh transaction details.');
      console.error('Error fetching transaction:', err);
      // Optionally close modal if fetch fails catastrophically? Or just show error.
    } finally {
      setLoading(false);
    }
  };

  const handleAddEntryClick = () => {
    setIsAddingEntry(true);
  };

  const handleCancelAddEntry = () => {
    setIsAddingEntry(false);
  };

  const handleSaveEntry = async () => {
    // SingleEntryForm's internal save should handle API call.
    // We just need to refresh the modal's data and notify the parent list.
    setIsAddingEntry(false);
    await fetchModalTransaction(); // Refresh details in modal
    if (onUpdate) {
      onUpdate(); // Refresh the list in the background
    }
  };

  const handleApplyRules = async () => {
    try {
      setApplyingRules(true);
      // Note: applyRulesToAllTransactions might be heavy. 
      // Consider if a targeted rule application is needed later.
      const response = await applyRulesToAllTransactions(); 
      
      if (response.success) {
        toast.success('Rules applied successfully');
        await fetchModalTransaction(); // Refresh details in modal
        if (onUpdate) {
          onUpdate(); // Refresh the list
        }
      } else {
        toast.error(response.message || 'Failed to apply rules');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply rules');
    } finally {
      setApplyingRules(false);
    }
  };

  const calculateBalance = () => {
    if (!transaction?.entries) return 0;
    
    let total = 0;
    transaction.entries.forEach(entry => {
      // Support both entry.type and entry.entryType fields
      const entryType = entry.entryType || entry.type; 
      if (entryType === 'debit') {
        total += Number(entry.amount);
      } else {
        total -= Number(entry.amount);
      }
    });
    return total;
  };

  // Early exit if no transaction data
  if (!transaction) {
    // This shouldn't happen if TransactionList handles state correctly,
    // but good practice to have a fallback.
    return (
      <Modal isOpen={isOpen} onClose={onClose} title="Transaction Detail" size="lg">
        <div className="text-gray-500 p-4 text-center">Transaction data is missing.</div>
      </Modal>
    );
  }

  const balance = calculateBalance();
  const isBalanced = Math.abs(balance) < 0.001; // Use calculated balance for UI consistency

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Detail" size="lg">
      <div className="p-6"> {/* Add padding inside modal if needed */}
        {loading && !isAddingEntry ? ( // Show loader only for main refreshes, not during add form
           <div className="absolute inset-0 bg-white bg-opacity-75 flex justify-center items-center z-10">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
           </div>
        ) : null}

        {/* Action Buttons - moved inside Modal content */}
        <div className="flex justify-end space-x-2 mb-4">
           {/* Conditionally show Add/Apply based on calculated balance */}
           {!isBalanced && !isAddingEntry && (
             <>
               <button 
                 onClick={handleApplyRules}
                 disabled={applyingRules}
                 className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:bg-green-300"
               >
                 {applyingRules ? 'Applying...' : 'Apply Rules'}
               </button>
               <button 
                 onClick={handleAddEntryClick}
                 className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
               >
                 Add Entry
               </button>
             </>
           )}
           {/* Add a close button? Modal header usually has one, but explicit button can be good UX */}
           {/* <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">Close</button> */}
        </div>

        {isAddingEntry ? (
          // Show Add Entry Form
          <div className="mt-4">
            <h3 className="text-lg font-medium mb-4">Add Entry Line</h3>
             <SingleEntryForm
               // Ensure SingleEntryForm accepts transactionId if it needs it for saving
               transactionId={transaction._id} 
               onSave={handleSaveEntry}
               onCancel={handleCancelAddEntry}
               // Pass balance info if SingleEntryForm can use it for defaults
               balanceAmount={-balance} // Pass the amount needed to balance
               balanceType={balance > 0 ? 'credit' : 'debit'} // Pass the type needed
             />
          </div>
        ) : (
          // Show Transaction Details
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Transaction Info Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Transaction Information</h3>
              <div className="bg-gray-50 p-4 rounded">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date</p>
                    <p className="font-medium">{formatDate(transaction.date)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Reference</p>
                    <p className="font-medium">{transaction.reference || '-'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Description</p>
                    <p className="font-medium">{transaction.description}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Notes</p>
                    <p className="font-medium">{transaction.notes || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      isBalanced 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {isBalanced ? 'Balanced' : 'Unbalanced'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Balance</p>
                    <p className={`font-medium ${isBalanced ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(balance)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Entry Lines Section */}
            <div>
              <h3 className="text-lg font-medium mb-4">Entry Lines</h3>
              {(transaction.entries) && transaction.entries.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {(transaction.entries).map((entry, index) => {
                        // Support both entry.type and entry.entryType fields
                        const entryType = entry.entryType || entry.type;
                        
                        return (
                          <tr key={entry._id || index} className="hover:bg-gray-100">
                            <td className="px-4 py-3 text-sm text-gray-900">
                              {/* Handle populated vs non-populated account */}
                              {entry.account && typeof entry.account === 'object' 
                                ? entry.account.name 
                                : typeof entry.account === 'string' ? 'Loading...' : 'Unknown Account'} 
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                entryType === 'debit' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {entryType}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                              {formatCurrency(entry.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 text-yellow-800 rounded">
                  No entry lines found for this transaction.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default TransactionDetailModal;
