import { fetchData } from './api';

const MASS_ENDPOINT = '/mass';

export const previewEligible = async ({ query, action, startDate, endDate }) => {
  return fetchData(`${MASS_ENDPOINT}/preview-eligible`, {
    method: 'POST',
    body: JSON.stringify({ query, action, startDate, endDate })
  });
};

export const applyMass = async ({ query, action, startDate, endDate }) => {
  return fetchData(`${MASS_ENDPOINT}/apply`, {
    method: 'POST',
    body: JSON.stringify({ query, action, startDate, endDate })
  });
};


