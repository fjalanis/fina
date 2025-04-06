// Format date to local date string
export const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    // You might want a more sophisticated date formatting library if needed
    return date.toLocaleDateString(); // Example: 'MM/DD/YYYY' or locale specific
  } catch (error) {
    console.error("Error formatting date:", error);
    return dateString; // Return original string if formatting fails
  }
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

export const formatNumber = (number, decimals = 2) => {
  if (typeof number !== 'number') {
    return '0.00'; // Or handle as an error/default value
  }
  return number.toLocaleString(undefined, { 
    minimumFractionDigits: decimals, 
    maximumFractionDigits: decimals 
  });
}; 