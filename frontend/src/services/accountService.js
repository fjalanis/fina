import { fetchData } from './api'; // Import the generic fetch function

// Define account-specific endpoints and logic
const ACCOUNT_ENDPOINT = '/accounts';

export const fetchAccounts = async () => {
  // Call fetchData with the specific endpoint
  return fetchData(ACCOUNT_ENDPOINT);
};

export const fetchAccountById = async (accountId) => {
  // Construct the endpoint dynamically
  return fetchData(`${ACCOUNT_ENDPOINT}/${accountId}`);
};

export const createAccount = async (accountData) => {
  // Pass method and body in options
  return fetchData(ACCOUNT_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(accountData),
  });
};

export const updateAccount = async (accountId, accountData) => {
  return fetchData(`${ACCOUNT_ENDPOINT}/${accountId}`, {
    method: 'PUT',
    body: JSON.stringify(accountData),
  });
};

export const deleteAccount = async (accountId) => {
  return fetchData(`${ACCOUNT_ENDPOINT}/${accountId}`, {
    method: 'DELETE',
  });
};

export const fetchAccountHierarchy = async () => {
  return fetchData(`${ACCOUNT_ENDPOINT}/hierarchy`);
}; 