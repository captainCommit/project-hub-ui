import React from 'react';
import { Button } from "@/components/ui/button";
import { GanttChart, List, ClipboardCheck, Trello } from "lucide-react";
import { cn } from "@/lib/utils";

const VIEWS = [
  { key: 'sheet', label: 'Sheet', icon: List },
  { key: 'gantt', label: 'Gantt', icon: GanttChart },
  { key: 'mondayboard', label: 'Board', icon: Trello },
  { key: 'audit', label: 'Audit', icon: ClipboardCheck },
];

// Hover: a navy outline (the sidebar's colour) with bolder text. Selected: the sidebar's selection orange
// for text and icon, on a light tint of it.
const BASE = 'rounded-md border border-transparent text-slate-600 transition-colors';
const HOVER = 'hover:bg-transparent hover:border-[#002046] hover:text-[#002046] hover:font-semibold';
const SELECTED = 'bg-[#d97706]/10 text-[#d97706] font-semibold hover:bg-[#d97706]/15 hover:text-[#d97706] hover:border-transparent';

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="flex items-center mb-4" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-1">
        {VIEWS.map(({ key, label, icon: Icon }) => {
          const selected = view === key;
          return (
            <Button
              key={key}
              variant="ghost"
              size="sm"
              aria-pressed={selected}
              className={cn(BASE, selected ? SELECTED : HOVER)}
              onClick={() => onViewChange(key)}
            >
              <Icon className="w-4 h-4 mr-2" /> {label}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
