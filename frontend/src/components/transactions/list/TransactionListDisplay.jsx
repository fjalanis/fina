import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import TransactionTable from './TransactionTable';
import { fetchTransactions } from '../../../services/transactionService';

// Managed mode when `query` is provided; otherwise static mode using `transactions`
// Props:
// - query: params for fetchTransactions (e.g., { startDate, endDate, accountIds, ... })
// - eligibility: optional predicate to filter items before tab filter
const TransactionListDisplay = ({ query, transactions, counts, eligibility, onViewTransaction, onBalanceTransaction, onEditTransaction }) => {
  // State for transaction filtering (managed internally)
  const [filter, setFilter] = useState('all'); // 'all', 'balanced', 'unbalanced'
  const [unbalancedCount, setUnbalancedCount] = useState(0);
  const [managedItems, setManagedItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [managedCounts, setManagedCounts] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  const sentinelRef = useRef(null);
  const loadingMoreRef = useRef(false);

  const inManagedMode = !!query;

  // Reset managed mode when resetKey changes
  useEffect(() => {
    if (!inManagedMode) return;
    setManagedItems([]);
    setManagedCounts(null);
    setPage(1);
    setHasMore(true);
    setHasUserScrolled(false);
  }, [inManagedMode, JSON.stringify(query || {})]);

  // Load page in managed mode
  const fetchNextPage = useCallback(async () => {
    if (!inManagedMode) return;
    if (!hasMore || loadingMoreRef.current) return;
    loadingMoreRef.current = true;
    if (page === 1) setIsLoading(true);
    try {
      const resp = await fetchTransactions({ ...query, page, limit: 50, includeCounts: true });
      const newItems = Array.isArray(resp?.data) ? resp.data : [];
      setManagedItems(prev => prev.length === 0 ? newItems : [...prev, ...newItems]);
      const meta = resp?.meta || {};
      if (meta.total !== undefined) {
        setManagedCounts({ total: meta.total, balanced: meta.balanced, unbalanced: meta.unbalanced });
      }
      const totalPages = meta.pages || (newItems.length < 50 ? page : page + 1);
      const more = page < totalPages && newItems.length > 0;
      setHasMore(more);
      if (more) setPage(p => p + 1);
    } finally {
      setIsLoading(false);
      loadingMoreRef.current = false;
    }
  }, [inManagedMode, hasMore, page, JSON.stringify(query || {})]);

  // Initial load and intersection observer
  useEffect(() => {
    if (!inManagedMode) return;
    // Load first page after reset once (avoid chaining further pages here)
    if (page !== 1) return;
    if (managedItems.length !== 0) return;
    fetchNextPage();
    // Intentionally depend on page and managedItems length to guard re-entry
  }, [inManagedMode, JSON.stringify(query || {}), page, managedItems.length, fetchNextPage]);

  // Track user scroll to avoid immediate auto-loading all pages when sentinel is visible initially
  useEffect(() => {
    if (!inManagedMode) return;
    const onScroll = () => {
      if (window.scrollY > 0) setHasUserScrolled(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [inManagedMode]);

  useEffect(() => {
    if (!inManagedMode) return;
    if (!hasUserScrolled) return; // Defer observing until user scrolls
    if (!sentinelRef.current) return;
    const el = sentinelRef.current;
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        fetchNextPage();
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [inManagedMode, hasUserScrolled, fetchNextPage]);

  // Prepare transactions with a stable isBalanced flag to avoid recompute discrepancies
  const sourceItems = inManagedMode ? managedItems : (Array.isArray(transactions) ? transactions : []);

  const prepared = useMemo(() => {
    if (!Array.isArray(sourceItems)) return [];
    return sourceItems.map(t => {
      if (!t || !Array.isArray(t.entries)) return { ...t, __isBalanced: true };
      // Prefer server-provided virtual if available
      if (typeof t.isBalanced === 'boolean') {
        return { ...t, __isBalanced: t.isBalanced };
      }
      // Fallback: unit-aware balance: treat multi-unit transactions as balanced
      const unitSet = new Set();
      t.entries.forEach(e => { if (e && e.unit) unitSet.add(e.unit); });
      if (unitSet.size > 1) {
        return { ...t, __isBalanced: true };
      }
      const debitTotal = t.entries
        .filter(e => e.type === 'debit')
        .reduce((sum, e) => sum + Number(e?.amount || 0), 0);
      const creditTotal = t.entries
        .filter(e => e.type === 'credit')
        .reduce((sum, e) => sum + Number(e?.amount || 0), 0);
      const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01;
      return { ...t, __isBalanced: isBalanced };
    });
  }, [sourceItems]);

  // Calculate unbalanced count from prepared data
  useEffect(() => {
    if (prepared.length > 0) {
      const count = prepared.filter(t => t && t.__isBalanced === false).length;
      setUnbalancedCount(count);
    } else {
      setUnbalancedCount(0);
    }
  }, [prepared]);

  const balancedCountLocal = Math.max(0, (prepared.length || 0) - unbalancedCount);
  const totalCount = (inManagedMode ? managedCounts?.total : counts?.total) ?? prepared.length;
  const balancedCount = (inManagedMode ? managedCounts?.balanced : counts?.balanced) ?? balancedCountLocal;
  const unbalancedCountDisplay = (inManagedMode ? managedCounts?.unbalanced : counts?.unbalanced) ?? unbalancedCount;

  // Apply filtering based on the internal filter state
  const baseFiltered = eligibility ? prepared.filter(t => eligibility(t)) : prepared;
  const filteredTransactions = baseFiltered.filter(transaction => {
    if (!transaction) return false;
    if (filter === 'all') return true;
    if (filter === 'balanced') return transaction.__isBalanced === true;
    if (filter === 'unbalanced') return transaction.__isBalanced === false;
    return true;
  });

  return (
    <div>
      {/* Filter Buttons */} 
      <div className="mb-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded flex items-center ${
              filter === 'all' 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <span>All</span>
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
              filter === 'all' ? 'bg-white text-gray-700' : 'bg-gray-700 text-white'
            }`}>
              {totalCount}
            </span>
          </button>
          <button
            onClick={() => setFilter('balanced')}
            className={`px-3 py-1 rounded flex items-center ${
              filter === 'balanced' 
                ? 'bg-green-600 text-white' 
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            <span>Balanced</span>
            <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
              filter === 'balanced' ? 'bg-white text-green-700' : 'bg-green-600 text-white'
            }`}>
              {balancedCount}
            </span>
          </button>
          <button
            onClick={() => setFilter('unbalanced')}
            className={`px-3 py-1 rounded flex items-center ${
              filter === 'unbalanced' 
                ? 'bg-red-600 text-white' 
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            }`}
          >
            <span>Unbalanced</span>
            {unbalancedCountDisplay > 0 && (
              <span className={`ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                filter === 'unbalanced' ? 'bg-white text-red-600' : 'bg-red-600 text-white'
              }`}>
                {unbalancedCountDisplay}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Transaction Table - Pass filtered data and handlers */}
      <TransactionTable
        transactions={filteredTransactions} 
        onViewTransaction={onViewTransaction}
        onBalanceTransaction={onBalanceTransaction}
        onEditTransaction={onEditTransaction}
      />
      {inManagedMode && (
        <>
          {isLoading && prepared.length === 0 && (
            <div className="flex justify-center p-4"><div className="animate-spin h-6 w-6 border-4 border-blue-500 rounded-full border-t-transparent"></div></div>
          )}
          <div ref={sentinelRef} className="h-8" />
        </>
      )}
    </div>
  );
};

export default TransactionListDisplay; 