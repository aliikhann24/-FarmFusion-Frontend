import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { cattleAPI, enquiryAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

const SPECIES = ['Cow', 'Buffalo', 'Goat', 'Sheep', 'Bull', 'Calf', 'Other'];

const defaultForm = {
  tagId: '', name: '', species: 'Cow', breed: '', gender: 'Female',
  age: '', weight: '', price: '', location: '', description: '',
  imageBase64: null, imageMimeType: null
};

const defaultEnquiry = { buyerName: '', buyerPhone: '', offerPrice: '', message: '' };

// ✅ Fixed compressImage using FileReader
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx    = canvas.getContext('2d');
        let { width, height } = img;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height / width) * maxDim); width = maxDim; }
          else { width = Math.round((width / height) * maxDim); height = maxDim; }
        }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let result  = canvas.toDataURL('image/jpeg', quality);
        while (result.length > 500 * 1024 * 1.37 && quality > 0.2) {
          quality -= 0.1;
          result = canvas.toDataURL('image/jpeg', quality);
        }
        resolve(result);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function CattleMarket() {
  const { user }                                = useAuth();
  const [cattle, setCattle]                     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [showModal, setShowModal]               = useState(false);
  const [editListing, setEditListing]           = useState(null);
  const [showEnquiryModal, setShowEnquiryModal] = useState(null);
  const [form, setForm]                         = useState(defaultForm);
  const [enquiryForm, setEnquiryForm]           = useState(defaultEnquiry);
  const [enquiries, setEnquiries]               = useState([]);
  const [imagePreview, setImagePreview]         = useState(null);
  const [compressing, setCompressing]           = useState(false);
  const [search, setSearch]                     = useState('');
  const [filterSpecies, setFilterSpecies]       = useState('');
  const [saving, setSaving]                     = useState(false);
  const [activeTab, setActiveTab]               = useState('market');
  const pollRef  = useRef(null);
  const imageRef = useRef();

  // ===== LOAD =====
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
    } catch {}
  };

  useEffect(() => { load(); }, [search, filterSpecies]);
  useEffect(() => {
    loadEnquiries();
    pollRef.current = setInterval(loadEnquiries, 30000);
    return () => clearInterval(pollRef.current);
  }, []);
  useEffect(() => { if (activeTab === 'enquiries') loadEnquiries(); }, [activeTab]);

  // ===== IMAGE =====
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      const base64     = compressed.split(',')[1];
      setForm(p => ({ ...p, imageBase64: base64, imageMimeType: 'image/jpeg' }));
      setImagePreview(compressed);
      toast.success('Image ready ✅');
    } catch (err) {
      console.error('Image error:', err);
      toast.error('Failed to process image');
    } finally { setCompressing(false); }
  };

  const removeImage = () => {
    setForm(p => ({ ...p, imageBase64: null, imageMimeType: null }));
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  // ===== MODAL OPEN/CLOSE =====
  const openAdd = () => {
    setEditListing(null);
    setForm(defaultForm);
    setImagePreview(null);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditListing(c);
    setForm({
      tagId: c.tagId || '', name: c.name || '',
      species: c.species || 'Cow', breed: c.breed || '',
      gender: c.gender || 'Female', age: c.age || '',
      weight: c.weight || '', price: c.price || '',
      location: c.location || '', description: c.description || '',
      imageBase64: c.imageBase64 || null, imageMimeType: c.imageMimeType || null
    });
    setImagePreview(c.imageBase64 ? `data:${c.imageMimeType};base64,${c.imageBase64}` : null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditListing(null);
    setForm(defaultForm);
    setImagePreview(null);
  };

  // ===== SUBMIT LISTING =====
  const handleList = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editListing) {
        await cattleAPI.update(editListing._id, form);
        toast.success('Listing updated! ✅');
      } else {
        await cattleAPI.create(form);
        toast.success('Animal listed! 🏪');
      }
      closeModal();
      load();
    } catch (err) {
      console.error('Submit error:', err.response?.data || err);
      toast.error(err.response?.data?.message || 'Failed to save listing');
    } finally { setSaving(false); }
  };

  // ===== DELETE LISTING =====
  const handleDeleteListing = async (id) => {
    if (!window.confirm('Remove this listing from marketplace?')) return;
    try {
      await cattleAPI.delete(id);
      toast.success('Listing removed');
      load();
    } catch (err) {
      console.error('Delete error:', err.response?.data || err);
      toast.error('Failed to remove listing');
    }
  };

  // ===== ENQUIRY SUBMIT =====
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
      toast.success('Enquiry sent! ✅');
      setShowEnquiryModal(null);
      setEnquiryForm(defaultEnquiry);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send enquiry');
    } finally { setSaving(false); }
  };

  // ===== ENQUIRY STATUS =====
  const handleEnquiryStatus = async (id, status) => {
    try {
      await enquiryAPI.update(id, status);
      toast.success(`Enquiry ${status}! ✅`);
      loadEnquiries();
    } catch { toast.error('Failed to update'); }
  };

  // ===== DELETE ENQUIRY =====
  const handleDeleteEnquiry = async (id) => {
    if (!window.confirm('Delete this enquiry?')) return;
    try {
      await enquiryAPI.delete(id);
      toast.success('Enquiry deleted');
      loadEnquiries();
    } catch { toast.error('Failed to delete enquiry'); }
  };

  const isMyListing      = (c) => c.seller?._id === user?._id || c.seller === user?._id;
  const statusMap        = { Pending: 'badge-orange', Accepted: 'badge-green', Rejected: 'badge-red' };
  const pendingEnquiries = enquiries.filter(e => e.status === 'Pending').length;
  const handleChange     = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  return (
    <div className="page-cattle">
      <div className="page-header">
        <div><h2>🏪 Cattle Marketplace</h2><p>Buy & sell livestock</p></div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="btn btn-outline btn-sm" style={{ position: 'relative' }}
            onClick={() => setActiveTab(activeTab === 'enquiries' ? 'market' : 'enquiries')}>
            {activeTab === 'enquiries' ? '🏪 Marketplace' : '📬 My Enquiries'}
            {pendingEnquiries > 0 && activeTab !== 'enquiries' && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: 'var(--danger)', color: 'white',
                borderRadius: '50%', width: '20px', height: '20px',
                fontSize: '0.7rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{pendingEnquiries}</span>
            )}
          </button>
          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ List Animal</button>
        </div>
      </div>

      <div className="page-content">

        {/* ===== MARKETPLACE TAB ===== */}
        {activeTab === 'market' && (
          <>
            <div className="filter-bar">
              <input className="search-input" placeholder="🔍 Search by name, breed or location..."
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
                <button className="btn btn-primary" onClick={openAdd}>+ List Animal</button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {cattle.map(c => (
                  <div key={c._id} className="card" style={{ overflow: 'hidden' }}>

                    {/* ✅ Animal Image */}
                    {c.imageBase64 ? (
                      <img
                        src={`data:${c.imageMimeType || 'image/jpeg'};base64,${c.imageBase64}`}
                        alt={c.name || c.species}
                        style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{
                        width: '100%', height: '140px',
                        background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
                        display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '3.5rem'
                      }}>🐄</div>
                    )}

                    <div style={{ padding: '16px 20px 20px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                        <div>
                          <h3 style={{ fontSize: '1.05rem', color: 'var(--primary-dark)', marginBottom: '2px' }}>
                            {c.name || `${c.species} #${c.tagId}`}
                          </h3>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tag: {c.tagId} • {c.gender}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span className="badge badge-green">{c.species}</span>
                          {isMyListing(c) && (
                            <span className="badge badge-blue" style={{ fontSize: '0.65rem' }}>My Listing</span>
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '14px' }}>
                        {[
                          ['Breed',    c.breed    || '—'],
                          ['Age',      c.age      ? `${c.age} yrs` : '—'],
                          ['Weight',   c.weight   ? `${c.weight} kg` : '—'],
                          ['Location', c.location || '—'],
                        ].map(([k, v]) => (
                          <div key={k} style={{ background: '#f8faf8', borderRadius: '8px', padding: '7px 10px' }}>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>{k}</div>
                            <div style={{ fontSize: '0.85rem', fontWeight: 500, marginTop: '1px' }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {c.description && (
                        <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                          {c.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                        <div>
                          <div style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--primary)' }}>
                            PKR {Number(c.price).toLocaleString()}
                          </div>
                          <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>
                            Seller: {c.seller?.farmName || c.seller?.name || 'Unknown'}
                          </div>
                        </div>

                        {/* ✅ Edit/Delete for my listings, Enquire for others */}
                        {isMyListing(c) ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(c)}>✏️ Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteListing(c._id)}>🗑 Remove</button>
                          </div>
                        ) : (
                          <button className="btn btn-primary btn-sm"
                            onClick={() => {
                              setShowEnquiryModal(c);
                              setEnquiryForm({ ...defaultEnquiry, buyerName: user?.name || '', buyerPhone: user?.phone || '' });
                            }}>
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
              <h3>📬 Enquiries Received
                {pendingEnquiries > 0 && (
                  <span style={{ marginLeft: '8px', background: 'var(--danger)', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem' }}>
                    {pendingEnquiries} pending
                  </span>
                )}
              </h3>
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
                      <th>Animal</th><th>Buyer</th><th>Phone</th>
                      <th>Offer</th><th>Message</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enquiries.map(eq => (
                      <tr key={eq._id}>
                        <td>
                          <strong>{eq.cattle?.name || eq.cattle?.tagId || '—'}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {eq.cattle?.species} • PKR {Number(eq.cattle?.price || 0).toLocaleString()}
                          </div>
                        </td>
                        <td><strong>{eq.buyerName}</strong></td>
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
                        <td style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {eq.message || '—'}
                        </td>
                        <td><span className={`badge ${statusMap[eq.status]}`}>{eq.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {/* ✅ Accept / Reject for pending */}
                            {eq.status === 'Pending' && (
                              <>
                                <button className="btn btn-sm"
                                  style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                                  onClick={() => handleEnquiryStatus(eq._id, 'Accepted')}>
                                  ✅ Accept
                                </button>
                                <button className="btn btn-sm"
                                  style={{ background: '#fde8ea', color: '#c62828', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                                  onClick={() => handleEnquiryStatus(eq._id, 'Rejected')}>
                                  ❌ Reject
                                </button>
                              </>
                            )}
                            {/* ✅ Delete always available */}
                            <button className="btn btn-sm"
                              style={{ background: '#fde8ea', color: '#c62828', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                              onClick={() => handleDeleteEnquiry(eq._id)}>
                              🗑 Delete
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
        )}
      </div>

      {/* ===== LIST / EDIT MODAL ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editListing ? '✏️ Edit Listing' : '🏪 List Animal for Sale'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleList}>

                {/* ✅ Image Upload */}
                <div className="form-group">
                  <label>📸 Animal Photo (optional)</label>
                  {!imagePreview ? (
                    <div className="upload-box"
                      onClick={() => !compressing && imageRef.current?.click()}
                      style={{ opacity: compressing ? 0.6 : 1, cursor: compressing ? 'not-allowed' : 'pointer' }}>
                      <div style={{ fontSize: '2rem' }}>{compressing ? '⏳' : '🖼️'}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {compressing ? 'Compressing image...' : 'Click to upload photo'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>JPG, PNG up to 5MB — auto compressed</div>
                      <input ref={imageRef} type="file" accept="image/*"
                        onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <img src={imagePreview} alt="preview"
                        style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px', border: '2px solid var(--border)' }} />
                      <button type="button" onClick={removeImage} style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.65)', color: 'white',
                        border: 'none', borderRadius: '50%',
                        width: '30px', height: '30px', cursor: 'pointer', fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>✕</button>
                    </div>
                  )}
                </div>

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
                      <option>Female</option><option>Male</option>
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
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving || compressing}>
                    {saving ? 'Saving...' : editListing ? 'Update Listing ✅' : 'List for Sale 🏪'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== ENQUIRY MODAL ===== */}
      {showEnquiryModal && (
        <div className="modal-overlay" onClick={() => setShowEnquiryModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📬 Send Enquiry</h3>
              <button className="modal-close" onClick={() => setShowEnquiryModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              {showEnquiryModal.imageBase64 && (
                <img
                  src={`data:${showEnquiryModal.imageMimeType || 'image/jpeg'};base64,${showEnquiryModal.imageBase64}`}
                  alt="animal"
                  style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '16px' }}
                />
              )}
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