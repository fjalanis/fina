import api from './api';

export const fetchAccounts = async () => {
  try {
    const response = await api.get('/accounts');
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const fetchAccountById = async (accountId) => {
  try {
    const response = await api.get(`/accounts/${accountId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const createAccount = async (accountData) => {
  try {
    const response = await api.post('/accounts', accountData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const updateAccount = async (accountId, accountData) => {
  try {
    const response = await api.put(`/accounts/${accountId}`, accountData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

export const deleteAccount = async (accountId) => {
  try {
    const response = await api.delete(`/accounts/${accountId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}; 