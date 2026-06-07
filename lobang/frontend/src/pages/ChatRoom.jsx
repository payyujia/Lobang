import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import '../styles/ChatRoom.css';

const ACCEPTED_MEDIA = 'image/*,video/*';
const MAX_FILES = 5;

export default function ChatRoom() {
  const { id }    = useParams();
  const { user }  = useAuth();
  const { emit, on } = useSocket();

  const [chat, setChat]           = useState(null);
  const [messages, setMessages]   = useState([]);
  const [hasMore, setHasMore]     = useState(false);
  const [loadingMore, setLM]      = useState(false);
  const [loading, setLoading]     = useState(true);
  const [text, setText]           = useState('');
  const [mediaFiles, setMedia]    = useState([]);    // File[]
  const [previews, setPreviews]   = useState([]);    // { url, type }[]
  const [sending, setSending]     = useState(false);
  const [typing, setTyping]       = useState(null);  // name of whoever is typing

  const bottomRef     = useRef(null);
  const topRef        = useRef(null);
  const fileInputRef  = useRef(null);
  const typingTimer   = useRef(null);
  const oldestMsgId   = useRef(null);

  //  Initial load 
  useEffect(() => {
    fetch(`/api/chats/${id}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setChat(d.chat);
        setMessages(d.messages || []);
        setHasMore(d.hasMore);
        if (d.messages?.length) {
          oldestMsgId.current = d.messages[0]._id;
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  //  Socket.io ─
  useEffect(() => {
    emit('join_chat', { chatId: id });

    const offMsg = on('new_message', msg => {
      setMessages(prev => [...prev, msg]);
      scrollToBottom();
    });

    const offTyping = on('typing', ({ name }) => {
      setTyping(name);
    });

    const offStop = on('stop_typing', () => {
      setTyping(null);
    });

    return () => { offMsg(); offTyping(); offStop(); };
  }, [id, emit, on]);

  //  Scroll to bottom on new messages ─
  const scrollToBottom = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, []);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [loading, scrollToBottom]);

  //  Load older messages ─
  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLM(true);
    const res = await fetch(
      `/api/chats/${id}?before=${oldestMsgId.current}`,
      { credentials: 'include' }
    );
    const d = await res.json();
    setMessages(prev => [...(d.messages || []), ...prev]);
    setHasMore(d.hasMore);
    if (d.messages?.length) oldestMsgId.current = d.messages[0]._id;
    setLM(false);
  };

  //  Typing indicator 
  const handleTextChange = e => {
    setText(e.target.value);
    emit('typing', { chatId: id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      emit('stop_typing', { chatId: id });
    }, 1500);
  };

  //  Media selection ─
  const handleMediaChange = e => {
    const files = Array.from(e.target.files);
    const combined = [...mediaFiles, ...files].slice(0, MAX_FILES);
    const urls = combined.map(f => ({
      url:  URL.createObjectURL(f),
      type: f.type.startsWith('video') ? 'video' : 'image',
      name: f.name,
    }));
    setMedia(combined);
    setPreviews(urls);
    e.target.value = '';
  };

  const removeMedia = idx => {
    URL.revokeObjectURL(previews[idx].url);
    setMedia(prev => prev.filter((_, i) => i !== idx));
    setPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  //  Send 
  const handleSend = async e => {
    e?.preventDefault();
    if ((!text.trim() && mediaFiles.length === 0) || sending) return;

    // Pure text → use socket for instant delivery
    if (mediaFiles.length === 0 && text.trim()) {
      emit('send_message', { chatId: id, text: text.trim() });
      setText('');
      emit('stop_typing', { chatId: id });
      clearTimeout(typingTimer.current);
      return;
    }

    // Files → REST (multipart)
    setSending(true);
    const fd = new FormData();
    fd.append('text', text.trim());
    mediaFiles.forEach(f => fd.append('media', f));

    try {
      const res = await fetch(`/api/chats/${id}/messages`, {
        method: 'POST',
        body: fd,
        credentials: 'include',
      });
      const d = await res.json();
      if (d.message) {
        setMessages(prev => [...prev, d.message]);
        scrollToBottom();
      }
      setText('');
      previews.forEach(p => URL.revokeObjectURL(p.url));
      setMedia([]);
      setPreviews([]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) return <div className="page"><div className="chatroom-loading">Loading chat…</div></div>;
  if (!chat)   return <div className="page"><p>Chat not found.</p></div>;

  const other = chat.other;

  return (
    <div className="chatroom-page">
      {/* Header */}
      <div className="chatroom-header">
        <Link to="/chats" className="back-btn">← Back</Link>
        <div className="chatroom-party">
          <div className="chatroom-avatar">
            {other?.avatar
              ? <img src={`/uploads/${other.avatar}`} alt={other.name} />
              : <span>{other?.name?.charAt(0).toUpperCase()}</span>
            }
          </div>
          <div>
            <div className="chatroom-name">{other?.name}</div>
            <Link
              to={`/listings/${chat.listingId?._id}`}
              className="chatroom-listing-link"
            >
              re: {chat.listingId?.title}
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="chatroom-messages" ref={topRef}>
        {hasMore && (
          <button
            className="load-more-btn"
            onClick={loadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading…' : 'Load older messages'}
          </button>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={msg._id || i}
            msg={msg}
            isMine={String(msg.senderId?._id || msg.senderId) === String(user.id)}
            showAvatar={
              i === 0 ||
              String(messages[i - 1]?.senderId?._id || messages[i - 1]?.senderId)
                !== String(msg.senderId?._id || msg.senderId)
            }
          />
        ))}

        {typing && (
          <div className="typing-indicator">
            <span>{typing} is typing</span>
            <span className="typing-dots">
              <span /><span /><span />
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Media previews */}
      {previews.length > 0 && (
        <div className="media-preview-strip">
          {previews.map((p, i) => (
            <div key={i} className="media-preview-item">
              {p.type === 'video'
                ? <video src={p.url} className="preview-thumb" />
                : <img src={p.url} alt={p.name} className="preview-thumb" />
              }
              <button className="preview-remove" onClick={() => removeMedia(i)}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="chatroom-input-bar">
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Attach image or video"
          disabled={mediaFiles.length >= MAX_FILES}
        >
          <img className="nav__icon-btn" src="/icons/upload.svg" alt="upload" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_MEDIA}
          multiple
          style={{ display: 'none' }}
          onChange={handleMediaChange}
        />

        <textarea
          className="chatroom-textarea"
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={1}
        />

        <button
          className={`send-btn${(text.trim() || mediaFiles.length > 0) ? ' send-btn--active' : ''}`}
          onClick={handleSend}
          disabled={sending || (!text.trim() && mediaFiles.length === 0)}
        >
          {sending ? '…' : '➤'}
        </button>
      </div>
    </div>
  );
}

function MessageBubble({ msg, isMine, showAvatar }) {
  const sender  = msg.senderId;
  const initials = sender?.name?.charAt(0).toUpperCase() || '?';

  return (
    <div className={`msg-row${isMine ? ' msg-row--mine' : ''}`}>
      {!isMine && (
        <div className={`msg-avatar${showAvatar ? '' : ' msg-avatar--hidden'}`}>
          {sender?.avatar
            ? <img src={`/uploads/${sender.avatar}`} alt={sender.name} />
            : <span>{initials}</span>
          }
        </div>
      )}

      <div className="msg-bubble-wrap">
        {showAvatar && !isMine && (
          <div className="msg-sender-name">{sender?.name}</div>
        )}

        <div className={`msg-bubble${isMine ? ' msg-bubble--mine' : ''}`}>
          {/* Media */}
          {msg.media?.length > 0 && (
            <div className="msg-media">
              {msg.media.map((m, i) => (
                m.mimetype?.startsWith('video')
                  ? (
                    <video
                      key={i}
                      src={`/uploads/${m.filename}`}
                      controls
                      className="msg-media-item"
                    />
                  ) : (
                    <a key={i} href={`/uploads/${m.filename}`} target="_blank" rel="noreferrer">
                      <img
                        src={`/uploads/${m.filename}`}
                        alt={m.originalName}
                        className="msg-media-item"
                      />
                    </a>
                  )
              ))}
            </div>
          )}
          {/* Text */}
          {msg.text && <p className="msg-text">{msg.text}</p>}
        </div>

        <div className="msg-time">{formatTime(msg.createdAt)}</div>
      </div>
    </div>
  );
}

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
    ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
