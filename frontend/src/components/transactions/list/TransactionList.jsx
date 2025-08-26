import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchTransactions, fetchTransactionById } from '../../../services/transactionService';
import Modal from '../../common/Modal';
import TransactionBalanceModal from '../balancing/TransactionBalanceModal';
import { useSearchParams } from 'react-router-dom';
import TransactionListDisplay from './TransactionListDisplay';
import SearchReplaceBar from '../../common/SearchReplaceBar';
import { fetchAccounts } from '../../../services/accountService';
import RuleModal from '../../rules/RuleModal';

const TransactionList = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [modalMode, setModalMode] = useState(null);
  const [allAccounts, setAllAccounts] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [initialRuleSearch, setInitialRuleSearch] = useState(null);

  const getTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchTransactions({ startDate, endDate });
      setTransactions(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      toast.error('Failed to load transactions. Please try again.');
      console.error('Error fetching transactions:', err);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    getTransactions();
  }, [getTransactions]);

  useEffect(() => {
    // Load accounts for the search multi-select
    fetchAccounts().then(resp => {
      const list = resp.data || [];
      // Build simple depth if the payload has parent relationships
      const idToNode = new Map();
      list.forEach(a => idToNode.set(a._id, { ...a, depth: 0 }));
      list.forEach(a => {
        let d = 0; let p = a.parent;
        while (p && idToNode.has(p)) { d++; p = idToNode.get(p).parent; }
        idToNode.get(a._id).depth = d;
      });
      setAllAccounts(Array.from(idToNode.values()));
    }).catch(()=>{});
  }, []);

  const handleOpenModal = useCallback((transaction, mode) => {
    setSelectedTransaction(transaction);
    setModalMode(mode);
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
    setModalMode(null);
  }, []);

  const handleModalUpdate = useCallback(async (updateInfo) => {
    if (!updateInfo || !updateInfo.id) {
      console.warn('handleModalUpdate received invalid updateInfo:', updateInfo);
      await getTransactions(); 
      return;
    }

    const { id, action } = updateInfo;
    
    try {
      if (action === 'delete') {
        // Handle deletion locally to avoid flickering
        setTransactions(prevTransactions => 
          prevTransactions.filter(t => t._id !== id)
        );
        setSelectedTransaction(null); // Clear selection if the deleted item was selected
        setModalMode(null); 
        console.log(`Locally removed transaction ${id} from list.`);
        // No need to call onClose here, the modal initiated the close
        return; // Stop processing for delete action
      }

      // Handle create/update by fetching the updated data
      const response = await fetchTransactionById(id);
      const updatedTransaction = response.data;

      if (updatedTransaction) {
        // Update list and potentially selected transaction/mode in one go
        setTransactions(prevTransactions => 
          prevTransactions.map(t => 
            t._id === id ? updatedTransaction : t
          )
        );

        if (action === 'create') {
            // After list state is set, update selected state and mode for next render
            setSelectedTransaction(updatedTransaction);
            setModalMode('view');
        }
      } else {
        console.warn(`Could not fetch updated data for ${id}, refreshing full list.`);
        await getTransactions();
      }
    } catch (error) {
      console.error(`Error fetching updated transaction ${id}:`, error);
      toast.error('Failed to refresh transaction details.');
    } 
  }, [getTransactions]); // Only depends on getTransactions for fallback

  if (loading) return <div className="flex justify-center p-5"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <SearchReplaceBar startDate={startDate} endDate={endDate} accounts={allAccounts} onSearch={(params)=>{
        console.log('[SearchReplace] onSearch params', params);
        fetchTransactions(params).then(resp=>{
          console.log('[SearchReplace] response count', Array.isArray(resp.data) ? resp.data.length : 'n/a');
          setTransactions(Array.isArray(resp.data) ? resp.data : []);
        }).catch(()=>{});
      }} onEligibilityChange={(pred) => setEligibility(() => pred)} onCreateRule={(state)=>{ setInitialRuleSearch(state); setShowRuleModal(true); }} />
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-gray-800">Transactions</h2>
        <div className="space-x-2">
          <button 
            onClick={() => handleOpenModal(null, 'create')}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          >
            Add Transaction
          </button>
        </div>
      </div>

      <TransactionListDisplay
          transactions={eligibility ? transactions.filter(t => eligibility(t)) : transactions}
          onViewTransaction={(transaction) => handleOpenModal(transaction, 'view')}
          onBalanceTransaction={(transaction) => handleOpenModal(transaction, 'balance')}
          onEditTransaction={(transaction) => handleOpenModal(transaction, 'edit')}
      />
      
      {isModalOpen && (
        <TransactionBalanceModal
          key={selectedTransaction?._id || 'create-mode'}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          transaction={selectedTransaction}
          mode={modalMode}
          onTransactionUpdated={handleModalUpdate}
        />
      )}

      {showRuleModal && (
        <RuleModal
          isOpen={showRuleModal}
          onClose={() => setShowRuleModal(false)}
          onSave={() => setShowRuleModal(false)}
          initialSearch={initialRuleSearch}
        />
      )}
    </div>
  );
};

export default TransactionList; 