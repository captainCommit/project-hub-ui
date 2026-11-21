import { useState } from 'react';
import { X } from 'lucide-react';

/**
 * Chips of people and teams, by name. Suggestions come from the account's resources and their departments;
 * anything else can be typed and added with Enter.
 */
export default function ResourceTeamsInput({ value = [], onChange, resources = [], placeholder = 'Add a resource or team...' }) {
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const options = [...new Set([...resources.map(r => r.full_name), ...resources.map(r => r.department)].filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const query = text.trim().toLowerCase();
  const suggestions = options.filter(o => !value.includes(o) && o.toLowerCase().includes(query)).slice(0, 7);

  const add = (name) => {
    const clean = name.trim();
    setText('');
    if (clean && !value.includes(clean)) onChange([...value, clean]);
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-md border border-slate-200 bg-white px-1.5 py-1 min-h-[32px]">
        {value.map(name => (
          <span key={name} className="inline-flex items-center gap-1 rounded-full bg-[#002046]/10 px-2 py-0.5 text-xs font-medium text-[#002046]">
            {name}
            <button type="button" aria-label={`Remove ${name}`} className="hover:text-red-500" onClick={() => onChange(value.filter(n => n !== name))}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          value={text}
          onChange={e => { setText(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(text); } }}
          placeholder={value.length ? '' : placeholder}
          className="flex-1 min-w-[80px] bg-transparent text-xs outline-none"
        />
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-0.5 rounded border border-slate-200 bg-white shadow-lg">
          {suggestions.map(option => (
            <button key={option} type="button" className="w-full text-left px-3 py-1.5 text-xs hover:bg-slate-50" onMouseDown={() => add(option)}>{option}</button>
          ))}
        </div>
      )}
    </div>
  );
}
