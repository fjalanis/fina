// Format date to local date string
export const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString();
};

// Format currency to USD
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}; 