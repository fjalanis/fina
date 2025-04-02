import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchTransactionById } from '../../services/transactionService';
import { applyRulesToAllTransactions } from '../../services/ruleService';
import Modal from '../common/Modal';
import SingleEntryForm from './SingleEntryForm';
import { toast } from 'react-toastify';

const TransactionDetail = () => {
  const { id } = useParams();
  const [transaction, setTransaction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddEntryModalOpen, setIsAddEntryModalOpen] = useState(false);
  const [applyingRules, setApplyingRules] = useState(false);
  
  useEffect(() => {
    fetchTransaction();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  
  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const response = await fetchTransactionById(id);
      setTransaction(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load transaction. Please try again.');
      console.error('Error fetching transaction:', err);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddEntry = () => {
    setIsAddEntryModalOpen(true);
  };
  
  const handleSaveEntry = async () => {
    setIsAddEntryModalOpen(false);
    await fetchTransaction();
  };

  const handleApplyRules = async () => {
    try {
      setApplyingRules(true);
      const response = await applyRulesToAllTransactions();
      
      if (response.success) {
        toast.success('Rules applied successfully');
        await fetchTransaction();
      } else {
        toast.error(response.message || 'Failed to apply rules');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply rules');
    } finally {
      setApplyingRules(false);
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };
  
  const formatCurrency = (amount) => {
    return `$${amount.toFixed(2)}`;
  };
  
  if (loading) {
    return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;
  }
  
  if (error) {
    return <div className="text-red-500 p-4 text-center">{error}</div>;
  }
  
  if (!transaction) {
    return <div className="text-gray-500 p-4 text-center">Transaction not found</div>;
  }
  
  const calculateBalance = () => {
    let total = 0;
    
    if (transaction.entries) {
      transaction.entries.forEach(entry => {
        if (entry.type === 'debit') {
          total += entry.amount;
        } else {
          total -= entry.amount;
        }
      });
    }
    
    return total;
  };
  
  const balance = calculateBalance();
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Transaction Detail</h2>
        <div className="space-x-2">
          <Link to="/transactions" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition">
            Back to List
          </Link>
          {!transaction.isBalanced && (
            <>
              <button 
                onClick={handleApplyRules}
                disabled={applyingRules}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition disabled:bg-green-300"
              >
                {applyingRules ? 'Applying...' : 'Apply Rules'}
              </button>
              <button 
                onClick={handleAddEntry}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Add Entry
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
                  transaction.isBalanced 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {transaction.isBalanced ? 'Balanced' : 'Unbalanced'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Balance</p>
                <p className={`font-medium ${Math.abs(balance) < 0.001 ? 'text-green-600' : 'text-red-600'}`}>
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
                          {entry.account && typeof entry.account === 'object' 
                            ? entry.account.name 
                            : 'Unknown Account'}
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
      
      {/* Add Entry Modal for Unbalanced Transactions */}
      <Modal
        isOpen={isAddEntryModalOpen}
        onClose={() => setIsAddEntryModalOpen(false)}
        title="Add Entry Line"
        size="md"
      >
        <SingleEntryForm
          onSave={handleSaveEntry}
          onCancel={() => setIsAddEntryModalOpen(false)}
        />
      </Modal>
    </div>
  );
};

export default TransactionDetail; 