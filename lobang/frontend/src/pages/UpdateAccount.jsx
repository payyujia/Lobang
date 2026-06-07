import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/UpdateAccount.css';

export default function UpdateAccount() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', bio: '',
    password: '', confirmPassword: '',
    locationLabel: '', locationLat: '', locationLng: '',
  });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setPreview] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSub] = useState(false);
  const [locStatus, setLocStatus] = useState('');
  const [pwStrength, setPwStrength] = useState(0);
  const fileRef = useRef(null);

  // Fetch current user data
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        const u = d.user;
        setForm({
          name: u.name || '',
          email: u.email || '',
          bio: u.bio || '',
          password: '',
          confirmPassword: '',
          locationLabel: u.location?.label || '',
          locationLat: u.location?.coordinates?.[1] || '',
          locationLng: u.location?.coordinates?.[0] || '',
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const set = field => e => setForm(prev => ({ ...prev, [field]: e.target.value }));

  const handleAvatarChange = e => {
    const file = e.target.files[0];
    if (!file) return;
    setAvatarFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handlePwChange = e => {
    const pw = e.target.value;
    setForm(prev => ({ ...prev, password: pw }));
    const score = [pw.length >= 8, /[A-Z]/.test(pw), /[0-9]/.test(pw), /[^A-Za-z0-9]/.test(pw)]
      .filter(Boolean).length;
    setPwStrength(score);
  };

  const detectLocation = () => {
    setLocStatus('Detecting…');
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setForm(prev => ({ ...prev, locationLat: lat, locationLng: lng }));
        try {
          const r = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
          const data = await r.json();
          const label = data.address?.suburb || data.address?.city || data.address?.town || 'Your location';
          setForm(prev => ({ ...prev, locationLabel: label }));
          setLocStatus(`📍 Found: ${label}`);
        } catch {
          setLocStatus('Located — enter area name manually.');
        }
      },
      () => setLocStatus('Could not detect location.')
    );
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setErrors([]);
    setSub(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    if (avatarFile) fd.append('avatar', avatarFile);

    try {
      const res = await fetch('/api/auth/update-account', {
        method: 'POST',
        credentials: 'include',
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors(Array.isArray(data.errors) ? data.errors : [data.error || 'Something went wrong']);
        return;
      }
      login(data.user); // refresh AuthContext
      navigate(`/profile/${user.id}`);
    } finally {
      setSub(false);
    }
  };

  const pwColors = ['transparent', '#ff4444', '#f0b429', '#80f7b7', '#49f4ed'];
  const displayAvatar = avatarPreview || (user?.avatar ? `/uploads/${user.avatar}` : null);
  const initials = (form.name || user?.name || '?').charAt(0).toUpperCase();

  if (loading) return <div className="page"><p>Loading…</p></div>;

  return (
    <div className="page">
      <div style={{ maxWidth: 860, margin: '0 auto 28px' }}>
        <h1 style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 30 }}>Edit your profile</h1>
        <p className="text-sm" style={{ marginTop: 4 }}>Changes show up on your public page instantly.</p>
      </div>

      {errors.length > 0 && (
        <div style={{ maxWidth: 860, margin: '0 auto 20px' }}>
          <div className="alert alert--error">
            {errors.map((e, i) => <div key={i}>⚠️ {e}</div>)}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <div className="edit-wrap">

          {/*  LEFT: Live preview  */}
          <div className="preview-card">
            <div className="avatar-ring" onClick={() => fileRef.current?.click()}>
              <div className="avatar-inner">
                {displayAvatar
                  ? <img src={displayAvatar} alt="" />
                  : <span>{initials}</span>
                }
              </div>
              <div className="avatar-overlay">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                Change
              </div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />

            <div className="preview-name">{form.name || 'Your Name'}</div>
            <div className="preview-email">{form.email}</div>
            {form.bio && <div className="preview-bio">{form.bio}</div>}
            {form.locationLabel && <div className="preview-loc">📍 {form.locationLabel}</div>}
            <div style={{ fontSize: 11, color: 'var(--text-2)', fontWeight: 600, marginTop: 4 }}>
              Preview of your public profile
            </div>
          </div>

          {/*  RIGHT: Form  */}
          <div className="form-card">
            <div className="form-card__band" />
            <div className="form-card__body">

              {/* Identity */}
              <div className="form-section">
                <div className="form-section__title">👤 Identity</div>
                <div className="field">
                  <label>Display Name</label>
                  <input type="text" maxLength={40} required value={form.name} onChange={set('name')} />
                </div>
                <div className="field">
                  <label>Email</label>
                  <input type="email" required value={form.email} onChange={set('email')} />
                </div>
                <div className="field">
                  <label>Bio</label>
                  <textarea rows={3} value={form.bio} onChange={set('bio')} />
                </div>
              </div>

              {/* Location */}
              <div className="form-section">
                <div className="form-section__title">
                  <img src="/icons/location.svg" style={{ width: '1em', height: '1em'}}/>
                  Location</div>
                <p className="text-sm">Used to surface nearby listings for you.</p>
                <div className="loc-row">
                  <div className="field" style={{ flex: 1, margin: 0 }}>
                    <label>Area (e.g. Tampines, SG)</label>
                    <input type="text" value={form.locationLabel} onChange={set('locationLabel')} />
                  </div>
                  <button type="button" className="btn btn--accent btn--sm" onClick={detectLocation} style={{ flexShrink: 0, marginBottom: 1 }}>
                    Detect
                  </button>
                </div>
                {locStatus && <div className="text-sm">{locStatus}</div>}
              </div>

              {/* Security */}
              <div className="form-section">
                <div className="form-section__title">🔒 Security</div>
                <p className="text-sm">Leave blank to keep your current password.</p>
                <div className="field">
                  <label>New Password</label>
                  <input type="password" autoComplete="new-password" value={form.password} onChange={handlePwChange} />
                </div>
                {form.password && (
                  <div className="pw-bar-wrap">
                    <div className="pw-bar" style={{ width: `${pwStrength * 25}%`, background: pwColors[pwStrength] }} />
                  </div>
                )}
                <div className="field">
                  <label>Confirm New Password</label>
                  <input type="password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} />
                </div>
              </div>

              {/* Actions */}
              <div className="form-section" style={{ flexDirection: 'row', gap: 10 }}>
                <button type="submit" className="btn btn--primary" style={{ flex: 1 }} disabled={submitting}>
                  {submitting ? 'Saving…' : 'Save changes ✨'}
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => navigate(`/profile/${user.id}`)}>
                  Cancel
                </button>
              </div>

            </div>
          </div>

        </div>
      </form>
    </div>
  );
}
