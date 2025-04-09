import { fetchData } from './api';

const REPORT_ENDPOINT = '/reports';

// Get account balance report
export const fetchAccountBalanceReport = async (startDate, endDate, accountId = null) => {
  // Use URLSearchParams for cleaner query string construction
  const params = new URLSearchParams({ startDate, endDate });
  if (accountId) {
    params.append('accountId', accountId);
  }
  const endpoint = `${REPORT_ENDPOINT}/account-balance?${params.toString()}`;
  return fetchData(endpoint);
};

// Rename and update function for date-range based income/expense summary
export const fetchIncomeExpenseSummary = async (startDate, endDate) => {
  const params = new URLSearchParams();
  // Format dates as YYYY-MM-DD strings if they are Date objects or strings
  const formatQueryDate = (date) => {
    if (!date) return '';
    if (date instanceof Date) {
      return date.toISOString().split('T')[0];
    } 
    // Assume it's already a YYYY-MM-DD string if not a Date object
    return date;
  };
  
  const formattedStartDate = formatQueryDate(startDate);
  const formattedEndDate = formatQueryDate(endDate);
  
  if (formattedStartDate) params.append('startDate', formattedStartDate);
  if (formattedEndDate) params.append('endDate', formattedEndDate);

  const queryString = params.toString();
  // Use the correct backend endpoint
  const endpoint = `${REPORT_ENDPOINT}/income-expense-summary?${queryString}`;

  return fetchData(endpoint);
};

// Get Sankey diagram data
export const fetchSankeyReportData = async (startDate, endDate) => {
  const params = new URLSearchParams();
  // Format dates as YYYY-MM-DD strings if they are Date objects
  if (startDate instanceof Date) {
    params.append('startDate', startDate.toISOString().split('T')[0]);
  }
  if (endDate instanceof Date) {
    params.append('endDate', endDate.toISOString().split('T')[0]);
  }

  const queryString = params.toString();
  const endpoint = `${REPORT_ENDPOINT}/sankey?${queryString}`;
  return fetchData(endpoint);
}; 