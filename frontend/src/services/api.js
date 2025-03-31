const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generic fetch function with error handling
const fetchData = async (endpoint, options = {}) => {
  const baseUrl = API_BASE_URL;
  const url = `${baseUrl}${endpoint}`;
  
  // Set default headers
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  try {
    const response = await fetch(url, {
      ...options,
      headers
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      // Improved error handling - extract server error message if available
      const errorMessage = data.error || data.message || `HTTP Error ${response.status}`;
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Account API functions
export const accountApi = {
  // Get all accounts
  getAccounts: () => fetchData('/accounts'),

  // Get account by ID
  getAccount: (id) => fetchData(`/accounts/${id}`),

  // Create a new account
  createAccount: (accountData) => fetchData('/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData),
  }),

  // Update an account
  updateAccount: (id, accountData) => fetchData(`/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(accountData),
  }),

  // Delete an account
  deleteAccount: (id) => fetchData(`/accounts/${id}`, {
    method: 'DELETE',
  }),

  // Get account hierarchy
  getAccountHierarchy: () => fetchData('/accounts/hierarchy'),
};

// Transaction API functions
export const transactionApi = {
  // Get all transactions
  getTransactions: () => fetchData('/transactions'),

  // Get transaction by ID
  getTransaction: (id) => fetchData(`/transactions/${id}`),

  // Create a new transaction with entry lines
  createTransaction: (transactionData) => fetchData('/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData),
  }),

  // Update a transaction
  updateTransaction: (id, transactionData) => fetchData(`/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(transactionData),
  }),

  // Delete a transaction
  deleteTransaction: (id) => fetchData(`/transactions/${id}`, {
    method: 'DELETE',
  }),

  // Get entry lines for a transaction
  getTransactionEntries: (transactionId) => fetchData(`/transactions/${transactionId}/entries`),

  // Add entry line to a transaction
  addEntryLine: (transactionId, entryData) => fetchData(`/transactions/${transactionId}/entries`, {
    method: 'POST',
    body: JSON.stringify(entryData),
  }),
  
  // Get suggested matches for an entry line
  getSuggestedMatches: (entryLineId, maxMatches = 10) => 
    fetchData(`/transactions/matches/${entryLineId}?maxMatches=${maxMatches}`),
  
  // Balance transactions by combining entries
  balanceTransactions: (sourceEntryId, targetEntryId) => 
    fetchData('/transactions/balance', {
      method: 'POST',
      body: JSON.stringify({
        sourceEntryId,
        targetEntryId
      }),
    }),
};

// Entry Line API functions
export const entryLineApi = {
  // Get entry line by ID
  getEntryLine: (id) => fetchData(`/entries/${id}`),

  // Update an entry line
  updateEntryLine: (id, entryData) => fetchData(`/entries/${id}`, {
    method: 'PUT',
    body: JSON.stringify(entryData),
  }),

  // Delete an entry line
  deleteEntryLine: (id) => fetchData(`/entries/${id}`, {
    method: 'DELETE',
  }),
};

// Report API functions
export const reportApi = {
  // Get account balance report
  getAccountBalanceReport: (startDate, endDate, accountId = null) => {
    let endpoint = `/reports/account-balance?startDate=${startDate}&endDate=${endDate}`;
    if (accountId) {
      endpoint += `&accountId=${accountId}`;
    }
    return fetchData(endpoint);
  },
  
  // Get monthly income/expense summary
  getMonthlyIncomeExpenseSummary: (year, month) => {
    let endpoint = `/reports/monthly-summary`;
    
    // Add parameters if they're provided
    const params = [];
    if (year) params.push(`year=${year}`);
    if (month) params.push(`month=${month}`);
    
    if (params.length > 0) {
      endpoint += `?${params.join('&')}`;
    }
    
    return fetchData(endpoint);
  }
};

// Create API object with all services
const api = { 
  accountApi,
  transactionApi,
  entryLineApi,
  reportApi
};

export default api; 