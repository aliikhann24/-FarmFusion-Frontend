import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { progressAPI, animalsAPI } from '../../utils/api';
import Spinner from '../../components/common/Spinner';
// ...

const defaultForm = {
  animal: '',
  date: new Date().toISOString().split('T')[0],
  weight: '', height: '', milkProduction: '',
  healthStatus: 'Good', notes: ''
};

export default function AnimalProgress() {
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
        progressAPI.getAll({ animalId: filterAnimal }),
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
      await progressAPI.create(form);
      toast.success('Progress record added! 📈');
      setShowModal(false);
      setForm(defaultForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const healthMap = {
    Excellent: 'badge-green',
    Good:      'badge-blue',
    Fair:      'badge-orange',
    Poor:      'badge-red'
  };

  const avgWeight = records.filter(r => r.weight).length > 0
    ? Math.round(records.filter(r => r.weight).reduce((s, r) => s + r.weight, 0) / records.filter(r => r.weight).length)
    : 0;

  const avgMilk = records.filter(r => r.milkProduction).length > 0
    ? (records.filter(r => r.milkProduction).reduce((s, r) => s + r.milkProduction, 0) / records.filter(r => r.milkProduction).length).toFixed(1)
    : 0;

  return (
    <div>
      <div className="page-header">
        <div><h2>📈 Animal Progress</h2><p>Track health & growth over time</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Progress</button>
      </div>

      <div className="page-content">

        {/* Summary Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '24px' }}>
          {[
            { label: 'Total Records',    value: records.length, icon: '📈', cls: 'green'  },
            { label: 'Avg Weight (kg)',  value: avgWeight,      icon: '⚖️', cls: 'blue'   },
            { label: 'Avg Milk (L/day)', value: avgMilk,        icon: '🥛', cls: 'orange' },
            { label: 'Excellent Health', value: records.filter(r => r.healthStatus === 'Excellent').length, icon: '💚', cls: 'purple' },
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

        {/* Filter */}
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

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : records.length === 0 ? (
            <div className="empty-state">
              <div className="icon">📈</div>
              <h3>No progress records</h3>
              <p>Start tracking your animals' health and growth</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Progress</button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Animal</th>
                    <th>Date</th>
                    <th>Weight (kg)</th>
                    <th>Height (cm)</th>
                    <th>Milk (L/day)</th>
                    <th>Health</th>
                    <th>Notes</th>
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
                      <td>{new Date(r.date).toLocaleDateString()}</td>
                      <td>{r.weight || '—'}</td>
                      <td>{r.height || '—'}</td>
                      <td>{r.milkProduction || '—'}</td>
                      <td>
                        <span className={`badge ${healthMap[r.healthStatus]}`}>
                          {r.healthStatus}
                        </span>
                      </td>
                      <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {r.notes || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Progress Record</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Animal *</label>
                    <select
                      value={form.animal}
                      onChange={e => setForm(p => ({ ...p, animal: e.target.value }))}
                      required
                    >
                      <option value="">Select animal</option>
                      {animals.map(a => (
                        <option key={a._id} value={a._id}>
                          {a.name || a.tagId} ({a.species})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Date *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input
                      type="number"
                      value={form.weight}
                      onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                      min="0" placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input
                      type="number"
                      value={form.height}
                      onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                      min="0" placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Milk Production (L/day)</label>
                    <input
                      type="number"
                      value={form.milkProduction}
                      onChange={e => setForm(p => ({ ...p, milkProduction: e.target.value }))}
                      min="0" placeholder="0"
                    />
                  </div>
                  <div className="form-group">
                    <label>Health Status</label>
                    <select
                      value={form.healthStatus}
                      onChange={e => setForm(p => ({ ...p, healthStatus: e.target.value }))}
                    >
                      {['Excellent', 'Good', 'Fair', 'Poor'].map(h => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={3} style={{ resize: 'vertical' }}
                    placeholder="Any observations..."
                  />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Add Progress'}
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