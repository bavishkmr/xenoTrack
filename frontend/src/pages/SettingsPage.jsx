import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { settingsService } from '../services';
import { BsSave } from 'react-icons/bs';

export default function SettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institute, setInstitute] = useState({ name: '', address: '', phone: '', email: '', timezone: 'Asia/Kolkata', currency: 'INR' });
  const [settings, setSettings] = useState({ receipt_prefix: 'REC', member_code_prefix: 'MEM', staff_code_prefix: 'STF', attendance_edit_window_hours: '24' });

  useEffect(() => {
    settingsService.get()
      .then(r => {
        const d = r.data.data;
        setData(d);
        if (d.institute) setInstitute(i => ({ ...i, ...d.institute }));
        if (d.settings) {
          const parsed = {};
          (d.settings || []).forEach(s => { parsed[s.setting_key] = s.setting_value; });
          setSettings(s => ({ ...s, ...parsed }));
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async e => {
    e.preventDefault(); setSaving(true);
    try {
      await settingsService.update({ institute, settings });
      toast.success('Settings saved successfully!');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-overlay"><div className="spinner" /></div>;

  return (
    <div>
      <form onSubmit={handleSave}>
        {/* Institute Info */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">Institute Information</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2">
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Institute Name <span className="required">*</span></label>
                <input className="form-control" value={institute.name} onChange={e => setInstitute(i => ({ ...i, name: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input className="form-control" value={institute.phone || ''} onChange={e => setInstitute(i => ({ ...i, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-control" value={institute.email || ''} onChange={e => setInstitute(i => ({ ...i, email: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Address</label>
                <textarea className="form-control" value={institute.address || ''} onChange={e => setInstitute(i => ({ ...i, address: e.target.value }))} rows={2} />
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="form-select" value={institute.timezone} onChange={e => setInstitute(i => ({ ...i, timezone: e.target.value }))}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Currency</label>
                <select className="form-select" value={institute.currency} onChange={e => setInstitute(i => ({ ...i, currency: e.target.value }))}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="AED">AED (د.إ)</option>
                  <option value="SGD">SGD (S$)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* System Settings */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header"><h3 className="card-title">System Settings</h3></div>
          <div className="card-body">
            <div className="grid grid-cols-2">
              <div className="form-group">
                <label className="form-label">Receipt Number Prefix</label>
                <input className="form-control" value={settings.receipt_prefix} onChange={e => setSettings(s => ({ ...s, receipt_prefix: e.target.value }))} placeholder="REC" />
                <div className="form-text">Used in receipt numbers, e.g. REC-00001</div>
              </div>
              <div className="form-group">
                <label className="form-label">Member Code Prefix</label>
                <input className="form-control" value={settings.member_code_prefix} onChange={e => setSettings(s => ({ ...s, member_code_prefix: e.target.value }))} placeholder="MEM" />
                <div className="form-text">e.g. MEM-0001</div>
              </div>
              <div className="form-group">
                <label className="form-label">Staff Code Prefix</label>
                <input className="form-control" value={settings.staff_code_prefix} onChange={e => setSettings(s => ({ ...s, staff_code_prefix: e.target.value }))} placeholder="STF" />
                <div className="form-text">e.g. STF-0001</div>
              </div>
              <div className="form-group">
                <label className="form-label">Attendance Edit Window (hours)</label>
                <input type="number" className="form-control" value={settings.attendance_edit_window_hours} onChange={e => setSettings(s => ({ ...s, attendance_edit_window_hours: e.target.value }))} min={0} />
                <div className="form-text">How long staff can edit attendance after marking. 0 = admin only.</div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</> : <><BsSave /> Save Settings</>}
          </button>
        </div>
      </form>
    </div>
  );
}
