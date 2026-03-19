import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';

const navItems = [
  { section: 'Overview', items: [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
  ]},
  { section: 'My Farm', items: [
    { path: '/my-animals',       label: 'My Animals',      icon: '🐄' },
    { path: '/breeding-records', label: 'Breeding Records', icon: '🧬' },
    { path: '/feeding-records',  label: 'Feeding Records',  icon: '🌾' },
    { path: '/animal-progress',  label: 'Animal Progress',  icon: '📈' },
  ]},
  { section: 'Marketplace', items: [
    { path: '/cattle', label: 'Cattle Market', icon: '🏪' },
  ]},
  { section: 'Finance', items: [
    { path: '/installments', label: 'My Installments', icon: '💳' },
    { path: '/vouchers',     label: 'My Vouchers',     icon: '🧾' },
  ]},
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'FF';

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <h1>Farm<span>Fusion</span></h1>
          <p>Smart Livestock Management</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(section => (
            <div className="nav-section" key={section.section}>
              <div className="nav-section-title">{section.section}</div>
              {section.items.map(item => (
                { section: 'Account', items: [
  { path: '/profile', label: 'My Profile', icon: '👤' },
]},
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-user">
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <div className="name">{user?.name}</div>
            <div className="email">{user?.email}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', fontSize: '1.1rem' }}
            title="Logout"
          >🚪</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}