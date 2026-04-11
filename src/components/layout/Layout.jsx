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
  const prevCountRef  = useRef(0);
  const pollRef       = useRef(null);
  const isFirstLoad   = useRef(true);

  // ===== ENQUIRY POLLING =====
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
  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'FF';

  return (
    <div className="app-layout">

      {/* ===== OVERLAY ===== */}
      {sidebarOpen && (
        <div onClick={closeSidebar} style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 199
        }} />
      )}

      {/* ===== SIDEBAR ===== */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <button className="sidebar-close" onClick={closeSidebar}>✕</button>

        {/* Clickable logo navigates to /dashboard */}
        <div
          className="sidebar-logo"
          onClick={() => { navigate('/dashboard'); closeSidebar(); }}
          style={{ cursor: 'pointer' }}
        >
          <h1>Farm<span>Fusion</span></h1>
          <p>Smart Livestock Management</p>
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
                  {/* 🔴 Badge on Cattle Market */}
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

        {/* ✅ Clickable user section navigates to /profile */}
        <div
          className="sidebar-user"
          onClick={() => { navigate('/profile'); closeSidebar(); }}
          style={{ cursor: 'pointer' }}
        >
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="name">{user?.name}</div>
            <div className="email">{user?.email}</div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleLogout(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}
            title="Logout"
          >
            🚪
          </button>
        </div>
      </aside>

      {/* ===== MAIN CONTENT ===== */}
      <main className="main-content">

        {/* Mobile topbar */}
        <div className="mobile-topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>☰</button>

          {/* Clickable mobile logo navigates to /dashboard */}
          <div
            className="mobile-logo"
            onClick={() => navigate('/dashboard')}
            style={{ cursor: 'pointer' }}
          >
            Farm<span>Fusion</span>
          </div>

          {/* 🔴 Bell with badge on mobile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => navigate('/cattle')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', position: 'relative', padding: '4px' }}>
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
            {/* ✅ Clickable avatar on mobile navigates to /profile */}
            <div
              className="user-avatar"
              onClick={() => navigate('/profile')}
              style={{ width: '32px', height: '32px', fontSize: '0.75rem', cursor: 'pointer' }}
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