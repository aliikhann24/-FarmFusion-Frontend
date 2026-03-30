import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { breedingAPI, animalsAPI } from '../../utils/api';

const defaultForm = {
  femaleAnimal: '', maleAnimal: '',
  breedingDate: '', expectedDelivery: '',
  outcome: 'Pending', notes: ''
};

export default function BreedingRecords() {
  const [records, setRecords]     = useState([]);
  const [animals, setAnimals]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm]           = useState(defaultForm);
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [recRes, animRes] = await Promise.all([
        breedingAPI.getAll(),
        animalsAPI.getAll()
      ]);
      setRecords(recRes.data.records || []);
      setAnimals(animRes.data.animals || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditRecord(null);
    setForm(defaultForm);
    setShowModal(true);
  };

  const openEdit = (r) => {
    setEditRecord(r);
    setForm({
      femaleAnimal:     r.femaleAnimal?._id || '',
      maleAnimal:       r.maleAnimal?._id   || '',
      breedingDate:     r.breedingDate     ? r.breedingDate.split('T')[0]     : '',
      expectedDelivery: r.expectedDelivery ? r.expectedDelivery.split('T')[0] : '',
      outcome:          r.outcome || 'Pending',
      notes:            r.notes   || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditRecord(null);
    setForm(defaultForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRecord) {
        await breedingAPI.update(editRecord._id, form);
        toast.success('Breeding record updated! ✅');
      } else {
        await breedingAPI.create(form);
        toast.success('Breeding record added! 🧬');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await breedingAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const outcomeMap = {
    Pending: 'badge-orange', Successful: 'badge-green',
    Failed: 'badge-red', Miscarriage: 'badge-red'
  };

  const females = animals.filter(a => a.gender === 'Female');
  const males   = animals.filter(a => a.gender === 'Male');

 return (
    <div className="page-breeding">
      <div className="page-header">
        <div><h2>🧬 Breeding Records</h2><p>Track animal breeding history</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Record</button>
      </div>

      <div className="page-content">
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Records', value: records.length,                                         icon: '🧬', cls: 'purple' },
            { label: 'Pending',       value: records.filter(r => r.outcome === 'Pending').length,    icon: '⏳', cls: 'orange' },
            { label: 'Successful',    value: records.filter(r => r.outcome === 'Successful').length, icon: '✅', cls: 'green'  },
            { label: 'Failed',        value: records.filter(r => r.outcome === 'Failed').length,     icon: '❌', cls: 'blue'   },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-info">
                <div className="value">{s.value}</div>
                <div className="label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧬</div>
              <h3>No breeding records</h3>
              <p>Start tracking your animals' breeding history</p>
              <button className="btn btn-primary" onClick={openAdd}>+ Add Record</button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Female Animal</th><th>Male Animal</th>
                    <th>Breeding Date</th><th>Expected Delivery</th>
                    <th>Outcome</th><th>Notes</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.femaleAnimal?.name || r.femaleAnimal?.tagId || '—'}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.femaleAnimal?.species}</div>
                      </td>
                      <td>{r.maleAnimal?.name || r.maleAnimal?.tagId || 'External'}</td>
                      <td>{r.breedingDate ? new Date(r.breedingDate).toLocaleDateString() : '—'}</td>
                      <td>{r.expectedDelivery ? new Date(r.expectedDelivery).toLocaleDateString() : '—'}</td>
                      <td><span className={`badge ${outcomeMap[r.outcome]}`}>{r.outcome}</span></td>
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.notes || '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(r)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>Delete</button>
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

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editRecord ? 'Edit Breeding Record' : 'Add Breeding Record'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Female Animal *</label>
                  <select value={form.femaleAnimal}
                    onChange={e => setForm(p => ({ ...p, femaleAnimal: e.target.value }))} required>
                    <option value="">Select female animal</option>
                    {females.map(a => (
                      <option key={a._id} value={a._id}>{a.name || a.tagId} ({a.species})</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Male Animal (optional)</label>
                  <select value={form.maleAnimal}
                    onChange={e => setForm(p => ({ ...p, maleAnimal: e.target.value }))}>
                    <option value="">External / Unknown</option>
                    {males.map(a => (
                      <option key={a._id} value={a._id}>{a.name || a.tagId} ({a.species})</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Breeding Date *</label>
                    <input type="date" value={form.breedingDate}
                      onChange={e => setForm(p => ({ ...p, breedingDate: e.target.value }))} required />
                  </div>
                  <div className="form-group">
                    <label>Expected Delivery</label>
                    <input type="date" value={form.expectedDelivery}
                      onChange={e => setForm(p => ({ ...p, expectedDelivery: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Outcome</label>
                  <select value={form.outcome}
                    onChange={e => setForm(p => ({ ...p, outcome: e.target.value }))}>
                    {['Pending', 'Successful', 'Failed', 'Miscarriage'].map(o => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={3} style={{ resize: 'vertical' }} placeholder="Any additional notes..." />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editRecord ? 'Update Record' : 'Add Record'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}