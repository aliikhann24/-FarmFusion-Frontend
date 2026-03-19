import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';
import Spinner from '../../components/common/Spinner';

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
    <div className="auth-wrapper">
      <div className="auth-left">
        <div className="logo">Farm<span>Fusion</span></div>
        <p className="tagline">Your complete livestock management platform</p>
        <ul className="features">
          <li>Track all your animals in one place</li>
          <li>Monitor breeding & feeding records</li>
          <li>Buy & sell cattle on the marketplace</li>
          <li>Manage installments & vouchers</li>
          <li>Track animal health & progress</li>
        </ul>
      </div>

      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Welcome back 👋</h2>
          <p className="subtitle">Sign in to your FarmFusion account</p>

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

          <p style={{ textAlign: 'center', marginTop: '20px', color: '#666', fontSize: '0.9rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
              Create one free
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}