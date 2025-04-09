import axios from 'axios';

const PRICE_API_URL = '/api/asset-prices';
const ACCOUNT_API_URL = '/api/accounts';

export const fetchAssetPrices = async ({ startDate, endDate } = {}) => {
  const params = {};
  if (startDate) params.startDate = startDate;
  if (endDate) params.endDate = endDate;
  const response = await axios.get(PRICE_API_URL, { params });
  return response.data;
};

export const createAssetPrice = async (assetPriceData) => {
  const response = await axios.post(PRICE_API_URL, assetPriceData);
  return response.data;
};

export const updateAssetPrice = async (id, assetPriceData) => {
  const response = await axios.put(`${PRICE_API_URL}/${id}`, assetPriceData);
  return response.data;
};

export const deleteAssetPrice = async (id) => {
  const response = await axios.delete(`${PRICE_API_URL}/${id}`);
  return response.data;
};

export const fetchAccountUnits = async () => {
  const response = await axios.get(`${ACCOUNT_API_URL}/units`);
  if (response.data && response.data.success) {
    return response.data.data;
  }
  throw new Error('Failed to fetch account units');
}; 