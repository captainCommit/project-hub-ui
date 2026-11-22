import React from 'react';
import CsvImportDialog from '@/components/CsvImportDialog';
import { tasksApi } from '@/api/tasks';
import { visibleSheetColumnKeys } from '@/components/projects/TaskSheet';

// Column names match the Sheet view; the older names still work.
const COLUMNS = [
  { key: 'type', label: 'Task Type', aliases: ['Type'], hint: 'A task type from Settings, e.g. Activity' },
  { key: 'name', label: 'Task Name', required: true, aliases: ['Name', 'Task', 'Title'] },
  { key: 'description', label: 'Description' },
  { key: 'status', label: 'Status', hint: 'A task status from Settings, e.g. In Progress' },
  { key: 'priority', label: 'Priority' },
  { key: 'start_date', label: 'Start', aliases: ['Start Date'], hint: 'YYYY-MM-DD' },
  { key: 'finish_date', label: 'End', aliases: ['End Date', 'Finish', 'Finish Date', 'Due Date'], hint: 'YYYY-MM-DD' },
  { key: 'duration_days', label: 'Duration', aliases: ['Duration Days'], hint: 'Days' },
  { key: 'predecessors', label: 'Predecessor #', aliases: ['Predecessor', 'Predecessors'], hint: 'Row numbers in this file (1 is the first task), e.g. 2 or 3FS+2' },
  { key: 'percent_complete', label: '% Completion', aliases: ['% Complete', 'Progress'], hint: '0 to 100' },
  { key: 'assignee', label: 'Assigned To', aliases: ['Assignee', 'Assignee Email'], hint: 'Names as listed in Resources (or emails); several with ;' },
  { key: 'story_points', label: 'Story Points', aliases: ['Points'] },
  { key: 'sprint', label: 'Sprint', hint: "A sprint's name in this project" },
  { key: 'parent', label: 'Parent', aliases: ['Parent Task'], hint: 'Name of an earlier row, or of a task already in the project' },
];

// Sheet columns -> import columns. Related records, comments, attachments and planned resources aren't imported.
const SHEET_TO_IMPORT = {
  status: 'status', start_date: 'start_date', due_date: 'finish_date', duration: 'duration_days',
  predecessors: 'predecessors', progress: 'percent_complete', resources: 'assignee', priority: 'priority',
};

/** The template's columns: Task Type and Task Name, then the sheet's columns as the person has them. */
const templateKeys = () => [
  'type', 'name',
  ...visibleSheetColumnKeys().map(key => SHEET_TO_IMPORT[key]).filter(Boolean),
];

const EXAMPLE_ROWS = [
  { type: 'Phase', name: 'Initiation & Planning', status: 'Not Started', start_date: '2027-01-04', finish_date: '2027-01-15', duration_days: '10', percent_complete: '0', priority: 'High' },
  { type: 'Activity', name: 'Requirements workshop', status: 'Not Started', start_date: '2027-01-04', finish_date: '2027-01-08', duration_days: '5', percent_complete: '0', assignee: 'Grace Kim', priority: 'Medium' },
  { type: 'Milestone', name: 'Plan approved', status: 'Not Started', start_date: '2027-01-15', finish_date: '2027-01-15', duration_days: '0', predecessors: '2', percent_complete: '0' },
];

/** Create many tasks in one project from a CSV. Nothing is created unless every row is valid. */
export default function TaskCsvImport({ open, onOpenChange, projectId, onDone }) {
  const send = (records, dryRun) =>
    /** @type {Promise<any>} */ (tasksApi.importTasks(projectId, { rows: records, dry_run: dryRun }));

  return (
    <CsvImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import tasks from CSV"
      description={(
        <p>
          Tasks are added to the end of the plan. Type, status, priority and sprint match by name; blanks get the defaults.
          Assigned To matches people by the name they have in Resources, so add them there first.
          Predecessor # uses row numbers in the file (1 is the first task). To nest a task, put its parent&apos;s name in Parent.
          Nothing is imported until every row is valid.
        </p>
      )}
      columns={COLUMNS}
      templateKeys={templateKeys()}
      exampleRows={EXAMPLE_ROWS}
      templateFilename="tasks_import_template.csv"
      check={(records) => send(records, true)}
      submit={async (records) => {
        const result = await send(records, false);
        return { message: `${result.created} task${result.created === 1 ? '' : 's'} imported.` };
      }}
      onDone={onDone}
    />
  );
}
