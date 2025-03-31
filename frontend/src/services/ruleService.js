import api from './api';

export const fetchRules = async () => {
  try {
    return await api.ruleApi.getRules();
  } catch (error) {
    console.error('Error fetching rules:', error);
    throw error;
  }
};

export const fetchRuleById = async (ruleId) => {
  try {
    return await api.ruleApi.getRule(ruleId);
  } catch (error) {
    console.error('Error fetching rule:', error);
    throw error;
  }
};

export const createRule = async (ruleData) => {
  try {
    return await api.ruleApi.createRule(ruleData);
  } catch (error) {
    console.error('Error creating rule:', error);
    throw error;
  }
};

export const updateRule = async (ruleId, ruleData) => {
  try {
    return await api.ruleApi.updateRule(ruleId, ruleData);
  } catch (error) {
    console.error('Error updating rule:', error);
    throw error;
  }
};

export const deleteRule = async (ruleId) => {
  try {
    return await api.ruleApi.deleteRule(ruleId);
  } catch (error) {
    console.error('Error deleting rule:', error);
    throw error;
  }
};

export const testRule = async (ruleId, testData) => {
  try {
    return await api.ruleApi.testRule(ruleId, testData);
  } catch (error) {
    console.error('Error testing rule:', error);
    throw error;
  }
};

export const applyRuleToTransaction = async (transactionId) => {
  try {
    return await api.ruleApi.applyRuleToTransaction(transactionId);
  } catch (error) {
    console.error('Error applying rule to transaction:', error);
    throw error;
  }
};

export const applyRulesToAllTransactions = async () => {
  try {
    console.log('Starting applyRulesToAllTransactions...');
    const response = await api.ruleApi.applyRulesToAllTransactions();
    console.log('applyRulesToAllTransactions response:', response);
    return response;
  } catch (error) {
    console.error('Error applying rules to all transactions:', error);
    throw error;
  }
}; 