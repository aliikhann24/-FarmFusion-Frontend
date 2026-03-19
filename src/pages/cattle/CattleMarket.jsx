import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { cattleAPI } from '../../utils/api';
import Spinner from '../../components/common/Spinner';

const SPECIES = ['Cow', 'Buffalo', 'Goat', 'Sheep', 'Bull', 'Calf', 'Other'];

const defaultForm = {
  tagId: '', name: '', species: 'Cow', breed: '', gender: 'Female',
  age: '', weight: '', price: '', location: '', description: ''
};

export default function CattleMarket() {
  const [cattle, setCattle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await cattleAPI.getAll({ search, species: filterSpecies });
      setCattle(data.cattle || []);
    } catch { toast.error('Failed to load marketplace'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, filterSpecies]);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleList = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await cattleAPI.create(form);
      toast.success('Animal listed on marketplace! 🏪');
      setShowModal(false);
      setForm(defaultForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to list');
    } finally { setSaving(false); }
  };

  const handleBuy = async (id, name) => {
    if (!window.confirm(`Buy ${name || 'this animal'}? It will be added to My Animals.`)) return;
    try {
      await cattleAPI.buy(id);
      toast.success('Animal purchased and added to My Animals! 🐄');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Purchase failed');
    }
  };

  return (
    <div>
      <div className="page-header">
        <div><h2>🏪 Cattle Marketplace</h2><p>Buy & sell livestock</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + List Animal for Sale
        </button>
      </div>

      <div className="page-content">

        {/* Filters */}
        <div className="filter-bar">
          <input
            className="search-input"
            placeholder="🔍 Search by name, breed or location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="search-input"
            style={{ flex: 'none', width: 'auto' }}
            value={filterSpecies}
            onChange={e => setFilterSpecies(e.target.value)}
          >
            <option value="">All Species</option>
            {SPECIES.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="empty-state"><p>Loading marketplace...</p></div>
        ) : cattle.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🏪</div>
            <h3>No listings available</h3>
            <p>Be the first to list an animal for sale!</p>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              + List Animal
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '20px'
          }}>
            {cattle.map(c => (
              <div key={c._id} className="card">
                <div style={{ padding: '20px' }}>

                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-dark)' }}>
                        {c.name || `${c.species} #${c.tagId}`}
                      </h3>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        Tag: {c.tagId} • {c.gender}
                      </p>
                    </div>
                    <span className="badge badge-green">{c.species}</span>
                  </div>

                  {/* Details Grid */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    gap: '8px', marginBottom: '16px'
                  }}>
                    {[
                      ['Breed',    c.breed    || '—'],
                      ['Age',      c.age      ? `${c.age} yrs` : '—'],
                      ['Weight',   c.weight   ? `${c.weight} kg` : '—'],
                      ['Location', c.location || '—'],
                    ].map(([k, v]) => (
                      <div key={k} style={{ background: '#f8faf8', borderRadius: '8px', padding: '8px 12px' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>{k}</div>
                        <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* Description */}
                  {c.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                      {c.description}
                    </p>
                  )}

                  {/* Price + Buy */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                        PKR {Number(c.price).toLocaleString()}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Seller: {c.seller?.farmName || c.seller?.name || 'Unknown'}
                      </div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => handleBuy(c._id, c.name)}>
                      Buy Now
                    </button>
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* List Animal Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>List Animal for Sale</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleList}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Tag ID *</label>
                    <input name="tagId" value={form.tagId} onChange={handleChange} required placeholder="TAG-001" />
                  </div>
                  <div className="form-group">
                    <label>Name</label>
                    <input name="name" value={form.name} onChange={handleChange} placeholder="Optional" />
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
                    <label>Gender *</label>
                    <select name="gender" value={form.gender} onChange={handleChange}>
                      <option>Female</option>
                      <option>Male</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Breed</label>
                    <input name="breed" value={form.breed} onChange={handleChange} placeholder="e.g. Holstein" />
                  </div>
                  <div className="form-group">
                    <label>Age (years)</label>
                    <input type="number" name="age" value={form.age} onChange={handleChange} min="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" name="weight" value={form.weight} onChange={handleChange} min="0" />
                  </div>
                  <div className="form-group">
                    <label>Price (PKR) *</label>
                    <input type="number" name="price" value={form.price} onChange={handleChange} required min="0" placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Location</label>
                  <input name="location" value={form.location} onChange={handleChange} placeholder="e.g. Lahore, Punjab" />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={form.description} onChange={handleChange}
                    rows={3} placeholder="Describe the animal..." style={{ resize: 'vertical' }} />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Listing...' : 'List for Sale'}
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