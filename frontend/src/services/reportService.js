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

// Get monthly income/expense summary
export const fetchMonthlyIncomeExpenseSummary = async (year, month) => {
  const params = new URLSearchParams();
  if (year) params.append('year', year);
  if (month) params.append('month', month);

  const queryString = params.toString();
  const endpoint = queryString
    ? `${REPORT_ENDPOINT}/monthly-summary?${queryString}`
    : `${REPORT_ENDPOINT}/monthly-summary`;

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