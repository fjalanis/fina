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

// Format date for HTML date input (YYYY-MM-DD)
export const inputDateFormat = (dateInput) => {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      throw new Error("Invalid Date");
    }
    const year = date.getFullYear();
    // getMonth() is 0-indexed, add 1 and pad with 0 if needed
    const month = String(date.getMonth() + 1).padStart(2, '0');
    // getDate() gets the day of the month, pad with 0 if needed
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error("Error formatting date for input:", error);
    // Attempt to return original if it matches the format, otherwise empty
    return typeof dateInput === 'string' && /\d{4}-\d{2}-\d{2}/.test(dateInput) ? dateInput : '';
  }
}; 