import { fetchData } from './api'; // Import the generic fetch function

// Define rule-specific endpoints and logic
const RULE_ENDPOINT = '/rules';

export const fetchRules = async (type) => {
  const queryParams = type ? `?type=${type}` : '';
  return fetchData(`${RULE_ENDPOINT}${queryParams}`);
};

export const fetchRuleById = async (ruleId) => {
  return fetchData(`${RULE_ENDPOINT}/${ruleId}`);
};

export const createRule = async (ruleData) => {
  return fetchData(RULE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(ruleData),
  });
};

export const updateRule = async (ruleId, ruleData) => {
  return fetchData(`${RULE_ENDPOINT}/${ruleId}`, {
    method: 'PUT',
    body: JSON.stringify(ruleData),
  });
};

export const deleteRule = async (ruleId) => {
  return fetchData(`${RULE_ENDPOINT}/${ruleId}`, {
    method: 'DELETE',
  });
};

export const testRule = async (ruleId, testData) => {
  return fetchData(`${RULE_ENDPOINT}/${ruleId}/test`, {
    method: 'POST',
    body: JSON.stringify(testData),
  });
};

export const applyRuleToTransaction = async (ruleId, transactionId) => {
  return fetchData(`${RULE_ENDPOINT}/${ruleId}/apply`, {
    method: 'POST',
    body: JSON.stringify({ transactionId }),
  });
};

export const applyRulesToAllTransactions = async () => {
  return fetchData(`${RULE_ENDPOINT}/apply-all`, {
    method: 'POST'
  });
};

export const applyRuleBulk = async (ruleId) => {
  return fetchData(`${RULE_ENDPOINT}/apply-all`, {
    method: 'POST',
    body: JSON.stringify({ ruleId })
  });
};

export const previewRule = async ({ pattern, sourceAccounts, entryType }) => {
  // Build query params for GET request
  const params = new URLSearchParams();

  // Required parameter
  if (!pattern) {
    // It's often better to throw validation errors *before* the API call
    throw new Error('Pattern is required for preview');
  }
  params.append('pattern', pattern);

  // Optional parameters
  if (sourceAccounts && sourceAccounts.length > 0) {
    if (Array.isArray(sourceAccounts)) {
      sourceAccounts.forEach(accountId => params.append('sourceAccounts', accountId));
    } else {
      params.append('sourceAccounts', sourceAccounts);
    }
  }

  if (entryType) {
    params.append('entryType', entryType);
  }

  // Call fetchData with the GET request and query params
  return fetchData(`${RULE_ENDPOINT}/preview?${params.toString()}`);
}; 