import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { vouchersAPI } from '../../utils/api';
import Spinner from '../../components/common/Spinner';
const defaultForm = {
  type: 'Purchase', amount: '',
  description: '', date: new Date().toISOString().split('T')[0]
};

export default function Vouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await vouchersAPI.getAll({ type: filterType });
      setVouchers(data.vouchers || []);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterType]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await vouchersAPI.create(form);
      toast.success('Voucher created! 🧾');
      setShowModal(false);
      setForm(defaultForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this voucher?')) return;
    try {
      await vouchersAPI.delete(id);
      toast.success('Deleted');
      load();
    } catch { toast.error('Failed to delete'); }
  };

  const isIncome  = (type) => ['Sale', 'Income'].includes(type);
  const typeMap   = {
    Purchase: 'badge-orange',
    Sale:     'badge-green',
    Expense:  'badge-red',
    Income:   'badge-blue'
  };

  const totalIncome  = vouchers.filter(v => isIncome(v.type)).reduce((s, v) => s + v.amount, 0);
  const totalExpense = vouchers.filter(v => !isIncome(v.type)).reduce((s, v) => s + v.amount, 0);
  const netBalance   = totalIncome - totalExpense;

  return (
    <div>
      <div className="page-header">
        <div><h2>🧾 My Vouchers</h2><p>Financial records & transactions</p></div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ New Voucher</button>
      </div>

      <div className="page-content">

        {/* Stats */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: '24px' }}>
          <div className="stat-card">
            <div className="stat-icon blue">🧾</div>
            <div className="stat-info">
              <div className="value">{vouchers.length}</div>
              <div className="label">Total Vouchers</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon green">📥</div>
            <div className="stat-info">
              <div className="value" style={{ fontSize: '1.2rem' }}>
                PKR {totalIncome.toLocaleString()}
              </div>
              <div className="label">Total Income</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon orange">📤</div>
            <div className="stat-info">
              <div className="value" style={{ fontSize: '1.2rem' }}>
                PKR {totalExpense.toLocaleString()}
              </div>
              <div className="label">Total Expenses</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon purple">💰</div>
            <div className="stat-info">
              <div className="value" style={{
                fontSize: '1.2rem',
                color: netBalance >= 0 ? 'var(--success)' : 'var(--danger)'
              }}>
                PKR {netBalance.toLocaleString()}
              </div>
              <div className="label">Net Balance</div>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="filter-bar">
          <select
            className="search-input"
            style={{ flex: 'none', width: 'auto' }}
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
          >
            <option value="">All Types</option>
            {['Purchase', 'Sale', 'Expense', 'Income'].map(t => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="card">
          {loading ? (
            <div className="empty-state"><p>Loading...</p></div>
          ) : vouchers.length === 0 ? (
            <div className="empty-state">
              <div className="icon">🧾</div>
              <h3>No vouchers yet</h3>
              <p>Start recording your financial transactions</p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                + Create Voucher
              </button>
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Voucher #</th>
                    <th>Type</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vouchers.map(v => (
                    <tr key={v._id}>
                      <td>
                        <code style={{
                          fontSize: '0.78rem', background: '#f5f5f5',
                          padding: '2px 8px', borderRadius: '4px'
                        }}>
                          {v.voucherNumber}
                        </code>
                      </td>
                      <td>
                        <span className={`badge ${typeMap[v.type]}`}>{v.type}</span>
                      </td>
                      <td>{v.description}</td>
                      <td style={{
                        fontWeight: 700,
                        color: isIncome(v.type) ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {isIncome(v.type) ? '+' : '-'} PKR {Number(v.amount).toLocaleString()}
                      </td>
                      <td>{new Date(v.date).toLocaleDateString()}</td>
                      <td>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(v._id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>New Voucher</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-group">
                    <label>Type *</label>
                    <select
                      value={form.type}
                      onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    >
                      {['Purchase', 'Sale', 'Expense', 'Income'].map(t => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Amount (PKR) *</label>
                    <input
                      type="number"
                      value={form.amount}
                      onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                      required min="0" placeholder="0"
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label>Description *</label>
                  <input
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. Purchased feed from market"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    required
                  />
                </div>

                {/* Preview */}
                {form.amount && (
                  <div style={{
                    background: isIncome(form.type) ? '#e8f5e9' : '#fde8ea',
                    borderRadius: '10px', padding: '12px', marginBottom: '16px'
                  }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Preview</div>
                    <div style={{
                      fontSize: '1.2rem', fontWeight: 700,
                      color: isIncome(form.type) ? 'var(--success)' : 'var(--danger)'
                    }}>
                      {isIncome(form.type) ? '+' : '-'} PKR {Number(form.amount).toLocaleString()}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {form.description || 'No description'}
                    </div>
                  </div>
                )}

                <div className="form-actions">
                  <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Creating...' : 'Create Voucher'}
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