import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { installmentsAPI } from '../../utils/api';
import QuickNav from '../../components/common/QuickNav';
import ConfirmModal from '../../components/common/ConfirmModal';
import useConfirm from '../../hooks/UseConfirm';
import Animate from '../../components/common/Animate';

const defaultForm = {
  title: '', totalAmount: '', installmentAmount: '',
  frequency: 'Monthly', startDate: new Date().toISOString().split('T')[0], dueDate: ''
};

export default function Installments() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showModal, setShowModal]       = useState(false);
  const [showPayModal, setShowPayModal] = useState(null);
  const [showHistory, setShowHistory]   = useState(null);
  const [editRecord, setEditRecord]     = useState(null);
  const [form, setForm]                 = useState(defaultForm);
  const [payAmount, setPayAmount]       = useState('');
  const [payNote, setPayNote]           = useState('');
  const [saving, setSaving]             = useState(false);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterFreq, setFilterFreq]     = useState('');
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await installmentsAPI.getAll();
      setInstallments(data.installments || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = installments.filter(i => {
    const matchSearch = !search       || i.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || i.status === filterStatus;
    const matchFreq   = !filterFreq   || i.frequency === filterFreq;
    return matchSearch && matchStatus && matchFreq;
  });

  const openAdd  = () => { setEditRecord(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (i) => {
    setEditRecord(i);
    setForm({
      title:             i.title             || '',
      totalAmount:       i.totalAmount       || '',
      installmentAmount: i.installmentAmount || '',
      frequency:         i.frequency         || 'Monthly',
      startDate:         i.startDate ? i.startDate.split('T')[0] : '',
      dueDate:           i.dueDate   ? i.dueDate.split('T')[0]   : '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditRecord(null); setForm(defaultForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRecord) {
        await installmentsAPI.update(editRecord._id, form);
        toast.success('Installment plan updated! ✅');
      } else {
        await installmentsAPI.create(form);
        toast.success('Installment plan created! 💳');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handlePay = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await installmentsAPI.pay(showPayModal._id, { amount: Number(payAmount), note: payNote });
      toast.success('Payment recorded! ✅');
      setShowPayModal(null);
      setPayAmount('');
      setPayNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Installment Plan?',
      message: 'This payment plan and all its records will be permanently deleted.',
      confirmText: 'Yes, Delete', type: 'danger'
    });
    if (!ok) return;
    try {
      await installmentsAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const statusMap = {
    Active: 'badge-blue', Completed: 'badge-green',
    Overdue: 'badge-red', Cancelled: 'badge-gray'
  };

  const totalPlans     = installments.length;
  const activePlans    = installments.filter(i => i.status === 'Active').length;
  const completedPlans = installments.filter(i => i.status === 'Completed').length;
  const totalRemaining = installments.reduce((s, i) => s + Math.max(0, i.totalAmount - i.paidAmount), 0);
  const overdueCount   = installments.filter(i => i.status === 'Overdue').length;

  return (
    <div className="page-installments">
      <div className="page-header">
        <div><h2>💳 My Installments</h2><p>Track your payment plans</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Plan</button>
      </div>

      <div className="page-content">
        <QuickNav />

        {/* ===== STATS ===== */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Plans',     value: totalPlans,                               icon: '💳', cls: 'blue',   big: false },
            { label: 'Active',          value: activePlans,                              icon: '🔄', cls: 'orange', big: false },
            { label: 'Completed',       value: completedPlans,                           icon: '✅', cls: 'green',  big: false },
            { label: 'Total Remaining', value: `PKR ${totalRemaining.toLocaleString()}`, icon: '💰', cls: 'purple', big: true  },
          ].map((s, i) => (
            <Animate key={s.label} direction="up" delay={i * 80}>
              <div className="stat-card">
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div className="stat-info">
                  <div className="value" style={{ fontSize: s.big ? '1.1rem' : '1.8rem' }}>{s.value}</div>
                  <div className="label">{s.label}</div>
                </div>
              </div>
            </Animate>
          ))}
        </div>

        {/* ===== OVERDUE ALERT ===== */}
        {overdueCount > 0 && (
          <Animate direction="right">
            <div style={{
              background: '#fde8ea', border: '1px solid #f5c6cb',
              borderRadius: '10px', padding: '14px 20px',
              marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'
            }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <div>
                <strong style={{ color: '#c62828' }}>
                  {overdueCount} overdue payment plan{overdueCount > 1 ? 's' : ''}!
                </strong>
                <p style={{ fontSize: '0.85rem', color: '#c62828', margin: 0 }}>
                  Please review and make payments as soon as possible.
                </p>
              </div>
            </div>
          </Animate>
        )}

        {/* ===== FILTER BAR ===== */}
        <Animate direction="left">
          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="🔍 Search by plan title..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="search-input"
              style={{ flex: 'none', width: 'auto', minWidth: '140px' }}
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
            >
              <option value="">All Status</option>
              {['Active', 'Completed', 'Overdue', 'Cancelled'].map(s => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <select
              className="search-input"
              style={{ flex: 'none', width: 'auto', minWidth: '140px' }}
              value={filterFreq}
              onChange={e => setFilterFreq(e.target.value)}
            >
              <option value="">All Frequencies</option>
              {['Weekly', 'Monthly', 'Quarterly'].map(f => (
                <option key={f}>{f}</option>
              ))}
            </select>
            {(search || filterStatus || filterFreq) && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setSearch(''); setFilterStatus(''); setFilterFreq(''); }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </Animate>

        {(search || filterStatus || filterFreq) && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Showing {filtered.length} of {installments.length} plans
          </p>
        )}

        {/* ===== MAIN TABLE ===== */}
        <Animate direction="up" delay={120}>
          <div className="card">
            {loading ? (
              <div className="empty-state"><p>Loading...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">💳</div>
                <h3>{installments.length === 0 ? 'No installment plans' : 'No results found'}</h3>
                <p>{installments.length === 0 ? 'Create a plan to start tracking payments' : 'Try adjusting your search or filters'}</p>
                {installments.length === 0 && (
                  <button className="btn btn-primary" onClick={openAdd}>+ Create Plan</button>
                )}
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th><th>Total</th><th>Paid</th>
                      <th>Remaining</th><th>Per Install.</th>
                      <th>Frequency</th><th>Due Date</th><th>Status</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(i => {
                      const remaining = Math.max(0, i.totalAmount - i.paidAmount);
                      const progress  = Math.min(100, Math.round((i.paidAmount / i.totalAmount) * 100));
                      return (
                        <tr key={i._id}>
                          <td>
                            <strong>{i.title}</strong>
                            <div style={{ marginTop: '6px', background: '#e8f5e9', borderRadius: '4px', height: '5px', width: '120px' }}>
                              <div style={{ background: progress === 100 ? 'var(--success)' : 'var(--primary)', borderRadius: '4px', height: '5px', width: `${progress}%`, transition: 'width 0.5s ease' }} />
                            </div>
                            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>{progress}% paid</div>
                          </td>
                          <td>PKR {Number(i.totalAmount).toLocaleString()}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 600 }}>
                            PKR {Number(i.paidAmount).toLocaleString()}
                          </td>
                          <td style={{ color: remaining > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                            PKR {remaining.toLocaleString()}
                          </td>
                          <td>PKR {Number(i.installmentAmount).toLocaleString()}</td>
                          <td>{i.frequency}</td>
                          <td>
                            {i.dueDate ? (
                              <span style={{ color: i.status === 'Overdue' ? 'var(--danger)' : 'var(--text)', fontWeight: i.status === 'Overdue' ? 700 : 400 }}>
                                {new Date(i.dueDate).toLocaleDateString()}
                              </span>
                            ) : '—'}
                          </td>
                          <td><span className={`badge ${statusMap[i.status]}`}>{i.status}</span></td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              {i.status === 'Active' && (
                                <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(i)}>
                                  💰 Pay
                                </button>
                              )}
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => setShowHistory(i)}
                                title="Payment History"
                              >
                                📋
                              </button>
                              <button className="btn btn-outline btn-sm" onClick={() => openEdit(i)}>Edit</button>
                              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(i._id)}>Delete</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
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
              <h3>{editRecord ? 'Edit Installment Plan' : 'New Installment Plan'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Title *</label>
                  <input value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Cow Purchase Installment" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Total Amount (PKR) *</label>
                    <input type="number" value={form.totalAmount}
                      onChange={e => setForm(p => ({ ...p, totalAmount: e.target.value }))}
                      required min="0" placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Per Installment (PKR) *</label>
                    <input type="number" value={form.installmentAmount}
                      onChange={e => setForm(p => ({ ...p, installmentAmount: e.target.value }))}
                      required min="0" placeholder="0" />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Frequency</label>
                    <select value={form.frequency}
                      onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                      <option>Weekly</option>
                      <option>Monthly</option>
                      <option>Quarterly</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input type="date" value={form.startDate}
                      onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Due Date</label>
                  <input type="date" value={form.dueDate}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editRecord ? 'Update Plan' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== PAY MODAL ===== */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 Record Payment</h3>
              <button className="modal-close" onClick={() => setShowPayModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f4faf5', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: '10px' }}>{showPayModal.title}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid so far</div>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>PKR {Number(showPayModal.paidAmount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining</div>
                    <div style={{ fontWeight: 700, color: 'var(--danger)' }}>PKR {Math.max(0, showPayModal.totalAmount - showPayModal.paidAmount).toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suggested</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>PKR {Number(showPayModal.installmentAmount).toLocaleString()}</div>
                  </div>
                </div>
                {/* Progress bar */}
                <div style={{ marginTop: '12px', background: '#e8f5e9', borderRadius: '4px', height: '6px' }}>
                  <div style={{
                    background: 'var(--primary)', borderRadius: '4px', height: '6px',
                    width: `${Math.min(100, Math.round((showPayModal.paidAmount / showPayModal.totalAmount) * 100))}%`
                  }} />
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {Math.min(100, Math.round((showPayModal.paidAmount / showPayModal.totalAmount) * 100))}% complete
                </div>
              </div>
              <form onSubmit={handlePay}>
                <div className="form-group">
                  <label>Payment Amount (PKR) *</label>
                  <input type="number" value={payAmount}
                    onChange={e => setPayAmount(e.target.value)}
                    required min="1" placeholder={showPayModal.installmentAmount} />
                </div>
                <div className="form-group">
                  <label>Note (optional)</label>
                  <input value={payNote} onChange={e => setPayNote(e.target.value)}
                    placeholder="e.g. March payment" />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowPayModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Recording...' : '💰 Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ===== PAYMENT HISTORY MODAL ===== */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(null)}>
          <div className="modal" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📋 Payment History</h3>
              <button className="modal-close" onClick={() => setShowHistory(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--primary-dark)' }}>{showHistory.title}</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {showHistory.frequency} • {showHistory.status}
                </div>
              </div>

              {/* Summary bar */}
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: '10px', marginBottom: '20px'
              }}>
                {[
                  { label: 'Total',     value: `PKR ${Number(showHistory.totalAmount).toLocaleString()}`,                                           color: 'var(--text)'    },
                  { label: 'Paid',      value: `PKR ${Number(showHistory.paidAmount).toLocaleString()}`,                                            color: 'var(--success)' },
                  { label: 'Remaining', value: `PKR ${Math.max(0, showHistory.totalAmount - showHistory.paidAmount).toLocaleString()}`,              color: 'var(--danger)'  },
                ].map(item => (
                  <div key={item.label} style={{ background: '#f8faf8', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '4px' }}>{item.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: item.color }}>{item.value}</div>
                  </div>
                ))}
              </div>

              {/* Progress */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ background: '#e8f5e9', borderRadius: '6px', height: '8px' }}>
                  <div style={{
                    background: 'var(--primary)', borderRadius: '6px', height: '8px',
                    width: `${Math.min(100, Math.round((showHistory.paidAmount / showHistory.totalAmount) * 100))}%`,
                    transition: 'width 0.5s ease'
                  }} />
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'right' }}>
                  {Math.min(100, Math.round((showHistory.paidAmount / showHistory.totalAmount) * 100))}% complete
                </div>
              </div>

              {/* Payments list */}
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Payment Entries ({showHistory.payments?.length || 0})
              </h4>

              {!showHistory.payments?.length ? (
                <div className="empty-state" style={{ padding: '30px' }}>
                  <div className="icon">💳</div>
                  <p>No payments recorded yet</p>
                  <button className="btn btn-primary btn-sm" onClick={() => { setShowHistory(null); setShowPayModal(showHistory); }}>
                    Record First Payment
                  </button>
                </div>
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr><th>#</th><th>Date</th><th>Amount</th><th>Note</th></tr>
                    </thead>
                    <tbody>
                      {showHistory.payments.map((p, idx) => (
                        <tr key={idx}>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>#{idx + 1}</td>
                          <td>{new Date(p.paidOn).toLocaleDateString()}</td>
                          <td style={{ color: 'var(--success)', fontWeight: 700 }}>
                            PKR {Number(p.amount).toLocaleString()}
                          </td>
                          <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.note || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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