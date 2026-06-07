import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ListingCard from '../components/ListingCard';
import OfferCard from '../components/OfferCard';
import '../styles/ProfilePage.css';

export default function ProfilePage() {
  const { id }           = useParams();
  const { user }         = useAuth();
  const navigate         = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setTab]   = useState(searchParams.get('tab') || 'listings');
  const [activeSubtab, setSub] = useState('made');

  // Review form state
  const [rating, setRating]   = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubR] = useState(false);

  const fetchData = (ratingFilter) => {
    const params = ratingFilter ? `?rating=${ratingFilter}` : '';
    setLoading(true);
    fetch(`/api/profile/${id}${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [id]);

  const switchTab = tab => {
    setTab(tab);
    setSearchParams({ tab });
  };

  const handleRemove = async listingId => {
    if (!confirm('Remove this listing and all its offers?')) return;
    await fetch(`/api/profile/${id}/listings/${listingId}/remove`, {
      method: 'POST', credentials: 'include',
    });
    fetchData();
  };

  const handleRelist = async listingId => {
    await fetch(`/api/profile/${id}/listings/${listingId}/relist`, {
      method: 'POST', credentials: 'include',
    });
    fetchData();
  };

  const handleReview = async e => {
    e.preventDefault();
    setSubR(true);
    await fetch(`/api/profile/${id}/review`, {
      method:      'POST',
      credentials: 'include',
      headers:     { 'Content-Type': 'application/json' },
      body:        JSON.stringify({ rating, comment, transactionId: data.sharedTransaction._id }),
    });
    setSubR(false);
    navigate(`/profile/${id}?tab=reviews`);
    fetchData();
  };

  if (loading) return <div className="page"><div className="profile-loading">Loading profile…</div></div>;
  if (!data?.profileUser) return <div className="page"><p>User not found.</p></div>;

  const {
    profileUser, isOwner, listings, wishlist,
    offersMade, offersReceived, reviews,
    reviewCount, avgRating, starCounts,
    canReview, sharedTransaction, karma,
  } = data;

  const initials = profileUser.name?.charAt(0).toUpperCase();

  return (
    <div className="page">
      <div className="container">

        {/* ── Hero ── */}
        <div className="profile-hero">
          <div className="profile-avatar">
            {profileUser.avatar
              ? <img src={`/uploads/${profileUser.avatar}`} alt={profileUser.name} />
              : initials
            }
          </div>

          <div className="profile-info">
            <div className="profile-name">{profileUser.name}</div>
            <div className="profile-meta">
              {profileUser.location?.label && <span><img src="/icons/location.svg" style={{ width: '1em', height: '1em'}}/> {profileUser.location.label}</span>}
              <span>📅 Joined {new Date(profileUser.createdAt).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}</span>
              {avgRating
                ? (
                  <span>
                    <span className="stars__icons">
                      {[1,2,3,4,5].map(i => i <= Math.round(avgRating) ? '★' : '☆')}
                    </span>
                    {avgRating} · {reviewCount} review{reviewCount !== 1 ? 's' : ''}
                  </span>
                )
                : <span>No reviews yet</span>
              }
            </div>
            {profileUser.bio && <p className="profile-bio">{profileUser.bio}</p>}
            {isOwner && (
              <Link to="/update-account" className="btn btn--ghost btn--sm" style={{ width: 'fit-content', marginTop: 8 }}>
                Edit Profile
              </Link>
            )}
          </div>
        </div>

        {/* ── Tab bar ── */}
        <div className="tab-bar">
          <button className={`tab-btn${activeTab === 'listings' ? ' active' : ''}`} onClick={() => switchTab('listings')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            Listings
          </button>
          {isOwner && (
            <button className={`tab-btn${activeTab === 'offers' ? ' active' : ''}`} onClick={() => switchTab('offers')}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M7 16V4m0 0L3 8m4-4 4 4M17 8v12m0 0 4-4m-4 4-4-4"/></svg>
              Offers
            </button>
          )}
          <button className={`tab-btn${activeTab === 'wishlist' ? ' active' : ''}`} onClick={() => switchTab('wishlist')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z"/></svg>
            Wishlist
          </button>
          <button className={`tab-btn${activeTab === 'reviews' ? ' active' : ''}`} onClick={() => switchTab('reviews')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Reviews
          </button>
        </div>

        {/* ── LISTINGS TAB ── */}
        {activeTab === 'listings' && (
          listings.length === 0
            ? <EmptyState icon="📦" text="No listings yet." />
            : <div className="listing-grid">
                {listings.map(listing => (
                  <ListingCard
                    key={listing._id}
                    listing={listing}
                    actions={isOwner && (
                      <>
                        <button className="btn btn--danger btn--sm" onClick={() => handleRemove(listing._id)}>🗑 Remove</button>
                        <Link to={`/listings/form?id=${listing._id}`} className="btn btn--primary btn--sm">🖊 Edit</Link>
                        <button className="btn btn--secondary btn--sm" onClick={() => handleRelist(listing._id)}>↻ Relist</button>
                      </>
                    )}
                  />
                ))}
              </div>
        )}

        {/* ── OFFERS TAB ── */}
        {activeTab === 'offers' && isOwner && (
          <div>
            <div className="subtab-bar">
              <button className={`subtab-btn${activeSubtab === 'made' ? ' active' : ''}`} onClick={() => setSub('made')}>
                Offers made by you
              </button>
              <button className={`subtab-btn${activeSubtab === 'received' ? ' active' : ''}`} onClick={() => setSub('received')}>
                Offers received
              </button>
            </div>

            {activeSubtab === 'made' && (
              offersMade.length === 0
                ? <EmptyState icon="🤲" text="You haven't made any offers yet." />
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {offersMade.map(offer => (
                      <OfferCard key={offer._id} offer={offer} perspective="made" onRefresh={fetchData} navigate={navigate} />
                    ))}
                  </div>
            )}

            {activeSubtab === 'received' && (
              offersReceived.length === 0
                ? <EmptyState icon="📬" text="No offers received yet." />
                : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {offersReceived.map(offer => (
                      <OfferCard key={offer._id} offer={offer} perspective="received" onRefresh={fetchData} navigate={navigate}/>
                    ))}
                  </div>
            )}
          </div>
        )}

        {/* ── WISHLIST TAB ── */}
        {activeTab === 'wishlist' && (
          wishlist.length === 0
            ? <EmptyState icon="🤍" text="Nothing saved yet." />
            : <div className="listing-grid">
                {wishlist.map(l => <ListingCard key={l._id} listing={l} />)}
              </div>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <div className="reviews-wrap">
            {/* Sidebar */}
            <div className="reviews-sidebar">
              {/* Karma card */}
              <div className="karma-card">
                <div className="reviews-sidebar__title">Trader Profile</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 28 }}>{karma.tier.emoji}</span>
                  <div>
                    <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 17, fontWeight: 600, color: karma.tier.color }}>
                      {karma.tier.label}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                      Karma score: {karma.total}/100
                    </div>
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${karma.total}%`, background: karma.tier.color, borderRadius: 3, transition: 'width .6s ease' }} />
                </div>
                <div className="karma-stats">
                  <KarmaStat label="Trades"  value={karma.tradeCount} />
                  <KarmaStat label="Avg ★"   value={avgRating || '—'} />
                  <KarmaStat label="Reviews" value={reviewCount} />
                </div>
              </div>

              {/* Star filter */}
              <div className="reviews-sidebar__title" style={{ marginTop: 4 }}>Filter by Rating</div>
              <button className="star-filter-btn active" onClick={() => fetchData()}>
                <span>All reviews</span>
                <span className="star-filter-btn__count">{reviewCount}</span>
              </button>
              {[5,4,3,2,1].map(star => (
                <button key={star} className="star-filter-btn" onClick={() => fetchData(star)}>
                  <span className="stars__icons">
                    {[1,2,3,4,5].map(i => i <= star ? '★' : '☆')}
                  </span>
                  <span className="star-filter-btn__count">{starCounts[star] || 0}</span>
                </button>
              ))}
            </div>

            {/* Right column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Write review */}
              {canReview && (
                <div className="review-form-card">
                  <div className="review-form-card__title">✍️ Write a Review</div>
                  {sharedTransaction?.snapshot && (
                    <div className="trade-snapshot">
                      <strong>{sharedTransaction.snapshot.listingTitle}</strong>
                      {' '}⇄{' '}
                      {(sharedTransaction.snapshot.offeredTitle || []).join(', ')}
                    </div>
                  )}
                  <form onSubmit={handleReview} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 6 }}>Overall Rating</div>
                      <StarInput value={rating} onChange={setRating} />
                    </div>
                    <div className="field">
                      <label>Write Your Review</label>
                      <textarea
                        placeholder="How was the trade?"
                        style={{ minHeight: 80 }}
                        value={comment}
                        onChange={e => setComment(e.target.value)}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button type="submit" className="btn btn--primary btn--sm" disabled={submittingReview}>
                        {submittingReview ? 'Submitting…' : 'Submit'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Review cards */}
              {reviews.length === 0
                ? <EmptyState icon="💬" text="No reviews yet." />
                : reviews.map(r => <ReviewCard key={r._id} review={r} />)
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

function KarmaStat({ label, value }) {
  return (
    <div style={{ textAlign: 'center', background: 'var(--surface)', border: '1.5px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '8px 4px' }}>
      <div style={{ fontFamily: "'Fredoka',sans-serif", fontSize: 18, fontWeight: 600 }}>{value}</div>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)' }}>{label}</div>
    </div>
  );
}

function StarInput({ value, onChange }) {
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map(i => (
        <label
          key={i}
          style={{
            fontSize: 28,
            cursor: 'pointer',
            color: i <= value ? '#f0b429' : 'var(--border)',
            transition: 'color .1s',
          }}
          onClick={() => onChange(i)}
        >
          ★
        </label>
      ))}
    </div>
  );
}
function ReviewCard({ review: r }) {
  return (
    <div className="review-card">
      <div className="review-card__header">
        <div className="review-card__avatar">
          {r.reviewerId?.avatar
            ? <img src={`/uploads/${r.reviewerId.avatar}`} alt={r.reviewerId.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
            : r.reviewerId?.name?.charAt(0).toUpperCase()
          }
        </div>
        <div>
          <Link className="review-card__name" to={`/profile/${r.reviewerId?._id}`}>
            {r.reviewerId?.name}
          </Link>
          <div className="stars__icons">
            {[1,2,3,4,5].map(i => i <= r.rating ? '★' : '☆')}
          </div>
        </div>
        <div className="review-card__time">{timeAgo(r.createdAt)}</div>
      </div>
      {r.transactionId?.snapshot && (
        <div className="review-card__trade">
          <strong>{r.transactionId.snapshot.listingTitle}</strong>
          {' ⮀ '}
          {(r.transactionId.snapshot.offeredTitle || []).join(', ')}
        </div>
      )}
      {r.comment && <div className="review-card__comment">{r.comment}</div>}
    </div>
  );
}

function EmptyState({ icon, text }) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">{icon}</span>
      {text}
    </div>
  );
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const secs = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (secs < 60)    return `${secs}s ago`;
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}
