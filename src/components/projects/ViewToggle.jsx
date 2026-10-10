import React from 'react';
import { Button } from "@/components/ui/button";
import { LayoutGrid, GanttChart, List, ClipboardCheck, Trello } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ViewToggle({ view, onViewChange }) {
  return (
    <div className="flex items-center mb-4" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      <div className="flex items-center bg-slate-100 rounded-lg p-1">
        <Button variant="ghost" size="sm" className={cn("rounded-md", view === 'sheet' && "bg-white shadow-sm")} onClick={() => onViewChange('sheet')}>
          <List className="w-4 h-4 mr-2" /> Sheet
        </Button>
        <Button variant="ghost" size="sm" className={cn("rounded-md", view === 'gantt' && "bg-white shadow-sm")} onClick={() => onViewChange('gantt')}>
          <GanttChart className="w-4 h-4 mr-2" /> Gantt
        </Button>
        <Button variant="ghost" size="sm" className={cn("rounded-md", view === 'mondayboard' && "bg-white shadow-sm")} onClick={() => onViewChange('mondayboard')}>
          <Trello className="w-4 h-4 mr-2" /> Board
        </Button>
        <Button variant="ghost" size="sm" className={cn("rounded-md", view === 'board' && "bg-white shadow-sm")} onClick={() => onViewChange('board')}>
          <LayoutGrid className="w-4 h-4 mr-2" /> Cards
        </Button>
        <Button variant="ghost" size="sm" className={cn("rounded-md", view === 'audit' && "bg-white shadow-sm")} onClick={() => onViewChange('audit')}>
          <ClipboardCheck className="w-4 h-4 mr-2" /> Audit
        </Button>
      </div>
    </div>
  );
}