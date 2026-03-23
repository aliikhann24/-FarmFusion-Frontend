import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', textAlign: 'center', padding: '20px'
    }}>
      <div style={{ fontSize: '5rem', marginBottom: '16px' }}>🌾</div>
      <h1 style={{ fontSize: '2rem', color: 'var(--primary-dark)', marginBottom: '8px' }}>
        Page Not Found
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px' }}>
        Looks like this field hasn't been planted yet!
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        Back to Dashboard
      </Link>
    </div>
  );
}