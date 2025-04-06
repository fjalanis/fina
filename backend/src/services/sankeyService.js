const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

/**
 * Generates data structure for Sankey diagram based on transactions within a date range.
 * @param {Date} startDate The start date for the report period.
 * @param {Date} endDate The end date for the report period.
 * @returns {Promise<{nodes: Array, links: Array}>} Object containing nodes and links for the Sankey diagram.
 */
const generateSankeyData = async (startDate, endDate) => {
  // Fetch transactions within the date range, populating account details
  const transactions = await Transaction.find({
    date: { $gte: startDate, $lte: endDate },
    // Consider only balanced transactions for flow representation
    isUnbalanced: { $ne: true } 
  })
  .populate({
    path: 'entries.account',
    select: 'name type unit' // Select necessary account fields
  })
  .lean(); // Use lean() for performance when not needing Mongoose docs methods

  const nodesMap = new Map(); // Using Map for efficient node lookup {accountId: {id, name, type, unit}}
  const linksMap = new Map(); // Using Map for efficient link aggregation {linkKey: {source, target, value, unit, transactionIds}}

  transactions.forEach(tx => {
    const debits = tx.entries.filter(e => e.type === 'debit');
    const credits = tx.entries.filter(e => e.type === 'credit');

    // Add all involved accounts to the nodes map
    tx.entries.forEach(entry => {
      if (entry.account && !nodesMap.has(entry.account._id.toString())) {
        nodesMap.set(entry.account._id.toString(), {
          id: entry.account._id.toString(),
          name: entry.account.name,
          type: entry.account.type,
          unit: entry.account.unit || 'USD' // Default to USD if unit is missing
        });
      }
    });

    // Create links: Iterate through each debit and pair it with each credit
    // This handles simple (1 debit, 1 credit) and complex splits
    debits.forEach(debitEntry => {
      credits.forEach(creditEntry => {
        // Ensure both accounts exist (might not if data is inconsistent)
        if (!debitEntry.account || !creditEntry.account) return;

        // *** Filter: Only process links between USD accounts ***
        const sourceUnit = creditEntry.account.unit || 'USD';
        const targetUnit = debitEntry.account.unit || 'USD';
        if (sourceUnit !== 'USD' || targetUnit !== 'USD') {
          return; // Skip this pair if either account is non-USD
        }
        // *** End Filter ***

        // For a balanced transaction, the debit amount equals the credit amount for a simple pair.
        // For splits, we need to decide how to represent the flow value.
        // Assumption: The value flowing *between this specific debit and credit account* 
        // within this transaction is the minimum of their absolute amounts.
        // This handles cases like 1 debit of 100 split into 2 credits of 50.
        // And 2 debits of 50 combining into 1 credit of 100.
        const flowValue = Math.min(debitEntry.amount, creditEntry.amount);

        if (flowValue <= 0) return; // Skip if no value transferred

        const sourceId = creditEntry.account._id.toString(); // Money flows FROM the credited account
        const targetId = debitEntry.account._id.toString();   // Money flows TO the debited account
        
        // *** Filter: Prevent direct self-loops ***
        if (sourceId === targetId) {
            return; // Skip links where source and target are the same account
        }
        // *** End Filter ***

        const unit = debitEntry.account.unit || 'USD'; // Assume debit/credit units match in balanced tx

        const linkKey = `${sourceId}_${targetId}_${unit}`; // Unique key for aggregation

        if (linksMap.has(linkKey)) {
          const existingLink = linksMap.get(linkKey);
          existingLink.value += flowValue;
          if (!existingLink.transactionIds.includes(tx._id.toString())) {
            existingLink.transactionIds.push(tx._id.toString());
          }
        } else {
          linksMap.set(linkKey, {
            source: sourceId,
            target: targetId,
            value: flowValue,
            unit: unit,
            transactionIds: [tx._id.toString()]
          });
        }
      });
    });
  });

  // 1. Get the initial list of potential USD-only links
  const potentialLinks = Array.from(linksMap.values());

  // 2. Identify the exact set of node IDs present in these potential links
  const nodeIdsInPotentialLinks = new Set();
  potentialLinks.forEach(link => {
    nodeIdsInPotentialLinks.add(link.source);
    nodeIdsInPotentialLinks.add(link.target);
  });

  // 3. Create the final nodes array: include only nodes from nodesMap whose ID is in the set above
  const finalNodes = Array.from(nodesMap.values()).filter(node => 
    nodeIdsInPotentialLinks.has(node.id)
  );

  // 4. Create the final links array: include only potential links where BOTH source and target are in the finalNodes set
  // (This might seem redundant but ensures absolute consistency if nodesMap had entries not hit by the initial link creation)
  const finalNodeIds = new Set(finalNodes.map(n => n.id));
  const finalLinks = potentialLinks.filter(link => 
    finalNodeIds.has(link.source) && finalNodeIds.has(link.target)
  );

  // 5. Calculate totalFlow for the finalNodes based *only* on the finalLinks
  const nodeFlows = new Map(); // Use a map to store flows temporarily {nodeId: flowValue}
  finalLinks.forEach(link => {
    nodeFlows.set(link.source, (nodeFlows.get(link.source) || 0) + link.value);
    nodeFlows.set(link.target, (nodeFlows.get(link.target) || 0) + link.value);
  });

  finalNodes.forEach(node => {
    node.totalFlow = nodeFlows.get(node.id) || 0;
  });

  // 6. Return the strictly consistent nodes and links
  return { nodes: finalNodes, links: finalLinks };
};

module.exports = {
  generateSankeyData,
}; 