import api from './api';

export const fetchAccounts = async () => {
  try {
    return await api.accountApi.getAccounts();
  } catch (error) {
    console.error('Error fetching accounts:', error);
    throw error;
  }
};

export const fetchAccountById = async (accountId) => {
  try {
    return await api.accountApi.getAccount(accountId);
  } catch (error) {
    console.error('Error fetching account:', error);
    throw error;
  }
};

export const createAccount = async (accountData) => {
  try {
    return await api.accountApi.createAccount(accountData);
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

export const updateAccount = async (accountId, accountData) => {
  try {
    return await api.accountApi.updateAccount(accountId, accountData);
  } catch (error) {
    console.error('Error updating account:', error);
    throw error;
  }
};

export const deleteAccount = async (accountId) => {
  try {
    return await api.accountApi.deleteAccount(accountId);
  } catch (error) {
    console.error('Error deleting account:', error);
    throw error;
  }
}; 