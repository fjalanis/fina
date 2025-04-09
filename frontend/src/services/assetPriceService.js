import axios from 'axios';

const API_URL = '/api/asset-prices';

export const fetchAssetPrices = async () => {
  const response = await axios.get(API_URL);
  return response.data;
};

export const createAssetPrice = async (assetPriceData) => {
  const response = await axios.post(API_URL, {
    body: JSON.stringify(assetPriceData),
  });
  return response.data;
};

export const updateAssetPrice = async (id, assetPriceData) => {
  const response = await axios.put(`${API_URL}/${id}`, {
    body: JSON.stringify(assetPriceData),
  });
  return response.data;
};

export const deleteAssetPrice = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`);
  return response.data;
}; 