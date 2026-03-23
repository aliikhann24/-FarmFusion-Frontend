import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { feedingAPI, animalsAPI } from '../../utils/api';

const defaultForm = {
  animal: '', feedType: '', quantity: '', unit: 'kg',
  feedingDate: new Date().toISOString().split('T')[0], cost: '', notes: ''
};

export default function FeedingRecords() {
  const [records, setRecords] = useState([]);
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filterAnimal, setFilterAnimal] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [recRes, animRes] = await Promise.all([
        feedingAPI.getAll({ animalId: filterAnimal }),
        animalsAPI.getAll()
      ]);
      setRecords(recRes.data.records || []);
      setAnimals(animRes.data.animals || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterAnimal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await feedingAPI.create(form);
      toast.success('Feeding record added! 🌾');
      setShowModal(false);
      setForm(defaultForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await feedingAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const totalCost     = records.reduce((sum, r) => sum + (r.cost || 0), 0);
  const totalRecords  = records.length;
  const uniqueAnimals = [...new Set(records.map(r => r.animal?._id))].length;
  const feedTypes     = [...new Set(records.map(r => r.feedType))].length;

  return (
    <div>
      <div className="page-header">
        <div><h2>🌾 Feeding Records</h2><p>Track animal feed & nutrition</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Record</button>
      </div>

      <div className="page-content">

        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Records',    value: totalRecords,                icon: '🌾', cls: 'green'  },
            { label: 'Animals Fed',      value: uniqueAnimals,               icon: '🐄', cls: 'blue'   },
            { label: 'Feed Types',       value: feedTypes,                   icon: '🥣', cls: 'orange' },
            { label: 'Total Cost (PKR)', value: totalCost.toLocaleString(),  icon: '💰', cls: 'purple' },
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

        <div className="filter-bar">
          <select
            className="search-input"
            style={{ flex: 'none', width: 'auto', minWidth: '200px' }}
            value={filterAnimal}
            onChange={e => setFilterAnimal(e.target.value)}
          >
            <option value="">All Animals</option>
            {animals.map(a => (
              <option key={a._id} value={a._id}>
                {a.name || a.tagId} ({a.species})
              </option>
            ))}
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🌾</div>
              <h3>No feeding records</h3>
              <p>Start logging what your animals eat</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Record</button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Feed Type</th>
                    <th>Quantity</th>
                    <th>Cost (PKR)</th>
                    <th>Date</th>
                    <th>Notes</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map(r => (
                    <tr key={r._id}>
                      <td>
                        <strong>{r.animal?.name || r.animal?.tagId || '—'}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {r.animal?.species}
                        </div>
                      </td>
                      <td><span className="badge badge-green">{r.feedType}</span></td>
                      <td>{r.quantity} {r.unit}</td>
                      <td>{r.cost ? `PKR ${Number(r.cost).toLocaleString()}` : '—'}</td>
                      <td>{new Date(r.feedingDate).toLocaleDateString()}</td>
                      <td style={{ maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.notes || '—'}
                      </td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r._id)}>
                          Delete
                        </button>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Feeding Record</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Animal *</label>
                  <select value={form.animal}
                    onChange={e => setForm(p => ({ ...p, animal: e.target.value }))} required>
                    <option value="">Select animal</option>
                    {animals.map(a => (
                      <option key={a._id} value={a._id}>{a.name || a.tagId} ({a.species})</option>
                    ))}
                  </select>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Feed Type *</label>
                    <input value={form.feedType}
                      onChange={e => setForm(p => ({ ...p, feedType: e.target.value }))}
                      placeholder="e.g. Hay, Silage, Grain" required />
                  </div>
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" value={form.feedingDate}
                      onChange={e => setForm(p => ({ ...p, feedingDate: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" value={form.quantity}
                      onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))}
                      required min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Unit</label>
                    <select value={form.unit}
                      onChange={e => setForm(p => ({ ...p, unit: e.target.value }))}>
                      <option>kg</option>
                      <option>lbs</option>
                      <option>liters</option>
                      <option>grams</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Cost (PKR)</label>
                  <input type="number" value={form.cost}
                    onChange={e => setForm(p => ({ ...p, cost: e.target.value }))}
                    min="0" placeholder="0" />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={3} style={{ resize: 'vertical' }} placeholder="Any additional notes..." />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Add Record'}
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