const Transaction = require('../models/Transaction');
const Account = require('../models/Account');

// Helper: sum debits/credits
function summarize(transaction) {
  const totals = transaction.entries.reduce((acc, e) => {
    if (e.type === 'debit') acc.debits += e.amount; else acc.credits += e.amount;
    return acc;
  }, { debits: 0, credits: 0 });
  return totals;
}

// Eligibility: fully unbalanced (strict)
function isFullyUnbalanced(transaction) {
  const { debits, credits } = summarize(transaction);
  const eps = 0.0001;
  const noDebits = Math.abs(debits) < eps;
  const noCredits = Math.abs(credits) < eps;
  return (noDebits && credits > eps) || (noCredits && debits > eps);
}

// Infer source entry type for complementary
function inferSourceType(transaction) {
  const { debits, credits } = summarize(transaction);
  if (credits > debits) return 'credit';
  if (debits > credits) return 'debit';
  return null;
}

async function getUnitsForAccounts(accountIds) {
  if (!accountIds || accountIds.length === 0) return {};
  const accounts = await Account.find({ '_id': { $in: accountIds } }).select('_id unit').lean();
  return accounts.reduce((map, acc) => {
    map[acc._id.toString()] = acc.unit || 'USD';
    return map;
  }, {});
}

// POST /api/mass/preview-eligible
exports.previewEligible = async (req, res) => {
  try {
    const { query, action, startDate, endDate } = req.body || {};
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    const start = new Date(startDate); const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ success: false, error: 'Invalid dates' });
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if ((end - start) > oneYearMs) return res.status(400).json({ success: false, error: 'Date range cannot exceed 1 year' });

    // Base match: date range + optional regex on description + sourceAccounts
    const match = { date: { $gte: start, $lte: end } };
    if (query?.pattern) match.description = { $regex: query.pattern, $options: 'i' };
    if (Array.isArray(query?.sourceAccounts) && query.sourceAccounts.length > 0) {
      match['entries.accountId'] = { $in: query.sourceAccounts };
    }

    const candidates = await Transaction.find(match).lean();
    let eligible = 0;
    for (const tx of candidates) {
      if (action?.type === 'ComplementaryAdd') {
        if (isFullyUnbalanced(tx)) eligible++;
      } else if (action?.type === 'EditFields') {
        // Eligible if any target field differs from provided value and query matches
        const needs = Boolean(action.fields && Object.keys(action.fields).some(k => {
          const v = action.fields[k];
          if (v === undefined || v === null || v === '') return false;
          // Support top-level editable fields
          return (tx[k] || '') !== v;
        }));
        if (needs) eligible++;
      } else if (action?.type === 'MergeInto') {
        // Eligible if fully unbalanced OR has complementary generated entries (replaceable)
        const fully = isFullyUnbalanced(tx);
        const hasComplementary = tx.entries?.some(e => e.generated && e.generated.kind === 'complementary');
        if (fully || hasComplementary) eligible++;
      }
    }
    return res.json({ success: true, data: { totalCandidates: candidates.length, eligibleCount: eligible } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};

// POST /api/mass/apply
exports.applyMass = async (req, res) => {
  try {
    const { query, action, startDate, endDate } = req.body || {};
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'startDate and endDate are required' });
    const start = new Date(startDate); const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return res.status(400).json({ success: false, error: 'Invalid dates' });
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    if ((end - start) > oneYearMs) return res.status(400).json({ success: false, error: 'Date range cannot exceed 1 year' });

    const match = { date: { $gte: start, $lte: end } };
    if (query?.pattern) match.description = { $regex: query.pattern, $options: 'i' };
    if (Array.isArray(query?.sourceAccounts) && query.sourceAccounts.length > 0) {
      match['entries.accountId'] = { $in: query.sourceAccounts };
    }

    const txs = await Transaction.find(match);
    let processed = 0, eligible = 0, modified = 0;
    for (const tx of txs) {
      processed++;
      if (action?.type === 'ComplementaryAdd') {
        if (!isFullyUnbalanced(tx)) continue;
        eligible++;
        const sourceType = inferSourceType(tx);
        if (!sourceType) continue;
        const sourceAmount = sourceType === 'credit' ? summarize(tx).credits : summarize(tx).debits;
        const ratios = (action.destination || []).map(d => ({ accountId: d.accountId, ratio: d.ratio }));
        const destIds = ratios.map(r => r.accountId).filter(Boolean);
        const unitsMap = await getUnitsForAccounts(destIds);
        const entriesToAdd = ratios.map(r => ({
          accountId: r.accountId,
          amount: Math.round((r.ratio * sourceAmount) * 100) / 100,
          type: sourceType === 'credit' ? 'debit' : 'credit',
          unit: unitsMap[r.accountId.toString()] || 'USD',
          description: 'Auto-generated complementary',
          generated: { kind: 'complementary' }
        }));
        tx.entries.push(...entriesToAdd);
        await tx.save();
        modified++;
      } else if (action?.type === 'EditFields') {
        const fields = action.fields || {};
        let changed = false;
        Object.keys(fields).forEach(k => {
          const v = fields[k];
          if (v !== undefined && v !== null && v !== '' && (tx[k] || '') !== v) { tx[k] = v; changed = true; }
        });
        if (!changed) continue; eligible++;
        await tx.save(); modified++;
      } else if (action?.type === 'MergeInto') {
        // Minimal placeholder: if balanced only by complementary, remove complementary entries (replace by merge’s logic later)
        const hasComplementary = tx.entries?.some(e => e.generated && e.generated.kind === 'complementary');
        const fully = isFullyUnbalanced(tx);
        if (!(fully || hasComplementary)) continue; eligible++;
        if (hasComplementary) {
          tx.entries = tx.entries.filter(e => !(e.generated && e.generated.kind === 'complementary'));
          await tx.save();
          modified++;
        }
        // Note: actual merging into counterpart transaction requires a counterpart query; left for a subsequent step.
      }
    }
    return res.json({ success: true, data: { processed, eligible, modified } });
  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};


