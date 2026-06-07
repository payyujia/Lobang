import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/Chats.css';

export default function ChatsPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [chats, setChats]     = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/chats', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setChats(d.chats || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="page">
      <div className="chats-shell">
        <div className="chats-loading">Loading chats…</div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="chats-shell">
        <div className="chats-header">
          <h1 className="section-title">Messages</h1>
          <span className="section-sub">{chats.length} conversation{chats.length !== 1 ? 's' : ''}</span>
        </div>

        {chats.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state__icon">💬</span>
            No chats yet. Accept an offer to start chatting with a trade partner!
          </div>
        ) : (
          <div className="chat-list">
            {chats.map(chat => (
              <ChatRow key={chat._id} chat={chat} currentUserId={user.id} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatRow({ chat, currentUserId }) {
  const other      = chat.other;
  const lastMsg    = chat.lastMessage;
  const unread     = chat.unreadCount;
  const listing    = chat.listingId;
  const initials   = other?.name?.charAt(0).toUpperCase() || '?';
  const hasUnread  = unread > 0;

  return (
    <Link to={`/chats/${chat._id}`} className={`chat-row${hasUnread ? ' chat-row--unread' : ''}`}>
      {/* Avatar */}
      <div className="chat-row__avatar">
        {other?.avatar
          ? <img src={`/uploads/${other.avatar}`} alt={other.name} />
          : <span>{initials}</span>
        }
        {hasUnread && <span className="chat-row__dot" />}
      </div>

      {/* Body */}
      <div className="chat-row__body">
        <div className="chat-row__top">
          <span className="chat-row__name">{other?.name || 'Unknown'}</span>
          {lastMsg && (
            <span className="chat-row__time">{timeAgo(lastMsg.createdAt || chat.updatedAt)}</span>
          )}
        </div>
        <div className="chat-row__sub">
          <span className="chat-row__listing">re: {listing?.title || 'Listing'}</span>
        </div>
        {lastMsg && (
          <div className={`chat-row__preview${hasUnread ? ' chat-row__preview--bold' : ''}`}>
            {lastMsg.media?.length > 0 && !lastMsg.text
              ? `📎 ${lastMsg.media.length} file${lastMsg.media.length > 1 ? 's' : ''}`
              : lastMsg.text || ''
            }
          </div>
        )}
      </div>

      {/* Unread badge */}
      {hasUnread && (
        <span className="chat-row__badge">{unread > 99 ? '99+' : unread}</span>
      )}
    </Link>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7)  return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}
