import React, { useEffect, useMemo, useRef, useState } from 'react';

const indentName = (name, level) => `${'\u00A0'.repeat(level * 2)}${name}`; // non-breaking spaces for indentation

const AccountsMultiSelect = ({ accounts = [], value = [], onChange }) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const flat = useMemo(() => {
    // Build parent->children map and DFS to ensure parents immediately precede their children
    const idToNode = new Map();
    const childrenMap = new Map();
    accounts.forEach(a => {
      idToNode.set(a._id, { ...a });
      const p = a.parent ? (typeof a.parent === 'object' ? a.parent._id || a.parent : a.parent) : null;
      if (!childrenMap.has(p)) childrenMap.set(p, []);
      childrenMap.get(p).push(a._id);
    });
    // Sort siblings by name for stable order
    childrenMap.forEach(list => list.sort((l, r) => {
      const ln = idToNode.get(l)?.name || ''; const rn = idToNode.get(r)?.name || '';
      return ln.localeCompare(rn);
    }));

    const result = [];
    const visit = (id, depth) => {
      const node = idToNode.get(id);
      if (!node) return;
      result.push({ _id: node._id, name: node.name, type: node.type, depth });
      const kids = childrenMap.get(id) || [];
      kids.forEach(kidId => visit(kidId, depth + 1));
    };
    // Roots are those with parent null/undefined or parent not present in the filtered set
    const allIds = new Set(accounts.map(a => a._id));
    const rootIds = accounts
      .filter(a => {
        const p = a.parent ? (typeof a.parent === 'object' ? a.parent._id || a.parent : a.parent) : null;
        return !p || !allIds.has(p);
      })
      .map(a => a._id)
      .sort((l, r) => {
        const ln = idToNode.get(l)?.name || ''; const rn = idToNode.get(r)?.name || '';
        return ln.localeCompare(rn);
      });
    rootIds.forEach(rootId => visit(rootId, 0));
    return result;
  }, [accounts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return flat;
    return flat.filter(a => a.name.toLowerCase().includes(q));
  }, [flat, query]);

  const toggle = (id) => {
    if (!onChange) return;
    const set = new Set(value);
    if (set.has(id)) set.delete(id); else set.add(id);
    onChange(Array.from(set));
  };

  const removeChip = (id) => {
    if (!onChange) return;
    onChange(value.filter(v => v !== id));
  };

  const containerRef = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex flex-wrap gap-1 border px-2 py-1 rounded">
        {value.map(id => {
          const acc = accounts.find(a => a._id === id);
          return (
            <span key={id} className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded flex items-center">
              {acc ? acc.name : id}
              <button className="ml-1 text-gray-600" onClick={e => { e.stopPropagation(); removeChip(id); }}>&times;</button>
            </span>
          );
        })}
        <input
          className="flex-1 outline-none text-sm"
          placeholder="Filter accounts..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
        />
        <button type="button" className="text-gray-600 text-sm ml-1" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); setOpen(o=>!o); }}>
          ▼
        </button>
      </div>
      {open && (
        <div className="absolute z-10 bg-white border rounded mt-1 max-h-60 overflow-auto w-full">
          {filtered.map(acc => (
            <div key={acc._id} className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => toggle(acc._id)}>
              <span>{indentName(acc.name, acc.depth || 0)} <span className="text-gray-400">({acc.type})</span></span>
              {value.includes(acc._id) && <span className="float-right text-blue-600">✓</span>}
            </div>
          ))}
          {filtered.length === 0 && <div className="px-2 py-2 text-sm text-gray-500">No accounts</div>}
        </div>
      )}
    </div>
  );
};

export default AccountsMultiSelect;


