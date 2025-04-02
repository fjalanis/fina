import React from 'react';
import { formatCurrency } from '../../../utils/formatters';

const TransactionBalanceAnalysis = ({ balanceData }) => {
  return (
    <div className={`p-4 rounded-lg ${
      balanceData.isBalanced
        ? 'bg-green-50 border border-green-200'
        : 'bg-yellow-50 border border-yellow-200'
    }`}>
      <h3 className="font-medium mb-2">Balance Analysis</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
        <div>
          <p className="text-sm text-gray-600">Total Debits</p>
          <p className="font-medium text-red-600">{formatCurrency(balanceData.totalDebits)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Total Credits</p>
          <p className="font-medium text-green-600">{formatCurrency(balanceData.totalCredits)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Net Balance</p>
          <p className={`font-medium ${balanceData.isBalanced ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(balanceData.netBalance)}
          </p>
        </div>
      </div>
      
      <div>
        <p className={`text-sm ${balanceData.isBalanced ? 'text-green-600' : 'text-yellow-600'}`}>
          {balanceData.isBalanced
            ? '✓ This transaction is perfectly balanced.'
            : balanceData.suggestedFix.message
          }
        </p>
      </div>
    </div>
  );
};

export default TransactionBalanceAnalysis; 