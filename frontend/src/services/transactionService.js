import { fetchData } from './api';

const TRANSACTION_ENDPOINT = '/transactions';

// Get all transactions
export const fetchTransactions = async (params = {}) => {
  const queryParams = new URLSearchParams();

  // Handle accountIds array or single accountId
  if (params.accountIds && Array.isArray(params.accountIds) && params.accountIds.length > 0) {
    // Join array into comma-separated string for query param
    queryParams.append('accountIds', params.accountIds.join(','));
  } else if (typeof params.accountIds === 'string' && params.accountIds.length > 0) {
    // Allow callers to provide comma-separated string directly
    queryParams.append('accountIds', params.accountIds);
  } else if (params.accountId) {
    // Fallback to single accountId if accountIds is not provided or invalid
    queryParams.append('accountId', params.accountId);
  }

  if (params.startDate) {
    queryParams.append('startDate', params.startDate);
  }
  if (params.endDate) {
    queryParams.append('endDate', params.endDate);
  }

  // Optional filters
  if (params.description) {
    queryParams.append('description', params.description);
  }
  if (params.entryType && (params.entryType === 'debit' || params.entryType === 'credit')) {
    queryParams.append('entryType', params.entryType);
  }
  if (params.owner) {
    queryParams.append('owner', params.owner);
  }
  if (params.category) {
    queryParams.append('category', params.category);
  }

  // Pagination and counts
  if (params.page) queryParams.append('page', params.page);
  if (params.limit) queryParams.append('limit', params.limit);
  if (params.includeCounts) queryParams.append('includeCounts', params.includeCounts);

  // Enforce app-wide default if dates missing (last 30 days)
  if (!params.startDate || !params.endDate) {
    const now = new Date();
    const end = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)).toISOString();
    const startDateObj = new Date(end);
    startDateObj.setUTCDate(startDateObj.getUTCDate() - 30);
    const start = startDateObj.toISOString();
    queryParams.set('startDate', start);
    queryParams.set('endDate', end);
  }

  const queryString = queryParams.toString();
  const endpoint = queryString ? `${TRANSACTION_ENDPOINT}?${queryString}` : TRANSACTION_ENDPOINT;

  return fetchData(endpoint);
};

// Get transaction by ID
export const fetchTransactionById = async (id) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/${id}`);
};

// Create a new transaction with entries
export const createTransaction = async (transactionData) => {
  return fetchData(TRANSACTION_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(transactionData),
  });
};

// Update a transaction
export const updateTransaction = async (id, transactionData) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(transactionData),
  });
};

// Delete a transaction
export const deleteTransaction = async (id) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/${id}`, {
    method: 'DELETE',
  });
};

// Add entry to a transaction
export const addEntryToTransaction = async (transactionId, entryData) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/${transactionId}/entries`, {
    method: 'POST',
    body: JSON.stringify(entryData),
  });
};

// Update an entry in a transaction
export const updateEntryInTransaction = async (transactionId, entryId, entryData) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/${transactionId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(entryData),
  });
};

// Delete an entry from a transaction
export const deleteEntryFromTransaction = async (transactionId, entryId) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/${transactionId}/entries/${entryId}`, {
    method: 'DELETE',
  });
};

// Get suggested matches for a transaction
export const fetchSuggestedMatches = async (params) => {
  const { amount, type, excludeTransactionId, maxMatches = 10, dateRange = 15, page = 1, limit = 10, referenceDate } = params || {};

  // Note: This logic seems specific to matching by amount/type based on the old api.js code.
  // If other matching methods were intended, this might need adjustment.
  if (amount === undefined || !type) {
     // Throw error early if required params are missing
    throw new Error('Both amount and type must be provided for suggested matches');
  }

  return fetchData(`${TRANSACTION_ENDPOINT}/matches`, { // Uses a specific /matches endpoint
    method: 'POST',
    body: JSON.stringify({
      amount,
      type,
      excludeTransactionId,
      maxMatches,
      dateRange,
      page,
      limit,
      referenceDate
    })
  });
};

// Search for entries with filters
export const searchEntries = async (filters = {}, page = 1, limit = 10) => {
  const {
    minAmount,
    maxAmount,
    accountId,
    type,
    searchText,
    dateRange,
    excludeTransactionId
  } = filters;

  let params = new URLSearchParams();

  params.append('page', page);
  params.append('limit', limit);

  if (minAmount !== undefined) params.append('minAmount', minAmount);
  if (maxAmount !== undefined) params.append('maxAmount', maxAmount);
  if (accountId) params.append('accountId', accountId);
  if (type) params.append('type', type);
  if (searchText) params.append('searchText', searchText);
  if (dateRange) params.append('dateRange', dateRange);
  if (excludeTransactionId) params.append('excludeTransactionId', excludeTransactionId);

  return fetchData(`${TRANSACTION_ENDPOINT}/search-entries?${params.toString()}`);
};

// Move an entry from one transaction to another
export const moveEntry = async (sourceTransactionId, entryId, destinationTransactionId) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/move-entry`, {
    method: 'POST',
    body: JSON.stringify({
      sourceTransactionId,
      entryId,
      destinationTransactionId
    }),
  });
};

// Merge all entries from one transaction to another
export const mergeTransaction = async (sourceTransactionId, destinationTransactionId) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/merge-transaction`, {
    method: 'POST',
    body: JSON.stringify({
      sourceTransactionId,
      destinationTransactionId
    }),
  });
};

// Split a transaction into two by moving selected entries to a new transaction
export const splitTransaction = async (transactionId, entryIndices) => {
  return fetchData(`${TRANSACTION_ENDPOINT}/split-transaction`, {
    method: 'POST',
    body: JSON.stringify({ transactionId, entryIndices })
  });
}; 