import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', farmName: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to FarmFusion 🌾');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
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
          <p className="auth-brand-tagline">Join thousands of farmers managing their livestock smarter</p>
          <ul className="auth-brand-features">
            <li>✅ Free to get started</li>
            <li>🐄 All your farm data in one place</li>
            <li>🏪 Access the cattle marketplace</li>
            <li>💰 Financial tracking made simple</li>
          </ul>
        </div>

        {/* Right — Form Card */}
        <div className="auth-card">
          <div className="auth-card-header">
            <div className="auth-card-icon">🐄</div>
            <h2>Create your account</h2>
            <p>Start managing your farm smarter today</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" placeholder="Ahmed Khan"
                  value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Farm Name</label>
                <input type="text" name="farmName" placeholder="Green Valley Farm"
                  value={form.farmName} onChange={handleChange} />
              </div>
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" name="email" placeholder="ahmed@farm.com"
                value={form.email} onChange={handleChange} required />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" placeholder="+92 300 1234567"
                value={form.phone} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input type="password" name="password" placeholder="Min. 6 characters"
                value={form.password} onChange={handleChange} required />
            </div>
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create Account 🌾'}
            </button>
          </form>

          <p className="auth-card-footer">
            Already have an account?{' '}
            <Link to="/login">Sign in</Link>
          </p>
        </div>

      </div>
    </div>
  );
}