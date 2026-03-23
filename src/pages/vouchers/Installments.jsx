import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { installmentsAPI } from '../../utils/api';

const defaultForm = {
  title: '', totalAmount: '', installmentAmount: '',
  frequency: 'Monthly', startDate: new Date().toISOString().split('T')[0], dueDate: ''
};

export default function Installments() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(null);
  const [form, setForm] = useState(defaultForm);
  const [payAmount, setPayAmount] = useState('');
  const [payNote, setPayNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await installmentsAPI.getAll();
      setInstallments(data.installments || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await installmentsAPI.create(form);
      toast.success('Installment plan created! 💳');
      setShowModal(false);
      setForm(defaultForm);
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
    if (!window.confirm('Delete this installment plan?')) return;
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

  return (
    <div>
      <div className="page-header">
        <div><h2>💳 My Installments</h2><p>Track your payment plans</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Plan</button>
      </div>

      <div className="page-content">

        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Plans',     value: totalPlans,                              icon: '💳', cls: 'blue'   },
            { label: 'Active',          value: activePlans,                             icon: '🔄', cls: 'orange' },
            { label: 'Completed',       value: completedPlans,                          icon: '✅', cls: 'green'  },
            { label: 'Total Remaining', value: `PKR ${totalRemaining.toLocaleString()}`, icon: '💰', cls: 'purple' },
          ].map(s => (
            <div className="stat-card" key={s.label}>
              <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
              <div className="stat-info">
                <div className="value" style={{ fontSize: s.label === 'Total Remaining' ? '1.1rem' : '1.8rem' }}>
                  {s.value}
                </div>
                <div className="label">{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : installments.length === 0 ? (
            <div className="empty-state">
              <div className="icon">💳</div>
              <h3>No installment plans</h3>
              <p>Create a plan to start tracking payments</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Create Plan</button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Total</th>
                    <th>Paid</th>
                    <th>Remaining</th>
                    <th>Per Install.</th>
                    <th>Frequency</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {installments.map(i => {
                    const remaining = Math.max(0, i.totalAmount - i.paidAmount);
                    const progress  = Math.min(100, Math.round((i.paidAmount / i.totalAmount) * 100));
                    return (
                      <tr key={i._id}>
                        <td>
                          <strong>{i.title}</strong>
                          <div style={{ marginTop: '6px', background: '#e8f5e9', borderRadius: '4px', height: '4px', width: '100px' }}>
                            <div style={{ background: 'var(--primary)', borderRadius: '4px', height: '4px', width: `${progress}%` }} />
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
                        <td><span className={`badge ${statusMap[i.status]}`}>{i.status}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {i.status === 'Active' && (
                              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(i)}>Pay</button>
                            )}
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
      </div>

      {/* New Plan Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Installment Plan</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
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
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Plan'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(null)}>
          <div className="modal" style={{ maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Record Payment</h3>
              <button className="modal-close" onClick={() => setShowPayModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div style={{ background: '#f4faf5', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '4px' }}>
                  {showPayModal.title}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Paid so far</div>
                    <div style={{ fontWeight: 700, color: 'var(--success)' }}>
                      PKR {Number(showPayModal.paidAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Remaining</div>
                    <div style={{ fontWeight: 700, color: 'var(--danger)' }}>
                      PKR {Math.max(0, showPayModal.totalAmount - showPayModal.paidAmount).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Suggested</div>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                      PKR {Number(showPayModal.installmentAmount).toLocaleString()}
                    </div>
                  </div>
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
                  <label>Note</label>
                  <input value={payNote}
                    onChange={e => setPayNote(e.target.value)}
                    placeholder="e.g. March payment" />
                </div>
                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowPayModal(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Recording...' : 'Record Payment'}
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