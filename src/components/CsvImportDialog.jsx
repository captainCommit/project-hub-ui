import React, { useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle2, Download, FileUp, Loader2 } from 'lucide-react';
import { readCsvRecords } from '@/lib/csv';
import { downloadCSV } from '@/lib/exportUtils';
import { cn } from '@/lib/utils';

const PREVIEW_ROWS = 50;

/**
 * Upload a CSV, check it, preview it with problems flagged, then import it.
 * columns: [{ key, label, required?, aliases?, hint? }]; exampleRows: arrays in column order, for the template.
 * check(records) -> Promise<{ errors: { row, message }[] }> (row is 1-based, header not counted).
 * submit(records) -> Promise<{ message, errors? }>; errors here are shown on the result screen.
 */
export default function CsvImportDialog({
  open, onOpenChange, title, description, columns, exampleRows = [], templateFilename, maxRows = 1000, check, submit, onDone,
}) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [errors, setErrors] = useState([]);
  const [notes, setNotes] = useState([]);
  const [stage, setStage] = useState('pick'); // pick | checking | review | importing | done
  const [result, setResult] = useState(null);

  const reset = () => {
    setFile(null); setRecords([]); setErrors([]); setNotes([]); setResult(null); setStage('pick');
    if (inputRef.current) inputRef.current.value = '';
  };
  const close = (next) => { if (!next) reset(); onOpenChange(next); };
  const fail = (message) => { setErrors([{ row: 0, message }]); setStage('review'); };

  const pickFile = async (picked) => {
    if (!picked) return;
    setFile(picked);
    setStage('checking');
    setResult(null);
    try {
      const { records: parsed, unknownHeaders, missing } = readCsvRecords(await picked.text(), columns);
      setRecords(parsed);
      setNotes(unknownHeaders.length ? [`Ignored columns: ${unknownHeaders.join(', ')}`] : []);
      if (missing.length) return fail(`Missing required column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}`);
      if (!parsed.length) return fail('The file has no rows under the header.');
      if (parsed.length > maxRows) return fail(`The file has ${parsed.length} rows; the limit is ${maxRows} per import.`);
      const checked = await check(parsed);
      setErrors(checked.errors || []);
      setStage('review');
    } catch (e) {
      fail(e?.message || 'Could not read that file.');
    }
  };

  const runImport = async () => {
    setStage('importing');
    try {
      const outcome = await submit(records);
      setResult(outcome);
      setStage('done');
      onDone?.();
    } catch (e) {
      fail(e?.message || 'The import failed.');
    }
  };

  const errorRows = new Set(errors.map((e) => e.row));
  const fileError = errors.find((e) => e.row === 0);
  const visibleColumns = columns.filter((c) => records.some((r) => r[c.key]));
  const template = () => downloadCSV([columns.map((c) => c.label), ...exampleRows], templateFilename);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl" style={{ fontFamily: 'Segoe UI, sans-serif' }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-[#002046]">
            <FileUp className="w-5 h-5 text-[#c87b14]" /> {title}
          </DialogTitle>
        </DialogHeader>

        {stage === 'done' ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm text-emerald-700 font-medium">
              <CheckCircle2 className="w-4 h-4" /> {result?.message}
            </p>
            {result?.errors?.length > 0 && <ErrorList errors={result.errors} />}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={reset}>Import another file</Button>
              <Button size="sm" onClick={() => close(false)} className="bg-[#c87b14] hover:bg-[#a86610] text-white">Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 space-y-2">
              {description}
              <p>
                Columns: {columns.map((c, i) => (
                  <span key={c.key}>
                    {i > 0 && ', '}
                    <span className={c.required ? 'font-semibold text-slate-700' : ''} title={c.hint}>{c.label}</span>
                  </span>
                ))}. Bold ones are required. Up to {maxRows} rows.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
              <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()} disabled={stage === 'checking' || stage === 'importing'}>
                <FileUp className="w-3.5 h-3.5 mr-1.5" /> {file ? 'Choose another file' : 'Choose CSV file'}
              </Button>
              <Button size="sm" variant="ghost" onClick={template} className="text-slate-500">
                <Download className="w-3.5 h-3.5 mr-1.5" /> Download template
              </Button>
              {file && <span className="text-xs text-slate-500 truncate max-w-[16rem]">{file.name}</span>}
            </div>

            {stage === 'checking' && (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="w-4 h-4 animate-spin" /> Checking rows…</p>
            )}

            {(stage === 'review' || stage === 'importing') && (
              <>
                {notes.map((n) => <p key={n} className="text-xs text-slate-400">{n}</p>)}
                {fileError ? (
                  <ErrorList errors={[fileError]} />
                ) : (
                  <>
                    <p className={cn('text-sm font-medium', errors.length ? 'text-red-600' : 'text-emerald-700')}>
                      {errors.length
                        ? `${errors.length} of ${records.length} rows need fixing. Fix them in the file and choose it again.`
                        : `All ${records.length} rows look good.`}
                    </p>
                    {errors.length > 0 && <ErrorList errors={errors} />}
                    <div className="max-h-64 overflow-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-50 sticky top-0">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-slate-400 font-medium">#</th>
                            {visibleColumns.map((c) => <th key={c.key} className="px-2 py-1.5 text-left text-slate-500 font-medium whitespace-nowrap">{c.label}</th>)}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {records.slice(0, PREVIEW_ROWS).map((r, i) => (
                            <tr key={i} className={errorRows.has(i + 1) ? 'bg-red-50' : ''}>
                              <td className="px-2 py-1 text-slate-400">{i + 1}</td>
                              {visibleColumns.map((c) => <td key={c.key} className="px-2 py-1 text-slate-700 max-w-[14rem] truncate">{r[c.key]}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {records.length > PREVIEW_ROWS && <p className="text-xs text-slate-400">Showing the first {PREVIEW_ROWS} rows.</p>}
                  </>
                )}
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => close(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    disabled={errors.length > 0 || stage === 'importing'}
                    onClick={runImport}
                    className="bg-[#c87b14] hover:bg-[#a86610] text-white"
                  >
                    {stage === 'importing' ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : null}
                    Import {records.length} row{records.length === 1 ? '' : 's'}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ErrorList({ errors }) {
  return (
    <ul className="max-h-40 overflow-y-auto rounded-lg border border-red-100 bg-red-50/60 p-2 space-y-1">
      {errors.map((e, i) => (
        <li key={i} className="flex gap-1.5 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{e.row > 0 && <span className="font-semibold">Row {e.row}: </span>}{e.message}</span>
        </li>
      ))}
    </ul>
  );
}
