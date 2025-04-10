import React, { useState } from 'react';
import IncomeExpenseSummaryReport from './IncomeExpenseSummaryReport';
import SankeyDiagramReport from './SankeyDiagramReport';
import NetWorthReport from './NetWorthReport';

const ReportDashboard = () => {
  const [activeReport, setActiveReport] = useState('sankey-diagram');

  const reportTypes = [
    { id: 'sankey-diagram', name: 'Sankey Diagram' },
    { id: 'income-expense-summary', name: 'Income/Expense Summary' },
    { id: 'net-worth', name: 'Net Worth' },
  ];

  const renderReport = () => {
    switch (activeReport) {
      case 'sankey-diagram':
        return <SankeyDiagramReport />;
      case 'income-expense-summary':
        return <IncomeExpenseSummaryReport />;
      case 'net-worth':
        return <NetWorthReport />;
      default:
        return <SankeyDiagramReport />;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6">Financial Reports</h1>
      
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mb-8">
        {reportTypes.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveReport(report.id)}
            className={`px-4 py-2 rounded-md ${
              activeReport === report.id
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {report.name}
          </button>
        ))}
      </div>
      
      <div className="bg-gray-50 p-6 rounded-lg">
        {renderReport()}
      </div>
    </div>
  );
};

export default ReportDashboard; 