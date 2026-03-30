import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { animalsAPI } from '../../utils/api';

const SPECIES = ['Cow', 'Buffalo', 'Goat', 'Sheep', 'Bull', 'Calf', 'Other'];
const STATUSES = ['Healthy', 'Sick', 'Pregnant', 'Sold', 'Deceased'];

const defaultForm = {
  tagId: '', name: '', species: 'Cow', breed: '', gender: 'Female',
  dateOfBirth: '', weight: '', color: '', status: 'Healthy',
  purchasePrice: '', purchaseDate: '', notes: ''
};

export default function MyAnimals() {
  const [animals, setAnimals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAnimal, setEditAnimal] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await animalsAPI.getAll({ search, species: filterSpecies });
      setAnimals(data.animals || []);
    } catch { toast.error('Failed to load animals'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterSpecies]);

  const openAdd = () => { setEditAnimal(null); setForm(defaultForm); setShowModal(true); };

  const openEdit = (animal) => {
    setEditAnimal(animal);
    setForm({
      tagId:         animal.tagId || '',
      name:          animal.name || '',
      species:       animal.species,
      breed:         animal.breed || '',
      gender:        animal.gender,
      color:         animal.color || '',
      dateOfBirth:   animal.dateOfBirth   ? animal.dateOfBirth.split('T')[0]   : '',
      weight:        animal.weight || '',
      status:        animal.status,
      purchasePrice: animal.purchasePrice || '',
      purchaseDate:  animal.purchaseDate  ? animal.purchaseDate.split('T')[0]  : '',
      notes:         animal.notes || ''
    });
    setShowModal(true);
  };

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editAnimal) {
        await animalsAPI.update(editAnimal._id, form);
        toast.success('Animal updated! ✅');
      } else {
        await animalsAPI.create(form);
        toast.success('Animal added! 🐄');
      }
      setShowModal(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this animal?')) return;
    try {
      await animalsAPI.delete(id);
      toast.success('Animal deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const statusBadge = {
    Healthy: 'badge-green', Sick: 'badge-red',
    Pregnant: 'badge-purple', Sold: 'badge-gray', Deceased: 'badge-red'
  };

  return (
    <div className="page-animals">
      <div className="page-header">
        <div><h2>🐄 My Animals</h2><p>Manage your livestock</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Animal</button>
      </div>

      <div className="page-content">
        <div className="filter-bar">
          <input className="search-input" placeholder="🔍 Search by name or tag ID..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <select className="search-input" style={{ flex: 'none', width: 'auto' }}
            value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}>
            <option value="">All Species</option>
            {SPECIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Loading animals...</p></div>
          ) : animals.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🐄</div>
              <h3>No animals found</h3>
              <p>Add your first animal to get started</p>
              <button className="btn btn-primary" onClick={openAdd}>+ Add Animal</button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Tag ID</th><th>Name</th><th>Species</th>
                    <th>Breed</th><th>Gender</th><th>Weight</th>
                    <th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {animals.map(a => (
                    <tr key={a._id}>
                      <td><strong>#{a.tagId}</strong></td>
                      <td>{a.name || '—'}</td>
                      <td>{a.species}</td>
                      <td>{a.breed || '—'}</td>
                      <td>{a.gender}</td>
                      <td>{a.weight ? `${a.weight} kg` : '—'}</td>
                      <td><span className={`badge ${statusBadge[a.status] || 'badge-gray'}`}>{a.status}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(a)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a._id)}>Delete</button>
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
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editAnimal ? 'Edit Animal' : 'Add New Animal'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tag ID *</label>
                    <input name="tagId" value={form.tagId} onChange={handleChange} placeholder="e.g. TAG-001" required />
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Optional name" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Species *</label>
                    <select name="species" value={form.species} onChange={handleChange}>
                      {SPECIES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Breed</label>
                    <input name="breed" value={form.breed} onChange={handleChange} placeholder="e.g. Holstein" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Gender *</label>
                    <select name="gender" value={form.gender} onChange={handleChange}>
                      <option>Female</option><option>Male</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Status</label>
                    <select name="status" value={form.status} onChange={handleChange}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date of Birth</label>
                    <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange} />
                  </div>
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" name="weight" value={form.weight} onChange={handleChange} placeholder="0" min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Purchase Price (PKR)</label>
                    <input type="number" name="purchasePrice" value={form.purchasePrice} onChange={handleChange} placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date</label>
                    <input type="date" name="purchaseDate" value={form.purchaseDate} onChange={handleChange} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Color</label>
                  <input name="color" value={form.color} onChange={handleChange} placeholder="e.g. Black & White" />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                    placeholder="Any additional notes..." style={{ resize: 'vertical' }} />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editAnimal ? 'Update Animal' : 'Add Animal'}
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