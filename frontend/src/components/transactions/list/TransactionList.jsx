import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [serverCounts, setServerCounts] = useState(null); // { total, balanced, unbalanced }
  const loadingMoreRef = useRef(false);
  const sentinelRef = useRef(null);
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

  const getTransactions = useCallback(async (opts = {}) => {
    try {
      const nextPage = opts.reset ? 1 : page;
      if (opts.reset) {
        setTransactions([]);
        setHasMore(true);
      }
      if (!hasMore && !opts.reset) return;
      if (loadingMoreRef.current) return;
      loadingMoreRef.current = true;
      if (opts.reset) setLoading(true);
      const response = await fetchTransactions({ startDate, endDate, page: nextPage, limit: 50, includeCounts: true });
      const newItems = Array.isArray(response.data) ? response.data : [];
      setTransactions(prev => {
        if (opts.reset) return newItems;
        // De-duplicate by _id while preserving order
        const seen = new Set(prev.map(t => t?._id));
        const merged = [...prev];
        newItems.forEach(item => {
          const id = item?._id;
          if (!id || !seen.has(id)) {
            merged.push(item);
            if (id) seen.add(id);
          }
        });
        return merged;
      });
      const meta = response.meta || {};
      if (meta.total !== undefined) {
        setServerCounts({ total: meta.total, balanced: meta.balanced, unbalanced: meta.unbalanced });
      }
      const totalPages = meta.pages || (newItems.length < 50 ? nextPage : nextPage + 1);
      const more = nextPage < totalPages && newItems.length > 0;
      setHasMore(more);
      if (!opts.reset && more) setPage(nextPage + 1);
    } catch (err) {
      toast.error('Failed to load transactions. Please try again.');
      console.error('Error fetching transactions:', err);
      if (opts.reset) setTransactions([]);
      setHasMore(false);
    } finally {
      if (opts.reset) setLoading(false);
      loadingMoreRef.current = false;
    }
  }, [startDate, endDate, page, hasMore]);

  useEffect(() => {
    // Reset when date range changes
    setPage(1);
    getTransactions({ reset: true });
  }, [startDate, endDate]);

  useEffect(() => {
    // IntersectionObserver to load next page
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        getTransactions();
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
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
        // Perform a reset search using new filters
        fetchTransactions({ ...params, includeCounts: true, page: 1, limit: 50 }).then(resp=>{
          setTransactions(Array.isArray(resp.data) ? resp.data : []);
          const meta = resp.meta || {};
          setServerCounts(meta.total !== undefined ? { total: meta.total, balanced: meta.balanced, unbalanced: meta.unbalanced } : null);
          setPage(2);
          setHasMore((resp.data || []).length === 50 && (meta.pages ? 1 < meta.pages : true));
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
          query={{ startDate, endDate }}
          counts={serverCounts}
          eligibility={eligibility}
          onViewTransaction={(transaction) => handleOpenModal(transaction, 'view')}
          onBalanceTransaction={(transaction) => handleOpenModal(transaction, 'balance')}
          onEditTransaction={(transaction) => handleOpenModal(transaction, 'edit')}
      />
      <div ref={sentinelRef} className="h-8"></div>
      
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