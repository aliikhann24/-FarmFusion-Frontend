import { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { progressAPI, animalsAPI } from '../../utils/api';
import QuickNav from '../../components/common/QuickNav';
import ConfirmModal from '../../components/common/ConfirmModal';
import useConfirm from '../../hooks/UseConfirm';
import Animate from '../../components/common/Animate';

// ─────────────────────────────────────────────────────────────────────────────
// FFmpeg WASM loader (lazy — only loads when user picks a large video)
// Run once in your project:  npm install @ffmpeg/ffmpeg @ffmpeg/util
// ─────────────────────────────────────────────────────────────────────────────
let _ffmpegInstance = null;
let _ffmpegLoaded   = false;
let _ffmpegLoading  = false;
let _ffmpegQueue    = [];

const getFFmpeg = () =>
  new Promise(async (resolve, reject) => {
    if (_ffmpegLoaded && _ffmpegInstance) { resolve(_ffmpegInstance); return; }
    _ffmpegQueue.push({ resolve, reject });
    if (_ffmpegLoading) return;
    _ffmpegLoading = true;
    try {
      const { FFmpeg }              = await import('@ffmpeg/ffmpeg');
      const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
      const ff      = new FFmpeg();
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      await ff.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`,   'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ff._fetchFile  = fetchFile;
      _ffmpegInstance = ff;
      _ffmpegLoaded   = true;
      _ffmpegLoading  = false;
      _ffmpegQueue.forEach(q => q.resolve(ff));
      _ffmpegQueue = [];
    } catch (err) {
      _ffmpegLoading = false;
      _ffmpegQueue.forEach(q => q.reject(err));
      _ffmpegQueue = [];
    }
  });

// ─────────────────────────────────────────────────────────────────────────────
// Compress video using FFmpeg WASM → returns a Blob (video/mp4)
// Targets ≤ 50 MB. Two-pass: CRF 28 first, CRF 35 if still too big.
// ─────────────────────────────────────────────────────────────────────────────
const compressVideoFFmpeg = async (file, onProgress) => {
  const ff = await getFFmpeg();

  const ext       = file.name?.includes('.') ? '.' + file.name.split('.').pop().toLowerCase() : '.mp4';
  const inputName = `input${ext}`;
  const outName   = 'output.mp4';

  ff.on('progress', ({ progress }) => onProgress(Math.round(Math.min(progress * 100, 98))));
  ff.writeFile(inputName, await ff._fetchFile(file));

  await ff.exec([
    '-i', inputName,
    '-vf', "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease",
    '-c:v', 'libx264', '-crf', '28', '-preset', 'fast',
    '-c:a', 'aac', '-b:a', '96k',
    '-movflags', '+faststart',
    '-y', outName,
  ]);

  let data = await ff.readFile(outName);
  let blob = new Blob([data.buffer], { type: 'video/mp4' });

  // Second pass if still > 50 MB
  if (blob.size > 50 * 1024 * 1024) {
    onProgress(5);
    await ff.exec([
      '-i', outName,
      '-c:v', 'libx264', '-crf', '35', '-preset', 'fast',
      '-c:a', 'aac', '-b:a', '64k',
      '-movflags', '+faststart',
      '-y', 'output2.mp4',
    ]);
    data = await ff.readFile('output2.mp4');
    blob = new Blob([data.buffer], { type: 'video/mp4' });
    try { await ff.deleteFile('output2.mp4'); } catch {}
  }

  try { await ff.deleteFile(inputName); } catch {}
  try { await ff.deleteFile(outName);   } catch {}
  ff.off('progress');
  return blob;
};

// ─────────────────────────────────────────────────────────────────────────────
// Compress image using Canvas (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
const compressImage = (file, maxSizeKB = 500) =>
  new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx    = canvas.getContext('2d');
    const img    = new Image();
    img.onload = () => {
      let { width: w, height: h } = img;
      const max = 1200;
      if (w > max || h > max) {
        if (w > h) { h = (h / w) * max; w = max; }
        else       { w = (w / h) * max; h = max; }
      }
      canvas.width = w; canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      let q = 0.8;
      let r = canvas.toDataURL('image/jpeg', q);
      while (r.length > maxSizeKB * 1024 * 1.37 && q > 0.2) { q -= 0.1; r = canvas.toDataURL('image/jpeg', q); }
      resolve(r);
    };
    img.src = URL.createObjectURL(file);
  });

// Read blob as base64 data-URL
const toBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload  = e => resolve(e.target.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

// ─────────────────────────────────────────────────────────────────────────────
// Build full video URL (handles both server path and legacy YouTube links)
// ─────────────────────────────────────────────────────────────────────────────
const getFullVideoUrl = (videoUrl) => {
  if (!videoUrl) return null;
  if (videoUrl.startsWith('http')) return videoUrl; // already absolute (old records)
  // Relative path like /uploads/videos/video_xxx.mp4
  const base = (import.meta.env?.VITE_API_URL || '').replace('/api', '').replace(/\/$/, '');
  return `${base}${videoUrl}`;
};

// ─────────────────────────────────────────────────────────────────────────────
// Default form
// ─────────────────────────────────────────────────────────────────────────────
const defaultForm = {
  animal: '',
  date:   new Date().toISOString().split('T')[0],
  weight: '', height: '', milkProduction: '',
  healthStatus: 'Good', notes: '',
  imageBase64:   null, imageMimeType: null,
  videoBase64:   null, videoMimeType: null, // sent to backend, saved to disk there
  videoLink:     '',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AnimalProgress() {
  const [records,       setRecords]       = useState([]);
  const [animals,       setAnimals]       = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showModal,     setShowModal]     = useState(false);
  const [editRecord,    setEditRecord]    = useState(null);
  const [form,          setForm]          = useState(defaultForm);
  const [saving,        setSaving]        = useState(false);
  const [filterAnimal,  setFilterAnimal]  = useState('');
  const [imagePreview,  setImagePreview]  = useState(null);
  const [videoPreview,  setVideoPreview]  = useState(null); // local object URL for preview
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoStatus,   setVideoStatus]   = useState('idle');
  // idle | loading-ffmpeg | compressing | reading | done | error
  const [viewImage,     setViewImage]     = useState(null);
  const [viewVideo,     setViewVideo]     = useState(null); // { type, src }
  const [compressing,   setCompressing]   = useState(false);

  const imageRef         = useRef();
  const videoRef         = useRef();
  const previewUrlRef    = useRef(null); // tracks object URL for cleanup

  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  // ── Load data ────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [recRes, animRes] = await Promise.all([
        progressAPI.getAll({ animalId: filterAnimal }),
        animalsAPI.getAll(),
      ]);
      setRecords(recRes.data.records || []);
      setAnimals(animRes.data.animals || []);
    } catch { toast.error('Failed to load data'); }
    finally   { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterAnimal]);
  useEffect(() => () => { if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current); }, []);

  // ── Reset video state ────────────────────────────────────────────
  const resetVideo = () => {
    if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null; }
    setVideoPreview(null);
    setVideoProgress(0);
    setVideoStatus('idle');
    if (videoRef.current) videoRef.current.value = '';
  };

  // ── Open modals ──────────────────────────────────────────────────
  const openAdd = () => {
    setEditRecord(null);
    setForm(defaultForm);
    setImagePreview(null);
    resetVideo();
    setShowModal(true);
  };

  const openEdit = (record) => {
    setEditRecord(record);
    setForm({
      animal:         record.animal?._id    || '',
      date:           record.date ? record.date.split('T')[0] : '',
      weight:         record.weight         || '',
      height:         record.height         || '',
      milkProduction: record.milkProduction || '',
      healthStatus:   record.healthStatus   || 'Good',
      notes:          record.notes          || '',
      imageBase64:    record.imageBase64    || null,
      imageMimeType:  record.imageMimeType  || null,
      videoBase64:    null,         // don't re-send old video; backend keeps existing
      videoMimeType:  null,
      videoLink:      record.videoLink      || '',
    });
    setImagePreview(
      record.imageBase64
        ? `data:${record.imageMimeType};base64,${record.imageBase64}`
        : null
    );
    // Show existing video as preview URL (served from server)
    if (record.videoUrl) {
      setVideoPreview(getFullVideoUrl(record.videoUrl));
      setVideoStatus('done');
    } else {
      resetVideo();
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditRecord(null);
    setForm(defaultForm);
    setImagePreview(null);
    resetVideo();
  };

  // ── Image handler ────────────────────────────────────────────────
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5 MB'); return; }
    setCompressing(true);
    try {
      const compressed = await compressImage(file, 500);
      setForm(p => ({ ...p, imageBase64: compressed.split(',')[1], imageMimeType: 'image/jpeg' }));
      setImagePreview(compressed);
      toast.success('Image ready ✅');
    } catch { toast.error('Failed to process image'); }
    finally   { setCompressing(false); }
  };

  const removeImage = () => {
    setForm(p => ({ ...p, imageBase64: null, imageMimeType: null }));
    setImagePreview(null);
    if (imageRef.current) imageRef.current.value = '';
  };

  // ── Video handler ────────────────────────────────────────────────
  const handleVideoChange = useCallback(async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload MP4, WebM, OGG or MOV');
      if (videoRef.current) videoRef.current.value = '';
      return;
    }

    const MAX_MB = 200;
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_MB} MB. Please trim it first.`);
      if (videoRef.current) videoRef.current.value = '';
      return;
    }

    const sizeMB          = (file.size / (1024 * 1024)).toFixed(1);
    const needsCompress   = file.size > 50 * 1024 * 1024;

    resetVideo();

    try {
      let finalBlob;

      if (needsCompress) {
        // Step 1 — load FFmpeg
        setVideoStatus('loading-ffmpeg');
        toast.info('Loading video compressor… (first time ~5 s)', { autoClose: 6000 });
        await getFFmpeg();

        // Step 2 — compress
        setVideoStatus('compressing');
        toast.info(`Compressing ${sizeMB} MB video…`, { autoClose: false, toastId: 'cvid' });
        finalBlob = await compressVideoFFmpeg(file, setVideoProgress);
        toast.dismiss('cvid');

        const outMB = (finalBlob.size / (1024 * 1024)).toFixed(1);
        toast.success(`Compressed ${sizeMB} MB → ${outMB} MB ✅`);
      } else {
        finalBlob = file;
        toast.info(`Processing ${sizeMB} MB video…`, { autoClose: 2000 });
      }

      // Step 3 — read as base64 to send to backend
      setVideoStatus('reading');
      setVideoProgress(99);
      const dataUrl = await toBase64(finalBlob);
      const base64  = dataUrl.split(',')[1];

      setForm(p => ({
        ...p,
        videoBase64:   base64,
        videoMimeType: needsCompress ? 'video/mp4' : file.type,
        videoLink:     '',
      }));

      // Local preview
      const previewUrl = URL.createObjectURL(finalBlob);
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = previewUrl;
      setVideoPreview(previewUrl);
      setVideoProgress(100);
      setVideoStatus('done');

      if (!needsCompress) toast.success(`Video ready (${sizeMB} MB) ✅`);

    } catch (err) {
      console.error('Video error:', err);
      setVideoStatus('error');
      setVideoProgress(0);
      toast.error('Video processing failed. Try a shorter clip.');
      if (videoRef.current) videoRef.current.value = '';
    }
  }, []);

  const removeVideo = () => {
    setForm(p => ({ ...p, videoBase64: null, videoMimeType: null, videoLink: '' }));
    resetVideo();
  };

  // ── Submit ───────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRecord) {
        await progressAPI.update(editRecord._id, form);
        toast.success('Progress updated ✅');
      } else {
        await progressAPI.create(form);
        toast.success('Progress record added 📈');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  // ── Delete ───────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Progress Record?',
      message: 'This entry including any photo and video will be permanently removed.',
      confirmText: 'Yes, Delete', type: 'danger',
    });
    if (!ok) return;
    try {
      await progressAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  // ── Derived ──────────────────────────────────────────────────────
  const getImageSrc       = (r) => r.imageBase64 ? `data:${r.imageMimeType};base64,${r.imageBase64}` : null;
  const isVideoProcessing = ['loading-ffmpeg', 'compressing', 'reading'].includes(videoStatus);

  const videoStatusLabel = {
    'idle':          'Click to upload video',
    'loading-ffmpeg':'Loading compressor…',
    'compressing':   `Compressing… ${videoProgress}%`,
    'reading':       'Finalising…',
    'done':          'Video ready ✅',
    'error':         'Failed — click to try again',
  }[videoStatus];

  const healthMap = { Excellent: 'badge-green', Good: 'badge-blue', Fair: 'badge-orange', Poor: 'badge-red' };

  const weightRecs = records.filter(r => r.weight);
  const milkRecs   = records.filter(r => r.milkProduction);
  const avgWeight  = weightRecs.length ? Math.round(weightRecs.reduce((s, r) => s + r.weight, 0) / weightRecs.length) : 0;
  const avgMilk    = milkRecs.length   ? (milkRecs.reduce((s, r) => s + r.milkProduction, 0) / milkRecs.length).toFixed(1) : 0;

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="page-progress">

      {/* Header */}
      <div className="page-header">
        <div>
          <h2>📈 Animal Progress</h2>
          <p>Track health &amp; growth over time</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Progress</button>
      </div>

      <div className="page-content">
        <QuickNav />

        {/* Stats */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Records',    value: records.length,                                              icon: '📈', cls: 'green'  },
            { label: 'Avg Weight (kg)',  value: avgWeight,                                                   icon: '⚖️', cls: 'blue'   },
            { label: 'Avg Milk (L/day)', value: avgMilk,                                                    icon: '🥛', cls: 'orange' },
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

        {/* Filter */}
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

        {/* Table */}
        <Animate direction="up" delay={120}>
          <div className="card">
            {loading ? (
              <div className="empty-state"><p>Loading…</p></div>
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
                      <th>Animal</th><th>Date</th><th>Weight</th><th>Height</th>
                      <th>Milk</th><th>Health</th><th>Photo</th><th>Video</th>
                      <th>Notes</th><th>Actions</th>
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
                        <td>{r.weight        ? `${r.weight} kg`         : '—'}</td>
                        <td>{r.height        ? `${r.height} cm`         : '—'}</td>
                        <td>{r.milkProduction? `${r.milkProduction} L`  : '—'}</td>
                        <td><span className={`badge ${healthMap[r.healthStatus]}`}>{r.healthStatus}</span></td>

                        {/* Photo */}
                        <td>
                          {r.imageBase64 ? (
                            <img src={getImageSrc(r)} alt="progress"
                              onClick={() => setViewImage(getImageSrc(r))}
                              style={{ width: '44px', height: '44px', objectFit: 'cover',
                                borderRadius: '8px', cursor: 'pointer', border: '2px solid var(--border)' }} />
                          ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>}
                        </td>

                        {/* Video — now uses URL served from server */}
                        <td>
                          {r.videoUrl ? (
                            <button className="btn btn-outline btn-sm"
                              onClick={() => setViewVideo({ type: 'file', src: getFullVideoUrl(r.videoUrl) })}>
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
                            <button className="btn btn-danger btn-sm"  onClick={() => handleDelete(r._id)}>Delete</button>
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

      {/* ════════════════════════════════════
          ADD / EDIT MODAL
      ════════════════════════════════════ */}
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
                    <input type="number" min="0" placeholder="0" value={form.weight}
                      onChange={e => setForm(p => ({ ...p, weight: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Height (cm)</label>
                    <input type="number" min="0" placeholder="0" value={form.height}
                      onChange={e => setForm(p => ({ ...p, height: e.target.value }))} />
                  </div>
                </div>

                {/* Milk + Health */}
                <div className="form-row">
                  <div className="form-group">
                    <label>Milk Production (L/day)</label>
                    <input type="number" min="0" placeholder="0" value={form.milkProduction}
                      onChange={e => setForm(p => ({ ...p, milkProduction: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Health Status</label>
                    <select value={form.healthStatus}
                      onChange={e => setForm(p => ({ ...p, healthStatus: e.target.value }))}>
                      {['Excellent', 'Good', 'Fair', 'Poor'].map(h => <option key={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                {/* IMAGE UPLOAD */}
                <div className="form-group">
                  <label>📸 Animal Photo (optional — max 5 MB)</label>
                  {!imagePreview ? (
                    <div className="upload-box"
                      onClick={() => !compressing && imageRef.current?.click()}
                      style={{ opacity: compressing ? 0.6 : 1, cursor: compressing ? 'not-allowed' : 'pointer' }}>
                      <div style={{ fontSize: '2rem' }}>{compressing ? '⏳' : '🖼️'}</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {compressing ? 'Compressing image…' : 'Click to upload photo'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>JPG, PNG up to 5 MB — auto compressed</div>
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
                        background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none',
                        borderRadius: '50%', width: '28px', height: '28px',
                        cursor: 'pointer', fontSize: '0.9rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  )}
                </div>

                {/* VIDEO UPLOAD */}
                <div className="form-group">
                  <label>🎥 Animal Video (optional — up to 200 MB, auto-compressed)</label>

                  {(videoStatus === 'idle' || videoStatus === 'error') && (
                    <div className="upload-box" onClick={() => videoRef.current?.click()} style={{ cursor: 'pointer' }}>
                      <div style={{ fontSize: '2rem' }}>🎥</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: videoStatus === 'error' ? 'var(--danger)' : 'var(--primary)' }}>
                        {videoStatus === 'error' ? '⚠️ Failed — click to try again' : 'Click to upload video'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        MP4, WebM, MOV up to 200 MB · Large videos auto-compressed to ≤50 MB
                      </div>
                      <input ref={videoRef} type="file"
                        accept="video/mp4,video/webm,video/ogg,video/quicktime"
                        onChange={handleVideoChange} style={{ display: 'none' }} />
                    </div>
                  )}

                  {isVideoProcessing && (
                    <div className="upload-box" style={{ cursor: 'not-allowed', opacity: 0.9 }}>
                      <div style={{ fontSize: '2rem' }}>⏳</div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--primary)' }}>
                        {videoStatusLabel}
                      </div>
                      {/* Progress bar */}
                      <div style={{ width: '85%', background: 'var(--border)', borderRadius: '6px', height: '8px', marginTop: '10px', overflow: 'hidden' }}>
                        <div style={{
                          width: videoStatus === 'loading-ffmpeg' ? '100%' : `${videoProgress}%`,
                          background: 'var(--primary)', borderRadius: '6px', height: '8px',
                          transition: 'width 0.3s ease',
                          animation: videoStatus === 'loading-ffmpeg' ? 'vidPulse 1.2s ease-in-out infinite' : 'none',
                        }} />
                      </div>
                      {videoStatus === 'loading-ffmpeg' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Downloading FFmpeg WASM (~4 MB) — only once per session
                        </div>
                      )}
                      {videoStatus === 'compressing' && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          Re-encoding to H.264 MP4 · Audio preserved
                        </div>
                      )}
                      <style>{`@keyframes vidPulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
                    </div>
                  )}

                  {videoStatus === 'done' && videoPreview && (
                    <div style={{ position: 'relative' }}>
                      <video src={videoPreview} controls
                        style={{ width: '100%', maxHeight: '220px', display: 'block',
                          borderRadius: '10px', border: '2px solid var(--border)', background: '#000' }} />
                      <button type="button" onClick={removeVideo} style={{
                        position: 'absolute', top: '8px', right: '8px',
                        background: 'rgba(0,0,0,0.7)', color: 'white', border: 'none',
                        borderRadius: '50%', width: '30px', height: '30px',
                        cursor: 'pointer', fontSize: '1rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
                    rows={3} style={{ resize: 'vertical' }} placeholder="Any observations…" />
                </div>

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary"
                    disabled={saving || compressing || isVideoProcessing}>
                    {saving ? 'Saving…' : isVideoProcessing ? videoStatusLabel : editRecord ? 'Update Record' : 'Add Progress'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Image Modal */}
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

      {/* View Video Modal */}
      {viewVideo && (
        <div className="modal-overlay" onClick={() => setViewVideo(null)}>
          <div className="modal" style={{ maxWidth: '720px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎥 Animal Video</h3>
              <button className="modal-close" onClick={() => setViewVideo(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ padding: '16px' }}>
              {viewVideo.type === 'file' ? (
                /* ✅ Video served from your server disk */
                <video src={viewVideo.src} controls autoPlay
                  style={{ width: '100%', borderRadius: '10px', background: '#000', maxHeight: '480px' }} />
              ) : (
                /* Legacy YouTube / Google Drive link */
                <>
                  <iframe
                    src={(() => {
                      const url = viewVideo.src;
                      const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                      if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
                      const gd = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
                      if (gd) return `https://drive.google.com/file/d/${gd[1]}/preview`;
                      return url;
                    })()}
                    title="Animal Video" width="100%" height="400"
                    frameBorder="0" allowFullScreen style={{ borderRadius: '10px' }} />
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                    If video doesn't load,{' '}
                    <a href={viewVideo.src} target="_blank" rel="noreferrer" style={{ color: 'var(--primary)' }}>open in new tab</a>
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
