import React from 'react';

const AssetTable = ({ account, transactions }) => {
  // Calculate positions and gains/losses
  const positions = transactions.reduce((acc, transaction) => {
    transaction.entries.forEach(entry => {
      if (!entry.unit || entry.unit === 'USD') return;
      
      if (!acc[entry.unit]) {
        acc[entry.unit] = {
          unit: entry.unit,
          quantity: 0,
          totalCost: 0,
          realizedGains: 0,
          transactions: []
        };
      }

      const position = acc[entry.unit];
      const amount = entry.type === 'debit' ? entry.amount : -entry.amount;
      const quantity = entry.type === 'debit' ? entry.quantity : -entry.quantity;
      
      // Calculate realized gains/losses when selling
      if (entry.type === 'credit' && position.quantity > 0) {
        const avgCost = position.totalCost / position.quantity;
        const gain = (entry.amount - (quantity * avgCost)) * -1; // Negative because it's a credit
        position.realizedGains += gain;
      }

      position.quantity += quantity;
      position.totalCost += amount;
      position.transactions.push(transaction);
    });
    
    return acc;
  }, {});

  // Calculate current market values and unrealized gains/losses
  const calculateMarketValue = (unit) => {
    // TODO: Implement market value lookup
    // This should come from a market data service
    return 0;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Cost</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unrealized G/L</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Realized G/L</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Object.values(positions).map((position) => {
            const marketValue = calculateMarketValue(position.unit);
            const unrealizedGains = marketValue - position.totalCost;
            
            return (
              <tr key={position.unit}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {position.unit}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {position.quantity.toFixed(6)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${(position.totalCost / position.quantity).toFixed(2)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  ${marketValue.toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                  unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${unrealizedGains.toFixed(2)}
                </td>
                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                  position.realizedGains >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ${position.realizedGains.toFixed(2)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default AssetTable; 