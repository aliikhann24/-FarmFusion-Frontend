import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      toast.success('Welcome back to FarmFusion! 🌾');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">

      {/* Background Image with Overlay */}
      <div className="auth-bg" />

      {/* Content */}
      <div className="auth-container">

        {/* Left — Branding */}
        <div className="auth-brand">
          <div className="auth-brand-logo">Farm<span>Fusion</span></div>
          <p className="auth-brand-tagline">Your complete livestock management platform</p>
          <ul className="auth-brand-features">
            <li>🐄 Track all your animals in one place</li>
            <li>🧬 Monitor breeding & feeding records</li>
            <li>🏪 Buy & sell cattle on the marketplace</li>
            <li>💳 Manage installments & vouchers</li>
            <li>📈 Track animal health & progress</li>
          </ul>
        </div>

        {/* Right — Form Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-icon">🌾</div>
            <h2>Welcome back</h2>
            <p>Sign in to your FarmFusion account</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email Address</label>
              <input type="email" name="email" placeholder="you@farm.com"
                value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" placeholder="••••••••"
                value={form.password} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In 🌾'}
            </button>
          </form>

          <p className="auth-card-footer">
            Don't have an account?{' '}
            <Link to="/register">Create one free</Link>
          </p>
        </div>

      </div>
    </div>
  );
}