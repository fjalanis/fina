import { fetchData } from './api';

const EXCHANGE_RATE_ENDPOINT = '/exchange-rates';

export const fetchExchangeRates = async () => {
  return fetchData(EXCHANGE_RATE_ENDPOINT);
};

export const createExchangeRate = async (exchangeRateData) => {
  return fetchData(EXCHANGE_RATE_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify(exchangeRateData),
  });
};

export const updateExchangeRate = async (id, exchangeRateData) => {
  return fetchData(`${EXCHANGE_RATE_ENDPOINT}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(exchangeRateData),
  });
};

export const deleteExchangeRate = async (id) => {
  return fetchData(`${EXCHANGE_RATE_ENDPOINT}/${id}`, {
    method: 'DELETE',
  });
}; 