import { getEnvVar } from '../utils/env';

const API_BASE_URL = getEnvVar('FRONTEND_API_URL');  

// Generic fetch function with error handling
const fetchData = async (endpoint, options = {}) => {
  const baseUrl = API_BASE_URL;
  const url = `${baseUrl}${endpoint}`;
  
  console.log('Making API request:', {
    url,
    method: options.method || 'GET',
    endpoint,
    baseUrl,
    params: options,
  });
  
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
    
    console.log('API response:', {
      status: response.status,
      statusText: response.statusText,
      url: response.url
    });
    
    const data = await response.json();
    console.log('API response data:', data);
    
    if (!response.ok) {
      // Improved error handling - extract server error message if available
      const errorMessage = data.error || data.message || `HTTP Error ${response.status}`;
      console.error('API Error:', {
        status: response.status,
        message: errorMessage,
        data
      });
      throw new Error(errorMessage);
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', {
      error: error.message,
      url,
      method: options.method || 'GET'
    });
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
  getTransactions: (params = {}) => {
    // Default to a very wide date range if none specified
    const queryParams = new URLSearchParams();
    
    if (params.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    
    if (params.endDate) {
      queryParams.append('endDate', params.endDate);
    }
    
    if (params.accountId) {
      queryParams.append('accountId', params.accountId);
    }
    
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/transactions?${queryString}` : '/transactions';
    
    return fetchData(endpoint);
  },

  // Get transaction by ID
  getTransaction: (id) => fetchData(`/transactions/${id}`),

  // Create a new transaction with entries
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

  // Add entry to a transaction
  addEntry: (transactionId, entryData) => fetchData(`/transactions/${transactionId}/entries`, {
    method: 'POST',
    body: JSON.stringify(entryData),
  }),
  
  // Update an entry in a transaction
  updateEntry: (transactionId, entryId, entryData) => fetchData(`/transactions/${transactionId}/entries/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(entryData),
  }),
  
  // Delete an entry from a transaction
  deleteEntry: (transactionId, entryId) => fetchData(`/transactions/${transactionId}/entries/${entryId}`, {
    method: 'DELETE',
  }),
  
  // Get suggested matches for a transaction
  getSuggestedMatches: (params) => {
    const { transactionId, amount, type, excludeTransactionId, maxMatches = 10, dateRange = 15, page = 1, limit = 10, referenceDate } = params || {};
    
    let endpoint = '';
    
    if (amount !== undefined && type) {
      // Match directly by amount and type - use the existing suggestions endpoint
      return fetchData('/transactions/matches', {
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
    } else {
      throw new Error('Either transactionId or both amount and type must be provided');
    }
    
    return fetchData(endpoint);
  },
  
  // Search for entries with filters
  searchEntries: (filters = {}, page = 1, limit = 10) => {
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
    
    // Add pagination params
    params.append('page', page);
    params.append('limit', limit);
    
    // Add optional filters if they exist
    if (minAmount !== undefined) params.append('minAmount', minAmount);
    if (maxAmount !== undefined) params.append('maxAmount', maxAmount);
    if (accountId) params.append('accountId', accountId);
    if (type) params.append('type', type);
    if (searchText) params.append('searchText', searchText);
    if (dateRange) params.append('dateRange', dateRange);
    if (excludeTransactionId) params.append('excludeTransactionId', excludeTransactionId);
    
    return fetchData(`/transactions/search-entries?${params.toString()}`);
  },
  
  // Move an entry from one transaction to another
  moveEntry: (entryId, destinationTransactionId) => 
    fetchData('/transactions/move-entry', {
      method: 'POST',
      body: JSON.stringify({
        entryId,
        destinationTransactionId
      }),
    }),
    
  // Merge all entries from one transaction to another
  mergeTransaction: (sourceTransactionId, destinationTransactionId) => 
    fetchData('/transactions/merge-transaction', {
      method: 'POST',
      body: JSON.stringify({
        sourceTransactionId,
        destinationTransactionId
      }),
    }),

  // Split a transaction into two by moving selected entries to a new transaction
  splitTransaction: (transactionId, entryIndices) =>
    fetchData('/transactions/split-transaction', {
      method: 'POST',
      body: JSON.stringify({ transactionId, entryIndices })
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

// Rule API functions
export const ruleApi = {
  // Get all rules - can filter by type
  getRules: (type) => {
    const queryParams = type ? `?type=${type}` : '';
    return fetchData(`/rules${queryParams}`);
  },

  // Get rule by ID
  getRule: (id) => fetchData(`/rules/${id}`),

  // Create a new rule
  createRule: (ruleData) => fetchData('/rules', {
    method: 'POST',
    body: JSON.stringify(ruleData),
  }),

  // Update a rule
  updateRule: (id, ruleData) => fetchData(`/rules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(ruleData),
  }),

  // Delete a rule
  deleteRule: (id) => fetchData(`/rules/${id}`, {
    method: 'DELETE',
  }),

  // Test a rule
  testRule: (id, testData) => fetchData(`/rules/${id}/test`, {
    method: 'POST',
    body: JSON.stringify(testData),
  }),

  // Apply rule to transaction
  applyRuleToTransaction: (ruleId, transactionId) => fetchData(`/rules/${ruleId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  }),

  // Apply all rules to all transactions
  applyRulesToAllTransactions: () => fetchData('/rules/apply-all', {
    method: 'POST'
  }),
  
  // Preview which transactions would match a rule pattern
  previewRule: ({ pattern, sourceAccounts, entryType }) => {
    // Build query params for GET request
    const params = new URLSearchParams();
    
    // Required parameter
    if (!pattern) {
      throw new Error('Pattern is required for preview');
    }
    params.append('pattern', pattern);
    
    // Optional parameters
    if (sourceAccounts && sourceAccounts.length > 0) {
      // If array, add each account ID separately
      if (Array.isArray(sourceAccounts)) {
        sourceAccounts.forEach(accountId => params.append('sourceAccounts', accountId));
      } else {
        params.append('sourceAccounts', sourceAccounts);
      }
    }
    
    if (entryType) {
      params.append('entryType', entryType);
    }
    
    return fetchData(`/rules/preview?${params.toString()}`);
  },
};

// Create API object with all services and export API_BASE_URL
const api = { 
  accountApi,
  transactionApi,
  reportApi,
  ruleApi,
  API_BASE_URL // Export the base URL for direct usage
};

export default api; 