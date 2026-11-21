import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, X, Loader2, Send, Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
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

// Dialling codes offered for the call-back number.
const COUNTRY_CODES = [
  { value: 'US+1', label: 'US +1', code: '+1' },
  { value: 'CA+1', label: 'CA +1', code: '+1' },
  { value: 'UK+44', label: 'UK +44', code: '+44' },
  { value: 'IE+353', label: 'IE +353', code: '+353' },
  { value: 'AU+61', label: 'AU +61', code: '+61' },
  { value: 'IN+91', label: 'IN +91', code: '+91' },
  { value: 'DE+49', label: 'DE +49', code: '+49' },
  { value: 'FR+33', label: 'FR +33', code: '+33' },
];

export default function TicketForm({ onSubmitted, onCancel }) {
  const [form, setForm] = useState({ category: 'general', subject: '', description: '', priority: 'medium', name: '', email: '', phone_call_ok: false, country: 'US+1', phone: '' });
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
      const dialCode = COUNTRY_CODES.find(c => c.value === form.country)?.code || '';
      const created = await supportTicketsApi.create(selectedAccountId, {
        ...form,
        requester_name: form.name,
        requester_email: form.email,
        phone_number: form.phone.trim() ? `${dialCode} ${form.phone.trim()}` : '',
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

        <div className="border-t border-slate-100 pt-4">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <Checkbox checked={form.phone_call_ok} onCheckedChange={v => setForm(f => ({ ...f, phone_call_ok: v === true }))} />
            <span className="text-sm font-semibold text-[#002046]">I'm open to a phone call if needed.</span>
            <span title="Some issues are quicker to sort out on a call. We'll only call if it would help." className="text-slate-400"><Info className="w-4 h-4" /></span>
          </label>
          {form.phone_call_ok && (
            <div className="mt-3 ml-7 space-y-1.5">
              <Label className="text-xs font-medium text-slate-600 block">Preferred phone number (optional)</Label>
              <div className="flex gap-2">
                <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                  <SelectTrigger className="h-9 w-[120px] text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>{COUNTRY_CODES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
                <Input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" className="h-9 text-sm flex-1" maxLength={30} />
              </div>
              <p className="text-xs text-slate-500">Our support team may contact you if a call would help resolve your issue.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
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