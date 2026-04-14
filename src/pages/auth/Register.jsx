import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', phone: '', farmName: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    if (form.password !== form.confirmPassword) return toast.error('Passwords do not match! ❌');
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
      <style>{`
        @keyframes ff-slideLeft {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes ff-slideRight {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .ff-brand-in {
          animation: ff-slideLeft 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .ff-card-in {
          animation: ff-slideRight 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;
          animation-delay: 80ms;
        }
      `}</style>

      <div className="auth-bg auth-bg-register" />
      <div className="auth-container">

        <div className="auth-brand ff-brand-in">
          <div className="auth-brand-logo">Farm<span>Fusion</span></div>
          <p className="auth-brand-tagline">Join thousands of farmers managing their livestock smarter</p>
          <ul className="auth-brand-features">
            <li>✅ Free to get started</li>
            <li>🐄 All your farm data in one place</li>
            <li>🏪 Access the cattle marketplace</li>
            <li>💰 Financial tracking made simple</li>
          </ul>
        </div>

        <div className="auth-card ff-card-in">
          <div className="auth-card-header">
            <div className="auth-card-icon">🐄</div>
            <h2>Create your account</h2>
            <p>Start managing your farm smarter today</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name *</label>
                <input type="text" name="name" placeholder="Full Name"
                  value={form.name} onChange={handleChange} required />
              </div>
              <div className="form-group">
                <label>Farm Name</label>
                <input type="text" name="farmName" placeholder="Farm Name"
                  value={form.farmName} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" name="email" placeholder="you@example.com"
                value={form.email} onChange={handleChange} required />
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" name="phone" placeholder="+92 300 1234567"
                value={form.phone} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Confirm Password *</label>
              <div className="password-input-wrapper">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  name="confirmPassword"
                  placeholder="Re-enter your password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirm(!showConfirm)}
                >
                  {showConfirm ? '🙈' : '👁️'}
                </button>
              </div>
              {form.confirmPassword && (
                <p style={{
                  fontSize: '0.78rem', marginTop: '6px', fontWeight: 500,
                  color: form.password === form.confirmPassword ? '#2e7d32' : '#c62828'
                }}>
                  {form.password === form.confirmPassword ? '✅ Passwords match!' : '❌ Passwords do not match'}
                </p>
              )}
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
