import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Save, 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Paintbrush,
  Type,
  ChevronDown,
  SlidersHorizontal,
  IndentIncrease,
  IndentDecrease,
  Plus,

} from "lucide-react";
import { cn } from "@/lib/utils";

const fontOptions = [
  { value: 'Segoe UI', label: 'Segoe UI' },
  { value: 'Arial', label: 'Arial' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Helvetica', label: 'Helvetica' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Courier New', label: 'Courier New' }
];

const fontSizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '36'];

const colors = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#efefef', '#ffffff',
  '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff', '#0000ff', '#9900ff',
  '#ff00ff', '#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3',
  '#d9d2e9', '#ead1dc'
];

const conditionalRules = [
  { value: 'greater_than', label: 'Greater than value' },
  { value: 'less_than', label: 'Less than value' },
  { value: 'equals', label: 'Equals value' },
  { value: 'contains', label: 'Text contains' },
  { value: 'overdue', label: 'Overdue tasks' },
  { value: 'complete', label: 'Complete (100%)' }
];

export default function FormattingToolbar({ 
  onSave,
  formatting,
  onFormattingChange,
  isSaving = false,
  onIndent,
  onOutdent,
  onBulkInsert,
  selectedCell,
  onExport,
  tasks,
  project
}) {
  const [font, setFont] = useState(formatting?.font || 'Segoe UI');
  const [fontSize, setFontSize] = useState(formatting?.fontSize || '11');
  const [isBold, setIsBold] = useState(formatting?.bold || false);
  const [isItalic, setIsItalic] = useState(formatting?.italic || false);
  const [isUnderline, setIsUnderline] = useState(formatting?.underline || false);
  const [isStrikethrough, setIsStrikethrough] = useState(formatting?.strikethrough || false);
  const [textAlign, setTextAlign] = useState(formatting?.textAlign || 'left');
  const [bgColor, setBgColor] = useState(formatting?.bgColor || '#ffffff');
  const [fontColor, setFontColor] = useState(formatting?.fontColor || '#000000');

  const handleFormatChange = (key, value) => {
    const newFormatting = { ...formatting, [key]: value };
    onFormattingChange?.(newFormatting);
  };

  const handleExportCSV = () => {
    if (!tasks || tasks.length === 0) return;
    const headers = ['Title', 'Type', 'Status', 'Start Date', 'Due Date', 'Progress', 'Resources'];
    const rows = tasks.map(t => [
      t.title,
      t.task_type,
      t.status,
      t.start_date || '',
      t.due_date || '',
      t.progress || 0,
      (t.resources || []).join('; ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project?.name || 'tasks'}_export.csv`;
    a.click();
  };

  const ColorPicker = ({ value, onChange, label }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
          {label === 'bg' ? (
            <Paintbrush className="w-3.5 h-3.5" />
          ) : (
            <Type className="w-3.5 h-3.5" />
          )}
          <div 
            className="w-3 h-3 rounded border border-slate-300" 
            style={{ backgroundColor: value }}
          />
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="p-2">
        <div className="grid grid-cols-7 gap-1">
          {colors.map(color => (
            <button
              key={color}
              className={cn(
                "w-5 h-5 rounded border hover:scale-110 transition-transform",
                value === color ? "ring-2 ring-blue-500" : "border-slate-200"
              )}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 border-b border-slate-300 flex-wrap" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {/* Save */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 px-2"
        onClick={onSave}
        disabled={isSaving}
      >
        <Save className="w-3.5 h-3.5 mr-1" />
        Save
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Font Family */}
      <Select value={font} onValueChange={(v) => { setFont(v); handleFormatChange('font', v); }}>
        <SelectTrigger className="h-7 w-28 text-xs bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontOptions.map(f => (
            <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Font Size */}
      <Select value={fontSize} onValueChange={(v) => { setFontSize(v); handleFormatChange('fontSize', v); }}>
        <SelectTrigger className="h-7 w-14 text-xs bg-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map(size => (
            <SelectItem key={size} value={size}>{size}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Text Formatting */}
      <Button 
        variant={isBold ? "secondary" : "ghost"} 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={() => { setIsBold(!isBold); handleFormatChange('bold', !isBold); }}
      >
        <Bold className="w-3.5 h-3.5" />
      </Button>
      <Button 
        variant={isItalic ? "secondary" : "ghost"} 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={() => { setIsItalic(!isItalic); handleFormatChange('italic', !isItalic); }}
      >
        <Italic className="w-3.5 h-3.5" />
      </Button>
      <Button 
        variant={isUnderline ? "secondary" : "ghost"} 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={() => { setIsUnderline(!isUnderline); handleFormatChange('underline', !isUnderline); }}
      >
        <Underline className="w-3.5 h-3.5" />
      </Button>
      <Button 
        variant={isStrikethrough ? "secondary" : "ghost"} 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={() => { setIsStrikethrough(!isStrikethrough); handleFormatChange('strikethrough', !isStrikethrough); }}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Colors */}
      <ColorPicker 
        value={bgColor} 
        onChange={(c) => { setBgColor(c); handleFormatChange('bgColor', c); }}
        label="bg"
      />
      <ColorPicker 
        value={fontColor} 
        onChange={(c) => { setFontColor(c); handleFormatChange('fontColor', c); }}
        label="font"
      />

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Alignment */}
      <Button 
        variant={textAlign === 'left' ? "secondary" : "ghost"} 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={() => { setTextAlign('left'); handleFormatChange('textAlign', 'left'); }}
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </Button>
      <Button 
        variant={textAlign === 'center' ? "secondary" : "ghost"} 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={() => { setTextAlign('center'); handleFormatChange('textAlign', 'center'); }}
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </Button>
      <Button 
        variant={textAlign === 'right' ? "secondary" : "ghost"} 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={() => { setTextAlign('right'); handleFormatChange('textAlign', 'right'); }}
      >
        <AlignRight className="w-3.5 h-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Indent/Outdent */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={onOutdent}
        disabled={!selectedCell}
      >
        <IndentDecrease className="w-3.5 h-3.5" />
      </Button>
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 w-7 p-0"
        onClick={onIndent}
        disabled={!selectedCell}
      >
        <IndentIncrease className="w-3.5 h-3.5" />
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Bulk Insert */}
      <Button 
        variant="ghost" 
        size="sm" 
        className="h-7 px-2"
        onClick={onBulkInsert}
      >
        <Plus className="w-3.5 h-3.5 mr-1" />
        Insert
      </Button>

      <Separator orientation="vertical" className="h-5 mx-1" />

      {/* Conditional Formatting */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Conditional</span>
            <ChevronDown className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {conditionalRules.map(rule => (
            <DropdownMenuItem key={rule.value}>
              {rule.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem>Clear rules</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

    </div>
  );
}