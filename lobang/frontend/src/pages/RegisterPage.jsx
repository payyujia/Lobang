import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Auth.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm]     = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async e => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(Array.isArray(data.error) ? data.error : [data.error]);
        return;
      }
      navigate('/login');
    } catch {
      setErrors(['Something went wrong. Please try again.']);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <nav className="auth-nav">
        <Link to="/home" className="nav__logo">lobang<span>.</span></Link>
        <div className="nav__actions">
          <Link to="/register" className="nav__add">Sign Up</Link>
          <Link to="/login"    className="nav__add">Login</Link>
        </div>
      </nav>

      <div className="page">
        <div className="card auth-card">
          <h1 className="card__title">Create account</h1>
          <p className="card__sub">Start trading today.</p>

          {errors.length > 0 && (
            <div className="alert alert--error">
              {errors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
            </div>
          )}

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="name">Full name</label>
              <input id="name" type="text" required value={form.name} onChange={set('name')} />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required value={form.email} onChange={set('email')} />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" type="password" required value={form.password} onChange={set('password')} />
            </div>
            <div className="field">
              <label htmlFor="confirm">Confirm password</label>
              <input id="confirm" type="password" required value={form.confirm} onChange={set('confirm')} />
            </div>
            <button className="btn btn--primary" type="submit" disabled={loading}>
              {loading ? 'Creating…' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm mt-2">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
