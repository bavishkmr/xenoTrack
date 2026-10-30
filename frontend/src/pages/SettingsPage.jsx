import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { settingsService } from '../services';
import Modal from '../components/Modal';
import { BsSave, BsPlus, BsPencil, BsTrash, BsToggleOn, BsToggleOff, BsArrowUp, BsArrowDown } from 'react-icons/bs';

export default function SettingsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [institute, setInstitute] = useState({ name: '', address: '', phone: '', email: '', timezone: 'Asia/Kolkata', currency: 'INR' });
  const [settings, setSettings] = useState({ receipt_prefix: 'REC', member_code_prefix: 'MEM', staff_code_prefix: 'STF', attendance_edit_window_hours: '24' });

  // Gender options state
  const [genderOptions, setGenderOptions] = useState([]);
  const [loadingGenders, setLoadingGenders] = useState(false);
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [editGenderOption, setEditGenderOption] = useState(null);
  const [genderForm, setGenderForm] = useState({ name: '', status: 'active' });
  const [savingGender, setSavingGender] = useState(false);

  const loadGenderOptions = useCallback(async () => {
    setLoadingGenders(true);
    try {
      const res = await settingsService.getGenderOptions();
      setGenderOptions(res.data.data || []);
    } catch {
      toast.error('Failed to load gender options');
    } finally {
      setLoadingGenders(false);
    }
  }, []);

  useEffect(() => {
    Promise.all([
      settingsService.get(),
      settingsService.getGenderOptions(),
    ])
      .then(([r, gRes]) => {
        const d = r.data.data;
        setData(d);
        if (d.institute) setInstitute(i => ({ ...i, ...d.institute }));
        if (d.settings) {
          const parsed = {};
          (d.settings || []).forEach(s => { parsed[s.setting_key] = s.setting_value; });
          setSettings(s => ({ ...s, ...parsed }));
        }
        setGenderOptions(gRes.data.data || []);
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

  const openAddGenderOption = () => {
    setEditGenderOption(null);
    setGenderForm({ name: '', status: 'active' });
    setShowGenderModal(true);
  };

  const openEditGenderOption = (opt) => {
    setEditGenderOption(opt);
    setGenderForm({ name: opt.name, status: opt.status || 'active' });
    setShowGenderModal(true);
  };

  const handleSaveGenderOption = async (e) => {
    e.preventDefault();
    const trimmed = genderForm.name.trim();
    if (!trimmed) {
      toast.error('Gender option name cannot be empty');
      return;
    }
    setSavingGender(true);
    try {
      if (editGenderOption) {
        await settingsService.updateGenderOption(editGenderOption.id, { name: trimmed, status: genderForm.status });
        toast.success('Gender option updated');
      } else {
        await settingsService.createGenderOption({ name: trimmed, status: genderForm.status });
        toast.success('Gender option created');
      }
      setShowGenderModal(false);
      loadGenderOptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSavingGender(false);
    }
  };

  const handleToggleGenderStatus = async (opt) => {
    try {
      await settingsService.toggleGenderOptionStatus(opt.id);
      toast.success(`Option is now ${opt.status === 'active' ? 'inactive' : 'active'}`);
      loadGenderOptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDeleteGenderOption = async (opt) => {
    if (!window.confirm(`Are you sure you want to delete the gender option "${opt.name}"?`)) {
      return;
    }
    try {
      await settingsService.deleteGenderOption(opt.id);
      toast.success('Gender option deleted successfully');
      loadGenderOptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete gender option');
    }
  };

  const handleMoveOption = async (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= genderOptions.length) return;

    const copy = [...genderOptions];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);

    const items = copy.map((item, i) => ({ id: item.id, display_order: i + 1 }));
    setGenderOptions(copy);

    try {
      await settingsService.reorderGenderOptions(items);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reorder');
      loadGenderOptions();
    }
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

        {/* Member Gender Options */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 className="card-title">Member Gender Options</h3>
              <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                Manage the gender options available when registering or editing members.
              </p>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={openAddGenderOption}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <BsPlus size={18} /> Add New Option
            </button>
          </div>
          <div className="card-body" style={{ padding: 0 }}>
            {loadingGenders ? (
              <div style={{ padding: 32, textAlign: 'center' }}><div className="spinner" /></div>
            ) : !genderOptions.length ? (
              <div className="empty-state" style={{ padding: 32 }}>
                <div className="empty-state-title">No gender options configured</div>
                <div className="empty-state-desc">Click "Add New Option" to create standard gender choices for members.</div>
              </div>
            ) : (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th style={{ width: 80 }}>Order</th>
                      <th>Gender Option</th>
                      <th style={{ width: 130 }}>Status</th>
                      <th style={{ width: 180, textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {genderOptions.map((opt, idx) => (
                      <tr key={opt.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary btn-icon"
                              disabled={idx === 0}
                              onClick={() => handleMoveOption(idx, -1)}
                              title="Move Up"
                              style={{ padding: '2px 6px', fontSize: 11 }}
                            >
                              <BsArrowUp />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary btn-icon"
                              disabled={idx === genderOptions.length - 1}
                              onClick={() => handleMoveOption(idx, 1)}
                              title="Move Down"
                              style={{ padding: '2px 6px', fontSize: 11 }}
                            >
                              <BsArrowDown />
                            </button>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{opt.name}</span>
                        </td>
                        <td>
                          <span
                            className={`badge ${opt.status === 'active' ? 'badge-active' : 'badge-inactive'}`}
                            style={{ textTransform: 'capitalize' }}
                          >
                            {opt.status}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary btn-icon"
                              onClick={() => openEditGenderOption(opt)}
                              title="Edit Option"
                            >
                              <BsPencil />
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary btn-icon"
                              onClick={() => handleToggleGenderStatus(opt)}
                              title={opt.status === 'active' ? 'Disable Option' : 'Enable Option'}
                            >
                              {opt.status === 'active' ? (
                                <BsToggleOn style={{ color: 'var(--color-success)', fontSize: 16 }} />
                              ) : (
                                <BsToggleOff style={{ fontSize: 16 }} />
                              )}
                            </button>
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary btn-icon text-danger"
                              onClick={() => handleDeleteGenderOption(opt)}
                              title="Delete Option"
                            >
                              <BsTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 32 }}>
          <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
            {saving ? <><div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} /> Saving…</> : <><BsSave /> Save Settings</>}
          </button>
        </div>
      </form>

      {/* Add / Edit Gender Option Modal */}
      <Modal
        show={showGenderModal}
        onClose={() => setShowGenderModal(false)}
        title={editGenderOption ? 'Edit Gender Option' : 'Add New Gender Option'}
      >
        <form onSubmit={handleSaveGenderOption}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="form-label">
              Gender Option Name <span className="required">*</span>
            </label>
            <input
              className="form-control"
              value={genderForm.name}
              onChange={(e) => setGenderForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Male, Female, Non-binary, Rather not disclose"
              required
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginBottom: 20 }}>
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={genderForm.status}
              onChange={(e) => setGenderForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active (Visible in member forms)</option>
              <option value="inactive">Inactive (Hidden from member registration)</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setShowGenderModal(false)}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={savingGender}>
              {savingGender ? (
                <>
                  <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> Saving…
                </>
              ) : editGenderOption ? (
                'Save Changes'
              ) : (
                'Add Option'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
