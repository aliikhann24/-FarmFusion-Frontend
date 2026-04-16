import { useState, useEffect, useRef } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { enquiryAPI } from '../../utils/api';

const navItems = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  ]},
  { section: 'My Farm', items: [
    { path: '/my-animals',          label: 'My Animals',      icon: '🐄' },
    { path: '/breeding-records',    label: 'Breeding Records', icon: '🧬' },
    { path: '/feeding-records',     label: 'Feeding Records',  icon: '🌾' },
    { path: '/animal-progress',     label: 'Animal Progress',  icon: '📈' },
    { path: '/vaccination-records', label: 'Vaccinations',     icon: '💉' },
  ]},
  { section: 'Marketplace', items: [
    { path: '/cattle', label: 'Cattle Market', icon: '🏪' },
  ]},
  { section: 'Finance', items: [
    { path: '/installments', label: 'My Installments', icon: '💳' },
    { path: '/vouchers',     label: 'My Vouchers',     icon: '🧾' },
  ]},
  { section: 'Account', items: [
    { path: '/profile', label: 'My Profile', icon: '👤' },
  ]},
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen]           = useState(false);
  const [pendingEnquiries, setPendingEnquiries] = useState(0);
  const prevCountRef = useRef(0);
  const pollRef      = useRef(null);
  const isFirstLoad  = useRef(true);

  const checkEnquiries = async () => {
    try {
      const { data } = await enquiryAPI.received();
      const pending = (data.enquiries || []).filter(e => e.status === 'Pending').length;
      if (!isFirstLoad.current && pending > prevCountRef.current) {
        const diff = pending - prevCountRef.current;
        toast.info(`📬 ${diff} new enquir${diff > 1 ? 'ies' : 'y'} on your listings!`, { autoClose: 6000 });
      }
      isFirstLoad.current  = false;
      prevCountRef.current = pending;
      setPendingEnquiries(pending);
    } catch {}
  };

  useEffect(() => {
    checkEnquiries();
    pollRef.current = setInterval(checkEnquiries, 30000);
    return () => clearInterval(pollRef.current);
  }, []);

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const displayName  = user?.name  || user?.fullName  || user?.username || '';
  const displayEmail = user?.email || user?.emailAddress || '';
  const initials = displayName
    ? displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'FF';

  return (
    <div className="app-layout">

      {/* OVERLAY */}
      {sidebarOpen && (
        <div
          onClick={closeSidebar}
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.5)', zIndex: 199
          }}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={closeSidebar}>✕</button>

        <div
          className="sidebar-logo"
          onClick={() => { navigate('/dashboard'); closeSidebar(); }}
          style={{ cursor: 'pointer' }}
        >
          <h1>Farm<span>Fusion</span></h1>
          <p style={{ color: 'white' }}>Smart Livestock Management</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={closeSidebar}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                  {item.path === '/cattle' && pendingEnquiries > 0 && (
                    <span style={{
                      marginLeft: 'auto',
                      background: 'var(--danger)', color: 'white',
                      borderRadius: '10px', padding: '1px 7px',
                      fontSize: '0.7rem', fontWeight: 700,
                      minWidth: '20px', textAlign: 'center'
                    }}>
                      {pendingEnquiries}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* ✅ IMPROVED USER + LOGOUT SECTION */}
        <div className="sidebar-user-footer">

          {/* Clickable user row → /profile */}
          <div
            className="sidebar-user-row"
            onClick={() => { navigate('/profile'); closeSidebar(); }}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && navigate('/profile')}
          >
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="name">{displayName || 'My Account'}</div>
              <div className="email">{displayEmail || 'No email found'}</div>
            </div>
          </div>

          {/* Dedicated logout button — full width, clearly labelled */}
          <button
            className="sidebar-logout-btn"
            onClick={handleLogout}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign out
          </button>

        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="main-content">

        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>

          <div
            className="mobile-logo"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
          >
            Farm<span>Fusion</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>

            {/* Enquiry bell */}
            <button
              onClick={() => navigate('/cattle')}
              style={{
                background: 'none', border: 'none',
                cursor: 'pointer', position: 'relative', padding: '4px'
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>📬</span>
              {pendingEnquiries > 0 && (
                <span style={{
                  position: 'absolute', top: '-2px', right: '-2px',
                  background: 'var(--danger)', color: 'white',
                  borderRadius: '50%', width: '16px', height: '16px',
                  fontSize: '0.6rem', fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  {pendingEnquiries}
                </span>
              )}
            </button>

            {/* Avatar → /profile */}
            <div
              className="user-avatar"
              onClick={() => navigate('/profile')}
              style={{ width: '32px', height: '32px', fontSize: '0.75rem', cursor: 'pointer' }}
              title={displayName || 'My Profile'}
            >
              {initials}
            </div>

          </div>
        </div>

        <Outlet />
      </main>

    </div>
  );
}