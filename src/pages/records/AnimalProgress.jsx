import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { progressAPI, animalsAPI } from '../../utils/api';
import QuickNav from '../../components/common/QuickNav';
import ConfirmModal from '../../components/common/ConfirmModal';
import useConfirm from '../../hooks/UseConfirm';
import Animate from '../../components/common/Animate';

const defaultForm = {
  animal: '',
  date: new Date().toISOString().split('T')[0],
  weight: '', height: '', milkProduction: '',
  healthStatus: 'Good', notes: '',
  imageBase64: null, imageMimeType: null,
  videoBase64: null, videoMimeType: null,
  videoLink: ''
};

// Compress image
const compressImage = (file, maxSizeKB = 500) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();
    img.onload = () => {
      let { width, height } = img;
      const maxDim = 1200;
      if (width > maxDim || height > maxDim) {
        if (width > height) { height = (height / width) * maxDim; width = maxDim; }
        else { width = (width / height) * maxDim; height = maxDim; }
      }
      canvas.width = width; canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      let quality = 0.8;
      let result  = canvas.toDataURL('image/jpeg', quality);
      while (result.length > maxSizeKB * 1024 * 1.37 && quality > 0.2) {
        quality -= 0.1;
        result = canvas.toDataURL('image/jpeg', quality);
      }
      resolve(result);
    };
    img.src = URL.createObjectURL(file);
  });
};

// Read file as base64
const readFileAsBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export default function AnimalProgress() {
  const [records, setRecords]           = useState([]);
  const [animals, setAnimals]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [editRecord, setEditRecord]     = useState(null);
  const [form, setForm]                 = useState(defaultForm);
  const [saving, setSaving]             = useState(false);
  const [filterAnimal, setFilterAnimal] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);  // ✅ local video preview URL
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoProgress, setVideoProgress]   = useState(0);
  const [viewImage, setViewImage]       = useState(null);
  const [viewVideo, setViewVideo]       = useState(null);  // ✅ {type:'uploaded'|'link', src, mime}
  const [compressing, setCompressing]   = useState(false);
  const imageRef = useRef();
  const videoRef = useRef();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

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

  const openAdd = () => {
    setEditRecord(null);
    setForm(defaultForm);
    setImagePreview(null);
    setVideoPreview(null);
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    setForm({
      animal:        record.animal?._id  || '',
      date:          record.date         ? record.date.split('T')[0] : '',
      weight:        record.weight        || '',
      height:        record.height        || '',
      milkProduction:record.milkProduction|| '',
      healthStatus:  record.healthStatus  || 'Good',
      notes:         record.notes         || '',
      imageBase64:   record.imageBase64   || null,
      imageMimeType: record.imageMimeType || null,
      videoBase64:   record.videoBase64   || null,
      videoMimeType: record.videoMimeType || null,
      videoLink:     record.videoLink     || '',
    });
    setImagePreview(
      record.imageBase64
        ? `data:${record.imageMimeType};base64,${record.imageBase64}`
        : null
    );
    // If there's an uploaded video, create a preview URL
    setVideoPreview(
      record.videoBase64
        ? `data:${record.videoMimeType};base64,${record.videoBase64}`
        : null
    );
    setShowModal(true);
  };

  // ===== IMAGE HANDLER =====
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setCompressing(true);
    try {
      const compressed = await compressImage(file, 500);
      const base64     = compressed.split(',')[1];
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

  // ===== VIDEO HANDLER =====
  const handleVideoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const maxMB = 20;
    if (file.size > maxMB * 1024 * 1024) {
      toast.error(`Video must be under ${maxMB}MB`);
      if (videoRef.current) videoRef.current.value = '';
      return;
    }

    // Allowed types
    const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload MP4, WebM, OGG or MOV video');
      if (videoRef.current) videoRef.current.value = '';
      return;
    }

    setUploadingVideo(true);
    setVideoProgress(0);

    try {
      // Show size info
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      toast.info(`Processing ${sizeMB}MB video...`, { autoClose: 2000 });

      // Simulate progress while reading
      const progressInterval = setInterval(() => {
        setVideoProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const dataUrl = await readFileAsBase64(file);
      clearInterval(progressInterval);
      setVideoProgress(100);

      const base64 = dataUrl.split(',')[1];
      setForm(p => ({
        ...p,
        videoBase64:   base64,
        videoMimeType: file.type,
        videoLink:     ''   // clear any old YouTube link
      }));
      // Create local object URL for preview (lighter than base64)
      const objectUrl = URL.createObjectURL(file);
      setVideoPreview(objectUrl);
      toast.success(`Video ready! (${sizeMB}MB) ✅`);
    } catch {
      toast.error('Failed to process video');
    } finally {
      setUploadingVideo(false);
      setVideoProgress(0);
    }
  };

  const removeVideo = () => {
    setForm(p => ({ ...p, videoBase64: null, videoMimeType: null, videoLink: '' }));
    setVideoPreview(null);
    if (videoRef.current) videoRef.current.value = '';
  };

  // ===== SUBMIT =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRecord) {
        await progressAPI.update(editRecord._id, form);
        toast.success('Progress updated! ✅');
      } else {
        await progressAPI.create(form);
        toast.success('Progress record added! 📈');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Progress Record?',
      message: 'This progress entry including any photo and video will be permanently removed.',
      confirmText: 'Yes, Delete', type: 'danger'
    });
    if (!ok) return;
    try {
      await progressAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditRecord(null);
    setForm(defaultForm);
    setImagePreview(null);
    setVideoPreview(null);
    setVideoProgress(0);
  };

  const getImageSrc = (record) => {
    if (!record.imageBase64) return null;
    return `data:${record.imageMimeType};base64,${record.imageBase64}`;
  };

  const hasVideo = (record) => record.videoBase64 || record.videoLink;

  const healthMap = {
    Excellent: 'badge-green', Good: 'badge-blue',
    Fair: 'badge-orange',     Poor: 'badge-red'
  };

  const avgWeight = records.filter(r => r.weight).length > 0
    ? Math.round(records.filter(r => r.weight).reduce((s, r) => s + r.weight, 0) / records.filter(r => r.weight).length)
    : 0;

  const avgMilk = records.filter(r => r.milkProduction).length > 0
    ? (records.filter(r => r.milkProduction).reduce((s, r) => s + r.milkProduction, 0) / records.filter(r => r.milkProduction).length).toFixed(1)
    : 0;

  return (
    <div className="page-progress">
      <div className="page-header">
        <div><h2>📈 Animal Progress</h2><p>Track health & growth over time</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Progress</button>
      </div>

      <div className="page-content">
        <QuickNav />

        {/* ===== STATS ===== */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Records',    value: records.length, icon: '📈', cls: 'green'  },
            { label: 'Avg Weight (kg)',  value: avgWeight,      icon: '⚖️', cls: 'blue'   },
            { label: 'Avg Milk (L/day)', value: avgMilk,        icon: '🥛', cls: 'orange' },
            { label: 'Excellent Health', value: records.filter(r => r.healthStatus === 'Excellent').length, icon: '💚', cls: 'purple' },
          ].map((s, i) => (
            <Animate key={s.label} direction="up" delay={i * 80}>
              <div className="stat-card">
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div className="stat-info">
                  <div className="value">{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              </div>
            </Animate>
          ))}
        </div>

        {/* ===== FILTER ===== */}
        <Animate direction="left">
          <div className="filter-bar">
            <select className="search-input"
              style={{ flex: 'none', width: 'auto', minWidth: '200px' }}
              value={filterAnimal} onChange={e => setFilterAnimal(e.target.value)}>
              <option value="">All Animals</option>
              {animals.map(a => (
                <option key={a._id} value={a._id}>{a.name || a.tagId} ({a.species})</option>
              ))}
            </select>
          </div>
        </Animate>

        {/* ===== TABLE ===== */}
        <Animate direction="up" delay={120}>
          <div className="card">
            {loading ? (
              <div className="empty-state"><p>Loading...</p></div>
            ) : records.length === 0 ? (
              <div className="empty-state">
                <div className="icon">📈</div>
                <h3>No progress records</h3>
                <p>Start tracking your animals' health and growth</p>
                <button className="btn btn-primary" onClick={openAdd}>+ Add Progress</button>
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Animal</th><th>Date</th><th>Weight</th>
                      <th>Height</th><th>Milk</th><th>Health</th>
                      <th>Photo</th><th>Video</th><th>Notes</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map(r => (
                      <tr key={r._id}>
                        <td>
                          <strong>{r.animal?.name || r.animal?.tagId || '—'}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{r.animal?.species}</div>
                        </td>
                        <td>{new Date(r.date).toLocaleDateString()}</td>
                        <td>{r.weight ? `${r.weight} kg` : '—'}</td>
                        <td>{r.height ? `${r.height} cm` : '—'}</td>
                        <td>{r.milkProduction ? `${r.milkProduction} L` : '—'}</td>
                        <td>
                          <span className={`badge ${healthMap[r.healthStatus]}`}>
                            {r.healthStatus}
                          </span>
                        </td>
                        <td>
                          {r.imageBase64 ? (
                            <img
                              src={getImageSrc(r)}
                              alt="progress"
                              onClick={() => setViewImage(getImageSrc(r))}
                              style={{
                                width: '44px', height: '44px',
                                objectFit: 'cover', borderRadius: '8px',
                                cursor: 'pointer', border: '2px solid var(--border)'
                              }}
                            />
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td>
                          {/* ✅ Handles both uploaded video and old YouTube links */}
                          {r.videoBase64 ? (
                            <button className="btn btn-outline btn-sm"
                              onClick={() => setViewVideo({ type: 'uploaded', src: `data:${r.videoMimeType};base64,${r.videoBase64}`, mime: r.videoMimeType })}>
                              🎥 Play
                            </button>
                          ) : r.videoLink ? (
                            <button className="btn btn-outline btn-sm"
                              onClick={() => setViewVideo({ type: 'link', src: r.videoLink })}>
                              🔗 Watch
                            </button>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
        </Animate>
      </div>

      {/* ===== ADD / EDIT MODAL ===== */}
      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editRecord ? 'Edit Progress Record' : 'Add Progress Record'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>

                {/* Animal + Date */}
                <div className="form-row">
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
                  <div className="form-group">
                    <label>Date *</label>
                    <input type="date" value={form.date}
                      onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                  </div>
                </div>

                {/* Weight + Height */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Weight (kg)</label>
                    <input type="number" value={form.weight}
                      onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                      min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input type="number" value={form.height}
                      onChange={e => setForm(p => ({ ...p, height: e.target.value }))}
                      min="0" placeholder="0" />
                  </div>
                </div>

                {/* Milk + Health */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Milk Production (L/day)</label>
                    <input type="number" value={form.milkProduction}
                      onChange={e => setForm(p => ({ ...p, milkProduction: e.target.value }))}
                      min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Health Status</label>
                    <select value={form.healthStatus}
                      onChange={e => setForm(p => ({ ...p, healthStatus: e.target.value }))}>
                      {['Excellent', 'Good', 'Fair', 'Poor'].map(h => (
                        <option key={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* ===== IMAGE UPLOAD ===== */}
                <div className="form-group">
                  <label>📸 Animal Photo</label>
                  {!imagePreview ? (
                    <div className="upload-box"
                      onClick={() => !compressing && imageRef.current.click()}
                      style={{ opacity: compressing ? 0.6 : 1, cursor: compressing ? 'not-allowed' : 'pointer' }}>
                      <div style={{ fontSize: '2rem' }}>{compressing ? '⏳' : '🖼️'}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {compressing ? 'Compressing...' : 'Click to upload photo'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        JPG, PNG up to 5MB — auto compressed
                      </div>
                      <input ref={imageRef} type="file" accept="image/*"
                        onChange={handleImageChange} style={{ display: 'none' }} />
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      <img src={imagePreview} alt="preview"
                        style={{ width: '100%', height: '180px', objectFit: 'cover',
                          borderRadius: '10px', border: '2px solid var(--border)' }} />
                      <button type="button" onClick={removeImage} style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.6)', color: 'white',
                        border: 'none', borderRadius: '50%',
                        width: '28px', height: '28px', cursor: 'pointer', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>✕</button>
                    </div>
                  )}
                </div>

                {/* ===== VIDEO UPLOAD ===== */}
                <div className="form-group">
                  <label>🎥 Animal Video</label>
                  {!videoPreview && !form.videoBase64 ? (
                    <div className="upload-box"
                      onClick={() => !uploadingVideo && videoRef.current.click()}
                      style={{ opacity: uploadingVideo ? 0.6 : 1, cursor: uploadingVideo ? 'not-allowed' : 'pointer' }}>
                      <div style={{ fontSize: '2rem' }}>{uploadingVideo ? '⏳' : '🎥'}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {uploadingVideo ? `Processing video... ${videoProgress}%` : 'Click to upload video'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        MP4, WebM, MOV up to 20MB
                      </div>
                      {/* Progress bar while uploading */}
                      {uploadingVideo && (
                        <div style={{ width: '80%', background: '#e0e0e0', borderRadius: '4px', height: '6px', marginTop: '8px' }}>
                          <div style={{
                            width: `${videoProgress}%`, background: 'var(--primary)',
                            borderRadius: '4px', height: '6px', transition: 'width 0.2s'
                          }} />
                        </div>
                      )}
                      <input ref={videoRef} type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleVideoChange} style={{ display: 'none' }} />
                    </div>
                  ) : (
                    <div style={{ position: 'relative' }}>
                      {/* ✅ Native video player preview */}
                      <video
                        src={videoPreview || (form.videoBase64 ? `data:${form.videoMimeType};base64,${form.videoBase64}` : undefined)}
                        controls
                        style={{
                          width: '100%', maxHeight: '220px',
                          borderRadius: '10px', border: '2px solid var(--border)',
                          background: '#000', display: 'block'
                        }}
                      />
                      <button type="button" onClick={removeVideo} style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.7)', color: 'white',
                        border: 'none', borderRadius: '50%',
                        width: '30px', height: '30px', cursor: 'pointer', fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}>✕</button>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '6px', textAlign: 'center' }}>
                        ✅ Video ready to save
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="form-group">
                  <label>Notes</label>
                  <textarea value={form.notes}
                    onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                    rows={3} style={{ resize: 'vertical' }} placeholder="Any observations..." />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary"
                    disabled={saving || compressing || uploadingVideo}>
                    {saving ? 'Saving...' : uploadingVideo ? 'Processing video...' : editRecord ? 'Update Record' : 'Add Progress'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW IMAGE MODAL ===== */}
      {viewImage && (
        <div className="modal-overlay" onClick={() => setViewImage(null)}>
          <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🖼️ Animal Photo</h3>
              <button className="modal-close" onClick={() => setViewImage(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              <img src={viewImage} alt="Animal"
                style={{ width: '100%', borderRadius: '10px', maxHeight: '500px', objectFit: 'contain' }} />
            </div>
          </div>
        </div>
      )}

      {/* ===== VIEW VIDEO MODAL ===== */}
      {viewVideo && (
        <div className="modal-overlay" onClick={() => setViewVideo(null)}>
          <div className="modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎥 Animal Video</h3>
              <button className="modal-close" onClick={() => setViewVideo(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              {viewVideo.type === 'uploaded' ? (
                /* ✅ Native HTML5 player for uploaded videos */
                <video
                  src={viewVideo.src}
                  controls
                  autoPlay
                  style={{ width: '100%', borderRadius: '10px', background: '#000', maxHeight: '480px' }}
                />
              ) : (
                /* YouTube / external link fallback */
                <>
                  <iframe
                    src={(() => {
                      const url = viewVideo.src;
                      const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;
                      const gdMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
                      if (gdMatch) return `https://drive.google.com/file/d/${gdMatch[1]}/preview`;
                      return url;
                    })()}
                    title="Animal Video"
                    width="100%" height="400"
                    frameBorder="0" allowFullScreen
                    style={{ borderRadius: '10px' }}
                  />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                    If video doesn't load,{' '}
                    <a href={viewVideo.src} target="_blank" rel="noreferrer"
                      style={{ color: 'var(--primary)' }}>open in new tab</a>
                  </p>
                </>
              )}
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