import { Link, useLocation } from 'react-router-dom';

const navLinks = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard' },
  { to: '/my-animals', icon: '🐄', label: 'Animals' },
  { to: '/breeding-records', icon: '🧬', label: 'Breeding' },
  { to: '/feeding-records', icon: '🌾', label: 'Feeding' },
  { to: '/animal-progress', icon: '📈', label: 'Progress' },
  { to: '/vaccination-records', icon: '💉', label: 'Vaccines' },
  { to: '/cattle', icon: '🏪', label: 'Market' },
  { to: '/installments', icon: '💳', label: 'Installments' },
  { to: '/vouchers', icon: '🧾', label: 'Vouchers' },
  { to: '/profile', icon: '👤', label: 'Profile' },
];

export default function QuickNav() {
  const { pathname } = useLocation();
  const isMobile = window.innerWidth <= 768;

  return (
    <div
      style={{
        background: 'white',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        padding: isMobile ? '12px' : '14px 16px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: isMobile ? '6px' : '8px',
          width: '100%',
        }}
      >
        {navLinks.map((link) => {
          const isActive = pathname === link.to;

          return (
            <Link
              key={link.to}
              to={link.to}
              style={{ textDecoration: 'none' }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: isMobile ? '8px 4px' : '10px 6px',
                  borderRadius: '10px',
                  background: isActive ? 'var(--primary)' : '#f8faf8',
                  border: isActive
                    ? '1.5px solid var(--primary)'
                    : '1.5px solid var(--border)',
                  minHeight: isMobile ? '58px' : '64px',
                  transition: 'all 0.15s',
                  cursor: 'pointer',
                }}
              >
                <span
                  style={{
                    fontSize: isMobile ? '0.95rem' : '1rem',
                  }}
                >
                  {link.icon}
                </span>

                <span
                  style={{
                    fontSize: isMobile ? '0.56rem' : '0.62rem',
                    fontWeight: 600,
                    color: isActive ? 'white' : 'var(--text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                  }}
                >
                  {link.label}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}