import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { previewEligible, applyMass } from '../../services/massService';
import AccountsMultiSelect from './AccountsMultiSelect';

const SearchReplaceBar = ({
  startDate,
  endDate,
  accounts = [],
  defaultSourceAccounts = [],
  alwaysShowReplace = false,
  hideApply = false,
  value,
  onChange,
  onSearch,
  onEligibilityChange,
  onCreateRule
}) => {
  const [expanded, setExpanded] = useState(alwaysShowReplace);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [local, setLocal] = useState(() => value || ({ query: { pattern: '', entryType: 'both', sourceAccounts: defaultSourceAccounts, owner: '', category: '' }, action: { type: 'ComplementaryAdd', destination: [], fields: {} } }));
  const [progress, setProgress] = useState(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { if (onChange) onChange(local); }, [local, onChange]);
  useEffect(() => {
    if (!onSearch) return;
    if (!startDate || !endDate) return;
    const handle = setTimeout(() => {
      const params = { startDate, endDate };
      if (local.query.pattern) params.description = local.query.pattern;
      if (local.query.entryType && local.query.entryType !== 'both') params.entryType = local.query.entryType;
      if (local.query.owner) params.owner = local.query.owner;
      if (local.query.category) params.category = local.query.category;
      if (local.query.sourceAccounts && local.query.sourceAccounts.length>0) params.accountIds = local.query.sourceAccounts; // let service handle array or string
      onSearch(params);
    }, 250);
    return () => clearTimeout(handle);
  }, [local.query, startDate, endDate]);

  const eligibilityPredicate = useMemo(() => {
    if (!expanded && !alwaysShowReplace) return null;
    const actionType = local.action?.type;
    if (actionType === 'ComplementaryAdd') {
      return (tx) => {
        const totals = (tx.entries||[]).reduce((acc,e)=>{ if(e.type==='debit') acc.d+=e.amount; else acc.c+=e.amount; return acc; }, {d:0,c:0});
        const eps = 0.0001;
        const noDebits = Math.abs(totals.d) < eps;
        const noCredits = Math.abs(totals.c) < eps;
        return (noDebits && totals.c > eps) || (noCredits && totals.d > eps);
      };
    } else if (actionType === 'MergeInto') {
      return (tx) => {
        const totals = (tx.entries||[]).reduce((acc,e)=>{ if(e.type==='debit') acc.d+=e.amount; else acc.c+=e.amount; return acc; }, {d:0,c:0});
        const eps = 0.0001;
        const fully = (Math.abs(totals.d) < eps && totals.c > eps) || (Math.abs(totals.c) < eps && totals.d > eps);
        const hasComp = (tx.entries||[]).some(e => e.generated && e.generated.kind === 'complementary');
        return fully || hasComp;
      };
    } else if (actionType === 'EditFields') {
      const fields = local.action?.fields || {};
      return (tx) => Object.keys(fields).some(k => {
        const v = fields[k];
        return v !== undefined && v !== null && v !== '' && (tx[k] || '') !== v;
      });
    }
    return null;
  }, [expanded, alwaysShowReplace, local.action]);

  useEffect(() => {
    if (onEligibilityChange) onEligibilityChange(eligibilityPredicate);
  }, [eligibilityPredicate, onEligibilityChange]);

  const handleApply = async () => {
    if (!startDate || !endDate || hideApply) return;
    setProcessing(true);
    setProgress(null);
    const s = io('/', { path: '/socket.io' });
    s.on('rule-apply-progress', (data) => setProgress(data));
    try {
      await applyMass({ query: local.query, action: local.action, startDate, endDate });
    } finally {
      setProcessing(false);
      s.disconnect();
    }
  };

  const canApply = useMemo(() => {
    if (hideApply) return false;
    if (!startDate || !endDate) return false;
    if (!local?.query) return false;
    if (local.action?.type === 'EditFields') {
      return Object.keys(local.action.fields || {}).some(k => {
        const v = local.action.fields[k];
        return v !== undefined && v !== null && v !== '';
      });
    }
    if (local.action?.type === 'ComplementaryAdd') {
      const dest = local.action.destination || [];
      const ratios = dest.map(d => parseFloat(d.ratio)||0).filter(r => r>0);
      if (ratios.length === 0) return false;
      const sum = ratios.reduce((t,r)=>t+r,0);
      return Math.abs(sum - 1) < 0.001;
    }
    if (local.action?.type === 'MergeInto') return true;
    return false;
  }, [hideApply, startDate, endDate, local]);

  return (
    <div className="mb-4 border rounded">
      <div className="p-2 flex items-center space-x-2">
        <input className="flex-1 border px-2 py-1" placeholder="Search description (regex)" value={local.query.pattern} onChange={e => setLocal(v => ({...v, query:{...v.query, pattern:e.target.value}}))} />
        <button className="text-sm text-gray-700" onClick={() => setShowAdvanced(a=>!a)}>{showAdvanced ? 'Hide filters' : 'More filters'}</button>
        {!alwaysShowReplace && (
          <button className="text-sm text-gray-700" onClick={() => setExpanded(e=>!e)}>{expanded ? 'Hide replace' : 'Show replace'}</button>
        )}
        <button className="text-sm text-blue-700" onClick={() => { if (onCreateRule) onCreateRule(local); }}>Create Rule…</button>
      </div>

      {showAdvanced && (
        <div className="px-2 pb-2 grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-600">Entry Type</label>
            <select className="w-full border px-2 py-1" value={local.query.entryType} onChange={e=>setLocal(v=>({...v, query:{...v.query, entryType:e.target.value}}))}>
              <option value="both">Both</option>
              <option value="debit">Debit</option>
              <option value="credit">Credit</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600">Owner</label>
            <input className="w-full border px-2 py-1" value={local.query.owner||''} onChange={e=>setLocal(v=>({...v, query:{...v.query, owner:e.target.value}}))} />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Category</label>
            <input className="w-full border px-2 py-1" value={local.query.category||''} onChange={e=>setLocal(v=>({...v, query:{...v.query, category:e.target.value}}))} />
          </div>
          <div className="col-span-3">
            <label className="block text-xs text-gray-600">Accounts</label>
            <AccountsMultiSelect accounts={accounts} value={local.query.sourceAccounts} onChange={(vals)=> setLocal(v=>({...v, query:{...v.query, sourceAccounts: vals}}))} />
          </div>
        </div>
      )}

      {(expanded || alwaysShowReplace) && (
        <div className="px-2 pb-2 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600">Action</label>
              <select className="w-full border px-2 py-1" value={local.action.type} onChange={e=>setLocal(v=>({...v, action:{...v.action, type:e.target.value}}))}>
                <option value="ComplementaryAdd">Complementary Add</option>
                <option value="MergeInto">Merge Into</option>
                <option value="EditFields">Edit Fields</option>
              </select>
            </div>
          </div>

          {local.action.type === 'ComplementaryAdd' && (
            <div>
              <label className="block text-xs text-gray-600 mb-1">Destination Ratios (sum=1.00)</label>
              {(local.action.destination||[]).map((d, idx)=> (
                <div key={idx} className="flex space-x-2 mb-1">
                  <input className="flex-1 border px-2 py-1" placeholder="Destination AccountId" value={d.accountId||''} onChange={e=>setLocal(v=>{const dest=[...(v.action.destination||[])]; dest[idx]={...dest[idx], accountId:e.target.value}; return {...v, action:{...v.action, destination:dest}};})} />
                  <input className="w-28 border px-2 py-1" type="number" min="0" max="1" step="0.01" placeholder="Ratio" value={d.ratio||''} onChange={e=>setLocal(v=>{const dest=[...(v.action.destination||[])]; dest[idx]={...dest[idx], ratio:parseFloat(e.target.value)||0}; return {...v, action:{...v.action, destination:dest}};})} />
                  <button className="text-red-600" onClick={()=>setLocal(v=>({...v, action:{...v.action, destination:(v.action.destination||[]).filter((_,i)=>i!==idx)}}))}>Remove</button>
                </div>
              ))}
              <button className="text-blue-600" onClick={()=>setLocal(v=>({...v, action:{...v.action, destination:[...(v.action.destination||[]), { accountId:'', ratio:0 }]}}))}>+ Add Destination</button>
            </div>
          )}

          {local.action.type === 'EditFields' && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600">Owner</label>
                <input className="w-full border px-2 py-1" value={local.action.fields?.owner||''} onChange={e=>setLocal(v=>({...v, action:{...v.action, fields:{...(v.action.fields||{}), owner:e.target.value}}}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Category</label>
                <input className="w-full border px-2 py-1" value={local.action.fields?.category||''} onChange={e=>setLocal(v=>({...v, action:{...v.action, fields:{...(v.action.fields||{}), category:e.target.value}}}))} />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Zip Code</label>
                <input className="w-full border px-2 py-1" value={local.action.fields?.zipCode||''} onChange={e=>setLocal(v=>({...v, action:{...v.action, fields:{...(v.action.fields||{}), zipCode:e.target.value}}}))} />
              </div>
            </div>
          )}

          {local.action.type === 'MergeInto' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs text-gray-600">Counterpart Account IDs (comma-separated)</label>
                <input className="w-full border px-2 py-1" placeholder="acctId1,acctId2" value={(local.action.merge?.counterpartAccounts||[]).join(',')} onChange={e=>{
                  const list=e.target.value.split(',').map(s=>s.trim()).filter(Boolean);
                  setLocal(v=>({...v, action:{...v.action, merge:{...(v.action.merge||{}), counterpartAccounts:list}}}));
                }} />
              </div>
              <div>
                <label className="block text-xs text-gray-600">Max Days</label>
                <input className="w-full border px-2 py-1" type="number" min="1" max="15" value={local.action.merge?.maxDays||3} onChange={e=>setLocal(v=>({...v, action:{...v.action, merge:{...(v.action.merge||{}), maxDays:parseInt(e.target.value)||3}}}))} />
              </div>
            </div>
          )}

          {!hideApply && (
            <div className="flex items-center space-x-3">
              <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={handleApply} disabled={!canApply || processing}>Apply</button>
              {progress && (
                <span className="text-xs text-blue-700">Processed: {progress.processed} | Matched: {progress.matched} | Modified: {progress.modified}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchReplaceBar;


