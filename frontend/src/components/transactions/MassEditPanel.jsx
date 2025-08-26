import React, { useState, useCallback } from 'react';
import { previewEligible, applyMass } from '../../services/massService';
import { io } from 'socket.io-client';

const MassEditPanel = ({ startDate, endDate, defaultSourceAccounts = [] }) => {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState({ pattern: '', sourceAccounts: defaultSourceAccounts, entryType: 'both' });
  const [action, setAction] = useState({ type: 'ComplementaryAdd', destination: [], fields: {} });
  const [eligible, setEligible] = useState(null);
  const [progress, setProgress] = useState(null);
  const [processing, setProcessing] = useState(false);

  const handlePreview = useCallback(async () => {
    if (!startDate || !endDate) return;
    const resp = await previewEligible({ query, action, startDate, endDate });
    setEligible(resp.data);
  }, [query, action, startDate, endDate]);

  const handleApply = useCallback(async () => {
    if (!startDate || !endDate) return;
    setProcessing(true);
    setProgress(null);
    const s = io('/', { path: '/socket.io' });
    s.on('rule-apply-progress', (data) => setProgress(data));
    try {
      await applyMass({ query, action, startDate, endDate });
    } finally {
      setProcessing(false);
      s.disconnect();
    }
  }, [query, action, startDate, endDate]);

  const canApply = Boolean(startDate && endDate && action && (action.type === 'EditFields' ? Object.keys(action.fields||{}).length>0 : (action.type !== 'EditFields')));

  return (
    <div className="mb-4 border rounded">
      <button onClick={() => setExpanded(e => !e)} className="w-full text-left px-3 py-2 bg-gray-100">{expanded ? 'Hide Mass Edit' : 'Show Mass Edit'}</button>
      {expanded && (
        <div className="p-3 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600">Regex Pattern</label>
              <input className="w-full border px-2 py-1" value={query.pattern} onChange={e => setQuery(q => ({ ...q, pattern: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Entry Type</label>
              <select className="w-full border px-2 py-1" value={query.entryType} onChange={e => setQuery(q => ({ ...q, entryType: e.target.value }))}>
                <option value="both">Both</option>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600">Action</label>
              <select className="w-full border px-2 py-1" value={action.type} onChange={e => setAction(a => ({ ...a, type: e.target.value }))}>
                <option value="ComplementaryAdd">Complementary Add</option>
                <option value="MergeInto">Merge Into</option>
                <option value="EditFields">Edit Fields</option>
              </select>
            </div>
          </div>

          {action.type === 'ComplementaryAdd' && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Destination Ratios (must sum to 1.00)</label>
              {(action.destination||[]).map((d, idx) => (
                <div key={idx} className="flex space-x-2 mb-1">
                  <input className="flex-1 border px-2 py-1" placeholder="Destination AccountId" value={d.accountId||''} onChange={e => setAction(a => { const dest=[...(a.destination||[])]; dest[idx]={...dest[idx], accountId:e.target.value}; return {...a, destination:dest}; })} />
                  <input className="w-28 border px-2 py-1" type="number" min="0" max="1" step="0.01" placeholder="Ratio" value={d.ratio||''} onChange={e => setAction(a => { const dest=[...(a.destination||[])]; dest[idx]={...dest[idx], ratio:parseFloat(e.target.value)||0}; return {...a, destination:dest}; })} />
                  <button className="text-red-600" onClick={() => setAction(a => ({...a, destination:(a.destination||[]).filter((_,i)=>i!==idx)}))}>Remove</button>
                </div>
              ))}
              <button className="text-blue-600" onClick={() => setAction(a => ({...a, destination:[...(a.destination||[]), { accountId:'', ratio:0 }]}))}>+ Add Destination</button>
            </div>
          )}

          {action.type === 'EditFields' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Owner</label>
                <input className="w-full border px-2 py-1" value={action.fields?.owner||''} onChange={e => setAction(a => ({...a, fields:{...(a.fields||{}), owner:e.target.value}}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Category</label>
                <input className="w-full border px-2 py-1" value={action.fields?.category||''} onChange={e => setAction(a => ({...a, fields:{...(a.fields||{}), category:e.target.value}}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Zip Code</label>
                <input className="w-full border px-2 py-1" value={action.fields?.zipCode||''} onChange={e => setAction(a => ({...a, fields:{...(a.fields||{}), zipCode:e.target.value}}))} />
              </div>
            </div>
          )}

          {action.type === 'MergeInto' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600">Counterpart Account IDs (comma-separated)</label>
                <input className="w-full border px-2 py-1" placeholder="acctId1,acctId2" value={(action.merge?.counterpartAccounts || []).join(',')} onChange={e => {
                  const list = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                  setAction(a => ({...a, merge:{ ...(a.merge||{}), counterpartAccounts:list }}));
                }} />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Max Days</label>
                <input className="w-full border px-2 py-1" type="number" min="1" max="15" value={action.merge?.maxDays || 3} onChange={e => setAction(a => ({...a, merge:{ ...(a.merge||{}), maxDays: parseInt(e.target.value)||3 }}))} />
              </div>
            </div>
          )}

          <div className="flex items-center space-x-3">
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={handlePreview} disabled={!startDate || !endDate}>Preview Eligible</button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleApply} disabled={!canApply || processing}>Apply</button>
            {eligible && (
              <span className="text-xs text-gray-700">Candidates: {eligible.totalCandidates} | Eligible: {eligible.eligibleCount}</span>
            )}
            {progress && (
              <span className="text-xs text-blue-700">Processed: {progress.processed} | Matched: {progress.matched} | Modified: {progress.modified}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MassEditPanel;


