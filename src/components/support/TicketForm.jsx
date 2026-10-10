import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Loader2, Send } from 'lucide-react';
import { attachmentsApi } from '@/api/attachments';
import { supportTicketsApi } from '@/api/collaboration';
import { useAuth } from '@/lib/AuthContext';

const CATEGORIES = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'technical', label: 'Technical Issue' },
  { value: 'billing', label: 'Billing & Plans' },
  { value: 'bug', label: 'Report a Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'account', label: 'Account Access' },
];

export default function TicketForm({ onSubmitted, onCancel }) {
  const [form, setForm] = useState({ category: 'general', subject: '', description: '', priority: 'medium', name: '', email: '' });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { user, selectedAccountId } = useAuth();

  useEffect(() => {
    if (user) setForm(f => ({ ...f, name: f.name || user.full_name || '', email: f.email || user.email || '' }));
  }, [user]);

  // Files are uploaded once the ticket exists (attachments belong to a ticket).
  const handleFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setAttachments(a => [...a, ...files.map(file => ({ name: file.name, file }))]);
    e.target.value = '';
  };

  const removeAttachment = (idx) => setAttachments(a => a.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!form.description.trim() || !form.name.trim() || !form.email.trim()) {
      setError('Please fill in the category, issue description, your name, and email.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const created = await supportTicketsApi.create(selectedAccountId, {
        ...form,
        requester_name: form.name,
        requester_email: form.email,
      });
      if (attachments.length) {
        setUploading(true);
        try {
          await Promise.all(attachments.map(a => attachmentsApi.upload('SUPPORT_TICKET', created.id, a.file)));
        } catch (err) {
          setError('Ticket created, but a file could not be uploaded: ' + err.message);
        } finally {
          setUploading(false);
        }
      }
      onSubmitted?.(created);
    } catch (err) {
      setError('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Submit a Support Ticket</h2>
          <p className="text-xs text-slate-400 mt-0.5">Tell us what's going on and we'll get back to you</p>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} className="text-slate-500"><X className="w-4 h-4" /> Cancel</Button>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Category</Label>
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Priority</Label>
            <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Subject</Label>
          <Input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Brief summary of your issue" className="h-9 text-sm" />
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Describe your issue</Label>
          <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Provide as much detail as possible — steps to reproduce, expected vs actual, etc." rows={5} />
        </div>

        <div>
          <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Attachments</Label>
          <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 rounded-lg cursor-pointer hover:bg-slate-50 text-sm text-slate-500">
            <Upload className="w-4 h-4" />
            {uploading ? 'Uploading…' : 'Click to upload files'}
            <input type="file" multiple className="hidden" onChange={handleFile} />
          </label>
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {attachments.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 rounded-full px-2.5 py-1">
                  {a.name}
                  <button onClick={() => removeAttachment(i)} className="text-slate-400 hover:text-red-500"><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Your Name</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="h-9 text-sm" placeholder="Full name" />
          </div>
          <div>
            <Label className="text-xs font-medium text-slate-600 mb-1.5 block">Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="h-9 text-sm" placeholder="you@company.com" />
          </div>
        </div>

        {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onCancel} className="h-9">Cancel</Button>
          <Button onClick={submit} disabled={submitting} className="h-9 bg-[#002046] hover:bg-[#001634] text-white">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Send className="w-4 h-4 mr-1.5" />}
            Submit Request
          </Button>
        </div>
      </div>
    </div>
  );
}