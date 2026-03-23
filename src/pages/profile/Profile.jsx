import { useState } from 'react';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../utils/api';

export default function Profile() {
  const { user } = useAuth();

  const [profileForm, setProfileForm] = useState({
    name:     user?.name     || '',
    phone:    user?.phone    || '',
    farmName: user?.farmName || '',
  });

  const [passForm, setPassForm] = useState({
    currentPassword: '', newPassword: '', confirmPassword: ''
  });

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass,    setSavingPass]    = useState(false);
  const [activeTab,     setActiveTab]     = useState('profile');

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await authAPI.updateProfile(profileForm);
      toast.success('Profile updated! ✅');
      const updated = { ...user, ...profileForm };
      localStorage.setItem('farmfusion_user', JSON.stringify(updated));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSavingProfile(false); }
  };

  const handlePassSave = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword)
      return toast.error('New passwords do not match');
    if (passForm.newPassword.length < 6)
      return toast.error('Password must be at least 6 characters');
    setSavingPass(true);
    try {
      await authAPI.changePassword({
        currentPassword: passForm.currentPassword,
        newPassword:     passForm.newPassword
      });
      toast.success('Password changed! 🔒');
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setSavingPass(false); }
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'FF';

  return (
    <div>
      <div className="page-header">
        <div><h2>👤 My Profile</h2><p>Manage your account details</p></div>
      </div>

      <div className="page-content">
        <div className="profile-grid">

          {/* Left — Avatar Card */}
          <div>
            <div className="card">
              <div className="card-body" style={{ textAlign: 'center', padding: '32px 24px' }}>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'var(--primary)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: '1.8rem', fontWeight: 700,
                  margin: '0 auto 16px'
                }}>
                  {initials}
                </div>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '4px' }}>{user?.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '4px' }}>
                  {user?.email}
                </p>
                {user?.farmName && (
                  <p style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 600 }}>
                    🌾 {user.farmName}
                  </p>
                )}
              </div>
              <div style={{ borderTop: '1px solid var(--border)', padding: '20px 24px' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                  Account Info
                </div>
                {[
                  { label: 'Role',   value: 'Farmer' },
                  { label: 'Phone',  value: user?.phone || 'Not set' },
                  { label: 'Member', value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A' },
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.label}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 500 }}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Forms */}
          <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', flexWrap: 'wrap' }}>
              {[
                { key: 'profile',  label: '✏️ Edit Profile' },
                { key: 'password', label: '🔒 Change Password' },
              ].map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px', border: 'none',
                    cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
                    background: activeTab === tab.key ? 'var(--primary)' : 'white',
                    color:      activeTab === tab.key ? 'white' : 'var(--text-muted)',
                    boxShadow:  activeTab === tab.key ? 'var(--shadow)' : 'none',
                    transition: 'all 0.2s'
                  }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'profile' && (
              <div className="card">
                <div className="card-header"><h3>Edit Profile</h3></div>
                <div className="card-body">
                  <form onSubmit={handleProfileSave}>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full Name *</label>
                        <input value={profileForm.name}
                          onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                          placeholder="Ahmed Khan" required />
                      </div>
                      <div className="form-group">
                        <label>Farm Name</label>
                        <input value={profileForm.farmName}
                          onChange={e => setProfileForm(p => ({ ...p, farmName: e.target.value }))}
                          placeholder="Green Valley Farm" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Phone Number</label>
                      <input value={profileForm.phone}
                        onChange={e => setProfileForm(p => ({ ...p, phone: e.target.value }))}
                        placeholder="+92 300 1234567" />
                    </div>
                    <div className="form-group">
                      <label>Email Address</label>
                      <input value={user?.email} disabled
                        style={{ background: '#f5f5f5', cursor: 'not-allowed', opacity: 0.7 }} />
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Email cannot be changed
                      </p>
                    </div>
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={savingProfile}>
                        {savingProfile ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {activeTab === 'password' && (
              <div className="card">
                <div className="card-header"><h3>Change Password</h3></div>
                <div className="card-body">
                  <form onSubmit={handlePassSave}>
                    <div className="form-group">
                      <label>Current Password *</label>
                      <input type="password" value={passForm.currentPassword}
                        onChange={e => setPassForm(p => ({ ...p, currentPassword: e.target.value }))}
                        placeholder="••••••••" required />
                    </div>
                    <div className="form-group">
                      <label>New Password *</label>
                      <input type="password" value={passForm.newPassword}
                        onChange={e => setPassForm(p => ({ ...p, newPassword: e.target.value }))}
                        placeholder="Min. 6 characters" required />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password *</label>
                      <input type="password" value={passForm.confirmPassword}
                        onChange={e => setPassForm(p => ({ ...p, confirmPassword: e.target.value }))}
                        placeholder="••••••••" required />
                    </div>
                    {passForm.newPassword && passForm.confirmPassword && (
                      <div style={{
                        padding: '10px 14px', borderRadius: '8px', marginBottom: '16px',
                        background: passForm.newPassword === passForm.confirmPassword ? '#e8f5e9' : '#fde8ea',
                        color:      passForm.newPassword === passForm.confirmPassword ? '#2e7d32' : '#c62828',
                        fontSize: '0.85rem', fontWeight: 500
                      }}>
                        {passForm.newPassword === passForm.confirmPassword
                          ? '✅ Passwords match!'
                          : '❌ Passwords do not match'}
                      </div>
                    )}
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={savingPass}>
                        {savingPass ? 'Changing...' : 'Change Password 🔒'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}