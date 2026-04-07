import { Link, useLocation } from 'react-router-dom';
import Animate from '../common/Animate';

const navLinks = [
  { to: '/dashboard',           icon: '🏠', label: 'Dashboard'    },
  { to: '/my-animals',          icon: '🐄', label: 'Animals'      },
  { to: '/breeding-records',    icon: '🧬', label: 'Breeding'     },
  { to: '/feeding-records',     icon: '🌾', label: 'Feeding'      },
  { to: '/animal-progress',     icon: '📈', label: 'Progress'     },
  { to: '/vaccination-records', icon: '💉', label: 'Vaccines'     },
  { to: '/cattle',              icon: '🏪', label: 'Market'       },
  { to: '/installments',        icon: '💳', label: 'Installments' },
  { to: '/vouchers',            icon: '🧾', label: 'Vouchers'     },
  { to: '/profile',             icon: '👤', label: 'Profile'      },
];

export default function QuickNav({ cattleNotifications = 0 }) {
    const { pathname } = useLocation();

  return (
    <Animate direction="down" duration={400}>
      <div style={{
        background: 'white',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
        padding: '12px 14px',
        marginBottom: '24px',
        overflowX: 'auto',
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(10, 1fr)',
          gap: '6px',
          minWidth: '520px',
        }}>
          {navLinks.map(link => {
            const isActive = pathname === link.to;
            return (
              <Link key={link.to} to={link.to} style={{ textDecoration: 'none' }}>
                <div style={{
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  padding: '8px 4px',
                  borderRadius: '10px',
                  background: isActive ? 'var(--primary)' : '#f8faf8',
                  border: isActive ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                  minHeight: '58px',
                  transition: 'all 0.18s',
                  cursor: 'pointer',
                }}>
                  {/* ✅ Notification badge on Market icon */}
                  {link.to === '/cattle' && cattleNotifications > 0 && (
                    <span style={{
                      position: 'absolute', top: '-6px', right: '-4px',
                      background: 'var(--danger)', color: 'white',
                      borderRadius: '50%', width: '16px', height: '16px',
                      fontSize: '0.55rem', fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    }}>{cattleNotifications}</span>
                  )}
                  <span style={{ fontSize: '1rem', lineHeight: 1 }}>{link.icon}</span>
                  <span style={{
                    fontSize: '0.58rem',
                    fontWeight: 600,
                    color: isActive ? 'white' : 'var(--text-muted)',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                  }}>
                    {link.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </Animate>
  );
}