import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Camera, Save, Loader2 } from 'lucide-react';
import { authApi } from '@/api/auth';

export default function ProfileEditor({ user }) {
  const [form, setForm] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    title: user?.title || '',
    department: user?.department || '',
    company: user?.company || '',
    phone: user?.phone || '',
    photo_url: user?.photo_url || '',
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Refresh from server so saved fields show even if the auth context is stale
  useEffect(() => {
    authApi.getCurrentUser().then(me => {
      if (!me) return;
      setForm({
        first_name: me.first_name || '',
        last_name: me.last_name || '',
        title: me.title || '',
        department: me.department || '',
        company: me.company || '',
        phone: me.phone || '',
        photo_url: me.photo_url || '',
      });
    }).catch(() => {});
  }, []);

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const me = await authApi.uploadPhoto(file);
      setField('photo_url', me.photo_url);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await authApi.updateMe({
        first_name: form.first_name,
        last_name: form.last_name,
        title: form.title,
        department: form.department,
        company: form.company,
        phone: form.phone,
        photo_url: form.photo_url,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const initials = `${(form.first_name || user?.full_name || '?')[0] || ''}${(form.last_name || '')[0] || ''}`.toUpperCase();

  return (
    <div className="bg-white rounded-xl border border-slate-200">
      <div className="px-5 py-3 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Profile</p>
      </div>
      <div className="p-5 space-y-5">
        {/* Photo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            {form.photo_url ? (
              <img src={form.photo_url} alt="Profile" className="w-20 h-20 rounded-full object-cover border border-slate-200" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#002046] text-white flex items-center justify-center text-xl font-semibold">{initials}</div>
            )}
            <label className="absolute bottom-0 right-0 w-7 h-7 bg-[#c87b14] hover:bg-[#a86610] rounded-full flex items-center justify-center cursor-pointer border-2 border-white">
              <Camera className="w-3.5 h-3.5 text-white" />
              <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </label>
          </div>
          <div>
            <p className="text-sm font-medium text-slate-800">Profile Photo</p>
            <p className="text-xs text-slate-500">{uploading ? 'Uploading…' : 'Click the camera icon to upload'}</p>
          </div>
        </div>
        {/* Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">First Name</Label>
            <Input value={form.first_name} onChange={e => setField('first_name', e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Last Name</Label>
            <Input value={form.last_name} onChange={e => setField('last_name', e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Title</Label>
            <Input value={form.title} onChange={e => setField('title', e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Department</Label>
            <Input value={form.department} onChange={e => setField('department', e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Company</Label>
            <Input value={form.company} onChange={e => setField('company', e.target.value)} className="h-9" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-500">Phone</Label>
            <Input value={form.phone} onChange={e => setField('phone', e.target.value)} className="h-9" />
          </div>
        </div>
        <div className="flex items-center gap-3 pt-1">
          <Button size="sm" onClick={handleSave} disabled={saving || uploading} className="bg-[#c87b14] hover:bg-[#a86610] text-white">
            {saving ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            {saving ? 'Saving…' : 'Save'}
          </Button>
          {saved && <span className="text-xs text-emerald-600 font-medium">Saved</span>}
        </div>
      </div>
    </div>
  );
}