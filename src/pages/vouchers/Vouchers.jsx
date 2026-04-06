import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { vouchersAPI } from '../../utils/api';
import QuickNav from '../../components/common/QuickNav';
import ConfirmModal from '../../components/common/ConfirmModal';
import useConfirm from '../../hooks/UseConfirm';
import Animate from '../../components/common/Animate';

const defaultForm = {
  type: 'Purchase', amount: '',
  description: '', date: new Date().toISOString().split('T')[0]
};

export default function Vouchers() {
  const [vouchers, setVouchers]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showModal, setShowModal]   = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [form, setForm]             = useState(defaultForm);
  const [saving, setSaving]         = useState(false);
  const [filterType, setFilterType] = useState('');
  const [search, setSearch]         = useState('');
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await vouchersAPI.getAll({ type: filterType });
      setVouchers(data.vouchers || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType]);

  // Client-side search filter
  const filtered = vouchers.filter(v =>
    !search || v.description.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd  = () => { setEditRecord(null); setForm(defaultForm); setShowModal(true); };
  const openEdit = (v) => {
    setEditRecord(v);
    setForm({
      type:        v.type        || 'Purchase',
      amount:      v.amount      || '',
      description: v.description || '',
      date:        v.date ? v.date.split('T')[0] : '',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditRecord(null); setForm(defaultForm); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editRecord) {
        await vouchersAPI.update(editRecord._id, form);
        toast.success('Voucher updated! ✅');
      } else {
        await vouchersAPI.create(form);
        toast.success('Voucher created! 🧾');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      title: 'Delete Voucher?',
      message: 'This financial record will be permanently deleted.',
      confirmText: 'Yes, Delete', type: 'danger'
    });
    if (!ok) return;
    try {
      await vouchersAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const isIncome = (type) => ['Sale', 'Income'].includes(type);
  const typeMap  = {
    Purchase: 'badge-orange', Sale: 'badge-green',
    Expense: 'badge-red', Income: 'badge-blue'
  };

  const totalIncome  = vouchers.filter(v => isIncome(v.type)).reduce((s, v) => s + v.amount, 0);
  const totalExpense = vouchers.filter(v => !isIncome(v.type)).reduce((s, v) => s + v.amount, 0);
  const netBalance   = totalIncome - totalExpense;

  return (
    <div className="page-vouchers">
      <div className="page-header">
        <div><h2>🧾 My Vouchers</h2><p>Financial records & transactions</p></div>
        <button className="btn btn-primary" onClick={openAdd}>+ New Voucher</button>
      </div>

      <div className="page-content">
        <QuickNav />

        {/* ===== STATS ===== */}
        <div className="stats-grid" style={{ marginBottom: '24px' }}>
          {[
            { label: 'Total Vouchers', value: vouchers.length,                        icon: '🧾', cls: 'blue',   big: false },
            { label: 'Total Income',   value: `PKR ${totalIncome.toLocaleString()}`,   icon: '📥', cls: 'green',  big: true  },
            { label: 'Total Expenses', value: `PKR ${totalExpense.toLocaleString()}`,  icon: '📤', cls: 'orange', big: true  },
            { label: 'Net Balance',    value: `PKR ${netBalance.toLocaleString()}`,    icon: '💰', cls: 'purple', big: true  },
          ].map((s, i) => (
            <Animate key={s.label} direction="up" delay={i * 80}>
              <div className="stat-card">
                <div className={`stat-icon ${s.cls}`}>{s.icon}</div>
                <div className="stat-info">
                  <div className="value" style={{
                    fontSize: s.big ? '1.1rem' : '1.8rem',
                    color: s.label === 'Net Balance'
                      ? netBalance >= 0 ? 'var(--success)' : 'var(--danger)'
                      : undefined
                  }}>
                    {s.value}
                  </div>
                  <div className="label">{s.label}</div>
                </div>
              </div>
            </Animate>
          ))}
        </div>

        {/* Net balance indicator */}
        <Animate direction="right">
          <div style={{
            background: netBalance >= 0 ? '#e8f5e9' : '#fde8ea',
            border: `1px solid ${netBalance >= 0 ? '#c8e6c9' : '#f5c6cb'}`,
            borderRadius: '10px', padding: '12px 20px',
            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px'
          }}>
            <span style={{ fontSize: '1.4rem' }}>{netBalance >= 0 ? '📈' : '📉'}</span>
            <div>
              <strong style={{ color: netBalance >= 0 ? '#2e7d32' : '#c62828' }}>
                {netBalance >= 0 ? 'You are in profit!' : 'Expenses exceed income!'}
              </strong>
              <p style={{ fontSize: '0.85rem', color: netBalance >= 0 ? '#2e7d32' : '#c62828', margin: 0 }}>
                Net balance: PKR {netBalance.toLocaleString()}
              </p>
            </div>
          </div>
        </Animate>

        {/* ===== FILTER BAR ===== */}
        <Animate direction="left">
          <div className="filter-bar">
            <input
              className="search-input"
              placeholder="🔍 Search by description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              className="search-input"
              style={{ flex: 'none', width: 'auto' }}
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              {['Purchase', 'Sale', 'Expense', 'Income'].map(t => <option key={t}>{t}</option>)}
            </select>
            {(search || filterType) && (
              <button
                className="btn btn-outline btn-sm"
                onClick={() => { setSearch(''); setFilterType(''); }}
              >
                ✕ Clear
              </button>
            )}
          </div>
        </Animate>

        {(search || filterType) && (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
            Showing {filtered.length} of {vouchers.length} vouchers
          </p>
        )}

        {/* ===== MAIN TABLE ===== */}
        <Animate direction="up" delay={120}>
          <div className="card">
            {loading ? (
              <div className="empty-state"><p>Loading...</p></div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <div className="icon">🧾</div>
                <h3>{vouchers.length === 0 ? 'No vouchers yet' : 'No results found'}</h3>
                <p>{vouchers.length === 0 ? 'Start recording your financial transactions' : 'Try adjusting your search or filters'}</p>
                {vouchers.length === 0 && (
                  <button className="btn btn-primary" onClick={openAdd}>+ Create Voucher</button>
                )}
              </div>
            ) : (
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Voucher #</th><th>Type</th><th>Description</th>
                      <th>Amount</th><th>Date</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(v => (
                      <tr key={v._id}>
                        <td>
                          <code style={{ fontSize: '0.78rem', background: '#f5f5f5', padding: '2px 8px', borderRadius: '4px' }}>
                            {v.voucherNumber}
                          </code>
                        </td>
                        <td><span className={`badge ${typeMap[v.type]}`}>{v.type}</span></td>
                        <td>{v.description}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: isIncome(v.type) ? 'var(--success)' : 'var(--danger)' }}>
                            {isIncome(v.type) ? '+' : '-'} PKR {Number(v.amount).toLocaleString()}
                          </span>
                        </td>
                        <td>{new Date(v.date).toLocaleDateString()}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button className="btn btn-outline btn-sm" onClick={() => openEdit(v)}>Edit</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v._id)}>Delete</button>
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
              <h3>{editRecord ? 'Edit Voucher' : 'New Voucher'}</h3>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type *</label>
                    <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                      {['Purchase', 'Sale', 'Expense', 'Income'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (PKR) *</label>
                    <input type="number" value={form.amount}
                      onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      required min="0" placeholder="0" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <input value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Purchased feed from market" required />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                </div>

                {/* Live preview */}
                {form.amount && (
                  <div style={{
                    background: isIncome(form.type) ? '#e8f5e9' : '#fde8ea',
                    borderRadius: '10px', padding: '14px', marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Preview</div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: isIncome(form.type) ? 'var(--success)' : 'var(--danger)' }}>
                      {isIncome(form.type) ? '+' : '-'} PKR {Number(form.amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      {form.type} • {form.description || 'No description'} • {form.date}
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : editRecord ? 'Update Voucher' : 'Create Voucher 🧾'}
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