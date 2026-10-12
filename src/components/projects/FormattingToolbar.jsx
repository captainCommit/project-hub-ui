import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
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
  Columns3,
  IndentIncrease,
  IndentDecrease,
  Maximize2,
  Minimize2,
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

const ColorSwatches = ({ value, onChange }) => (
  <div className="grid grid-cols-7 gap-1">
    {colors.map(color => (
      <button
        key={color}
        type="button"
        className={cn(
          "w-5 h-5 rounded border hover:scale-110 transition-transform",
          value === color ? "ring-2 ring-blue-500" : "border-slate-200"
        )}
        style={{ backgroundColor: color }}
        onClick={() => onChange(color)}
      />
    ))}
  </div>
);

/**
 * Sheet toolbar: task actions and the column picker get the primary space;
 * cell formatting lives in the "Formatting" popover.
 */
export default function FormattingToolbar({
  formatting,
  onFormattingChange,
  onIndent,
  onOutdent,
  indentDisabled = false,
  outdentDisabled = false,
  onBulkInsert,
  selectedCell,
  columnOptions = [],
  visibleColumnKeys = [],
  onToggleColumn,
  onResetColumns,
  focusMode = false,
  onToggleFocusMode,
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

  const toggleButton = (active, onClick, Icon, title) => (
    <Button variant={active ? "secondary" : "ghost"} size="sm" className="h-7 w-7 p-0" title={title} onClick={onClick}>
      <Icon className="w-3.5 h-3.5" />
    </Button>
  );

  const hiddenColumnCount = columnOptions.filter(column => !visibleColumnKeys.includes(column.key)).length;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-slate-100 border-b border-slate-300 flex-wrap" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
      {onBulkInsert && (
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onBulkInsert}>
          <Plus className="w-3.5 h-3.5 mr-1" />
          Insert rows
        </Button>
      )}
      <Button variant="ghost" size="sm" className="h-7 px-2" title="Outdent" onClick={onOutdent} disabled={!onOutdent || outdentDisabled || !selectedCell}>
        <IndentDecrease className="w-3.5 h-3.5 mr-1" />
        Outdent
      </Button>
      <Button variant="ghost" size="sm" className="h-7 px-2" title="Indent" onClick={onIndent} disabled={!onIndent || indentDisabled || !selectedCell}>
        <IndentIncrease className="w-3.5 h-3.5 mr-1" />
        Indent
      </Button>

      {columnOptions.length > 0 && (
        <>
          <Separator orientation="vertical" className="h-5 mx-1" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                <Columns3 className="w-3.5 h-3.5" />
                Columns
                {hiddenColumnCount > 0 && <span className="text-[10px] text-slate-500">({hiddenColumnCount} hidden)</span>}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel className="text-xs text-slate-500">Show columns</DropdownMenuLabel>
              {columnOptions.map(column => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumnKeys.includes(column.key)}
                  onCheckedChange={() => onToggleColumn?.(column.key)}
                  onSelect={event => event.preventDefault()}
                  className="text-sm"
                >
                  {column.menuLabel || column.label}
                </DropdownMenuCheckboxItem>
              ))}
              {onResetColumns && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-sm" onSelect={onResetColumns}>Reset to default</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}

      <div className="flex-1" />

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1" disabled={!selectedCell} title={selectedCell ? 'Format the selected cell' : 'Select a cell to format it'}>
            <Type className="w-3.5 h-3.5" />
            Formatting
            <ChevronDown className="w-3 h-3" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={font} onValueChange={(v) => { setFont(v); handleFormatChange('font', v); }}>
              <SelectTrigger className="h-7 flex-1 text-xs bg-white">
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
            <Select value={fontSize} onValueChange={(v) => { setFontSize(v); handleFormatChange('fontSize', v); }}>
              <SelectTrigger className="h-7 w-16 text-xs bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fontSizes.map(size => (
                  <SelectItem key={size} value={size}>{size}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            {toggleButton(isBold, () => { setIsBold(!isBold); handleFormatChange('bold', !isBold); }, Bold, 'Bold')}
            {toggleButton(isItalic, () => { setIsItalic(!isItalic); handleFormatChange('italic', !isItalic); }, Italic, 'Italic')}
            {toggleButton(isUnderline, () => { setIsUnderline(!isUnderline); handleFormatChange('underline', !isUnderline); }, Underline, 'Underline')}
            {toggleButton(isStrikethrough, () => { setIsStrikethrough(!isStrikethrough); handleFormatChange('strikethrough', !isStrikethrough); }, Strikethrough, 'Strikethrough')}
            <Separator orientation="vertical" className="h-5 mx-1" />
            {toggleButton(textAlign === 'left', () => { setTextAlign('left'); handleFormatChange('textAlign', 'left'); }, AlignLeft, 'Align left')}
            {toggleButton(textAlign === 'center', () => { setTextAlign('center'); handleFormatChange('textAlign', 'center'); }, AlignCenter, 'Align center')}
            {toggleButton(textAlign === 'right', () => { setTextAlign('right'); handleFormatChange('textAlign', 'right'); }, AlignRight, 'Align right')}
          </div>

          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5"><Paintbrush className="w-3 h-3" /> Fill</p>
            <ColorSwatches value={bgColor} onChange={(c) => { setBgColor(c); handleFormatChange('bgColor', c); }} />
          </div>
          <div>
            <p className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1.5"><Type className="w-3 h-3" /> Text color</p>
            <ColorSwatches value={fontColor} onChange={(c) => { setFontColor(c); handleFormatChange('fontColor', c); }} />
          </div>
        </PopoverContent>
      </Popover>

      {onToggleFocusMode && (
        <Button variant={focusMode ? "secondary" : "ghost"} size="sm" className="h-7 px-2 gap-1" onClick={onToggleFocusMode}
          title={focusMode ? 'Exit focus mode (Esc)' : 'Hide the sidebar and project header'}>
          {focusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          {focusMode ? 'Exit focus' : 'Focus mode'}
        </Button>
      )}
    </div>
  );
}
