import React from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Layers, ChevronDown, Folder, FolderTree, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

const viewModes = [
  { 
    value: 'project', 
    label: 'Project View', 
    icon: Folder,
    description: 'Single project schedule'
  },
  { 
    value: 'program', 
    label: 'Program View', 
    icon: FolderTree,
    description: 'Multiple related projects'
  },
  { 
    value: 'portfolio', 
    label: 'Portfolio View', 
    icon: Building2,
    description: 'All projects and programs'
  }
];

export default function ViewModeSelector({ viewMode, onViewModeChange }) {
  const currentMode = viewModes.find(m => m.value === viewMode) || viewModes[0];
  const CurrentIcon = currentMode.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <CurrentIcon className="w-4 h-4" />
          {currentMode.label}
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <Layers className="w-4 h-4" />
          View Mode
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {viewModes.map(mode => {
          const Icon = mode.icon;
          return (
            <DropdownMenuItem 
              key={mode.value}
              onClick={() => onViewModeChange(mode.value)}
              className={cn(
                "flex flex-col items-start py-2",
                viewMode === mode.value && "bg-indigo-50"
              )}
            >
              <div className="flex items-center gap-2 font-medium">
                <Icon className={cn(
                  "w-4 h-4",
                  viewMode === mode.value ? "text-indigo-600" : "text-slate-500"
                )} />
                {mode.label}
              </div>
              <span className="text-xs text-slate-500 ml-6">{mode.description}</span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}