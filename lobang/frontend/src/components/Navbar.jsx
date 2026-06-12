import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import '../styles/Navbar.css';

const CATEGORIES = [
  'Food & Beverages','Electronics','Books & Media','Clothing & Accessories',
  'Furniture & Home','Sports & Outdoors','Toys & Hobbies','Automotive',
  'Services','Other',
];

export default function Navbar() {
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const location         = useLocation();
  const { on }           = useSocket();

  const [q, setQ]                   = useState('');
  const [catOpen, setCatOpen]       = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [menuOpen, setMenuOpen]     = useState(false);
  const [notifications, setNotifs]  = useState([]);
  const [unreadCount, setUnread]    = useState(0);
  const [chatUnread, setChatUnread] = useState(0);
  const [selectedCats, setSelected] = useState([]);

  const catRef   = useRef(null);
  const notifRef = useRef(null);
  const menuRef  = useRef(null);

  // Fetch notifications on mount
  useEffect(() => {
    if (!user) return;
    fetch('/api/notifications', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setNotifs(d.notifications || []); setUnread(d.unreadCount || 0); });
    fetch('/api/chats/unread-count', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setChatUnread(d.count || 0));
  }, [user]);

  // Real-time unread bumps from socket
  useEffect(() => {
    const offBump = on('unread_bump', () => setChatUnread(n => n + 1));
    
    const offNotif = on('new_notification', (notif) => {
      setNotifs(prev => [notif, ...prev]);
      setUnread(n => n + 1);
    });

    return () => {
      offBump();
      offNotif();
    };
  }, [on]);
  // Close dropdowns on outside click
  useEffect(() => {
    const handler = e => {
      if (!catRef.current?.contains(e.target))   setCatOpen(false);
      if (!notifRef.current?.contains(e.target)) setNotifOpen(false);
      if (!menuRef.current?.contains(e.target))  setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = e => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    selectedCats.forEach(c => params.append('selectedCategories', c));
    navigate(`/home?${params.toString()}`);
    setCatOpen(false);
  };

  const toggleCat = cat => {
    setSelected(prev =>
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const markAllRead = async () => {
    await fetch('/api/notifications/all/read', { method: 'POST', credentials: 'include' });
    setUnread(0);
    setNotifs(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleNotifClick = async (n) => {
    await fetch(`/api/notifications/${n._id}/read`, {
      method: 'POST', credentials: 'include',
    });
    setNotifOpen(false);
    navigate(n.linkUrl);
  };

  if (!user) return null;

  const initials = user.name?.charAt(0).toUpperCase();

  return (
    <nav className="nav">
      {/* Logo */}
      <Link to="/home" className="nav__logo">lobang<span>.</span></Link>

      {/* Search */}
      <form className="nav__search" onSubmit={handleSearch}>
        <input
          name="q" type="search"
          placeholder="Search listings…"
          value={q}
          onChange={e => setQ(e.target.value)}
          autoComplete="on"
        />
        {/* Category dropdown */}
        <div className="nav__dropdown-wrap" ref={catRef} style={{ position: 'relative' }}>
          <button
            type="button"
            className={`btn btn--sm btn--ghost cat-btn${selectedCats.length ? ' cat-btn--active' : ''}`}
            onClick={() => setCatOpen(o => !o)}
          >
            Categories {selectedCats.length > 0 && <span className="cat-badge">{selectedCats.length}</span>} ⏷
          </button>
          {catOpen && (
            <div className="nav__dropdown cat-dropdown">
              <div className="nav__dropdown-header">Filter by Category</div>
              {CATEGORIES.map(cat => (
                <label key={cat} className="cat-option">
                  <input
                    type="checkbox"
                    checked={selectedCats.includes(cat)}
                    onChange={() => toggleCat(cat)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
              {selectedCats.length > 0 && (
                <button
                  type="button"
                  className="cat-clear"
                  onClick={() => setSelected([])}
                >
                  Clear all
                </button>
              )}
            </div>
          )}
        </div>
        <button type="submit" className="btn btn--sm btn--primary" aria-label="Search"><img src="/icons/search.svg" style={{ width: '1em', height: '1em'}}/></button>
      </form>

      {/* Actions */}
      <div className="nav__actions">
        <Link to="/listings/form" className="nav__add"><img src="/icons/pen.svg" style={{ width: '1.5em', height: '1.5em'}}/>Add Listing</Link>

        {/* Avatar */}
        <Link to={`/profile/${user.id}`} aria-label="Profile">
          {user.avatar
            ? <img className="nav__avatar" src={`/uploads/${user.avatar}`} alt={user.name} />
            : <span className="nav__avatar">{initials}</span>
          }
        </Link>

        {/* Notifications */}
        <div className="nav__dropdown-wrap" ref={notifRef}>
          <button
            className="nav__icon-btn"
            onClick={() => setNotifOpen(o => !o)}
            aria-label="Notifications"
          >
            <img src="/icons/bell.svg" style={{ width: '1.5em', height: '1.5em'}}/>
            {unreadCount > 0 && <span className="nav__badge">{unreadCount}</span>}
          </button>
          {notifOpen && (
            <div className="nav__dropdown notif-dropdown">
              <div className="nav__dropdown-header">
                <span>Notifications</span>
                {unreadCount > 0 && (
                  <button className="mark-read-btn" onClick={markAllRead}>Mark all read</button>
                )}
              </div>
              {notifications.length === 0
                ? <div className="notif-empty">You're all caught up 🎉</div>
                : notifications.map(n => (
                  <button
                    key={n._id}
                    className="notif-item"
                    style={{ background: n.isRead ? '' : '#E1F1FD' }}
                    onClick={() => handleNotifClick(n)}
                  >
                    <img src={`/icons/${n.type}.svg`} className="notif-item__icon" />
                    <span>{n.message}</span>
                    <span className="notif-item__time">{timeAgo(n.createdAt)}</span>
                  </button>
                ))
              }
            </div>
          )}
        </div>

        {/* Chat */}
        <Link to="/chats" className="nav__icon-btn" aria-label="Chats" style={{ textDecoration: 'none' }}>
        <img src="/icons/chat1.svg" style={{ width: '1.5em', height: '1.5em'}}/>
          {chatUnread > 0 && <span className="nav__badge">{chatUnread}</span>}
        </Link>

        {/* Menu */}
        <div className="nav__dropdown-wrap" ref={menuRef}>
          <button className="nav__icon-btn" onClick={() => setMenuOpen(o => !o)} aria-label="More">
            •••
          </button>
          {menuOpen && (
            <div className="nav__dropdown">
              <div className="nav__dropdown-header">Account</div>
              <Link to="/update-account" onClick={() => setMenuOpen(false)}>Account Settings</Link>
              <button
                className="danger"
                onClick={async () => {
                  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
                  window.location.href = '/login';
                }}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
