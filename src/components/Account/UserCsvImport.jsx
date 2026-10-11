import React from 'react';
import CsvImportDialog from '@/components/CsvImportDialog';
import { accountsApi } from '@/api/accounts';

const ROLES = ['OWNER', 'MANAGER', 'MEMBER', 'VIEWER'];
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const COLUMNS = [
  { key: 'email', label: 'Email', required: true, aliases: ['Email Address', 'E-mail'] },
  { key: 'full_name', label: 'Full Name', aliases: ['Name'] },
  { key: 'role', label: 'Role', hint: 'Owner, Manager, Member or Viewer. Blank means Member.' },
];

const roleOf = (value) => (value ? value.toUpperCase() : 'MEMBER');

/** Add many people to an account from a CSV. People already in the account keep their role. */
export default function UserCsvImport({ open, onOpenChange, accountId, onDone }) {
  const check = async (records) => {
    const seen = new Map();
    const errors = [];
    records.forEach((r, i) => {
      const problems = [];
      const email = (r.email || '').toLowerCase();
      if (!email) problems.push('Email is required');
      else if (!EMAIL.test(email)) problems.push(`"${r.email}" is not an email address`);
      else if (seen.has(email)) problems.push(`Same email as row ${seen.get(email)}`);
      else seen.set(email, i + 1);
      if (!ROLES.includes(roleOf(r.role))) problems.push(`Unknown role "${r.role}" (use Owner, Manager, Member or Viewer)`);
      if (problems.length) errors.push({ row: i + 1, message: problems.join('; ') });
    });
    return { errors };
  };

  const submit = async (records) => {
    const result = /** @type {any} */ (await accountsApi.bulkInviteUsers(accountId, {
      users: records.map((r) => ({ email: r.email, full_name: r.full_name || null, role: roleOf(r.role) })),
      update_existing: false,
    }));
    const parts = [`${result.created} added`];
    if (result.already_exists) parts.push(`${result.already_exists} already in the account (role unchanged)`);
    if (result.failed) parts.push(`${result.failed} failed`);
    return {
      message: `${parts.join(', ')}.`,
      errors: (result.results || [])
        .map((r, i) => ({ row: i + 1, message: r.error ? `${r.email || 'Row'}: ${r.error}` : null }))
        .filter((e) => e.message),
    };
  };

  return (
    <CsvImportDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Import users from CSV"
      description={<p>New people get an email with a temporary password, like adding them one at a time. Give them project access afterwards with the Access button.</p>}
      columns={COLUMNS}
      exampleRows={[['jane@company.com', 'Jane Doe', 'Member'], ['sam@company.com', 'Sam Lee', 'Viewer']]}
      templateFilename="users_import_template.csv"
      maxRows={500}
      check={check}
      submit={submit}
      onDone={onDone}
    />
  );
}
