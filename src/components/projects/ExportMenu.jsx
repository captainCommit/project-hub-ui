import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileSpreadsheet, Presentation, Loader2 } from "lucide-react";

export default function ExportMenu({ tasks, project, viewType = 'sheet' }) {
  const [exporting, setExporting] = useState(false);

  const exportToExcel = () => {
    setExporting(true);
    
    // Create CSV content
    const headers = ['Row', 'Task Type', 'Task Name', 'Duration', 'Start', 'Finish', 'Predecessors', 'Status', 'Resources', '% Complete'];
    const rows = tasks.map((task, index) => [
      index + 1,
      task.task_type || 'activity',
      task.title,
      task.duration || 1,
      task.start_date || '',
      task.due_date || '',
      (task.predecessors || []).map((_, i) => i + 1).join(', '),
      task.status || 'todo',
      (task.resources || []).join(', '),
      task.progress || 0
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project?.name || 'project'}_${viewType}.csv`;
    link.click();
    
    setExporting(false);
  };

  const exportToPPT = async () => {
    setExporting(true);
    
    // Create HTML table for PowerPoint (simple approach)
    const tableHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; }
            h1 { color: #4f46e5; }
            table { border-collapse: collapse; width: 100%; margin-top: 20px; }
            th { background: #4f46e5; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #e2e8f0; padding: 8px; }
            tr:nth-child(even) { background: #f8fafc; }
            .milestone { color: #7c3aed; font-weight: bold; }
            .phase { color: #0891b2; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>${project?.name || 'Project Schedule'}</h1>
          <p>Exported on ${new Date().toLocaleDateString()}</p>
          <table>
            <tr>
              <th>#</th>
              <th>Type</th>
              <th>Task</th>
              <th>Duration</th>
              <th>Start</th>
              <th>Finish</th>
              <th>Status</th>
              <th>Resources</th>
              <th>Progress</th>
            </tr>
            ${tasks.map((task, i) => `
              <tr>
                <td>${i + 1}</td>
                <td class="${task.task_type}">${task.task_type || 'activity'}</td>
                <td style="padding-left: ${(task.indent_level || 0) * 20}px">${task.title}</td>
                <td>${task.duration || 1}d</td>
                <td>${task.start_date || '-'}</td>
                <td>${task.due_date || '-'}</td>
                <td>${task.status || 'todo'}</td>
                <td>${(task.resources || []).join(', ')}</td>
                <td>${task.progress || 0}%</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-powerpoint' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${project?.name || 'project'}_${viewType}.ppt`;
    link.click();
    
    setExporting(false);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={exporting}>
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportToExcel}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export to Excel (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportToPPT}>
          <Presentation className="w-4 h-4 mr-2" />
          Export to PowerPoint
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}