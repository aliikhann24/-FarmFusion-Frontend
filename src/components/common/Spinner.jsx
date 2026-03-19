export default function Spinner({ text = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 20px', color: 'var(--text-muted)'
    }}>
      <div style={{
        width: '40px', height: '40px', borderRadius: '50%',
        border: '3px solid var(--border)',
        borderTop: '3px solid var(--primary)',
        animation: 'spin 0.8s linear infinite',
        marginBottom: '12px'
      }} />
      <p style={{ fontSize: '0.9rem' }}>{text}</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}