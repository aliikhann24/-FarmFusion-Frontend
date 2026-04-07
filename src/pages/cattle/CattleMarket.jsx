import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { cattleAPI, enquiryAPI } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import QuickNav from '../../components/common/QuickNav';
import ConfirmModal from '../../components/common/ConfirmModal';
import useConfirm from '../../hooks/UseConfirm';
import Animate from '../../components/common/Animate';

const SPECIES = ['Cow', 'Buffalo', 'Goat', 'Sheep', 'Bull', 'Calf', 'Other'];

const defaultForm = {
  tagId: '', name: '', species: 'Cow', breed: '', gender: 'Female',
  age: '', weight: '', price: '', location: '', description: '',
  imageBase64: null, imageMimeType: null
};

const defaultEnquiry = { buyerName: '', buyerPhone: '', offerPrice: '', message: '' };

const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let { width, height } = img;
        const maxDim = 1000;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round((height / width) * maxDim); width = maxDim; }
          else { width = Math.round((width / height) * maxDim); height = maxDim; }
        }
        canvas.width = width; canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        let quality = 0.8;
        let result = canvas.toDataURL('image/jpeg', quality);
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
  const { user } = useAuth();
  const [cattle, setCattle]                     = useState([]);
  const [loading, setLoading]                   = useState(true);
  const [showModal, setShowModal]               = useState(false);
  const [editListing, setEditListing]           = useState(null);
  const [showEnquiryModal, setShowEnquiryModal] = useState(null);
  const [viewAnimal, setViewAnimal]             = useState(null);
  const [form, setForm]                         = useState(defaultForm);
  const [enquiryForm, setEnquiryForm]           = useState(defaultEnquiry);
  const [enquiries, setEnquiries]               = useState([]);
  const [sentEnquiries, setSentEnquiries]       = useState([]);
  const [imagePreview, setImagePreview]         = useState(null);
  const [compressing, setCompressing]           = useState(false);
  const [search, setSearch]                     = useState('');
  const [filterSpecies, setFilterSpecies]       = useState('');
  const [saving, setSaving]                     = useState(false);
  const [activeTab, setActiveTab]               = useState('market');
  const [myUserId, setMyUserId]                 = useState(null);
  const [unseenChanges, setUnseenChanges]       = useState(0);

  const prevSentRef = useRef([]);
  const pollRef     = useRef(null);
  const imageRef    = useRef();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    if (user) {
      const id = user._id || user.id;
      setMyUserId(id?.toString());
    }
  }, [user]);

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

  // ✅ KEY FIX: compares ANY status change, not just from 'Pending'
  const loadSentEnquiries = async (notify = false) => {
    try {
      const { data } = await enquiryAPI.sent();
      const fresh = data.enquiries || [];

      if (notify && prevSentRef.current.length > 0) {
        let newChanges = 0;
        fresh.forEach(eq => {
          const prev = prevSentRef.current.find(p => p._id === eq._id);
          if (prev && prev.status !== eq.status) {
            newChanges++;
            const animalName = eq.cattle?.name || (eq.cattle?.tagId ? `Tag #${eq.cattle.tagId}` : 'your animal');
           if (eq.status === 'Accepted') {
  toast.success(
    `🎉 Your offer for ${animalName} was ACCEPTED! Contact the seller to finalize.`,
    { autoClose: 10000, toastId: `accepted-${eq._id}` }
  );
}
          }
        });
        // ✅ Increment unseen badge
        if (newChanges > 0) setUnseenChanges(prev => prev + newChanges);
      }

      // ✅ Always update ref AFTER comparison
      prevSentRef.current = fresh;
      setSentEnquiries(fresh);
    } catch (e) {
      console.error('Failed to load sent enquiries:', e);
    }
  };

  useEffect(() => { load(); }, [search, filterSpecies]); // eslint-disable-line

  // ✅ KEY FIX: seed prevSentRef first, then start polling AFTER seed is done
  useEffect(() => {
    loadEnquiries();
    loadSentEnquiries(false).then(() => {
      pollRef.current = setInterval(() => {
        loadEnquiries();
        loadSentEnquiries(true);
      }, 15000);
    });
    return () => clearInterval(pollRef.current);
  }, []); // eslint-disable-line

  // ✅ KEY FIX: notify=true when switching to tab so toast fires if already changed
  useEffect(() => {
    if (activeTab === 'enquiries') loadEnquiries();
    if (activeTab === 'my-enquiries') {
      loadSentEnquiries(true);
      setUnseenChanges(0); // clear badge when user views the tab
    }
  }, [activeTab]); // eslint-disable-line

  const isMyListing = (c) => {
    if (!myUserId || !c.seller) return false;
    const sellerId = typeof c.seller === 'object'
      ? (c.seller._id || c.seller.id)?.toString()
      : c.seller?.toString();
    return sellerId === myUserId;
  };

  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setCompressing(true);
    try {
      const compressed = await compressImage(file);
      const base64 = compressed.split(',')[1];
      setForm(p => ({ ...p, imageBase64: base64, imageMimeType: 'image/jpeg' }));
      setImagePreview(compressed);
      toast.success('Image ready ✅');
    } catch { toast.error('Failed to process image'); }
    finally { setCompressing(false); }
  };

  const removeImage = () => {
    setForm(p => ({ ...p, imageBase64: null, imageMimeType: null }));
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  const openAdd = () => { setEditListing(null); setForm(defaultForm); setImagePreview(null); setShowModal(true); };

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
    setImagePreview(c.imageBase64 ? `data:${c.imageMimeType || 'image/jpeg'};base64,${c.imageBase64}` : null);
    setViewAnimal(null);
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditListing(null); setForm(defaultForm); setImagePreview(null); };

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
      toast.error(err.response?.data?.message || 'Failed to save listing');
    } finally { setSaving(false); }
  };

  const handleDeleteListing = async (id) => {
    const ok = await confirm({
      title: 'Remove Listing?',
      message: 'This animal will be removed from the marketplace.',
      confirmText: 'Yes, Remove', type: 'warning'
    });
    if (!ok) return;
    try {
      await cattleAPI.delete(id);
      toast.success('Listing removed');
      setViewAnimal(null);
      load();
    } catch { toast.error('Failed to remove listing'); }
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
      toast.success('Enquiry sent! The seller will be notified. ✅');
      setShowEnquiryModal(null);
      setEnquiryForm(defaultEnquiry);
      loadSentEnquiries(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send enquiry');
    } finally { setSaving(false); }
  };

  const handleEnquiryStatus = async (id, status) => {
    try {
      await enquiryAPI.update(id, status);
      toast.success(`Enquiry ${status}! Buyer will be notified on next app refresh. ✅`);
      loadEnquiries();
    } catch { toast.error('Failed to update'); }
  };

  const handleDeleteEnquiry = async (id) => {
    const ok = await confirm({
      title: 'Delete Enquiry?',
      message: 'This enquiry will be permanently deleted.',
      confirmText: 'Yes, Delete', type: 'warning'
    });
    if (!ok) return;
    try {
      await enquiryAPI.delete(id);
      toast.success('Enquiry deleted');
      loadEnquiries();
    } catch { toast.error('Failed to delete enquiry'); }
  };

  const handleDeleteSentEnquiry = async (id) => {
    const ok = await confirm({
      title: 'Remove Enquiry?',
      message: 'This enquiry will be removed from your list.',
      confirmText: 'Yes, Remove', type: 'warning'
    });
    if (!ok) return;
    try {
      await enquiryAPI.deleteSent(id);
      toast.success('Enquiry removed');
      loadSentEnquiries(false);
    } catch { toast.error('Failed to remove enquiry'); }
  };

  const handleChange     = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  const statusMap        = { Pending: 'badge-orange', Accepted: 'badge-green', Rejected: 'badge-red' };
  const pendingEnquiries = enquiries.filter(e => e.status === 'Pending').length;
  const pendingSent      = sentEnquiries.filter(e => e.status === 'Pending').length;

  // ===== ANIMAL DETAIL CARD COMPONENT =====
  const AnimalDetailModal = ({ animal, onClose }) => (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🐄 {animal.name || `${animal.species} #${animal.tagId}`}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body" style={{ padding: 0 }}>
          {animal.imageBase64 ? (
            <img
              src={`data:${animal.imageMimeType || 'image/jpeg'};base64,${animal.imageBase64}`}
              alt={animal.name || animal.species}
              style={{ width: '100%', height: '260px', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <div style={{
              width: '100%', height: '180px',
              background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem'
            }}>🐄</div>
          )}

          <div style={{ padding: '20px 24px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.4rem', color: 'var(--primary-dark)', marginBottom: '4px' }}>
                  {animal.name || `${animal.species} #${animal.tagId}`}
                </h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Tag: {animal.tagId} • {animal.gender}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                <span className="badge badge-green">{animal.species}</span>
                {isMyListing(animal) && <span className="badge badge-blue">My Listing</span>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              {[
                { label: 'Breed',    value: animal.breed    || '—' },
                { label: 'Age',      value: animal.age      ? `${animal.age} yrs` : '—' },
                { label: 'Weight',   value: animal.weight   ? `${animal.weight} kg` : '—' },
                { label: 'Gender',   value: animal.gender   || '—' },
                { label: 'Species',  value: animal.species  || '—' },
                { label: 'Location', value: animal.location || '—' },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#f8faf8', borderRadius: '10px', padding: '10px 14px' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '3px' }}>{label}</div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)' }}>{value}</div>
                </div>
              ))}
            </div>

            {animal.description && (
              <div style={{ background: '#f4faf5', borderRadius: '10px', padding: '14px', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '6px' }}>Description</div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6 }}>{animal.description}</p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary)' }}>
                  PKR {Number(animal.price).toLocaleString()}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Listed by: {animal.seller?.farmName || animal.seller?.name || 'Unknown'}
                  {animal.seller?.phone && ` • 📞 ${animal.seller.phone}`}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isMyListing(animal) ? (
                <>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => openEdit(animal)}>
                    ✏️ Edit Listing
                  </button>
                  <button className="btn btn-danger" style={{ flex: 1 }} onClick={() => handleDeleteListing(animal._id)}>
                    🗑 Remove Listing
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" style={{ flex: 1 }} onClick={() => {
                    setShowEnquiryModal(animal);
                    setEnquiryForm({ ...defaultEnquiry, buyerName: user?.name || '', buyerPhone: user?.phone || '' });
                    onClose();
                  }}>
                    📬 Send Enquiry
                  </button>
                  {animal.seller?.phone && (
                    <a href={`tel:${animal.seller.phone}`} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>
                      📞 Call Seller
                    </a>
                  )}
                </>
              )}
              <button className="btn btn-outline btn-sm" onClick={onClose} style={{ width: '100%' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-cattle">
      <div className="page-header">
        <div><h2>🏪 Cattle Marketplace</h2><p>Buy & sell livestock</p></div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>

          {/* ===== MY OFFERS BUTTON with unseen badge ===== */}
          <button className="btn btn-outline btn-sm" style={{ position: 'relative' }}
            onClick={() => setActiveTab(activeTab === 'my-enquiries' ? 'market' : 'my-enquiries')}>
            {activeTab === 'my-enquiries' ? '🏪 Market' : '📋 My Offers'}
            {/* ✅ Red badge for new status changes (accepted/rejected) */}
            {unseenChanges > 0 && activeTab !== 'my-enquiries' && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: 'var(--danger)', color: 'white',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{unseenChanges}</span>
            )}
            {/* Yellow badge for pending (only when no unseen changes) */}
            {pendingSent > 0 && unseenChanges === 0 && activeTab !== 'my-enquiries' && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: 'var(--warning)', color: 'white',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{pendingSent}</span>
            )}
          </button>

          {/* ===== ENQUIRIES BUTTON ===== */}
          <button className="btn btn-outline btn-sm" style={{ position: 'relative' }}
            onClick={() => setActiveTab(activeTab === 'enquiries' ? 'market' : 'enquiries')}>
            {activeTab === 'enquiries' ? '🏪 Market' : '📬 Enquiries'}
            {pendingEnquiries > 0 && activeTab !== 'enquiries' && (
              <span style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: 'var(--danger)', color: 'white',
                borderRadius: '50%', width: '18px', height: '18px',
                fontSize: '0.65rem', fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>{pendingEnquiries}</span>
            )}
          </button>

          <button className="btn btn-primary btn-sm" onClick={openAdd}>+ List Animal</button>
        </div>
      </div>

      <div className="page-content">
        {/* ✅ Pass unseenChanges to QuickNav for sidebar badge */}
        <QuickNav cattleNotifications={unseenChanges} />

        {/* ===== MARKETPLACE TAB ===== */}
        {activeTab === 'market' && (
          <>
            <Animate direction="left">
              <div className="filter-bar">
                <input className="search-input" placeholder="🔍 Search by name, breed or location..."
                  value={search} onChange={e => setSearch(e.target.value)} />
                <select className="search-input" style={{ flex: 'none', width: 'auto' }}
                  value={filterSpecies} onChange={e => setFilterSpecies(e.target.value)}>
                  <option value="">All Species</option>
                  {SPECIES.map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </Animate>

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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
                {cattle.map((c, i) => (
                  <Animate key={c._id} direction="up" delay={i * 60}>
                    <div className="card" style={{ overflow: 'hidden', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
                      onClick={() => setViewAnimal(c)}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(45,106,79,0.18)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = ''; }}
                    >
                      {c.imageBase64 ? (
                        <img
                          src={`data:${c.imageMimeType || 'image/jpeg'};base64,${c.imageBase64}`}
                          alt={c.name || c.species}
                          style={{ width: '100%', height: '190px', objectFit: 'cover', display: 'block' }}
                        />
                      ) : (
                        <div style={{
                          width: '100%', height: '130px',
                          background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem'
                        }}>🐄</div>
                      )}

                      <div style={{ padding: '14px 16px 16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                          <div>
                            <h3 style={{ fontSize: '1rem', color: 'var(--primary-dark)', marginBottom: '2px' }}>
                              {c.name || `${c.species} #${c.tagId}`}
                            </h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Tag: {c.tagId} • {c.gender}</p>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-end' }}>
                            <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>{c.species}</span>
                            {isMyListing(c) && <span className="badge badge-blue" style={{ fontSize: '0.62rem' }}>Mine</span>}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          {c.breed    && <span style={{ background: '#f4faf5', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.breed}</span>}
                          {c.age      && <span style={{ background: '#f4faf5', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.age} yrs</span>}
                          {c.weight   && <span style={{ background: '#f4faf5', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.weight} kg</span>}
                          {c.location && <span style={{ background: '#f4faf5', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>📍{c.location}</span>}
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                              PKR {Number(c.price).toLocaleString()}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {c.seller?.farmName || c.seller?.name || 'Unknown'}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }} onClick={e => e.stopPropagation()}>
                            {isMyListing(c) ? (
                              <>
                                <button className="btn btn-outline btn-sm" style={{ padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => openEdit(c)}>✏️</button>
                                <button className="btn btn-danger btn-sm" style={{ padding: '6px 10px', fontSize: '0.78rem' }} onClick={() => handleDeleteListing(c._id)}>🗑</button>
                              </>
                            ) : (
                              <button className="btn btn-primary btn-sm" style={{ fontSize: '0.78rem' }}
                                onClick={() => {
                                  setShowEnquiryModal(c);
                                  setEnquiryForm({ ...defaultEnquiry, buyerName: user?.name || '', buyerPhone: user?.phone || '' });
                                }}>
                                📬 Enquire
                              </button>
                            )}
                          </div>
                        </div>

                        <div style={{ marginTop: '10px', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          👆 Click card for full details
                        </div>
                      </div>
                    </div>
                  </Animate>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== SELLER ENQUIRIES TAB ===== */}
        {activeTab === 'enquiries' && (
          <Animate direction="up" delay={0}>
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
                              {eq.status === 'Pending' && (
                                <>
                                  <button className="btn btn-sm"
                                    style={{ background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                                    onClick={() => handleEnquiryStatus(eq._id, 'Accepted')}>✅ Accept</button>
                                  <button className="btn btn-sm"
                                    style={{ background: '#fde8ea', color: '#c62828', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                                    onClick={() => handleEnquiryStatus(eq._id, 'Rejected')}>❌ Reject</button>
                                </>
                              )}
                              <button className="btn btn-sm"
                                style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                                onClick={() => handleDeleteEnquiry(eq._id)}>🗑 Delete</button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Animate>
        )}

        {/* ===== BUYER SENT ENQUIRIES TAB ===== */}
        {activeTab === 'my-enquiries' && (
          <Animate direction="up" delay={0}>
            <div className="card">
              <div className="card-header">
                <h3>📋 My Sent Enquiries
                  {pendingSent > 0 && (
                    <span style={{ marginLeft: '8px', background: 'var(--warning)', color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '0.75rem' }}>
                      {pendingSent} pending
                    </span>
                  )}
                </h3>
                <button className="btn btn-outline btn-sm" onClick={() => loadSentEnquiries(false)}>🔄 Refresh</button>
              </div>
              {sentEnquiries.length === 0 ? (
                <div className="empty-state" style={{ padding: '40px' }}>
                  <div className="icon">📋</div>
                  <h3>No enquiries sent yet</h3>
                  <p>Browse the marketplace and send enquiries to sellers</p>
                  <button className="btn btn-primary" onClick={() => setActiveTab('market')}>Browse Market</button>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>Animal</th><th>My Offer</th><th>My Message</th>
                        <th>Seller</th><th>Status</th><th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sentEnquiries.map(eq => (
                        <tr key={eq._id} style={{
                          background: eq.status === 'Accepted' ? '#f0fff4'
                                    : eq.status === 'Rejected' ? '#fff5f5'
                                    : undefined
                        }}>
                          <td>
                            <strong>{eq.cattle?.name || eq.cattle?.tagId || '—'}</strong>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {eq.cattle?.species} • PKR {Number(eq.cattle?.price || 0).toLocaleString()}
                            </div>
                          </td>
                          <td>
                            {eq.offerPrice
                              ? <span style={{ fontWeight: 700, color: 'var(--primary)' }}>PKR {Number(eq.offerPrice).toLocaleString()}</span>
                              : '—'}
                          </td>
                          <td style={{ maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {eq.message || '—'}
                          </td>
                          <td>
                      
  <div>{eq.cattle?.seller?.farmName || eq.cattle?.seller?.name || '—'}</div>
  {eq.status === 'Accepted' && eq.cattle?.seller?.phone && (
    <a href={`tel:${eq.cattle.seller.phone}`} style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem', display: 'block', marginTop: '4px' }}>
      📞 {eq.cattle.seller.phone}
    </a>
  )}
</td>
                          <td>
                            <span className={`badge ${statusMap[eq.status]}`}>{eq.status}</span>
                            {eq.status === 'Accepted' && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 600, marginTop: '4px' }}>
                                🎉 Contact the seller!
                              </div>
                            )}
                            {eq.status === 'Rejected' && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: '4px' }}>
                                Try another listing
                              </div>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-sm"
                              style={{ background: '#f5f5f5', color: '#555', border: 'none', borderRadius: '6px', padding: '5px 10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}
                              onClick={() => handleDeleteSentEnquiry(eq._id)}
                            >
                              🗑 Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </Animate>
        )}
      </div>

      {/* ===== ANIMAL DETAIL MODAL ===== */}
      {viewAnimal && <AnimalDetailModal animal={viewAnimal} onClose={() => setViewAnimal(null)} />}

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
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>JPG, PNG up to 5MB</div>
                      <input ref={imageRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <img src={imagePreview} alt="preview"
                        style={{ width: '100%', height: '200px', objectFit: 'cover', borderRadius: '10px', border: '2px solid var(--border)' }} />
                      <button type="button" onClick={removeImage} style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.65)', color: 'white', border: 'none',
                        borderRadius: '50%', width: '30px', height: '30px', cursor: 'pointer',
                        fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center'
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
                  {showEnquiryModal.species} • {showEnquiryModal.gender} • {showEnquiryModal.location || 'No location'}
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
                    placeholder="e.g. I am interested, please contact me..." />
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

      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        type={confirmState.type}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
