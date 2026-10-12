import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Bookmark, BookmarkPlus, Trash2, ChevronDown } from "lucide-react";

export default function SavedFilterView({ storageKey, currentFilters, onLoadFilters }) {
  const [views, setViews] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });
  const [open, setOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    const close = (e) => { if (!e.target.closest('[data-sfv]')) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const saveView = () => {
    if (!saveName.trim()) return;
    const newViews = [...views, { name: saveName.trim(), filters: currentFilters }];
    setViews(newViews);
    localStorage.setItem(storageKey, JSON.stringify(newViews));
    setSaveName(''); setSaving(false);
  };

  const removeView = (idx, e) => {
    e.stopPropagation();
    const newViews = views.filter((_, i) => i !== idx);
    setViews(newViews);
    localStorage.setItem(storageKey, JSON.stringify(newViews));
  };

  return (
    <div className="relative" data-sfv>
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-slate-200 bg-white text-xs text-slate-600 hover:bg-slate-50 transition-colors h-7">
        <Bookmark className="w-3.5 h-3.5 text-[#c87b14]" />
        Views {views.length > 0 && <span className="bg-[#002046] text-white rounded-full px-1.5 text-[10px]">{views.length}</span>}
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-30 p-2" data-sfv>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide px-1 mb-1.5">Saved Views</p>
          {views.length === 0 && <p className="text-xs text-slate-400 px-1 py-1 italic">No saved views yet.</p>}
          {views.map((v, i) => (
            <div key={i} className="flex items-center gap-1 group rounded hover:bg-slate-50">
              <button onClick={() => { onLoadFilters(v.filters); setOpen(false); }}
                className="flex-1 text-left px-2 py-1.5 text-xs text-slate-700 truncate">
                {v.name}
              </button>
              <button onClick={(e) => removeView(i, e)} className="opacity-0 group-hover:opacity-100 p-1 text-red-400 hover:text-red-600">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <div className="border-t mt-1.5 pt-1.5">
            {saving ? (
              <div className="flex gap-1">
                <Input value={saveName} onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveView(); if (e.key === 'Escape') { setSaving(false); setSaveName(''); } }}
                  placeholder="View name..." className="h-6 text-xs flex-1" autoFocus />
                <button onClick={saveView} className="px-2 py-1 bg-[#002046] text-white text-xs rounded hover:bg-[#003070]">Save</button>
              </div>
            ) : (
              <button onClick={() => setSaving(true)} className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#002046] hover:bg-slate-50 rounded w-full">
                <BookmarkPlus className="w-3.5 h-3.5" /> Save current filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}