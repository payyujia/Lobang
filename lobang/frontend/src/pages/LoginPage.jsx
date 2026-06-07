import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Auth.css';

export default function LoginPage() {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors]     = useState([]);
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(Array.isArray(data.error) ? data.error : [data.error]);
        return;
      }
      login(data.user);
      navigate('/home');
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
          <h1 className="card__title">Sign in</h1>
          <p className="card__sub">Welcome back.</p>

          {errors.length > 0 && (
            <div className="alert alert--error">
              {errors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
            </div>
          )}

          <form className="form" onSubmit={handleSubmit}>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email" type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input
                id="password" type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
            <button className="btn btn--primary" type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="divider mt-2">or</div>

          <p className="text-center text-sm mt-1">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
