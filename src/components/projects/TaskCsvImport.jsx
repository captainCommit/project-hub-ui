import React from 'react';
import CsvImportDialog from '@/components/CsvImportDialog';
import { tasksApi } from '@/api/tasks';

const COLUMNS = [
  { key: 'name', label: 'Name', required: true, aliases: ['Task Name', 'Task', 'Title'] },
  { key: 'description', label: 'Description' },
  { key: 'type', label: 'Type', aliases: ['Task Type'], hint: 'A task type from Settings, e.g. Activity' },
  { key: 'status', label: 'Status', hint: 'A task status from Settings, e.g. In Progress' },
  { key: 'priority', label: 'Priority' },
  { key: 'start_date', label: 'Start Date', aliases: ['Start'], hint: 'YYYY-MM-DD' },
  { key: 'finish_date', label: 'Finish Date', aliases: ['Finish', 'Due Date', 'End Date', 'End'], hint: 'YYYY-MM-DD' },
  { key: 'duration_days', label: 'Duration', aliases: ['Duration Days'], hint: 'Days' },
  { key: 'story_points', label: 'Story Points', aliases: ['Points'] },
  { key: 'percent_complete', label: '% Complete', aliases: ['Progress'], hint: '0 to 100' },
  { key: 'assignee', label: 'Assignee', aliases: ['Assignee Email', 'Assigned To'], hint: 'Email of an account member' },
  { key: 'sprint', label: 'Sprint', hint: "A sprint's name in this project" },
  { key: 'parent', label: 'Parent', aliases: ['Parent Task'], hint: 'Name of an earlier row, or of a task already in the project' },
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
          To nest a task, put its parent's name in Parent. The parent can be an earlier row or a task already in the project.
          Nothing is imported until every row is valid.
        </p>
      )}
      columns={COLUMNS}
      exampleRows={[
        ['Design phase', '', 'Work Package', 'Not Started', '', '2026-11-02', '2026-11-20', '15', '', '0', '', '', ''],
        ['Wireframes', 'Key screens', 'Activity', 'In Progress', 'High', '2026-11-02', '2026-11-06', '5', '3', '20', 'jane@company.com', '', 'Design phase'],
        ['Design sign-off', '', 'Milestone', '', '', '2026-11-20', '2026-11-20', '0', '', '', '', '', 'Design phase'],
      ]}
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
