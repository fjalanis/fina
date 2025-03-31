import React from 'react';
import { formatDate } from './TransactionBalancerUtils';

const TransactionHeader = ({
  transaction,
  onDeleteTransaction
}) => {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center">
          <h3 className="font-medium text-lg">{transaction.description}</h3>
          <button
            onClick={onDeleteTransaction}
            className="ml-4 text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
            title="Delete entire transaction"
          >
            Delete Transaction
          </button>
        </div>
        <span className="text-sm text-gray-500">{formatDate(transaction.date)}</span>
      </div>
      
      {transaction.reference && (
        <p className="text-sm text-gray-600 mb-2">Reference: {transaction.reference}</p>
      )}
      
      {transaction.notes && (
        <p className="text-sm text-gray-600 mb-2">Notes: {transaction.notes}</p>
      )}
    </div>
  );
};

export default TransactionHeader; 