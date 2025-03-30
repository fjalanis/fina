const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generic fetch function with error handling
const fetchData = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
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

// Create API object with all services
const api = { 
  accountApi,
  transactionApi,
  entryLineApi
};

export default api; 