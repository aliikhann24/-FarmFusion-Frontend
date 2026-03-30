import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { cattleAPI, enquiryAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const SPECIES = ['Cow', 'Buffalo', 'Goat', 'Sheep', 'Bull', 'Calf', 'Other'];

const defaultForm = {
  tagId: '', name: '', species: 'Cow', breed: '', gender: 'Female',
  age: '', weight: '', price: '', location: '', description: ''
};

const defaultEnquiry = {
  buyerName: '', buyerPhone: '', offerPrice: '', message: ''
};

export default function CattleMarket() {
  const { user } = useAuth();
  const [cattle, setCattle] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEnquiryModal, setShowEnquiryModal] = useState(null);
  const [showEnquiriesReceived, setShowEnquiriesReceived] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [enquiryForm, setEnquiryForm] = useState(defaultEnquiry);
  const [enquiries, setEnquiries] = useState([]);
  const [search, setSearch] = useState('');
  const [filterSpecies, setFilterSpecies] = useState('');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('market');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await cattleAPI.getAll({ search, species: filterSpecies });
      setCattle(data.cattle || []);
    } catch { toast.error('Failed to load marketplace'); }
    finally { setLoading(false); }
  };

  const loadEnquiries = async () => {
    try {
      const { data } = await enquiryAPI.received();
      setEnquiries(data.enquiries || []);
    } catch { toast.error('Failed to load enquiries'); }
  };

  useEffect(() => { load(); }, [search, filterSpecies]);
  useEffect(() => { if (activeTab === 'enquiries') loadEnquiries(); }, [activeTab]);

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

  const handleEnquirySubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await enquiryAPI.submit({
        cattleId:   showEnquiryModal._id,
        buyerName:  enquiryForm.buyerName,
        buyerPhone: enquiryForm.buyerPhone,
        offerPrice: enquiryForm.offerPrice,
        message:    enquiryForm.message
      });
      toast.success('Enquiry sent to seller! ✅');
      setShowEnquiryModal(null);
      setEnquiryForm(defaultEnquiry);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send enquiry');
    } finally { setSaving(false); }
  };

  const handleEnquiryStatus = async (id, status) => {
    try {
      await enquiryAPI.update(id, status);
      toast.success(`Enquiry ${status}! ✅`);
      loadEnquiries();
    } catch { toast.error('Failed to update'); }
  };

  const isMyListing = (c) => c.seller?._id === user?._id || c.seller === user?._id;

  const statusMap = {
    Pending:  'badge-orange',
    Accepted: 'badge-green',
    Rejected: 'badge-red'
  };

  return (
    <div className="page-cattle">
      <div className="page-header">
        <div><h2>🏪 Cattle Marketplace</h2><p>Buy & sell livestock</p></div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-outline btn-sm" onClick={() => setActiveTab(activeTab === 'enquiries' ? 'market' : 'enquiries')}>
            {activeTab === 'enquiries' ? '🏪 Marketplace' : '📬 My Enquiries'}
          </button>
          <button className="btn btn-primary btn-sm" onClick={() => setShowModal(true)}>
            + List Animal
          </button>
        </div>
      </div>

      <div className="page-content">

        {/* ===== MARKETPLACE TAB ===== */}
        {activeTab === 'market' && (
          <>
            <div className="filter-bar">
              <input className="search-input"
                placeholder="🔍 Search by name, breed or location..."
                value={search} onChange={e => setSearch(e.target.value)} />
              <select className="search-input" style={{ flex: 'none', width: 'auto' }}
                value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}>
                <option value="">All Species</option>
                {SPECIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>

            {loading ? (
              <div className="empty-state"><p>Loading marketplace...</p></div>
            ) : cattle.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🏪</div>
                <h3>No listings available</h3>
                <p>Be the first to list an animal for sale!</p>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ List Animal</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {cattle.map(c => (
                  <div key={c._id} className="card">
                    <div style={{ padding: '20px' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.1rem', color: 'var(--primary-dark)' }}>
                            {c.name || `${c.species} #${c.tagId}`}
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                            Tag: {c.tagId} • {c.gender}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span className="badge badge-green">{c.species}</span>
                          {isMyListing(c) && (
                            <span className="badge badge-blue" style={{ fontSize: '0.68rem' }}>My Listing</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
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

                      {c.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                          {c.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                            PKR {Number(c.price).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Seller: {c.seller?.farmName || c.seller?.name || 'Unknown'}
                          </div>
                        </div>

                        {isMyListing(c) ? (
                          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Your listing
                          </span>
                        ) : (
                          <button className="btn btn-primary btn-sm"
                            onClick={() => { setShowEnquiryModal(c); setEnquiryForm({ ...defaultEnquiry, buyerName: user?.name || '', buyerPhone: user?.phone || '' }); }}>
                            📬 Enquire
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== ENQUIRIES TAB ===== */}
        {activeTab === 'enquiries' && (
          <div className="card">
            <div className="card-header">
              <h3>📬 Enquiries Received</h3>
              <button className="btn btn-outline btn-sm" onClick={loadEnquiries}>🔄 Refresh</button>
            </div>
            {enquiries.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px' }}>
                <div className="icon">📬</div>
                <h3>No enquiries yet</h3>
                <p>When buyers enquire about your listings, they'll appear here</p>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Animal</th>
                      <th>Buyer Name</th>
                      <th>Phone</th>
                      <th>Offer Price</th>
                      <th>Message</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map(eq => (
                      <tr key={eq._id}>
                        <td>
                          <strong>{eq.cattle?.name || eq.cattle?.tagId || '—'}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {eq.cattle?.species} • PKR {Number(eq.cattle?.price).toLocaleString()}
                          </div>
                        </td>
                        <td>{eq.buyerName}</td>
                        <td>
                          <a href={`tel:${eq.buyerPhone}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                            {eq.buyerPhone}
                          </a>
                        </td>
                        <td>
                          {eq.offerPrice
                            ? <span style={{ fontWeight: 700, color: 'var(--primary)' }}>PKR {Number(eq.offerPrice).toLocaleString()}</span>
                            : '—'}
                        </td>
                        <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {eq.message || '—'}
                        </td>
                        <td>
                          <span className={`badge ${statusMap[eq.status]}`}>{eq.status}</span>
                        </td>
                        <td>
                          {eq.status === 'Pending' && (
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button className="btn btn-sm"
                                style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => handleEnquiryStatus(eq._id, 'Accepted')}>
                                ✅ Accept
                              </button>
                              <button className="btn btn-sm"
                                style={{ background: '#fde8ea', color: '#c62828', border: 'none', borderRadius: '6px', padding: '6px 12px', cursor: 'pointer', fontWeight: 600 }}
                                onClick={() => handleEnquiryStatus(eq._id, 'Rejected')}>
                                ❌ Reject
                              </button>
                            </div>
                          )}
                          {eq.status !== 'Pending' && (
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Done</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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

      {/* Enquiry Modal */}
      {showEnquiryModal && (
        <div className="modal-overlay" onClick={() => setShowEnquiryModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📬 Send Enquiry</h3>
              <button className="modal-close" onClick={() => setShowEnquiryModal(null)}>✕</button>
            </div>
            <div className="modal-body">

              {/* Animal Info */}
              <div style={{ background: '#f4faf5', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '4px' }}>
                  {showEnquiryModal.name || `${showEnquiryModal.species} #${showEnquiryModal.tagId}`}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {showEnquiryModal.species} • {showEnquiryModal.gender} • {showEnquiryModal.location || 'Location not specified'}
                </div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--primary)', marginTop: '6px' }}>
                  PKR {Number(showEnquiryModal.price).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Seller: {showEnquiryModal.seller?.farmName || showEnquiryModal.seller?.name}
                </div>
              </div>

              <form onSubmit={handleEnquirySubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Your Name *</label>
                    <input value={enquiryForm.buyerName}
                      onChange={e => setEnquiryForm(p => ({ ...p, buyerName: e.target.value }))}
                      placeholder="Ahmed Khan" required />
                  </div>
                  <div className="form-group">
                    <label>Your Phone *</label>
                    <input value={enquiryForm.buyerPhone}
                      onChange={e => setEnquiryForm(p => ({ ...p, buyerPhone: e.target.value }))}
                      placeholder="+92 300 1234567" required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Your Offer Price (PKR)</label>
                  <input type="number" value={enquiryForm.offerPrice}
                    onChange={e => setEnquiryForm(p => ({ ...p, offerPrice: e.target.value }))}
                    placeholder={showEnquiryModal.price} min="0" />
                </div>
                <div className="form-group">
                  <label>Message to Seller</label>
                  <textarea value={enquiryForm.message}
                    onChange={e => setEnquiryForm(p => ({ ...p, message: e.target.value }))}
                    rows={3} style={{ resize: 'vertical' }}
                    placeholder="e.g. I am interested in this animal, please contact me..." />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowEnquiryModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Sending...' : '📬 Send Enquiry'}
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